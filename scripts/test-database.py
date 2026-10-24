"""Real, ephemeral PostgreSQL tests. Never accepts a DB URL or remote target."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import time
import uuid
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826"
LABEL = "io.licenseinsight.test-run"
DOCKER = ["docker", "--host=unix:///var/run/docker.sock"]
ENV = {k: v for k, v in os.environ.items() if k not in {
    "DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_TLS", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH"
}}
METADATA_SQL = """
select json_build_object('columns',(select json_agg(row_to_json(c)) from
 (select table_schema,table_name,column_name,is_nullable,data_type,udt_schema,udt_name,
 column_default,is_generated from information_schema.columns
 where table_schema in ('public','internal') order by table_schema,table_name,ordinal_position)c),
 'views',(select json_agg(row_to_json(v)) from
 (select table_schema,table_name from information_schema.views where table_schema in ('public','internal') order by table_schema,table_name)v),
 'enums',(select json_agg(row_to_json(e)) from
 (select n.nspname schema,t.typname name,array_agg(e.enumlabel order by enumsortorder) values
 from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace
 where n.nspname='public' group by n.nspname,t.typname order by t.typname)e));
"""


def command(args: list[str], *, sql: str | None = None, check: bool = True):
    result = subprocess.run(args, input=sql, text=True, capture_output=True, env=ENV, timeout=180)
    if check and result.returncode:
        # Deliberately do not print environment, server logs, or arbitrary output.
        raise RuntimeError(f"Local command failed ({result.returncode}): {' '.join(args[:3])}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-dir", type=Path, default=ROOT / "test-results/database")
    args = parser.parse_args()
    evidence = args.evidence_dir.resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location("db_cases", ROOT / "tests/database/cases.py")
    cases = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cases)
    step05_spec = importlib.util.spec_from_file_location("db_step05_cases", ROOT / "tests/database/step05/cases.py")
    step05_cases = importlib.util.module_from_spec(step05_spec)
    step05_spec.loader.exec_module(step05_cases)
    migrations = sorted((ROOT / "supabase/migrations").glob("*.sql"))
    assert migrations, "No migrations found"
    run_id = uuid.uuid4().hex
    container = f"licenseinsight-db-test-{run_id[:12]}"
    report = {"started_at": datetime.now(timezone.utc).isoformat(), "target": "local Docker Unix socket",
              "image": IMAGE, "network": "none", "host_ports": [], "data": "synthetic-only",
              "auth_postgrest": "NOT_RUN", "migrations": [{"file": str(p.relative_to(ROOT)),
                  "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in migrations],
              "test_sources": [{"file": p, "sha256": hashlib.sha256((ROOT / p).read_bytes()).hexdigest()}
                  for p in ("tests/database/setup.sql", "tests/database/cases.py", "tests/database/step05/setup.sql", "tests/database/step05/cases.py", "scripts/test-database.py", "supabase/config.toml")],
              "role_simulation": "SET LOCAL SESSION AUTHORIZATION; no JWT verification",
              "checks": [], "cleanup": "NOT_RUN"}
    created = False

    def sql(database: str, statement: str, *, check=True):
        return command(DOCKER + ["exec", "-i", container, "psql", "-X", "-qAt",
            "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-U", "postgres", "-d", database],
            sql=statement, check=check)

    try:
        import tomllib
        config = tomllib.loads((ROOT / "supabase/config.toml").read_text())
        assert config["api"]["schemas"] == ["public"]
        assert "internal" not in config["api"]["extra_search_path"]
        assert config["api"]["auto_expose_new_tables"] is False
        assert config["db"]["seed"]["enabled"] is False
        assert config["db"]["major_version"] == 17
        report["checks"].append({"name": "local config limits exposure and disables seed (static)", "result": "PASS"})
        command(DOCKER + ["info", "--format", "{{.ServerVersion}}"])
        if command(DOCKER + ["image", "inspect", IMAGE, "--format", "{{.Id}}"], check=False).returncode:
            command(DOCKER + ["pull", IMAGE])
        command(DOCKER + ["run", "--detach", "--name", container, "--label", f"{LABEL}={run_id}",
            "--network", "none", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=256m",
            "--env", "POSTGRES_HOST_AUTH_METHOD=trust", IMAGE, "postgres", "-c", "listen_addresses="])
        created = True
        for _ in range(120):
            if command(DOCKER + ["exec", container, "pg_isready", "-U", "postgres"], check=False).returncode == 0:
                break
            time.sleep(0.25)
        else:
            raise RuntimeError("Ephemeral local PostgreSQL startup timed out")
        report["postgres_version"] = sql("postgres", "select version();").stdout.strip()
        sql("postgres", "create role anon nologin; create role authenticated nologin; "
            "create role service_role nologin bypassrls; create database qi_first; create database qi_replay;")
        fingerprints = []
        for database in ("qi_first", "qi_replay"):
            # Simulate old Supabase auto-grants, and ensure unrelated tables stay private.
            sql(database, "alter default privileges in schema public grant all on tables to anon, authenticated, service_role;"
                "create table public.step04_unrelated_private (id integer);"
                "revoke all on public.step04_unrelated_private from public, anon, authenticated, service_role;")
            for migration in migrations:
                sql(database, migration.read_text())
            unrelated = sql(database, "select has_table_privilege('anon','public.step04_unrelated_private','SELECT');").stdout.strip()
            assert unrelated == "f", "Migration granted access to an unrelated table"
            report["checks"].append({"database": database, "name": "unrelated table permissions preserved", "result": "PASS"})
            sql(database, "drop table public.step04_unrelated_private;")
            dump = command(DOCKER + ["exec", container, "pg_dump", "-U", "postgres", "-d", database,
                "--schema-only", "--schema=public", "--schema=internal", "--no-owner", "--no-privileges"]).stdout
            stable = "\n".join(line for line in dump.splitlines() if not line.startswith(("\\restrict", "\\unrestrict")))
            fingerprints.append(hashlib.sha256(stable.encode()).hexdigest())
            metadata = json.loads(sql(database, METADATA_SQL).stdout)
            (evidence / f"{database}-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
            sql(database, (ROOT / "tests/database/setup.sql").read_text())
            suite_cases = cases.TEST_CASES + [{"name": "STEP05 setup", "sql": (ROOT / "tests/database/step05/setup.sql").read_text(), "expected_output": ""}] + step05_cases.TEST_CASES
            for case in suite_cases:
                actual = sql(database, case["sql"], check=False)
                error = re.search(r"ERROR:\s+([A-Z0-9]{5}):", actual.stderr)
                state = error.group(1) if error else None
                if "expected_sqlstate" in case:
                    passed = actual.returncode != 0 and state == case["expected_sqlstate"]
                else:
                    passed = actual.returncode == 0 and actual.stdout.strip() == case.get("expected_output", "")
                result = {"database": database, "name": case["name"], "result": "PASS" if passed else "FAIL",
                          "exit_code": actual.returncode, "sqlstate": state}
                report["checks"].append(result)
                if not passed:
                    # SQL fixture output only; never capture server environment/logs.
                    result["expected"] = case.get("expected_sqlstate", case.get("expected_output", ""))
                    result["actual"] = state or actual.stdout.strip()[:200]
                    print(f"FAIL {database}: {case['name']} ({state or 'unexpected result'})")
            print(f"{database}: migration applied, {len(suite_cases)} DB cases executed")
        same = len(set(fingerprints)) == 1
        report["schema_fingerprints"] = fingerprints
        report["checks"].append({"name": "new database schema replay matches", "result": "PASS" if same else "FAIL"})
    except Exception as error:
        report["error"] = f"{type(error).__name__}: {error}"
        print(report["error"])
    finally:
        if created:
            label = command(DOCKER + ["inspect", "--format", '{{index .Config.Labels "' + LABEL + '"}}', container], check=False)
            if label.returncode == 0 and label.stdout.strip() == run_id:
                removed = command(DOCKER + ["rm", "--force", container], check=False)
                report["cleanup"] = "PASS" if removed.returncode == 0 else "FAIL"
            else:
                report["cleanup"] = "REFUSED_LABEL_MISMATCH"
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
        report["passed"] = sum(c["result"] == "PASS" for c in report["checks"])
        report["failed"] = sum(c["result"] == "FAIL" for c in report["checks"])
        report["exit_code"] = int(bool(report.get("error") or report["failed"] or report["cleanup"] != "PASS"))
        (evidence / "database-tests.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"DB checks: {report['passed']} passed, {report['failed']} failed; cleanup {report['cleanup']}")
    return report["exit_code"]


if __name__ == "__main__":
    raise SystemExit(main())
