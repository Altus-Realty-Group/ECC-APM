import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from legal_import_preview import (build_preview, cents, MATTER_HEADERS, REQUEST_HEADERS,
                                  FOLDER_HEADERS, PreviewError, write_private)


class LegalPreviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.master, self.requests = self.root / 'master.xlsx', self.root / 'requests.xlsx'
        book = openpyxl.Workbook()
        matter = book.active; matter.title = 'Master Collections Register'
        matter.append(MATTER_HEADERS)
        matter.append(['TEMP-1', 'SYNTHETIC PRIVATE CAPTION', 'lead', None, 'NO', 'NOT CHECKED',
                       '', '', '', None, 0, '', 'unverified', 2, 'NOT READY',
                       'https://private.invalid/source', 'HIGH', 'SYNTHETIC PRIVATE NOTES'])
        req = book.create_sheet('Missing Documents - Tramel'); req.append(REQUEST_HEADERS)
        row = ['TEMP-1', 'SYNTHETIC PRIVATE CAPTION', 'Obtain operative order', 'Verify evidence',
               'Review queue', 'OPEN', 'HIGH', 'SYNTHETIC PRIVATE HINT', 'https://private.invalid/source']
        req.append(row)
        folder = book.create_sheet('Folder Evidence Inventory'); folder.append(FOLDER_HEADERS)
        folder.append(['SYNTHETIC PRIVATE CAPTION', 2, 'NO', 'YES', 'archive', None, 'unverified'])
        book.save(self.master); book.close()
        book = openpyxl.Workbook(); book.active.title = 'Tramel Missing Records'
        book.active.append(REQUEST_HEADERS); book.active.append(row)
        book.save(self.requests); book.close()

    def tearDown(self):
        self.tmp.cleanup()

    def preview(self, namespace='synthetic-intake', **kwargs):
        return build_preview(self.master, self.requests, namespace, **kwargs)

    def change(self, path, sheet, cell, value):
        book = openpyxl.load_workbook(path); book[sheet][cell] = value; book.save(path); book.close()

    def test_duplicate_request_retains_two_sources_but_creates_one_requirement(self):
        result = self.preview()
        self.assertEqual(result['summary']['unique_requirement_rows'], 1)
        self.assertEqual(result['summary']['duplicate_requirement_rows'], 1)
        self.assertEqual(len(result['requirements'][0]['provenance']), 2)
        self.assertIsNone(result['requirements'][0]['assignee_id'])
        self.assertIsNone(result['requirements'][0]['due_at'])

    def test_source_identity_is_stable_across_revisions_but_payload_hash_changes(self):
        before = self.preview()
        self.change(self.master, 'Master Collections Register', 'R2', 'Changed private source notes')
        after = self.preview()
        self.assertEqual(before['matters'][0]['source_key'], after['matters'][0]['source_key'])
        self.assertNotEqual(before['matters'][0]['provenance'][0]['payload_sha256'], after['matters'][0]['provenance'][0]['payload_sha256'])
        self.assertNotEqual(after['matters'][0]['source_key'], self.preview('another-source')['matters'][0]['source_key'])
        self.assertIsNone(after['matters'][0]['legal_case_id'])

    def test_blank_money_is_unknown_and_real_zero_is_preserved_without_award_posting(self):
        result = self.preview()
        values = result['matters'][0]['unverified_amounts_cents']
        self.assertEqual(list(values.values()), [None, 0, None])
        self.assertIsNone(result['summary']['verified_collectible_balance_cents'])
        self.assertEqual(result['summary']['verified_judgments_created'], 0)
        self.assertEqual(cents('$1,234.56'), 123456)
        for value in (True, 'bad', '1.001', 'NaN', 'Infinity', '$1$2', '1,2', '12,34.56'):
            with self.assertRaises(PreviewError): cents(value)

    def test_orphan_and_conflicting_requests_fail_without_private_cell_values(self):
        self.change(self.requests, 'Tramel Missing Records', 'D2', 'SYNTHETIC PRIVATE CHANGE')
        with self.assertRaises(PreviewError) as raised: self.preview()
        self.assertNotIn('SYNTHETIC', str(raised.exception))
        self.change(self.requests, 'Tramel Missing Records', 'A2', 'UNMATCHED')
        with self.assertRaises(PreviewError): self.preview()

    def test_duplicate_matter_id_and_formula_require_review(self):
        book = openpyxl.load_workbook(self.master)
        sheet = book['Master Collections Register']; sheet.append([cell.value for cell in sheet[2]])
        book.save(self.master); book.close()
        with self.assertRaises(PreviewError): self.preview()
        book = openpyxl.load_workbook(self.master); book['Master Collections Register'].delete_rows(3)
        book['Master Collections Register']['J2'] = '=100+20'; book.save(self.master); book.close()
        with self.assertRaises(PreviewError): self.preview()

    def test_folder_counts_are_snapshots_and_never_document_manifests(self):
        result = self.preview(reference_evidence_count=1)
        self.assertEqual(result['summary']['document_records_to_create'], 0)
        self.assertEqual(result['summary']['folder_summary_rows'], 1)
        self.assertIn('HISTORICAL_SNAPSHOT_DIFFERS_FROM_REFERENCE_INVENTORY', result['summary']['warnings'])

    def test_unmapped_data_or_formula_on_otherwise_empty_row_is_not_silently_dropped(self):
        for value in ('SYNTHETIC PRIVATE EXTRA', '=1+1'):
            self.change(self.master, 'Master Collections Register', 'S3', value)
            with self.assertRaises(PreviewError): self.preview()

    def test_cli_stdout_excludes_private_cells_even_in_unexpected_status_fields(self):
        self.change(self.master, 'Master Collections Register', 'E2', 'SYNTHETIC PRIVATE VALUE')
        for path, sheet in [(self.master, 'Missing Documents - Tramel'), (self.requests, 'Tramel Missing Records')]:
            self.change(path, sheet, 'F2', 'SYNTHETIC PRIVATE STATUS')
        run = subprocess.run([sys.executable, str(Path(__file__).resolve().parents[2] / 'scripts/legal_import_preview.py'),
                              '--master', str(self.master), '--requests', str(self.requests), '--source-namespace', 'synthetic'],
                             capture_output=True, text=True, check=True)
        self.assertNotIn('SYNTHETIC', run.stdout)
        self.assertNotIn('private.invalid', run.stdout)
        self.assertIn('UNRECOGNIZED', run.stdout)
        self.assertEqual(json.loads(run.stdout)['summary']['database_writes'], 0)

    def test_private_output_is_explicit_owner_only_and_cannot_overwrite(self):
        target = self.root / 'restricted.json'
        write_private(target, self.preview())
        self.assertEqual(os.stat(target).st_mode & 0o777, 0o600)
        with self.assertRaises(FileExistsError): write_private(target, {})


if __name__ == '__main__':
    unittest.main()
