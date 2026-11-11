"""Compare private legal intake previews without importing or approving records.

Stdout is aggregate-only. An optional NEW 0600 file contains the private review
plan. This tool has no network/database client, commit action or legal authority.
"""
import argparse
from collections import Counter
import json
import math
from pathlib import Path
import re

from legal_import_preview import (
    MATTER_HEADERS, REQUEST_HEADERS, MONEY_HEADERS, PreviewError,
    canonical, cents, digest, normalized, optional, snapshot_count, write_private,
)


class ReconciliationError(ValueError):
    """Only fixed, non-sensitive messages may leave this boundary."""


def require(condition, message):
    if not condition:
        raise ReconciliationError(message)


def sha(value):
    return isinstance(value, str) and re.fullmatch(r'[0-9a-f]{64}', value) is not None


def validate_json_tree(value, depth=0):
    require(depth <= 40, 'Source structure requires review')
    if isinstance(value, dict):
        require(all(isinstance(k, str) for k in value), 'Invalid source structure')
        for child in value.values():
            validate_json_tree(child, depth + 1)
    elif isinstance(value, list):
        for child in value:
            validate_json_tree(child, depth + 1)
    else:
        require(value is None or isinstance(value, (str, bool, int, float)), 'Invalid source value')
        require(not isinstance(value, float) or math.isfinite(value), 'Non-finite source number')


