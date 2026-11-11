import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from legal_evidence_inventory import build_inventory, read_snapshot, InventoryError


def snapshot():
    root = '/SYNTHETIC PRIVATE LEGAL'
    def item(identifier, suffix, kind='file'):
        row = {'file_id': 'id:' + identifier, 'object_type': kind, 'name': suffix.rsplit('/', 1)[-1], 'path_display': root + '/' + suffix}
        if kind == 'file': row['file'] = {'size': 10}
        return row
    return {'format': 'ecc.legal-evidence.discovery.v1', 'root_path': root, 'observed_at': '2026-11-11T19:00:00Z',
            'listing_complete': True, 'source_workbook_ids': ['id:workbook'],
            'entries': [item('workbook', 'SOURCE.xlsx'), item('folder', 'PRIVATE MATTER', 'folder'),
                        item('evidence', 'PRIVATE MATTER/PRIVATE signed order.pdf')], 'file_metadata': {}}


def metadata():
    return {'id': 'id:evidence', 'size': 10, 'path_display': '/SYNTHETIC PRIVATE LEGAL/PRIVATE MATTER/PRIVATE signed order.pdf',
            'rev': 'synthetic-revision', 'content_hash': 'a' * 64}


class EvidenceInventoryTests(unittest.TestCase):
    def test_conflicting_root_metadata_paths_are_rejected(self):
        data = snapshot()
        data['root_metadata'] = {'id': 'id:root', 'name': 'SYNTHETIC PRIVATE LEGAL',
          'path_display': data['root_path'], 'sharing_info': {'parent_shared_folder_id': {'value': '123'}}}
        data['root_path'] = 'ns:123//SYNTHETIC PRIVATE LEGAL'
        data['root_metadata']['path'] = data['root_path']
        data['root_metadata']['path_lower'] = '/synthetic private legal'
        self.assertEqual(build_inventory(data)['summary']['candidate_evidence_files'], 1)
        for key, value in [('path', 'ns:999//UNRELATED ROOT'), ('path_lower', '/OUTSIDE/UNRELATED ROOT'), ('path', None)]:
            altered = copy.deepcopy(data); altered['root_metadata'][key] = value
            with self.assertRaises(InventoryError): build_inventory(altered)

    def test_listing_is_not_a_verified_or_complete_evidence_manifest(self):
        out = build_inventory(snapshot()); s = out['summary']
        self.assertEqual((s['file_entries'], s['excluded_source_workbooks'], s['candidate_evidence_files']), (2, 1, 1))
        self.assertFalse(s['complete_version_hash_manifest'])
        self.assertEqual((s['missing_revision_files'], s['missing_content_hash_files']), (1, 1))
        row = out['candidates'][0]
        self.assertTrue(row['restricted']); self.assertEqual(row['classification'], 'unreviewed')
        self.assertEqual(row['judgment_verification'], 'unverified')
        self.assertIsNone(row['legal_case_id']); self.assertEqual(row['source_case_folder_id'], 'id:folder')
        self.assertFalse(out['can_commit'])

    def test_version_hash_completeness_does_not_grant_access_or_verify_a_judgment(self):
        data = snapshot(); data['file_metadata']['id:evidence'] = metadata()
        out = build_inventory(data)
        self.assertTrue(out['summary']['complete_version_hash_manifest'])
        self.assertTrue(out['candidates'][0]['restricted'])
        self.assertEqual(out['summary']['verified_judgments'], 0)
        data['listing_complete'] = False
        self.assertFalse(build_inventory(data)['summary']['complete_version_hash_manifest'])

    def test_same_entry_replay_is_deduplicated_and_conflicting_identity_is_rejected(self):
        data = snapshot(); data['entries'].append(copy.deepcopy(data['entries'][-1]))
        out = build_inventory(data)
        self.assertEqual(out['summary']['candidate_evidence_files'], 1)
        self.assertEqual(out['summary']['replayed_entries'], 1)
        data['entries'][-1]['file']['size'] = 11
        with self.assertRaises(InventoryError): build_inventory(data)

    def test_same_path_with_different_provider_ids_is_not_silently_merged(self):
        data = snapshot(); row = copy.deepcopy(data['entries'][-1]); row['file_id'] = 'id:other'
        data['entries'].append(row)
        with self.assertRaises(InventoryError): build_inventory(data)

    def test_outside_root_prefix_traversal_and_url_paths_fail(self):
        for path in ['/SYNTHETIC PRIVATE LEGAL-OTHER/PRIVATE signed order.pdf',
                     '/SYNTHETIC PRIVATE LEGAL/../PRIVATE signed order.pdf', 'https://private.invalid/file.pdf']:
            data = snapshot(); data['entries'][-1]['path_display'] = path
            with self.assertRaises(InventoryError): build_inventory(data)

    def test_only_explicit_top_level_workbooks_can_be_excluded(self):
        for identifier in ['id:unknown', 'id:evidence', 'id:folder']:
            data = snapshot(); data['source_workbook_ids'] = [identifier]
            with self.assertRaises(InventoryError): build_inventory(data)

    def test_unmatched_or_changed_metadata_does_not_count_as_revision_proof(self):
        for field, value in [('id', 'id:other'), ('size', 11), ('path_display', '/SYNTHETIC PRIVATE LEGAL/OTHER.pdf'),
                             ('rev', ''), ('content_hash', 'not-a-hash')]:
            data = snapshot(); d = metadata(); d[field] = value; data['file_metadata']['id:evidence'] = d
            with self.assertRaises(InventoryError): build_inventory(data)

    def test_missing_folder_in_partial_listing_is_unresolved_not_inferred(self):
        data = snapshot(); data['listing_complete'] = False; data['entries'].pop(1)
        out = build_inventory(data)
        self.assertIsNone(out['candidates'][0]['source_case_folder_id'])
        self.assertEqual(out['summary']['unresolved_source_folder_files'], 1)

    def test_identity_and_manifest_are_deterministic_under_entry_order(self):
        data = snapshot(); reversed_data = copy.deepcopy(data); reversed_data['entries'].reverse()
        self.assertEqual(build_inventory(data), build_inventory(reversed_data))

    def test_snapshot_key_covers_folder_observations_not_only_candidates(self):
        before = snapshot(); after = copy.deepcopy(before)
        after['entries'].append({'file_id': 'id:empty', 'object_type': 'folder', 'name': 'EMPTY',
                                 'path_display': '/SYNTHETIC PRIVATE LEGAL/PRIVATE MATTER/EMPTY'})
        self.assertNotEqual(build_inventory(before)['snapshot_key'], build_inventory(after)['snapshot_key'])

    def test_non_finite_json_and_bad_modified_metadata_are_rejected(self):
        data = snapshot(); data['entries'][-1]['modified_time'] = float('inf')
        with self.assertRaises(InventoryError): build_inventory(data)
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'source.json'; p.write_text('{"number": 1e400}')
            with self.assertRaises(InventoryError): read_snapshot(p)

    def test_namespace_is_preserved_with_explicit_root_metadata_alias(self):
        data = snapshot()
        data['root_metadata'] = {'id': 'id:root', 'name': 'SYNTHETIC PRIVATE LEGAL',
          'path_display': data['root_path'], 'sharing_info': {'parent_shared_folder_id': {'value': '123'}}}
        data['root_path'] = 'ns:123//SYNTHETIC PRIVATE LEGAL'
        for entry in data['entries']:
            entry['path'] = 'ns:123//' + entry.pop('path_display').lstrip('/')
        data['file_metadata']['id:evidence'] = metadata()
        inventory = build_inventory(data)
        self.assertTrue(inventory['candidates'][0]['path'].startswith('ns:123//'))
        self.assertEqual(inventory['summary']['candidate_evidence_files'], 1)
        data['root_metadata']['sharing_info']['parent_shared_folder_id']['value'] = '456'
        with self.assertRaises(InventoryError): build_inventory(data)

    def test_other_namespace_or_unmapped_display_alias_cannot_escape_scope(self):
        data = snapshot(); data['entries'][-1]['path_display'] = 'ns:123//SYNTHETIC PRIVATE LEGAL/PRIVATE MATTER/PRIVATE signed order.pdf'
        with self.assertRaises(InventoryError): build_inventory(data)
        data = snapshot(); data['root_path'] = 'ns:123//SYNTHETIC PRIVATE LEGAL'
        with self.assertRaises(InventoryError): build_inventory(data)

    def test_conflicting_alternative_paths_are_rejected_even_when_preferred_path_is_inside(self):
        for field, value in [('path', 'ns:999//OUTSIDE/PRIVATE signed order.pdf'),
                             ('path_lower', '/outside/private signed order.pdf'), ('path', None)]:
            data = snapshot(); data['entries'][-1][field] = value
            with self.assertRaises(InventoryError): build_inventory(data)
        data = snapshot(); d = metadata(); d['path_lower'] = '/outside/private signed order.pdf'
        data['file_metadata']['id:evidence'] = d
        with self.assertRaises(InventoryError): build_inventory(data)

    def test_consistent_alternative_paths_and_missing_modified_time_are_supported(self):
        data = snapshot(); entry = data['entries'][-1]; entry['path_lower'] = entry['path_display'].lower()
        data['file_metadata']['id:evidence'] = metadata()
        data['file_metadata']['id:evidence']['path_lower'] = metadata()['path_display'].lower()
        self.assertTrue(build_inventory(data)['summary']['complete_version_hash_manifest'])
        for value in [False, 0]:
            data = snapshot(); data['entries'][-1]['modified_time'] = value
            with self.assertRaises(InventoryError): build_inventory(data)

    def test_cli_output_is_aggregate_only_and_private_output_cannot_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'PRIVATE snapshot.json'; source.write_text(json.dumps(snapshot()))
            output = Path(tmp) / 'private.json'
            cmd = [sys.executable, 'scripts/legal_evidence_inventory.py', '--snapshot', str(source), '--private-output', str(output)]
            run = subprocess.run(cmd, text=True, capture_output=True, check=True)
            self.assertNotIn('PRIVATE', run.stdout + run.stderr)
            self.assertNotIn('id:evidence', run.stdout)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
            self.assertIn('PRIVATE MATTER', output.read_text())
            again = subprocess.run(cmd, text=True, capture_output=True)
            self.assertEqual(again.returncode, 2); self.assertNotIn('PRIVATE', again.stderr)


if __name__ == '__main__':
    unittest.main()
