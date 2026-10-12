"""Execute the workflow's actual Bash with hostile metadata."""
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/codex-ready-check.yml"
FIELDS = ("OBJECTIVE", "CONSTRAINTS", "SCOPE", "ACCEPTANCE_CHECKS", "DO_NOT_TOUCH")


def scripts(source):
    blocks = re.findall(r"^        run: \|\n((?:^          .*\n|^\n)+)", source, re.M)
    if len(blocks) != 3:
        raise AssertionError("Expected all three workflow Bash steps")
    return [re.sub(r"^          ", "", block, flags=re.M) for block in blocks]


class ReadyCheckTests(unittest.TestCase):
    def setUp(self):
        self.source = WORKFLOW.read_text()
        self.scripts = scripts(self.source)

    def test_inputs_are_environment_data(self):
        for script in self.scripts:
            self.assertNotIn("$" + "{{", script)
            subprocess.run(["bash", "-n"], input=script, text=True, check=True)
        for field in FIELDS:
            self.assertRegex(self.source, re.compile(rf"^      {field}: \$\{{\{{ inputs\.", re.M))
        self.assertIn("    timeout-minutes: 5\n", self.source)

    def test_shell_payloads_are_preserved_without_execution(self):
        with tempfile.TemporaryDirectory() as folder:
            marker = Path(folder) / "executed"
            summary = Path(folder) / "summary"
            tick = chr(96)
            payload = f'quotes "\'; $(touch {marker}); {tick}touch {marker}{tick}; $HOME\nsecond line'
            env = dict(os.environ, **dict.fromkeys(FIELDS, payload),
                       GITHUB_REPOSITORY="Altus-Realty-Group/ECC-APM",
                       GITHUB_REF_NAME="test", GITHUB_ACTOR="test",
                       GITHUB_STEP_SUMMARY=str(summary))
            results = [subprocess.run(["bash", "-e", "-o", "pipefail", "-c", script],
                                      env=env, text=True, capture_output=True)
                       for script in self.scripts]
            for result in results:
                self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse(marker.exists(), "metadata executed as shell code")
            self.assertEqual(summary.read_text().count(payload), len(FIELDS))
            self.assertEqual(results[2].stdout.count(payload), len(FIELDS))

    def test_each_required_field_rejects_blank_whitespace(self):
        for field in FIELDS:
            for blank in ("", " ", "\t\n"):
                with self.subTest(field=field, blank=blank):
                    env = dict(os.environ, **dict.fromkeys(FIELDS, "present"))
                    env[field] = blank
                    result = subprocess.run(["bash", "-c", self.scripts[0]],
                                            env=env, text=True, capture_output=True)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn(f"{field} is required", result.stdout)


if __name__ == "__main__":
    unittest.main()
