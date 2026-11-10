"""Offline legal intake preview. No network/database writes or judgment postings.

Stdout is aggregate-only. Raw source rows appear only in an explicitly requested,
new private output file, created with owner-only permissions. Never commit that file.
"""
import argparse
from collections import Counter
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re

import openpyxl

MATTER_HEADERS = [
    'Case ID', 'Debtor / Matter', 'Matter classification', 'Order located (filename)',
    'Judgment verified?', 'Debtor identity confirmed?', 'Case number', 'Court / jurisdiction',
    'Judgment creditor', 'Original judgment ($)', 'Total payments ($)', 'Remaining balance ($)',
    'Collection status', 'Files copied (snapshot)', 'Evidence completeness', 'Dropbox folder URL',
    'Priority', 'Next action / notes',
]
REQUEST_HEADERS = ['Case ID', 'Debtor / matter', 'Missing or unverified item', 'Why required',
                   'Request to', 'Status', 'Priority', 'Evidence currently located', 'Folder URL']
FOLDER_HEADERS = ['Debtor / matter', 'Copied file count snapshot', 'Order filename known',
                  'Order needs verification', 'AppFolio historical source', 'Other source', 'Current evidence status']
MONEY_HEADERS = ['Original judgment ($)', 'Total payments ($)', 'Remaining balance ($)']


class PreviewError(ValueError):
    """Messages must not contain source cell values, names or file links."""


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def normalized(value):
    return re.sub(r'\s+', ' ', str(value or '').strip()).casefold()


def optional(value):
    return None if value is None or (isinstance(value, str) and not value.strip()) else value


def status_bucket(value, allowed):
    # Aggregate output must not echo arbitrary text placed in a status cell.
    text = normalized(value).upper()
    return text if text in allowed else 'UNRECOGNIZED'


def cents(value):
    value = optional(value)
    if value is None:
        return None
    if isinstance(value, bool):
        raise PreviewError('Boolean monetary cell requires review')
    text = str(value).strip()
    if not re.fullmatch(r'[+-]?\$?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?|\.\d{1,2})', text):
        raise PreviewError('Invalid monetary syntax requires review')
    try:
        amount = Decimal(text.replace('$', '').replace(',', ''))
    except InvalidOperation:
        raise PreviewError('Invalid monetary cell requires review') from None
    scaled = amount * 100
    if not scaled.is_finite() or scaled != scaled.to_integral_value() or abs(scaled) > 2**63 - 1:
        raise PreviewError('Unsupported monetary precision or range requires review')
    return int(scaled)


