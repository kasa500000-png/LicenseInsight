"""STEP05: real node-postgres end-to-end tests in a fresh local-only database."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("db_test_utils", ROOT / "scripts/test-database.py")
db = importlib.util.module_from_spec(spec)
spec.loader.exec_module(db)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-dir", type=Path, default=ROOT / "test-results/ingestion-db")
    args = parser.parse_args()
    dest = args.evidence_dir.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    (ROOT / "test-results").mkdir(exist_ok=True)
    socket = Path(tempfile.mkdtemp(prefix="pg-step05-", dir=ROOT / "test-results"))
    socket.chmod(0o777)  # Disposable local test socket; container postgres owns it.
    run_id = uuid.uuid4().hex
    name = f"licenseinsight-step05-node-{run_id[:10]}"
    report = {"started_at": datetime.now(timezone.utc).isoformat(), "image": db.IMAGE,
              "data": "synthetic-only", "network": "none", "host_ports": [],
              "connection": "node-postgres through newly created bind-mounted local Unix socket",
              "checks": [], "cleanup": "NOT_RUN"}
    sources = list((ROOT / "src/server/ingestion").glob("*.ts")) + list((ROOT / "tests/database/node").glob("*.ts")) + [
        ROOT / p for p in ("scripts/test-ingestion-db.py", "src/data/repositories/public-repository.ts",
        "src/data/adapters/source-registry.ts", "tests/database/setup.sql", "tests/database/step05/setup.sql",
        "vitest.database.config.mts", "package.json", "pnpm-lock.yaml")]
    report["source_hashes"] = [{"file": str(p.relative_to(ROOT)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(sources)]
    created = False

    def sql(statement):
        return db.command(db.DOCKER + ["exec", "-i", name, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
            "-U", "postgres", "-d", "qi_node"], sql=statement)
    try:
        db.command(db.DOCKER + ["info", "--format", "{{.ServerVersion}}"])
        db.command(db.DOCKER + ["run", "--detach", "--name", name, "--label", f"io.licenseinsight.step05={run_id}",
            "--network", "none", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=256m",
            "--mount", f"type=bind,src={socket},dst=/var/run/postgresql", "--env", "POSTGRES_HOST_AUTH_METHOD=trust",
            db.IMAGE, "postgres", "-c", "listen_addresses="])
        created = True
        for _ in range(120):
            state = db.command(db.DOCKER + ["exec", name, "cat", "/proc/1/comm"], check=False)
            ready = db.command(db.DOCKER + ["exec", name, "pg_isready", "-U", "postgres"], check=False)
            if state.stdout.strip() == "postgres" and ready.returncode == 0:
                break
            time.sleep(0.2)
        else:
            raise RuntimeError("Local DB final server did not become ready")
        db.command(db.DOCKER + ["exec", "-i", name, "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres"],
            sql="create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create database qi_node;")
        migrations = sorted((ROOT / "supabase/migrations").glob("*.sql"))
        report["migrations"] = [{"file": str(p.relative_to(ROOT)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in migrations]
        for p in migrations:
            sql(p.read_text())
        sql((ROOT / "tests/database/setup.sql").read_text())
        sql((ROOT / "tests/database/step05/setup.sql").read_text())
        sql("create role qi_test_worker login; grant qi_ingestion to qi_test_worker; "
            "create role qi_test_publisher login; grant qi_admin_server to qi_test_publisher; "
            "create role qi_test_readonly login; grant anon to qi_test_readonly;")
        report["postgres_version"] = sql("select version();").stdout.strip()
        (dest / "metadata.json").write_text(json.dumps(json.loads(sql(db.METADATA_SQL).stdout), indent=2) + "\n")
        report["checks"].append({"name": "fresh schema, restricted test logins and Unix socket", "result": "PASS"})
        env = {**db.ENV, "QI_TEST_PG_SOCKET": str(socket)}
        command = ["pnpm", "exec", "vitest", "run", "--config", "vitest.database.config.mts", "--reporter=json",
                   "--outputFile", str(dest / "node-tests.json")]
        actual = subprocess.run(command, cwd=ROOT, env=env, text=True, capture_output=True, timeout=180)
        report["command"] = command
        report["node_exit_code"] = actual.returncode
        report["node_stdout"] = actual.stdout
        report["node_stderr"] = actual.stderr
        report["checks"].append({"name": "actual node-postgres ingestion/public repository tests", "result": "PASS" if actual.returncode == 0 else "FAIL"})
    except Exception as error:
        report["error"] = str(error)
    finally:
        if created:
            label = db.command(db.DOCKER + ["inspect", "--format", '{{index .Config.Labels "io.licenseinsight.step05"}}', name], check=False)
            if label.returncode == 0 and label.stdout.strip() == run_id:
                # The image chowns its socket directory to postgres. Restore the
                # session-created bind directory's owner before removing it.
                ownership = db.command(db.DOCKER + ["exec", "--user", "0", name, "chown",
                    f"{os.getuid()}:{os.getgid()}", "/var/run/postgresql"], check=False)
                report["socket_owner_restored"] = ownership.returncode == 0
                removed = db.command(db.DOCKER + ["rm", "--force", name], check=False)
                report["cleanup"] = "PASS" if removed.returncode == 0 else "FAIL"
            else:
                report["cleanup"] = "REFUSED_LABEL_MISMATCH"
        if report["cleanup"] == "PASS":
            try:
                shutil.rmtree(socket)
                report["socket_cleanup"] = "PASS"
            except OSError:
                report["socket_cleanup"] = "FAIL"
                report["cleanup"] = "FAIL"
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
        report["exit_code"] = int(bool(report.get("error") or report.get("node_exit_code", 1) or report["cleanup"] != "PASS"))
        (dest / "ingestion-db.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"exit_code": report["exit_code"], "cleanup": report["cleanup"], "error": report.get("error")}))
    return report["exit_code"]


if __name__ == "__main__":
    raise SystemExit(main())
