#!/usr/bin/env python3
"""Produce truthful ECC source/check evidence without printing scanned content."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

TOKENS = ("fetch(", "httpGet(", "queryFn", "useQuery", "supabase",
          "adapter", "endpoint", "VITE_API_BASE_URL")
SOURCE_ROOTS = ("src/", "server/", "shared/", "ecc-functions/")
ZERO_SHA = "0" * 40


def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


def changed_files(base, source, event):
    if base and base != ZERO_SHA:
        separator = "..." if event == "pull_request" else ".."
        result = subprocess.check_output(
            ["git", "diff", "--name-only", "-z", base + separator + source])
    else:
        result = subprocess.check_output(
            ["git", "ls-tree", "-r", "--name-only", "-z", source])
    return [p.decode("utf-8") for p in result.split(b"\0") if p]


def scan_scope(paths):
    """Terms identify review surfaces, not forbidden functionality or secrets."""
    rows = []
    for name in paths:
        if not name.startswith(SOURCE_ROOTS):
            continue
        path = Path(name)
        if path.is_symlink() or not path.is_file():
            continue
        if path.stat().st_size > 1024 * 1024:
            rows.append((name, "scan-size-limit", "REVIEW"))
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeError:
            rows.append((name, "non-text", "REVIEW"))
            continue
        for token in TOKENS:
            if token in content:
                rows.append((name, token, "REVIEW"))
    return rows


def run_checks(scripts):
    checks = {}
    install = subprocess.run(["npm", "ci"], check=False).returncode
    checks["install"] = {"status": "passed" if install == 0 else "failed",
                         "exit_code": install}
    for name in ("guardrail", "typecheck", "build"):
        if name not in scripts:
            checks[name] = {"status": "not_configured", "exit_code": None}
        elif install != 0:
            checks[name] = {"status": "not_run_install_failed", "exit_code": None}
        else:
            code = subprocess.run(["npm", "run", name], check=False).returncode
            checks[name] = {"status": "passed" if code == 0 else "failed",
                            "exit_code": code}
    # Guardrail and build are baseline requirements. Missing typecheck is
    # recorded as debt; it is NEVER reported as a successful typecheck.
    failed = install != 0 or any(c["status"] == "failed" for c in checks.values())
    failed = failed or any(checks[n]["status"] == "not_configured"
                           for n in ("guardrail", "build"))
    return checks, failed


def save(proof, paths, rows):
    Path("changed_files.txt").write_text(
        "".join(p + "\n" for p in paths), encoding="utf-8")
    Path("scan.tsv").write_text(
        "".join("\t".join(row) + "\n" for row in rows), encoding="utf-8")
    Path("ci_proof.json").write_text(
        json.dumps(proof, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    Path("ci_proof.txt").write_text(
        "ECC CI PROOF PACK\n" + json.dumps(proof, indent=2, sort_keys=True) + "\n",
        encoding="utf-8")


def main():
    env = os.environ
    proof = {
        "metadata": {
            "repo": env.get("GITHUB_REPOSITORY", ""),
            "branch": env.get("ECC_BRANCH", ""),
            "commit_sha": env.get("ECC_SOURCE_SHA", ""),
            "workflow_sha": env.get("GITHUB_SHA", ""),
            "base_sha": env.get("ECC_BASE_SHA", ""),
            "timestamp_utc": datetime.datetime.now(
                datetime.timezone.utc).isoformat(),
        },
        "scope_proof": {"diff_name_only": [], "file_hashes": {}},
        "scope_review": {"mode": "advisory", "tokens": list(TOKENS),
                         "per_file": {}, "is_secret_scan": False},
        "checks": {},
        "fe_build_proof": {"typecheck_exit_code": None,
                           "build_exit_code": None},
        "runtime_verified": False,
        "database_verified": False,
        "result": "incomplete",
    }
    paths, rows = [], []
    save(proof, paths, rows)
    try:
        source = git("rev-parse", "HEAD")
        expected = proof["metadata"]["commit_sha"]
        if not expected or source != expected:
            raise ValueError("checkout_source_sha_mismatch")
        paths = changed_files(proof["metadata"]["base_sha"], source,
                              env.get("GITHUB_EVENT_NAME", ""))
        rows = scan_scope(paths)
        proof["scope_proof"]["diff_name_only"] = paths
        for name in paths:
            # Never read env files, archives, caches, uploads or arbitrary
            # business documents. Hash only reviewed text implementation.
            if name.startswith(SOURCE_ROOTS) or name == "package.json":
                path = Path(name)
                if path.is_file() and not path.is_symlink():
                    proof["scope_proof"]["file_hashes"][name] = (
                        hashlib.sha256(path.read_bytes()).hexdigest())
        for name, token, state in rows:
            proof["scope_review"]["per_file"].setdefault(name, {})[token] = state
        scripts = json.loads(Path("package.json").read_text())["scripts"]
        proof["checks"], failed = run_checks(scripts)
        for name in ("typecheck", "build"):
            proof["fe_build_proof"][name + "_exit_code"] = (
                proof["checks"][name]["exit_code"])
        proof["result"] = "failed" if failed else "configured_checks_passed"
        save(proof, paths, rows)
        return 1 if failed else 0
    except Exception as exc:
        # Report type only; arbitrary exception text may include private data.
        proof["result"] = "failed"
        proof["error_type"] = type(exc).__name__
        save(proof, paths, rows)
        print("Proof generation failed; see redacted ci_proof.json.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