def validated_records(preview):
    validate_json_tree(preview)
    require(isinstance(preview, dict) and preview.get('format') == 'ecc.legal-intake.preview.v1',
            'Unsupported preview format')
    namespace = preview.get('source_namespace')
    require(isinstance(namespace, str) and re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}', namespace),
            'Invalid source namespace')
    files = preview.get('source_hashes')
    require(isinstance(files, dict) and set(files) == {'master', 'requirements'} and all(sha(v) for v in files.values()),
            'Invalid source file receipts')
    records, matters, locations = {}, {}, set()
    for kind, collection, headers in [('matter', 'matters', MATTER_HEADERS), ('requirement', 'requirements', REQUEST_HEADERS)]:
        rows = preview.get(collection)
        require(isinstance(rows, list), 'Missing source collection')
        for item in rows:
            require(isinstance(item, dict), 'Invalid source record')
            allowed = ({'source_key', 'source_case_id', 'legal_case_id', 'source_row', 'provenance',
                        'proposed_lifecycle', 'judgment_verification', 'unverified_amounts_cents',
                        'source_docket', 'source_court', 'source_creditor', 'file_count_snapshot'} if kind == 'matter'
                       else {'source_key', 'source_matter_key', 'source_case_id', 'source_row', 'provenance',
                             'assignee_id', 'due_at', 'sent_at', 'proposed_state'})
            require(set(item) == allowed, 'Source record mapping requires review')
            key, case_id, row = item.get('source_key'), item.get('source_case_id'), item.get('source_row')
            require(isinstance(case_id, str) and bool(case_id.strip()) and case_id == case_id.strip(),
                    'Invalid source case identity')
            require(isinstance(row, dict) and set(row) == set(headers), 'Source mapping requires review')
            require(all(value is None or isinstance(value, (str, int, float, bool)) for value in row.values()),
                    'Nested source cells require review')
            require(isinstance(row['Case ID'], str) and row['Case ID'].strip() == case_id, 'Source case identity mismatch')
            if kind == 'matter':
                expected_key = digest([namespace, kind, case_id])
                require(case_id not in matters, 'Duplicate source matter identity')
                require(item.get('legal_case_id') is None and item.get('proposed_lifecycle') == 'intake'
                        and item.get('judgment_verification') == 'unverified', 'Preview cannot establish legal authority')
                amounts = item.get('unverified_amounts_cents')
                require(isinstance(amounts, dict) and set(amounts) == set(MONEY_HEADERS), 'Invalid monetary mapping')
                for header in MONEY_HEADERS:
                    value = amounts[header]
                    require(value is None or type(value) is int, 'Invalid monetary representation')
                    try:
                        parsed = cents(row[header])
                    except PreviewError:
                        raise ReconciliationError('Monetary source requires review') from None
                    require(value == parsed, 'Monetary source mismatch')
                for derived, header in [('source_docket', 'Case number'), ('source_court', 'Court / jurisdiction'),
                                        ('source_creditor', 'Judgment creditor')]:
                    require(canonical(item[derived]) == canonical(optional(row[header])), 'Derived source field mismatch')
                try:
                    expected_count = snapshot_count(row['Files copied (snapshot)'])
                except (PreviewError, ValueError, TypeError, OverflowError):
                    raise ReconciliationError('Historical file count requires review') from None
                require(type(item['file_count_snapshot']) is int and item['file_count_snapshot'] == expected_count,
                        'Historical file-count source mismatch')
                matters[case_id] = key
            else:
                require(case_id in matters and item.get('source_matter_key') == matters[case_id],
                        'Unresolved source matter reference')
                description = row['Missing or unverified item']
                require(isinstance(description, str) and bool(description.strip()), 'Missing requirement description')
                expected_key = digest([namespace, kind, case_id, normalized(description), normalized(row['Request to'])])
                require(all(item.get(k) is None for k in ('assignee_id', 'due_at', 'sent_at'))
                        and item.get('proposed_state') == 'needs_review', 'Preview cannot assign or send work')
            require(sha(key) and key == expected_key, 'Source identity mismatch')
            identity = (kind, key)
            require(identity not in records, 'Duplicate source key')
            provenance = item.get('provenance')
            require(isinstance(provenance, list) and len(provenance) > 0, 'Missing row provenance')
            for source in provenance:
                require(isinstance(source, dict) and set(source) == {'file_sha256', 'worksheet', 'row_number', 'payload_sha256'},
                        'Invalid row provenance')
                sheet = source['worksheet']
                file_key = 'master' if sheet in ('Master Collections Register', 'Missing Documents - Tramel') else 'requirements'
                allowed_sheets = ('Master Collections Register',) if kind == 'matter' else ('Missing Documents - Tramel', 'Tramel Missing Records')
                require(sheet in allowed_sheets and source['file_sha256'] == files[file_key]
                        and source['payload_sha256'] == digest(row), 'Row provenance does not match source')
                require(type(source['row_number']) is int and source['row_number'] >= 2, 'Invalid source row position')
                location = (source['file_sha256'], sheet, source['row_number'])
                require(location not in locations, 'Duplicate source row provenance')
                locations.add(location)
            records[identity] = item
    return namespace, records


def provenance_key(item):
    return sorted(canonical(p) for p in item['provenance'])


