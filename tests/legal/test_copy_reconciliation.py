import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from legal_copy_reconciliation import reconcile, read_input, ReconciliationError


def fixture():
    common = {'byte_size': 0, 'dropbox_content_hash': 'a' * 64, 'sha256': 'b' * 64}
    return {'format': 'ecc.legal-evidence.copy-reconciliation-input.v1', 'observed_at': '2026-11-12T20:00:00Z', 'listing_complete': True,
        'sources': [{'source_id': 'id:PRIVATE-source', 'source_revision': 's1', **common}],
        'destinations': [{'destination_id': 'id:PRIVATE-copy', 'destination_revision': 'd1', **common}],
        'receipts': [{'receipt_id': 'PRIVATE-receipt', 'attempt': 1, 'operation': 'copy', 'status': 'verified',
            'source_id': 'id:PRIVATE-source', 'source_revision': 's1', 'destination_id': 'id:PRIVATE-copy', 'destination_revision': 'd1', **common}]}


class CopyReconciliationTests(unittest.TestCase):
    def test_matching_evidence_is_not_authority_or_a_write(self):
        out = reconcile(fixture())
        self.assertTrue(out['summary']['complete_copy_evidence'])
        self.assertEqual(out['summary']['matching_copy_evidence'], 1)
        for key in ('can_copy', 'can_commit', 'files_copied', 'files_moved', 'files_deleted', 'database_writes', 'verified_judgments'):
            self.assertFalse(out['summary'][key])

    def test_provider_hash_and_sha256_are_independent(self):
        data = fixture()
        data['destinations'][0]['sha256'] = data['sources'][0]['dropbox_content_hash']
        self.assertEqual(reconcile(data)['summary']['conflict'], 1)

    def test_missing_revision_or_either_hash_never_matches(self):
        for collection, key in [('sources', 'source_revision'), ('destinations', 'destination_revision'),
            ('sources', 'sha256'), ('sources', 'dropbox_content_hash'), ('destinations', 'sha256'), ('receipts', 'sha256')]:
            data = fixture(); data[collection][0][key] = None
            out = reconcile(data)['summary']
            self.assertFalse(out['complete_copy_evidence'], (collection, key))
            self.assertEqual(out['matching_copy_evidence'], 0)

    def test_changed_source_or_destination_revision_and_content_conflict(self):
        for collection, key, value in [('sources', 'source_revision', 's2'), ('destinations', 'destination_revision', 'd2'),
            ('destinations', 'dropbox_content_hash', 'c' * 64), ('receipts', 'byte_size', 1)]:
            data = fixture(); data[collection][0][key] = value
            self.assertEqual(reconcile(data)['summary']['conflict'], 1)

    def test_newer_failure_overrides_old_success_in_either_order(self):
        for reverse in (False, True):
            data = fixture(); later = {**data['receipts'][0], 'receipt_id': 'PRIVATE-later', 'attempt': 2, 'status': 'failed'}
            data['receipts'].append(later)
            if reverse: data['receipts'].reverse()
            out = reconcile(data)['summary']
            self.assertEqual(out['failed'], 1); self.assertEqual(out['matching_copy_evidence'], 0)

    def test_replay_is_idempotent_and_snapshot_order_is_stable(self):
        data = fixture(); original = reconcile(data)
        for key in ('sources', 'destinations', 'receipts'): data[key].append(copy.deepcopy(data[key][0]))
        replay = reconcile(data)
        self.assertEqual(replay['rows'], original['rows'])
        self.assertEqual(replay['snapshot_key'], original['snapshot_key'])
        self.assertEqual(replay['summary']['replayed_rows'], 3)
        for key in ('sources', 'destinations', 'receipts'): data[key].reverse()
        self.assertEqual(reconcile(data)['snapshot_key'], original['snapshot_key'])

    def test_conflicting_repeated_identity_is_rejected(self):
        for key, field in [('sources', 'source_revision'), ('destinations', 'destination_revision'), ('receipts', 'status')]:
            data = fixture(); data[key].append({**data[key][0], field: 'OTHER'})
            with self.assertRaises(ReconciliationError): reconcile(data)

    def test_same_attempt_under_distinct_ids_is_ambiguous(self):
        data = fixture(); data['receipts'].append({**data['receipts'][0], 'receipt_id': 'PRIVATE-other'})
        for rows in (data['receipts'], list(reversed(data['receipts']))):
            data['receipts'] = rows
            self.assertEqual(reconcile(data)['summary']['conflict'], 1)

    def test_sources_are_never_destinations_and_only_copy_is_accepted(self):
        for kind in ('move', 'delete', 'overwrite', None):
            data = fixture(); data['receipts'][0]['operation'] = kind
            with self.assertRaises(ReconciliationError): reconcile(data)
        data = fixture(); data['receipts'][0]['destination_id'] = data['sources'][0]['source_id']
        with self.assertRaises(ReconciliationError): reconcile(data)

    def test_destination_cannot_be_claimed_by_multiple_sources(self):
        data = fixture(); data['sources'].append({**data['sources'][0], 'source_id': 'id:PRIVATE-source2'})
        data['receipts'].append({**data['receipts'][0], 'source_id': 'id:PRIVATE-source2', 'receipt_id': 'PRIVATE-receipt2'})
        self.assertEqual(reconcile(data)['summary']['conflict'], 2)

    def test_partial_empty_or_orphan_snapshot_is_not_complete(self):
        data = fixture(); data['listing_complete'] = False
        self.assertFalse(reconcile(data)['summary']['complete_copy_evidence'])
        data = fixture(); data['destinations'].append({**data['destinations'][0], 'destination_id': 'id:PRIVATE-orphan'})
        self.assertFalse(reconcile(data)['summary']['complete_copy_evidence'])
        data = fixture(); data['receipts'] = []; data['destinations'] = []
        self.assertEqual(reconcile(data)['summary']['pending'], 1)
        data['sources'] = []
        self.assertFalse(reconcile(data)['summary']['complete_copy_evidence'])

    def test_unknown_source_or_malformed_input_is_refused(self):
        changes = [lambda d: d.update(listing_complete=1), lambda d: d.update(sources=[None]),
            lambda d: d.update(observed_at='2026-02-30T00:00:00Z'), lambda d: d['receipts'][0].update(attempt=True),
            lambda d: d['sources'][0].update(byte_size=True), lambda d: d['sources'][0].update(byte_size=-1),
            lambda d: d['receipts'][0].update(source_id='id:PRIVATE-unknown'), lambda d: d['sources'][0].update(sha256='bad'), lambda d: d['sources'][0].update(source_id='/PRIVATE/path.pdf')]
        for change in changes:
            data = fixture(); change(data)
            with self.assertRaises((ReconciliationError, ValueError)): reconcile(data)

    def test_cli_redacts_private_values_and_output_is_exclusive_owner_only(self):
        script = Path(__file__).resolve().parents[2] / 'scripts/legal_copy_reconciliation.py'
        with tempfile.TemporaryDirectory() as tmp:
            source, dest = Path(tmp) / 'input.json', Path(tmp) / 'private.json'
            source.write_text(json.dumps(fixture()))
            args = [sys.executable, str(script), '--input', str(source), '--private-output', str(dest)]
            result = subprocess.run(args, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            self.assertNotIn('PRIVATE', result.stdout + result.stderr)
            self.assertEqual(os.stat(dest).st_mode & 0o777, 0o600)
            original = dest.read_bytes()
            alias = Path(tmp) / 'alias.json'; alias.symlink_to(source)
            linked = subprocess.run([*args[:-1], str(alias)], capture_output=True, text=True)
            self.assertNotEqual(linked.returncode, 0); self.assertTrue(alias.is_symlink())
            result = subprocess.run(args, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0); self.assertEqual(dest.read_bytes(), original)
            source.write_text('{"PRIVATE-malformed": NaN}')
            result = subprocess.run(args, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0); self.assertNotIn('PRIVATE', result.stdout + result.stderr)

    def test_duplicate_json_keys_are_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / 'input.json'; p.write_text('{"format": "PRIVATE", "format": "OTHER"}')
            with self.assertRaises(ReconciliationError): read_input(p)


if __name__ == '__main__':
    unittest.main()
