"""Protect review evidence while regenerating the UI plan register; synthetic approvals only."""
import csv
from pathlib import Path
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / 'scripts/inventory-ui-review-register.py'
PLAN = (REPO / 'docs/ui-recovery/ECC_UI_RECOVERY_AND_REBUILD_PLAN.md').read_text()


class ReviewEvidenceTests(unittest.TestCase):
    def run_generator(self, root):
        subprocess.run(['python', str(SCRIPT)], cwd=root, check=True, capture_output=True)
        with (root / 'docs/ui-recovery/experience-review-register.csv').open() as handle:
            return list(csv.DictReader(handle))

    def fixture(self, root):
        folder = root / 'docs/ui-recovery'
        folder.mkdir(parents=True)
        (folder / 'ECC_UI_RECOVERY_AND_REBUILD_PLAN.md').write_text(PLAN)
        rows = self.run_generator(root)
        row = next(r for r in rows if r['design_id'] == 'CC01')
        row.update(approval='SYNTHETIC_APPROVAL', source_sha_and_evidence='fixture-source', dion_decision='synthetic-test-decision', codex_visual_review='SYNTHETIC_CODEX_PASS')
        with (folder / 'experience-review-register.csv').open('w', newline='') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)

    def test_unchanged_evidence_survives(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.fixture(root)
            row = next(r for r in self.run_generator(root) if r['design_id'] == 'CC01')
            self.assertEqual(row['approval'], 'SYNTHETIC_APPROVAL')
            self.assertEqual(row['codex_visual_review'], 'SYNTHETIC_CODEX_PASS')
            self.assertEqual(row['source_sha_and_evidence'], 'fixture-source')

    def test_changed_spec_requires_review_and_keeps_prior_decision(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.fixture(root)
            plan = root / 'docs/ui-recovery/ECC_UI_RECOVERY_AND_REBUILD_PLAN.md'
            plan.write_text(PLAN.replace('| CC01 / top full-width | Portfolio KPI cards |', '| CC01 / top full-width | Revised fixture panel |'))
            row = next(r for r in self.run_generator(root) if r['design_id'] == 'CC01')
            self.assertEqual(row['approval'], 'NOT APPROVED')
            self.assertEqual(row['codex_visual_review'], 'PENDING')
            self.assertIn('synthetic-test-decision', row['dion_decision'])
            self.assertEqual(row['source_sha_and_evidence'], 'fixture-source')

    def test_removed_object_remains_in_review_register(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name)
            self.fixture(root)
            plan = root / 'docs/ui-recovery/ECC_UI_RECOVERY_AND_REBUILD_PLAN.md'
            plan.write_text('\n'.join(line for line in PLAN.splitlines() if not line.startswith('| CC01 /')))
            row = next(r for r in self.run_generator(root) if r['design_id'] == 'CC01')
            self.assertEqual(row['approval'], 'REMOVAL NEEDS REVIEW')
            self.assertEqual(row['dion_decision'], 'synthetic-test-decision')


if __name__ == '__main__':
    unittest.main()
