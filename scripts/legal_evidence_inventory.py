"""Validate an authorized private metadata snapshot; never organize or verify files.

No provider client or database writes. Aggregate stdout only; an explicit new0600
output may hold the private candidate manifest. Names never establish authority.
"""
import argparse
from collections import Counter
from datetime import datetime
import json
import math
from pathlib import Path
import re
import unicodedata

from legal_import_preview import canonical, digest, write_private


class InventoryError(ValueError):
    """Errors must not contain private provider values."""


def require(condition):
    if not condition:
        raise InventoryError('Evidence metadata requires review')


def path_parts(value):
    require(isinstance(value, str) and unicodedata.normalize('NFC', value) == value
            and not any(ord(c) < 32 for c in value))
    match = re.fullmatch(r'ns:(\d+)//(.*)', value)
    if match:
        prefix, remainder = 'ns:' + match[1] + '//', match[2]
    else:
        require(value.startswith('/') and not value.startswith('//'))
        prefix, remainder = '/', value[1:]
    parts = remainder.rstrip('/').split('/')
    require(bool(parts) and all(part not in ('', '.', '..') for part in parts))
    return prefix, parts


def folder_path(value):
    prefix, parts = path_parts(value)
    return prefix + '/'.join(parts)


def relative_to(path, root):
    prefix, parts = path_parts(path)
    root_prefix, root_parts = path_parts(root)
    require(prefix == root_prefix and len(parts) > len(root_parts)
            and [p.casefold() for p in parts[:len(root_parts)]] == [p.casefold() for p in root_parts])
    return parts[len(root_parts):]


def append_path(root, parts):
    return root + '/' + '/'.join(parts)


def valid_id(value):
    return isinstance(value, str) and re.fullmatch(r'id:[A-Za-z0-9_-]+', value) is not None


