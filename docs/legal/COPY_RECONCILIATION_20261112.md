# Copy-only evidence reconciliation

This offline, source-only tool supports L4 / issue #217. It checks supplied
source observations, independent destination observations and reported copy
attempts. It never reads Dropbox, copies files, registers documents or grants
access. No originals or directories are changed. Net database objects: zero.

Run `python3 scripts/legal_copy_reconciliation.py --input /private/input.json`.
Stdout contains aggregate counts only. Optional `--private-output` creates a
new 0600 file exclusively; existing files and symlinks are refused. Keep input,
private results and provider identifiers outside GitHub. This is an authorized
operator tool, not a browser response or a public count endpoint.

## Input contract

This is a proposed offline interchange format, not a D1 database/API contract.
The root has exactly `format`, `observed_at`, `listing_complete`, `sources`,
`destinations` and `receipts`. Format is
`ecc.legal-evidence.copy-reconciliation-input.v1`; time is a real UTC timestamp
in `YYYY-MM-DDTHH:MM:SSZ` format; completeness is an explicit boolean. Each
collection is bounded at 10,000 rows. Byte sizes are safe nonnegative integers;
unknown revision/hash is explicit null. Booleans are not numeric values.

- Source row: `source_id`, `source_revision`, `byte_size`,
  `dropbox_content_hash`, `sha256`.
- Destination row: `destination_id`, `destination_revision`, `byte_size`,
  `dropbox_content_hash`, `sha256`.
- Receipt row: `receipt_id`, positive `attempt`, `operation` (only `copy`),
  `status` (`pending`, `failed`, `verified`), both source fields, both destination
  fields, `byte_size`, `dropbox_content_hash`, `sha256`.

Source/destination identities must be provider file IDs (`id:...`), never paths
or folder labels. Both hashes are separate lowercase 64-hex fields. Dropbox's content hash uses
its block-hashing algorithm; it is not the ordinary SHA-256 of the full file.
See the [official content-hash reference](https://docs.dropboxapi.com/dropbox-api/docs/technical-reference/content-hash).
This tool compares reported values; it neither downloads bytes nor computes
those file-content hashes. The snapshot digest hashes canonical metadata only.

## Result semantics

`matching_copy_evidence` requires a reported verified receipt and matching
source/destination/receipt byte size and both hashes, known current revisions,
and the exact receipt references. A newer failed or pending attempt supersedes
an older success. Changed revisions/content, ambiguous attempt numbers and
destinations claimed by multiple sources conflict. Exact identity replays are
deduplicated; conflicting repeated identities and unknown sources reject the
input. Sources may never also be destinations.

`complete_copy_evidence` means every source in the supplied complete listing
has matching evidence and no orphan destination observation exists. Empty or
partial snapshots never qualify. It does not prove that a supplied observation
is genuine or fresh, that bytes were delivered, that confidential access is
protected, or that all real provider files were supplied. Exit zero means valid
input was evaluated, including incomplete/failed results; callers must inspect
the summary. Invalid input exits nonzero with a fixed, non-identifying error.

Every result keeps `can_copy` and `can_commit` false, all live-write counters
zero, and verified judgments zero. It is not a D1 verified delivery receipt and
must never be inserted as one. Missing source-to-matter/document mappings,
classification review, authenticated provider observations, independently
verified bytes, authorized D1 registration and confidential destination proof
remain gates. Folder names never establish any mapping or permission.

The existing candidate inventory contains nullable revisions and provider
content hashes; it does not supply full-file SHA-256 or independent copy
observations. Do not relabel that inventory as a completed reconciliation.

## Validation and rollback

Fourteen synthetic Python tests cover success, nulls/zero, both hash fields,
revision/content drift, retries, conflicts, copy-only behavior, partial/orphan
snapshots, malformed JSON and CLI privacy/output permissions. A unit-runner
bridge executes this suite in the existing `npm test` and fails if Python or
discovery fails. No new workflow, trigger, job, install, service or artifact.
The bounded subprocess adds a ten-second ceiling (normally below one second)
inside the existing job, with no vendor calls. No browser behavior changed.

Rollback removes the script, tests and this document. It has no production,
schema, folder or source-file rollback action.
