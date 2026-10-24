#!/usr/bin/env python3
"""Offline M0 audit checks only; never reads secrets or calls an API."""
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/reports/evidence"
OUTPUT = EVIDENCE / "m0-validation.json"
ALLOWED_BASELINE_CHANGES = {
    "README.md", "state/APPROVALS.md", "state/BLOCKERS.md",
    "state/DECISIONS.md", "state/EVIDENCE_INDEX.md", "state/PROJECT_STATUS.md",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args, stdin=None):
    return subprocess.run(["git", *args], cwd=ROOT, input=stdin,
                          capture_output=True, text=True, check=False)


def main():
    checks = []

    def record(name, passed, detail):
        checks.append({"check": name, "result": "PASS" if passed else "FAIL",
                       "detail": detail})

    files = [p for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts
             and p != OUTPUT and "__pycache__" not in p.parts]
    # Do not open local env/auth files, even if someone adds them later.
    forbidden = [p.relative_to(ROOT).as_posix() for p in files
                 if (p.name.startswith(".env") and p.name != ".env.example")
                 or ".auth" in p.relative_to(ROOT).parts]
    record("secret_files_absent_from_audit_input", not forbidden,
           {"excluded_file_names": forbidden})
    safe_files = [p for p in files if p.relative_to(ROOT).as_posix() not in forbidden]
    texts = {}
    utf_errors = []
    for p in safe_files:
        try:
            texts[p] = p.read_text(encoding="utf-8")
            if "\ufffd" in texts[p]:
                utf_errors.append(p.relative_to(ROOT).as_posix())
        except UnicodeError:
            utf_errors.append(p.relative_to(ROOT).as_posix())
    record("utf8_no_replacement_characters", not utf_errors, utf_errors)

    baseline = dict(re.findall(r"\|`([^`]+)`\|`([0-9a-f]{64})`\|",
                               (ROOT / "CHECKSUMS.md").read_text()))
    missing, changed, preserved = [], [], []
    for rel, expected in baseline.items():
        p = ROOT / rel
        if not p.is_file():
            missing.append(rel)
        elif sha(p.read_bytes()) != expected:
            changed.append(rel)
        else:
            preserved.append(rel)
    unexpected = sorted(set(changed) - ALLOWED_BASELINE_CHANGES)
    record("package_baseline_preserved", len(baseline) == 64 and not missing and not unexpected,
           {"baseline_hash_count": len(baseline), "unchanged_hashed_files": len(preserved),
            "intentional_changes": sorted(changed), "missing": missing,
            "unexpected_changes": unexpected,
            "note": "CHECKSUMS.md excludes itself; ZIP byte comparison is recorded separately."})

    broken_links = []
    md_files = [p for p in texts if p.suffix == ".md"]
    for p in md_files:
        for target in re.findall(r"(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)", texts[p]):
            target = target.strip().strip("<>").split("#", 1)[0]
            if not target or re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target):
                continue
            resolved_target = (p.parent / target).resolve()
            # This run writes OUTPUT after collecting checks; its links are valid.
            if resolved_target != OUTPUT and not resolved_target.exists():
                broken_links.append({"file": p.relative_to(ROOT).as_posix(), "target": target})
    record("relative_markdown_links", not broken_links,
           {"markdown_files_checked": len(md_files), "broken": broken_links})

    json_errors, parsed = [], {}
    for p, content in texts.items():
        if p.suffix == ".json":
            try:
                parsed[p.name] = json.loads(content)
            except json.JSONDecodeError:
                json_errors.append(p.relative_to(ROOT).as_posix())
    record("evidence_json_syntax", not json_errors,
           {"checked": sorted(parsed), "invalid": json_errors})
    ready = parsed.get("three-qualification-readiness.json", {})
    targets = ready.get("targets", [])
    target_names = {t.get("requested_name") for t in targets}
    honest_targets = len(targets) == 3 and target_names == {"전기기사", "전기산업기사", "전기기능사"}
    honest_targets = honest_targets and all(
        t.get("official_source_code") is None and t.get("statistics_grade_crosswalk") is None
        and all(t.get(k) == "NOT_RUN" for k in ("code_verification", "schedule_verification",
                                                "statistics_verification", "official_comparison"))
        for t in targets)
    record("three_targets_keep_unknowns", honest_targets and
           ready.get("authenticated_api_requests_executed") == 0 and
           ready.get("publication_allowed") is False and
           ready.get("test_preparation", {}).get("executed") is False and
           ready.get("G0") == "BLOCKED",
           {"targets": sorted(target_names), "official_codes": "null", "api_tests": "NOT_RUN"})
    catalog = parsed.get("api-catalog.json", {})
    datasets = catalog.get("datasets", [])
    record("catalog_approval_authenticated_call_separation", len(datasets) == 3 and all(
        d.get("http_status") == 503 and d.get("public_spec_reconfirmed") is False
        and d.get("account_development_approval") == "UNKNOWN"
        and d.get("account_production_approval") == "UNKNOWN"
        and d.get("authenticated_call_status") == "NOT_RUN"
        and d.get("authenticated_calls_performed") == 0 for d in datasets),
        {"catalog": "BLOCKED_HTTP503", "account_approval": "UNKNOWN", "api_requests": 0})
    diagnostic = catalog.get("diagnostic", {})
    diagnostic_path = ROOT / diagnostic.get("raw_path", "missing")
    record("catalog_failure_body_hash", diagnostic_path.is_file() and
           sha(diagnostic_path.read_bytes()) == diagnostic.get("body_sha256"),
           {"kind": "network failure diagnostic, not official spec or API fixture"})

    patterns = {
        "github_token": r"(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{25,})",
        "private_key": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        "credential_query": r"[?&](?:serviceKey|ServiceKey|api_key|access_token)=[^&\s\"'`<>]+",
        "authorization_value": r"Authorization\s*:\s*(?:Bearer|Basic)\s+[A-Za-z0-9+/_.=-]{16,}",
        "database_password_url": r"postgres(?:ql)?://[^\s:/]+:[^\s@]+@",
    }
    findings = []
    for p, content in texts.items():
        for kind, pattern in patterns.items():
            for match in re.finditer(pattern, content):
                findings.append({"file": p.relative_to(ROOT).as_posix(), "kind": kind,
                                 "line": content.count("\n", 0, match.start()) + 1})
    record("limited_secret_pattern_scan", not findings,
           {"files_checked": len(texts), "findings_without_values": findings,
            "limitation": "Known patterns only; not proof that arbitrary secrets cannot exist."})
    template = (ROOT / ".env.example").read_text()
    values = dict(line.split("=", 1) for line in template.splitlines()
                  if line and not line.startswith("#") and "=" in line)
    record("template_key_blank_ads_off", values.get("DATA_GO_KR_SERVICE_KEY") == ""
           and values.get("ADS_ENABLED") == "false" and values.get("ANALYTICS_ENABLED") == "false",
           {"template_only": True, "runtime_guard_implemented": False})
    ignored = git("check-ignore", "--stdin", stdin=".env\n.env.local\n.env.production\n.auth/state.json\n")
    example = git("check-ignore", ".env.example")
    record("secret_file_gitignore", ignored.returncode == 0 and len(ignored.stdout.splitlines()) == 4
           and example.returncode == 1, {"secret_paths_ignored": 4, "example_not_ignored": example.returncode == 1})
    diff = git("diff", "--check")
    head = git("rev-parse", "--verify", "HEAD")
    status = git("status", "--porcelain=v1", "--untracked-files=all")
    record("git_scope", diff.returncode == 0 and head.returncode != 0
           and all(line.startswith("?? ") for line in status.stdout.splitlines()),
           {"branch": git("branch", "--show-current").stdout.strip(), "commit": None,
            "all_files_untracked": True, "file_count": len(status.stdout.splitlines()),
            "note": "Empty baseline: git diff cannot show untracked content; checksum and content checks supplement it."})
    record("m0_has_no_application_scaffold", not (ROOT / "package.json").exists(),
           {"product_tests": "NOT_RUN", "build": "NOT_RUN", "ui": "NOT_RUN", "db": "NOT_RUN"})
    failed = sum(c["result"] == "FAIL" for c in checks)
    result = {"checked_at_utc": datetime.now(timezone.utc).isoformat(),
              "artifact_kind": "offline_document_audit_only", "checks": checks,
              "passed": len(checks) - failed, "failed": failed,
              "application_or_live_tests_executed": False}
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"audit_checks_passed": result["passed"], "audit_checks_failed": failed,
                      "application_or_live_tests": "NOT_RUN", "evidence": str(OUTPUT)}, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