def build_inventory(snapshot):
    require(isinstance(snapshot, dict) and snapshot.get('format') == 'ecc.legal-evidence.discovery.v1')
    root = folder_path(snapshot.get('root_path'))
    root_prefix, root_parts = path_parts(root)
    alias = None
    if root_prefix.startswith('ns:'):
        # Preserve the namespace. The explicit root metadata binds its namespace
        # to a display-path alias; never strip ns:<id>// or infer it by filename.
        root_meta = snapshot.get('root_metadata')
        require(isinstance(root_meta, dict) and valid_id(root_meta.get('id')))
        sharing = root_meta.get('sharing_info')
        require(isinstance(sharing, dict) and isinstance(sharing.get('parent_shared_folder_id'), dict)
                and sharing['parent_shared_folder_id'].get('value') == root_prefix[3:-2])
        alias = folder_path(root_meta.get('path_display'))
        require(path_parts(alias)[0] == '/' and root_meta.get('name') == root_parts[-1]
                and path_parts(alias)[1][-1] == root_parts[-1])
        for key in ('path_display', 'path', 'path_lower'):
            if key in root_meta:
                supplied = folder_path(root_meta[key])
                expected = root if path_parts(supplied)[0].startswith('ns:') else alias
                require(supplied.casefold() == expected.casefold())

    def canonical_path(value):
        path = folder_path(value)
        if path_parts(path)[0] == root_prefix:
            relative_to(path, root)
            return path
        require(alias is not None)
        return append_path(root, relative_to(path, alias))
    def checked_paths(record):
        paths = [canonical_path(record[key]) for key in ('path_display', 'path', 'path_lower') if key in record]
        require(bool(paths) and len({path.casefold() for path in paths}) == 1)
        return paths[0]

    observed_at = snapshot.get('observed_at')
    require(isinstance(observed_at, str))
    try:
        observed = datetime.fromisoformat(observed_at.replace('Z', '+00:00'))
    except ValueError:
        raise InventoryError('Evidence metadata requires review') from None
    require(observed.tzinfo is not None)
    require(type(snapshot.get('listing_complete')) is bool)
    entries, excluded, metadata = snapshot.get('entries'), snapshot.get('source_workbook_ids'), snapshot.get('file_metadata', {})
    require(isinstance(entries, list) and isinstance(excluded, list) and isinstance(metadata, dict))
    require(all(valid_id(i) for i in excluded) and len(set(excluded)) == len(excluded))
    by_id, by_path = {}, {}
    replayed_entries = 0
    for entry in entries:
        require(isinstance(entry, dict) and entry.get('object_type') in ('file', 'folder') and valid_id(entry.get('file_id')))
        path = checked_paths(entry)
        name = entry.get('name')
        require(isinstance(name, str) and name == path.rsplit('/', 1)[1])
        modified = entry.get('modified_time')
        require(modified is None or isinstance(modified, str))
        row = {'provider_id': entry['file_id'], 'kind': entry['object_type'], 'path': path, 'name': name,
               'modified_time': None if modified == '' else modified}
        if row['kind'] == 'file':
            size = entry.get('file', {}).get('size') if isinstance(entry.get('file'), dict) else None
            require(type(size) is int and size >= 0)
            row['size'] = size
        if row['provider_id'] in by_id:
            require(by_id[row['provider_id']] == row)
            replayed_entries += 1
            continue
        require(path.casefold() not in by_path)
        by_id[row['provider_id']] = row
        by_path[path.casefold()] = row
    for item_id in excluded:
        row = by_id.get(item_id)
        require(row is not None and row['kind'] == 'file' and len(relative_to(row['path'], root)) == 1
                and row['name'].lower().endswith('.xlsx'))
    # Extra/unmatched metadata is not silently treated as verified inventory.
    for item_id, detail in metadata.items():
        row = by_id.get(item_id)
        require(row is not None and row['kind'] == 'file' and isinstance(detail, dict) and detail.get('id') == item_id)
        require(detail.get('size') == row['size'] and type(detail.get('size')) is int)
        require(checked_paths(detail).casefold() == row['path'].casefold())
    candidates = []
    excluded_ids = set(excluded)
    for item_id, row in sorted(by_id.items()):
        if row['kind'] != 'file' or item_id in excluded_ids:
            continue
        detail = metadata.get(item_id, {})
        revision = detail.get('rev')
        require(revision is None or isinstance(revision, str) and bool(revision.strip()) and len(revision) <= 128)
        content_hash = detail.get('content_hash')
        require(content_hash is None or isinstance(content_hash, str) and re.fullmatch(r'[0-9a-f]{64}', content_hash))
        case_path = append_path(root, relative_to(row['path'], root)[:1])
        source_folder = by_path.get(case_path.casefold())
        source_folder_id = source_folder['provider_id'] if source_folder and source_folder['kind'] == 'folder' else None
        candidates.append({**row, 'provider_revision': revision, 'content_hash': content_hash,
                           'source_case_folder_id': source_folder_id, 'legal_case_id': None,
                           'classification': 'unreviewed', 'restricted': True,
                           'judgment_verification': 'unverified', 'observed_at': observed_at})
    counts = Counter(row['kind'] for row in by_id.values())
    missing_revision = sum(row['provider_revision'] is None for row in candidates)
    missing_hash = sum(row['content_hash'] is None for row in candidates)
    complete = snapshot['listing_complete'] and missing_revision == 0 and missing_hash == 0
    summary = {
        'listing_complete': snapshot['listing_complete'], 'unique_entries': len(by_id), 'replayed_entries': replayed_entries,
        'folder_entries': counts['folder'], 'file_entries': counts['file'], 'excluded_source_workbooks': len(excluded),
        'candidate_evidence_files': len(candidates), 'missing_revision_files': missing_revision, 'missing_content_hash_files': missing_hash,
        'unresolved_source_folder_files': sum(row['source_case_folder_id'] is None for row in candidates),
        'complete_version_hash_manifest': complete, 'mapped_legal_cases': 0, 'classified_evidence_files': 0,
        'verified_judgments': 0, 'files_moved': 0, 'files_deleted': 0, 'links_created': 0, 'database_writes': 0,
    }
    return {'format': 'ecc.legal-evidence.candidate-inventory.v1',
            'snapshot_key': digest([root, observed_at, snapshot['listing_complete'], sorted(excluded),
                                    sorted(by_id.values(), key=lambda row: row['provider_id']), candidates]),
            'summary': summary, 'can_commit': False, 'candidates': candidates}


def read_snapshot(path):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result)
            result[key] = value
        return result
    def invalid(_value):
        raise InventoryError('Evidence metadata requires review')
    def finite_float(value):
        parsed = float(value)
        require(math.isfinite(parsed))
        return parsed
    return json.loads(Path(path).read_text(), object_pairs_hook=pairs, parse_constant=invalid, parse_float=finite_float)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', required=True)
    parser.add_argument('--private-output')
    args = parser.parse_args()
    try:
        inventory = build_inventory(read_snapshot(args.snapshot))
        if args.private_output:
            write_private(args.private_output, inventory)
        print(json.dumps({'format': inventory['format'], 'summary': inventory['summary']}, indent=2))
    except (InventoryError, OSError, ValueError, TypeError, KeyError, OverflowError):
        parser.exit(2, 'Inventory blocked: private source or output requires review\n')


if __name__ == '__main__':
    main()
