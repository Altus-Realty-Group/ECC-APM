import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from legal_import_preview import MATTER_HEADERS, REQUEST_HEADERS, MONEY_HEADERS, digest, normalized, write_private
from legal_intake_reconciliation import build_plan, read_preview, ReconciliationError


def preview(count=1):
    namespace = 'synthetic-private-review'
    result = {'format': 'ecc.legal-intake.preview.v1', 'source_namespace': namespace,
              'source_hashes': {'master': 'a' * 64, 'requirements': 'b' * 64},
              'summary': {'untrusted': 'PRIVATE SUMMARY MUST NOT ESCAPE'}, 'matters': [], 'requirements': []}
    for n in range(count):
        case = f'TEST-{n}'
        row = dict.fromkeys(MATTER_HEADERS)
        row.update({'Case ID': case, 'Debtor / Matter': 'PRIVATE SYNTHETIC CAPTION', 'Judgment verified?': 'NO',
                    'Dropbox folder URL': 'https://private.invalid', 'Total payments ($)': 0, 'Files copied (snapshot)': 2})
        matter_key = digest([namespace, 'matter', case])
        result['matters'].append({'source_key': matter_key, 'source_case_id': case, 'legal_case_id': None,
          'proposed_lifecycle': 'intake', 'judgment_verification': 'unverified', 'source_row': row,
          'source_docket': None, 'source_court': None, 'source_creditor': None, 'file_count_snapshot': 2,
          'unverified_amounts_cents': dict(zip(MONEY_HEADERS, [None, 0, None])),
          'provenance': [{'file_sha256': 'a' * 64, 'worksheet': 'Master Collections Register',
                          'row_number': n + 2, 'payload_sha256': digest(row)}]})
        for k in range(3):
            request = dict.fromkeys(REQUEST_HEADERS)
            request.update({'Case ID': case, 'Debtor / matter': 'PRIVATE SYNTHETIC CAPTION',
                            'Missing or unverified item': f'Requirement {k}', 'Request to': 'Unverified recipient'})
            item = {'source_key': digest([namespace, 'requirement', case, normalized(request['Missing or unverified item']),
                                          normalized(request['Request to'])]),
                    'source_case_id': case, 'source_matter_key': matter_key, 'source_row': request,
                    'assignee_id': None, 'due_at': None, 'sent_at': None, 'proposed_state': 'needs_review',
                    'provenance': [{'file_sha256': h * 64, 'worksheet': sheet, 'row_number': n * 3 + k + 2,
                                    'payload_sha256': digest(request)}
                                   for h, sheet in [('a', 'Missing Documents - Tramel'), ('b', 'Tramel Missing Records')]]}
            result['requirements'].append(item)
    return result


def resign(item):
    for p in item['provenance']:
        p['payload_sha256'] = digest(item['source_row'])


