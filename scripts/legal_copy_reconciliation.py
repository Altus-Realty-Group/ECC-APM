"""Offline COPY ONLY receipt reconciliation. No provider, database or copy client.

JSON observations are supplied evidence, not authenticated delivery or authority.
Stdout is aggregate-only; private rows require an explicit new owner-only file.
"""
import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re


class ReconciliationError(ValueError):
    pass


def require(ok):
    if not ok:
        raise ReconciliationError('Copy evidence requires review')


def text(value):
    return isinstance(value, str) and 0 < len(value) <= 128 and value.strip() == value and not any(ord(c) < 32 for c in value)


def provider_id(value):
    return text(value) and re.fullmatch(r'id:[A-Za-z0-9_-]+', value) is not None


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False)


def observation(row, kind):
    require(isinstance(row, dict))
    keys = {kind + '_id', kind + '_revision', 'byte_size', 'dropbox_content_hash', 'sha256'}
    require(set(row) == keys and provider_id(row[kind + '_id']))
    require(row[kind + '_revision'] is None or text(row[kind + '_revision']))
    require(type(row['byte_size']) is int and 0 <= row['byte_size'] <= 9007199254740991)
    for key in ('dropbox_content_hash', 'sha256'):
        require(row[key] is None or isinstance(row[key], str) and re.fullmatch('[0-9a-f]{64}', row[key]) is not None)
    return dict(row)


def unique(rows, key, parse):
    require(isinstance(rows, list) and len(rows) <= 10000)
    out, replays = {}, 0
    for value in rows:
        row = parse(value)
        identity = row[key]
        if identity in out:
            require(out[identity] == row)
            replays += 1
        else:
            out[identity] = row
    return out, replays


def receipt(row):
    require(isinstance(row, dict) and set(row) == {'receipt_id', 'attempt', 'operation', 'status', 'source_id', 'source_revision',
        'destination_id', 'destination_revision', 'byte_size', 'dropbox_content_hash', 'sha256'})
    require(text(row['receipt_id']) and provider_id(row['source_id']) and provider_id(row['destination_id']))
    require(type(row['attempt']) is int and row['attempt'] >= 1 and row['operation'] == 'copy')
    require(row['status'] in ('pending', 'failed', 'verified'))
    for key in ('source_revision', 'destination_revision'):
        require(row[key] is None or text(row[key]))
    observation({k: row[k] for k in ('destination_id', 'destination_revision', 'byte_size', 'dropbox_content_hash', 'sha256')}, 'destination')
    return dict(row)


def reconcile(data):
    require(isinstance(data, dict) and set(data) == {'format', 'observed_at', 'listing_complete', 'sources', 'destinations', 'receipts'})
    require(data['format'] == 'ecc.legal-evidence.copy-reconciliation-input.v1' and type(data['listing_complete']) is bool)
    require(isinstance(data['observed_at'], str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', data['observed_at']) is not None)
    datetime.fromisoformat(data['observed_at'].replace('Z', '+00:00'))
    sources, sr = unique(data['sources'], 'source_id', lambda row: observation(row, 'source'))
    destinations, dr = unique(data['destinations'], 'destination_id', lambda row: observation(row, 'destination'))
    receipts, rr = unique(data['receipts'], 'receipt_id', receipt)
    require(not set(sources).intersection(destinations))  # A retained source is never a copy destination.
    by_source = {key: [] for key in sources}
    destination_sources = {}
    for row in receipts.values():
        require(row['source_id'] in sources and row['destination_id'] not in sources)
        by_source[row['source_id']].append(row)
        destination_sources.setdefault(row['destination_id'], set()).add(row['source_id'])
    rows = []
    for key, source in sorted(sources.items()):
        attempts = by_source[key]
        state, dest_id = 'pending', None
        if attempts:
            latest = max(attempts, key=lambda row: row['attempt'])
            dest_id = latest['destination_id']
            dest = destinations.get(dest_id)
            ambiguous = len({r['attempt'] for r in attempts}) != len(attempts)
            shared = len(destination_sources[dest_id]) != 1
            if ambiguous or shared:
                state = 'conflict'
            elif latest['source_revision'] != source['source_revision']:
                state = 'conflict'
            elif latest['status'] != 'verified':
                state = latest['status']
            elif dest is None or any(source[k] is None or latest[k] is None or dest[k] is None
                    for k in ('dropbox_content_hash', 'sha256')) or source['source_revision'] is None or dest['destination_revision'] is None:
                state = 'incomplete'
            elif latest['destination_revision'] != dest['destination_revision'] or any(
                    source[k] != latest[k] or source[k] != dest[k] for k in ('byte_size', 'dropbox_content_hash', 'sha256')):
                state = 'conflict'
            else:
                state = 'matching_copy_evidence'
        rows.append({'source_id': key, 'destination_id': dest_id, 'state': state})
    counts = Counter(row['state'] for row in rows)
    orphans = len(set(destinations) - set(destination_sources))
    complete = bool(sources) and data['listing_complete'] and counts['matching_copy_evidence'] == len(sources) and orphans == 0
    summary = {'source_files': len(sources), 'destination_observations': len(destinations), 'receipt_attempts': len(receipts),
        'replayed_rows': sr + dr + rr, 'orphan_destination_observations': orphans, 'listing_complete': data['listing_complete'],
        **{k: counts[k] for k in ('matching_copy_evidence', 'pending', 'failed', 'incomplete', 'conflict')},
        'complete_copy_evidence': complete, 'can_commit': False, 'can_copy': False, 'verified_judgments': 0,
        'files_copied': 0, 'files_moved': 0, 'files_deleted': 0, 'database_writes': 0}
    normalized = {'observed_at': data['observed_at'], 'listing_complete': data['listing_complete'], 'sources': sorted(sources.values(), key=lambda r: r['source_id']),
        'destinations': sorted(destinations.values(), key=lambda r: r['destination_id']), 'receipts': sorted(receipts.values(), key=lambda r: r['receipt_id'])}
    return {'format': 'ecc.legal-evidence.copy-reconciliation.v1', 'snapshot_key': hashlib.sha256(canonical(normalized).encode()).hexdigest(),
        'summary': summary, 'rows': rows}


def read_input(path):
    def pairs(items):
        out = {}
        for key, value in items:
            require(key not in out)
            out[key] = value
        return out
    def invalid(_):
        raise ReconciliationError('Copy evidence requires review')
    return json.loads(Path(path).read_text(), object_pairs_hook=pairs, parse_constant=invalid)


def write_private(path, result):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.write(canonical(result) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--private-output')
    args = parser.parse_args()
    try:
        result = reconcile(read_input(args.input))
        if args.private_output:
            write_private(args.private_output, result)
        print(json.dumps({'format': result['format'], 'summary': result['summary']}, sort_keys=True))
    except (OSError, ValueError, TypeError, KeyError, OverflowError, RecursionError):
        parser.exit(2, 'Reconciliation blocked: private evidence or output requires review\n')


if __name__ == '__main__':
    main()
