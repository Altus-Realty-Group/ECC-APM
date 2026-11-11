# Legal evidence inventory and copy-only ECC gateway plan

Status: source preparation plus verified creation of the ECC app root and its
Production folder. No files have been copied, moved, deleted, shared, or
registered in a database by this work.

The full ownership/property layout and rollout sequence are documented in
[ECC app-folder layout](ECC_APP_FOLDER_LAYOUT_AND_ROLLOUT_20261111.md).

## Storage decision

Dion's November 11 instruction is COPY ONLY. Keep the existing legal folder,
its subfolders, files, and original locations intact. ECC will use separately
registered copies under Altus App Folder once delivery and access are proven.
The existing archive remains a retained source, including its source workbooks.
No source cleanup, relocation, or deletion is part of this plan.

The root directions name the company app-file standard. The reviewed version is
`ALTUS-APP-FILES-2026-09-20`, version 2.1, in
`Altus-Realty-Group/Altus-Realty-Group-altus-company-blueprints`, file
`ALTUS_APP_FOLDER_STORAGE.md`, commit
`890cee159d58a2aaed6dd67385e254b924513962`, blob
`5d410746937c23828dc3774989105c5c61cc40ad`.

The replacement ECC layout follows Dion's instruction to mirror Assets Under
Management: ECC/Production/Assets Under Management/<Ownership>/<Property>/
the five existing property sections. The full linked plan supersedes this
inventory's earlier canonical-category placement proposal. Source identities
and provenance remain separate registry metadata; folder labels do not prove
ownership or legal matter identity.

The ECC app root and its Production folder were created and listed successfully
on November 11. This proves folder creation, not a private document-delivery
binding or confidential access controls. A team-view master link is not proof
that confidential legal evidence is protected. Folder paths never confer authority.

## Read-only discovery receipt

Observed November 11, 2026 at 19:32:46 UTC through the Dropbox connector:

| Measurement | Count |
| --- | ---: |
| Immediate source entries | 31 |
| Immediate matter-folder candidates | 27 |
| Recursive entries, complete listing | 310 |
| Recursive folders | 99 |
| Files with distinct provider IDs | 211 |
| Top-level source workbooks | 4 |
| Other candidate evidence files | 207 |

The 207 is an evidence-inventory count, not a verified judgment count. All 211
files are within the proposed copy-intake coverage; excluding four workbooks
from the evidence count does not exclude them from preservation or intake.

One file revision was sampled. The available metadata did not expose content
hashes. The local validator therefore reports 206 candidates without a revision,
207 without a content hash, and an incomplete version/hash manifest. No native
case mapping, evidence classification, or judgment verification was performed.
Names, links, paths, IDs, and source rows are deliberately absent from this
public receipt.

## Source validator

`scripts/legal_evidence_inventory.py` consumes an explicitly supplied private
metadata snapshot. It has no provider client, copy executor, or database client.
It preserves provider namespaces, requires explicit metadata for a display-path
alias, and rejects conflicting alternate paths, conflicting identities, duplicate
JSON keys, nonfinite numbers, and path escapes. Identical replayed entries are
deduplicated. Only explicitly identified top-level source workbooks are excluded
from the evidence count.

Every candidate starts restricted and unreviewed, without a native case ID or
verified judgment. Missing revisions and hashes remain missing. Even a complete
metadata manifest does not establish legal truth, document authorization, or
successful delivery. A physical source-folder ID is provenance only.

The command emits aggregate JSON to stdout. A private manifest is written only
with an explicit new output path, owner-only permissions, and exclusive creation;
existing outputs cannot be overwritten. Input and manifests contain sensitive
metadata and must never be committed or attached to public PRs.

## Execution gates and acceptance

1. Register ECC's app-folder binding and prove actual private destination access
   plus app authorization before delivering confidential copies. Do not broaden
   the source folder or master-folder sharing.
2. Accept the Supabase document registry and governed scope mapping. Register
   the intake record, document IDs, immutable revisions, and source provenance.
   No invented matter identity or workbook amount becomes authoritative.
3. Complete the per-file revision, size, and checksum manifest. Detect changed
   source revisions and reconcile them before delivery; do not silently replace
   an accepted version.
4. Review an exact source-to-destination COPY plan covering all 211 files and
   folder provenance. Destination collisions require reconciliation, not
   overwrite. The plan must contain no move/delete operation.
5. Stage privately, deliver copies idempotently, and verify destination identity,
   revision, size, and checksum. Keep failed/pending delivery separate from
   verified delivery and from legal review status.
6. Bind the ECC document gateway to current authorization and registered,
   verified delivery references. Do not publish raw archive or master-folder
   links as the legal dashboard's authorization boundary.
7. Prove authorized, denied, revoked, missing, stale, and failed-delivery journeys.
   Confirm the original source IDs, locations, and bytes remain intact.

These gates are not satisfied by this inventory or by creating empty folders.
There is no live copy, registry write, access change, producer activation, or
gateway acceptance. Source rollback is reverting the PR. Removing the newly
created empty folders is a separate action requiring an explicit request; do
not delete them or any original folders automatically.

## Validation

Local Python suite: 26 tests, including the existing nine workbook preview tests.
The fresh private metadata snapshot also passed validation in memory; only its
aggregate summary was emitted. Hosted CI does not run this Python suite, and no
new CI workflow or paid service was introduced.