class ReconciliationTests(unittest.TestCase):
    def test_initial_synthetic_27_81_retains_dual_provenance_without_creating_records(self):
        current = preview(27)
        result = build_plan(current)
        s = result['summary']
        self.assertEqual((s['current_matters'], s['current_requirements'], s['requirements_with_multiple_sources']), (27, 81, 81))
        self.assertEqual(s['new_source_reviews'], 108)
        self.assertEqual(s['unknown_monetary_cells'], 54)
        self.assertEqual(s['explicit_zero_monetary_cells'], 27)
        for field in ['canonical_records_to_write', 'verified_awards_created', 'document_records_created', 'database_writes', 'provider_calls']:
            self.assertEqual(s[field], 0)
        self.assertFalse(result['can_commit'])
        self.assertTrue(all(not a['can_commit'] for a in result['actions']))
        self.assertEqual(sum(len(a['current']['provenance']) for a in result['actions'] if a['kind'] == 'requirement'), 162)

    def test_actual_preview_tool_output_flows_into_revision_comparison(self):
        from test_import_preview import LegalPreviewTests
        fixture = LegalPreviewTests()
        fixture.setUp()
        try:
            before = fixture.preview()
            self.assertEqual(build_plan(before, before)['summary']['replays'], 2)
            fixture.change(fixture.master, 'Master Collections Register', 'R2', 'PRIVATE UPDATED NOTE')
            after = fixture.preview()
            summary = build_plan(after, before)['summary']
            self.assertEqual(summary['revision_reviews'], 1)
            self.assertEqual(summary['provenance_refreshes'], 1)
        finally:
            fixture.tearDown()

    def test_exact_replay_is_deterministic_and_does_not_mutate_inputs(self):
        current = preview()
        original = copy.deepcopy(current)
        first = build_plan(current, current)
        self.assertEqual(first, build_plan(current, current))
        self.assertEqual(first['summary']['replays'], 4)
        self.assertEqual(first['summary']['new_source_reviews'], 0)
        self.assertEqual(current, original)

    def test_list_order_is_not_identity(self):
        before = preview(2)
        after = copy.deepcopy(before)
        after['matters'].reverse(); after['requirements'].reverse()
        self.assertEqual(build_plan(after, before)['summary']['replays'], 8)

    def test_file_revision_and_row_movement_refresh_provenance_without_new_identity(self):
        before = preview()
        after = copy.deepcopy(before)
        after['source_hashes']['master'] = 'c' * 64
        for item in after['matters'] + after['requirements']:
            for p in item['provenance']:
                if p['file_sha256'] == 'a' * 64:
                    p['file_sha256'] = 'c' * 64
                    p['row_number'] += 20
        plan = build_plan(after, before)
        self.assertEqual(plan['summary']['provenance_refreshes'], 4)
        self.assertEqual(plan['summary']['new_source_reviews'], 0)

    def test_changed_notes_are_reviewable_revisions_and_preserve_both_payloads(self):
        before = preview(); after = copy.deepcopy(before)
        item = after['matters'][0]
        item['source_row']['Next action / notes'] = 'PRIVATE CHANGED NOTE'
        resign(item)
        plan = build_plan(after, before)
        self.assertEqual(plan['summary']['revision_reviews'], 1)
        action = next(a for a in plan['actions'] if a['kind'] == 'matter')
        self.assertIsNone(action['previous']['source_row']['Next action / notes'])
        self.assertEqual(action['current']['source_row']['Next action / notes'], 'PRIVATE CHANGED NOTE')
        self.assertTrue(action['requires_review'])

    def test_reused_temporary_case_identity_never_replaces_the_existing_matter(self):
        before = preview(); after = copy.deepcopy(before)
        after['matters'][0]['source_row']['Debtor / Matter'] = 'DIFFERENT PRIVATE PERSON'
        resign(after['matters'][0])
        self.assertEqual(build_plan(after, before)['summary']['identity_reviews'], 4)
        self.assertTrue(all(a['requires_review'] for a in build_plan(after, before)['actions']))

    def test_changed_requirement_wording_or_recipient_is_quarantined_not_a_second_obligation(self):
        for field in ['Missing or unverified item', 'Request to']:
            with self.subTest(field=field):
                before = preview(); after = copy.deepcopy(before)
                item = after['requirements'][0]
                item['source_row'][field] = 'PRIVATE CHANGED REQUIREMENT'
                row = item['source_row']
                item['source_key'] = digest([after['source_namespace'], 'requirement', item['source_case_id'],
                                           normalized(row['Missing or unverified item']), normalized(row['Request to'])])
                resign(item)
                s = build_plan(after, before)['summary']
                self.assertEqual((s['identity_reviews'], s['source_absent_reviews'], s['new_source_reviews']), (1, 1, 0))
                self.assertEqual(s['canonical_records_to_write'], 0)

    def test_missing_source_rows_do_not_close_or_delete_a_requirement(self):
        before = preview(); after = copy.deepcopy(before); after['requirements'].pop()
        plan = build_plan(after, before)
        self.assertEqual(plan['summary']['source_absent_reviews'], 1)
        missing = next(a for a in plan['actions'] if a['disposition'] == 'source_absent_review')
        self.assertIsNotNone(missing['previous']); self.assertIsNone(missing['current'])
        self.assertFalse(missing['can_commit'])

    def test_namespace_duplicate_or_orphan_sources_fail_closed(self):
        bad = preview(); bad['source_namespace'] = 'another-source'
        duplicate = preview(); duplicate['requirements'].append(copy.deepcopy(duplicate['requirements'][0]))
        orphan = preview(); orphan['requirements'][0]['source_matter_key'] = 'c' * 64
        for current in [bad, duplicate, orphan]:
            with self.assertRaises(ReconciliationError): build_plan(current, preview())

    def test_tampered_payload_provenance_or_row_location_fail(self):
        for mutation in ['payload', 'receipt', 'position']:
            current = preview()
            item = current['requirements'][0]
            if mutation == 'payload': item['source_row']['Why required'] = 'PRIVATE UNRECEIPTED CHANGE'
            elif mutation == 'receipt': item['provenance'][0]['file_sha256'] = 'c' * 64
            else: item['provenance'][0]['row_number'] = True
            with self.assertRaises(ReconciliationError): build_plan(current)

    def test_preview_cannot_assign_deadline_actor_or_judgment_authority(self):
        for field, value in [('assignee_id', 'actor'), ('due_at', '2026-11-11'), ('sent_at', '2026-11-11')]:
            current = preview(); current['requirements'][0][field] = value
            with self.assertRaises(ReconciliationError): build_plan(current)
        current = preview(); current['matters'][0]['judgment_verification'] = 'verified'
        with self.assertRaises(ReconciliationError): build_plan(current)

    def test_bool_or_inconsistent_money_is_rejected_while_null_and_zero_stay_distinct(self):
        for value in [True, '0', 50]:
            current = preview(); current['matters'][0]['unverified_amounts_cents'][MONEY_HEADERS[1]] = value
            with self.assertRaises(ReconciliationError): build_plan(current)

    def test_json_duplicate_keys_or_non_finite_values_are_not_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'source.json'
            for text in ['{"format": 1, "format": 2}', '{"value": NaN}', '{"value": 1e400}']:
                p.write_text(text)
                with self.assertRaises(ReconciliationError): read_preview(p)

    def test_tampered_derived_fields_and_unknown_record_fields_cannot_appear_as_replays(self):
        for field, value in [('source_docket', 'CHANGED'), ('source_court', 'CHANGED'),
                             ('source_creditor', 'CHANGED'), ('file_count_snapshot', 900), ('new_field', 'CHANGED')]:
            current = preview(); current['matters'][0][field] = value
            with self.assertRaises(ReconciliationError): build_plan(current, preview())

    def test_non_finite_or_nested_source_cells_are_rejected_even_with_matching_receipts(self):
        for value in [float('inf'), float('nan'), {'nested': 'PRIVATE'}, ['PRIVATE']]:
            current = preview(); item = current['matters'][0]
            item['source_row']['Next action / notes'] = value
            resign(item)
            with self.assertRaises(ReconciliationError): build_plan(current)

    def test_cli_only_prints_counts_and_private_output_is_exclusive_0600(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'PRIVATE-source.json'; source.write_text(json.dumps(preview()))
            output = Path(tmp) / 'private-plan.json'
            command = [sys.executable, 'scripts/legal_intake_reconciliation.py', '--current-preview', str(source),
                       '--private-output', str(output)]
            run = subprocess.run(command, capture_output=True, text=True, check=True)
            self.assertNotIn('PRIVATE', run.stdout + run.stderr)
            self.assertNotIn('private.invalid', run.stdout + run.stderr)
            self.assertNotIn('source_key', run.stdout)
            self.assertEqual(os.stat(output).st_mode & 0o777, 0o600)
            self.assertIn('PRIVATE SYNTHETIC CAPTION', output.read_text())
            blocked = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(blocked.returncode, 2)
            self.assertNotIn('PRIVATE', blocked.stderr)
            self.assertEqual(json.loads(output.read_text())['format'], 'ecc.legal-intake.reconciliation.v1')

    def test_cli_errors_do_not_echo_private_filename_or_cell_value(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'PRIVATE-source.json'
            bad = preview(); bad['matters'][0]['source_row']['Next action / notes'] = 'PRIVATE WRONG HASH'
            source.write_text(json.dumps(bad))
            run = subprocess.run([sys.executable, 'scripts/legal_intake_reconciliation.py', '--current-preview', str(source)],
                                 capture_output=True, text=True)
            self.assertEqual(run.returncode, 2)
            self.assertNotIn('PRIVATE', run.stdout + run.stderr)


if __name__ == '__main__':
    unittest.main()