def snapshot_count(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value or value < 0:
        raise PreviewError('Invalid historical file-count cell')
    return int(value)


def sheet_rows(book, sheet_name, headers):
    if sheet_name not in book.sheetnames:
        raise PreviewError('Required source worksheet is missing')
    sheet = book[sheet_name]
    if [sheet.cell(1, i + 1).value for i in range(len(headers))] != headers:
        raise PreviewError('Source worksheet headers do not match the reviewed mapping')
    if any(sheet.cell(1, i).value is not None for i in range(len(headers) + 1, sheet.max_column + 1)):
        raise PreviewError('Unexpected source columns require mapping review')
    for row in sheet.iter_rows(min_row=2):
        values = [cell.value for cell in row[:len(headers)]]
        if any(cell.data_type in ('f', 'e') for cell in row):
            raise PreviewError('Formula or error cells require source review')
        if any(optional(cell.value) is not None for cell in row[len(headers):]):
            raise PreviewError('Unexpected source columns require mapping review')
        if all(optional(value) is None for value in values):
            continue
        yield row[0].row, dict(zip(headers, values))


def provenance(file_hash, sheet, row, payload):
    return {'file_sha256': file_hash, 'worksheet': sheet, 'row_number': row,
            'payload_sha256': digest(payload)}


def build_preview(master_path, requests_path, namespace, reference_evidence_count=None):
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}', namespace):
        raise PreviewError('A stable logical source namespace is required')
    paths = [Path(master_path), Path(requests_path)]
    hashes = [hashlib.sha256(path.read_bytes()).hexdigest() for path in paths]
    books = [openpyxl.load_workbook(path, data_only=False, read_only=False, keep_links=False) for path in paths]
    matters, requests, raw_request_count = {}, {}, 0
    warnings = []
    try:
        for number, row in sheet_rows(books[0], 'Master Collections Register', MATTER_HEADERS):
            temp_id = optional(row['Case ID'])
            if not isinstance(temp_id, str) or not temp_id.strip():
                raise PreviewError('Matter row has no source identifier')
            temp_id = temp_id.strip()
            if temp_id in matters:
                raise PreviewError('Duplicate temporary matter identifier requires review')
            amounts = {header: cents(row[header]) for header in MONEY_HEADERS}
            matters[temp_id] = {
                'source_key': digest([namespace, 'matter', temp_id]),
                'source_case_id': temp_id, 'legal_case_id': None,
                'source_row': row, 'provenance': [provenance(hashes[0], 'Master Collections Register', number, row)],
                'proposed_lifecycle': 'intake', 'judgment_verification': 'unverified',
                'unverified_amounts_cents': amounts,
                'source_docket': optional(row['Case number']),
                'source_court': optional(row['Court / jurisdiction']),
                'source_creditor': optional(row['Judgment creditor']),
                'file_count_snapshot': snapshot_count(row['Files copied (snapshot)']),
            }

        for book, file_hash, sheet in [(books[0], hashes[0], 'Missing Documents - Tramel'),
                                        (books[1], hashes[1], 'Tramel Missing Records')]:
            for number, row in sheet_rows(book, sheet, REQUEST_HEADERS):
                raw_request_count += 1
                temp_id = str(row['Case ID'] or '').strip()
                if temp_id not in matters:
                    raise PreviewError('Request has an unresolved source matter reference')
                if optional(row['Missing or unverified item']) is None:
                    raise PreviewError('Request has no evidence requirement description')
                key = digest([namespace, 'requirement', temp_id,
                              normalized(row['Missing or unverified item']), normalized(row['Request to'])])
                source = provenance(file_hash, sheet, number, row)
                if key in requests:
                    if digest(requests[key]['source_row']) != digest(row):
                        raise PreviewError('Conflicting versions of one requirement require review')
                    requests[key]['provenance'].append(source)
                else:
                    requests[key] = {'source_key': key, 'source_matter_key': matters[temp_id]['source_key'],
                                     'source_case_id': temp_id, 'source_row': row, 'provenance': [source],
                                     'assignee_id': None, 'due_at': None, 'sent_at': None,
                                     'proposed_state': 'needs_review'}

        folders = list(sheet_rows(books[0], 'Folder Evidence Inventory', FOLDER_HEADERS))
        folder_snapshot = sum(snapshot_count(row['Copied file count snapshot']) for _, row in folders)
        matter_snapshot = sum(row['file_count_snapshot'] for row in matters.values())
        if folder_snapshot != matter_snapshot:
            warnings.append('WORKBOOK_FILE_COUNT_SNAPSHOTS_DISAGREE')
        if reference_evidence_count is not None and reference_evidence_count != matter_snapshot:
            warnings.append('HISTORICAL_SNAPSHOT_DIFFERS_FROM_REFERENCE_INVENTORY')
        if any(normalized(row['source_row']['Judgment verified?']) in ('yes', 'true') for row in matters.values()):
            warnings.append('SOURCE_VERIFICATION_ASSERTION_REQUIRES_INDEPENDENT_EVIDENCE')

        summary = {
            'matter_rows': len(matters), 'unique_requirement_rows': len(requests),
            'input_requirement_rows': raw_request_count,
            'duplicate_requirement_rows': raw_request_count - len(requests),
            'requirements_with_multiple_sources': sum(len(row['provenance']) > 1 for row in requests.values()),
            'folder_summary_rows': len(folders), 'document_records_to_create': 0,
            'matter_file_count_snapshot': matter_snapshot, 'folder_file_count_snapshot': folder_snapshot,
            'reference_evidence_count': reference_evidence_count,
            'missing_monetary_cells': {header: sum(row['unverified_amounts_cents'][header] is None for row in matters.values()) for header in MONEY_HEADERS},
            'source_judgment_verification_counts': dict(Counter(status_bucket(row['source_row']['Judgment verified?'], {'YES','NO','NOT CHECKED','UNVERIFIED'}) for row in matters.values())),
            'source_requirement_status_counts': dict(Counter(status_bucket(row['source_row']['Status'], {'OPEN','CLOSED','COMPLETE','IN PROGRESS','REQUESTED','UNVERIFIED'}) for row in requests.values())),
            'missing_docket_rows': sum(row['source_docket'] is None for row in matters.values()),
            'missing_court_rows': sum(row['source_court'] is None for row in matters.values()),
            'missing_creditor_rows': sum(row['source_creditor'] is None for row in matters.values()),
            'verified_judgments_created': 0, 'verified_collectible_balance_cents': None,
            'database_writes': 0, 'provider_calls': 0, 'warnings': warnings,
        }
        return {'format': 'ecc.legal-intake.preview.v1', 'source_namespace': namespace,
                'source_hashes': {'master': hashes[0], 'requirements': hashes[1]},
                'summary': summary, 'matters': list(matters.values()), 'requirements': list(requests.values())}
    finally:
        for book in books:
            book.close()


def write_private(path, payload):
    # Refuse overwrites and symlinks; do not permit broad default filesystem modes.
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        json.dump(payload, stream, indent=2, ensure_ascii=True)
        stream.write('\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--master', required=True)
    parser.add_argument('--requests', required=True)
    parser.add_argument('--source-namespace', required=True)
    parser.add_argument('--reference-evidence-count', type=int)
    parser.add_argument('--private-output', help='New local file for restricted row-level review; never commit it')
    args = parser.parse_args()
    try:
        preview = build_preview(args.master, args.requests, args.source_namespace, args.reference_evidence_count)
        if args.private_output:
            write_private(args.private_output, preview)
        print(json.dumps({'format': preview['format'], 'source_hashes': preview['source_hashes'],
                          'summary': preview['summary']}, indent=2))
    except PreviewError as error:
        parser.exit(2, 'Preview blocked: ' + str(error) + '\n')
    except (OSError, ValueError, TypeError, KeyError):
        parser.exit(2, 'Preview blocked: source file or output cannot be processed safely\n')


if __name__ == '__main__':
    main()
