import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "ci_proof_pack.py"
SPEC = importlib.util.spec_from_file_location("proof", SCRIPT)
proof = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(proof)


class ProofTests(unittest.TestCase):
    def test_install_failure_never_runs_checks(self):
        with patch.object(proof.subprocess, "run",
                          return_value=subprocess.CompletedProcess([], 9)) as run:
            checks, failed = proof.run_checks(
                {"guardrail": "x", "build": "x", "typecheck": "x"})
        self.assertTrue(failed)
        self.assertEqual(run.call_count, 1)
        self.assertEqual(checks["build"]["status"], "not_run_install_failed")
        self.assertIsNone(checks["build"]["exit_code"])

    def test_build_failure_is_job_failure(self):
        with patch.object(proof.subprocess, "run", side_effect=[
            subprocess.CompletedProcess([], n) for n in (0, 0, 2)
        ]):
            checks, failed = proof.run_checks({"guardrail": "x", "build": "x"})
        self.assertTrue(failed)
        self.assertEqual(checks["build"]["exit_code"], 2)

    def test_missing_typecheck_is_not_a_pass(self):
        with patch.object(proof.subprocess, "run",
                          return_value=subprocess.CompletedProcess([], 0)):
            checks, failed = proof.run_checks({"guardrail": "x", "build": "x"})
        self.assertFalse(failed)
        self.assertEqual(checks["typecheck"]["status"], "not_configured")
        self.assertIsNone(checks["typecheck"]["exit_code"])

    def test_missing_required_build_fails(self):
        with patch.object(proof.subprocess, "run",
                          return_value=subprocess.CompletedProcess([], 0)):
            checks, failed = proof.run_checks({"guardrail": "x"})
        self.assertTrue(failed)
        self.assertEqual(checks["build"]["status"], "not_configured")

    def in_repo(self, work):
        previous = Path.cwd()
        with tempfile.TemporaryDirectory() as root:
            try:
                os.chdir(root)
                subprocess.run(["git", "init", "-q"], check=True)
                subprocess.run(["git", "config", "user.email", "test@example.invalid"],
                               check=True)
                subprocess.run(["git", "config", "user.name", "Test"], check=True)
                Path("package.json").write_text(json.dumps({
                    "scripts": {"guardrail": "x", "build": "x"}}))
                subprocess.run(["git", "add", "package.json"], check=True)
                subprocess.run(["git", "commit", "-qm", "base"], check=True)
                return work()
            finally:
                os.chdir(previous)

    def test_checkout_mismatch_still_emits_failure_artifacts(self):
        def work():
            with patch.dict(os.environ, {"ECC_SOURCE_SHA": "f" * 40}, clear=True):
                self.assertEqual(proof.main(), 1)
            data = json.loads(Path("ci_proof.json").read_text())
            self.assertEqual(data["result"], "failed")
            self.assertEqual(data["error_type"], "ValueError")
            self.assertFalse(data["runtime_verified"])
            for name in ("ci_proof.txt", "changed_files.txt", "scan.tsv"):
                self.assertTrue(Path(name).is_file())
        self.in_repo(work)

    def test_real_diff_advisory_scan_and_json_null(self):
        def work():
            base = proof.git("rev-parse", "HEAD")
            Path("src").mkdir()
            Path("src/example.ts").write_text("const endpoint = 'adapter';")
            Path("docs").mkdir()
            Path("docs/example.md").write_text("supabase adapter endpoint")
            subprocess.run(["git", "add", "."], check=True)
            subprocess.run(["git", "commit", "-qm", "changes"], check=True)
            head = proof.git("rev-parse", "HEAD")
            env = {"ECC_SOURCE_SHA": head, "ECC_BASE_SHA": base,
                   "GITHUB_EVENT_NAME": "pull_request", "GITHUB_SHA": "merge-sha"}
            with patch.dict(os.environ, env, clear=True), patch.object(
                proof, "run_checks",
                return_value=({
                    "install": {"status": "passed", "exit_code": 0},
                    "guardrail": {"status": "passed", "exit_code": 0},
                    "build": {"status": "passed", "exit_code": 0},
                    "typecheck": {"status": "not_configured", "exit_code": None},
                }, False)
            ):
                self.assertEqual(proof.main(), 0)
            data = json.loads(Path("ci_proof.json").read_text())
            self.assertEqual(data["metadata"]["commit_sha"], head)
            self.assertEqual(data["metadata"]["workflow_sha"], "merge-sha")
            self.assertEqual(data["checks"]["typecheck"]["status"], "not_configured")
            self.assertIsNone(data["fe_build_proof"]["typecheck_exit_code"])
            self.assertNotIn("docs/example.md",
                             data["scope_review"]["per_file"])
            self.assertIn("src/example.ts", data["scope_review"]["per_file"])
            self.assertNotIn("const endpoint", Path("ci_proof.txt").read_text())
        self.in_repo(work)


if __name__ == "__main__":
    unittest.main()