def build_plan(current_preview, previous_preview=None):
    namespace, current = validated_records(current_preview)
    previous = {}
    if previous_preview is not None:
        prior_namespace, previous = validated_records(previous_preview)
        require(prior_namespace == namespace, 'Cannot reconcile different source namespaces')
    # A disappeared wording-derived key and a new key for the same matter are
    # ambiguous. Row positions/names are never used to auto-merge their identity.
    disappeared_requirement_cases = {v['source_case_id'] for (kind, key), v in previous.items()
                                      if kind == 'requirement' and (kind, key) not in current}
    quarantined_parent_cases = {
        after['source_case_id'] for identity, after in current.items()
        if identity[0] == 'matter' and identity in previous
        and normalized(previous[identity]['source_row']['Debtor / Matter']) != normalized(after['source_row']['Debtor / Matter'])
    }
    actions = []
    for identity in sorted(set(previous) | set(current)):
        kind, key = identity
        before, after = previous.get(identity), current.get(identity)
        if after is None:
            disposition = 'source_absent_review'
        elif kind == 'requirement' and after['source_case_id'] in quarantined_parent_cases:
            disposition = 'identity_review'
        elif before is None:
            disposition = ('identity_review' if kind == 'requirement'
                           and after['source_case_id'] in disappeared_requirement_cases else 'new_source_review')
        elif digest(before['source_row']) != digest(after['source_row']):
            caption_changed = kind == 'matter' and normalized(before['source_row']['Debtor / Matter']) != normalized(after['source_row']['Debtor / Matter'])
            disposition = 'identity_review' if caption_changed else 'revision_review'
        elif provenance_key(before) != provenance_key(after):
            disposition = 'provenance_refresh'
        else:
            disposition = 'replay'
        actions.append({'kind': kind, 'source_key': key, 'disposition': disposition,
                        'requires_review': disposition not in ('replay', 'provenance_refresh'),
                        'can_commit': False, 'previous': before, 'current': after})
    counts = Counter(a['disposition'] for a in actions)
    summary = {
        'current_matters': sum(kind == 'matter' for kind, _ in current),
        'current_requirements': sum(kind == 'requirement' for kind, _ in current),
        'previous_matters': sum(kind == 'matter' for kind, _ in previous),
        'previous_requirements': sum(kind == 'requirement' for kind, _ in previous),
        'replays': counts['replay'], 'provenance_refreshes': counts['provenance_refresh'],
        'new_source_reviews': counts['new_source_review'], 'revision_reviews': counts['revision_review'],
        'identity_reviews': counts['identity_review'], 'source_absent_reviews': counts['source_absent_review'],
        'requirements_with_multiple_sources': sum(len(v['provenance']) > 1 for (kind, _), v in current.items() if kind == 'requirement'),
        'unknown_monetary_cells': sum(value is None for (kind, _), row in current.items() if kind == 'matter'
                                      for value in row['unverified_amounts_cents'].values()),
        'explicit_zero_monetary_cells': sum(value == 0 for (kind, _), row in current.items() if kind == 'matter'
                                           for value in row['unverified_amounts_cents'].values()),
        'canonical_records_to_write': 0, 'verified_awards_created': 0, 'document_records_created': 0,
        'database_writes': 0, 'provider_calls': 0,
    }
    return {'format': 'ecc.legal-intake.reconciliation.v1', 'source_namespace': namespace,
            'comparison_only': True, 'can_commit': False,
            'plan_key': digest(['ecc.legal-intake.reconciliation.v1', previous_preview, current_preview]),
            'previous_preview_sha256': digest(previous_preview) if previous_preview is not None else None,
            'current_preview_sha256': digest(current_preview), 'summary': summary, 'actions': actions}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'Duplicate JSON object keys')
        result[key] = value
    return result


def read_preview(path):
    # Strict decoding: duplicate JSON fields and non-finite values are not facts.
    def invalid_constant(_value):
        raise ReconciliationError('Invalid JSON numeric constant')
    def finite_float(text):
        value = float(text)
        require(math.isfinite(value), 'Non-finite source number')
        return value
    return json.loads(Path(path).read_text(), object_pairs_hook=unique_object,
                      parse_constant=invalid_constant, parse_float=finite_float)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--current-preview', required=True)
    parser.add_argument('--previous-preview')
    parser.add_argument('--private-output', help='New 0600 review plan; never commit or share publicly')
    args = parser.parse_args()
    try:
        plan = build_plan(read_preview(args.current_preview), read_preview(args.previous_preview) if args.previous_preview else None)
        if args.private_output:
            write_private(args.private_output, plan)
        print(json.dumps({'format': plan['format'], 'summary': plan['summary']}, indent=2))
    except (ReconciliationError, OSError, ValueError, TypeError, KeyError, OverflowError):
        # Never echo filenames, cells, captions, links, source IDs or exception text.
        parser.exit(2, 'Reconciliation blocked: private source or output requires review\n')


if __name__ == '__main__':
    main()
