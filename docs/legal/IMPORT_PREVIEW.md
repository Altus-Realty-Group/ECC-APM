# Offline legal workbook preview

This source-only operator tool prepares intake review. It does not call APIs,
write to Supabase, move files, create judgments, post payments or send requests.
It is separate from ECC browser/runtime dependencies.

Install the pinned offline-tool dependency in an appropriate local environment:

```bash
python3 -m pip install -r scripts/requirements-legal-preview.txt
```

Run an aggregate-only preview against authorized private source files:

```bash
python3 scripts/legal_import_preview.py --master master.xlsx --requests requests.xlsx --source-namespace altus-judgment-archive
```

Use the same logical namespace when reviewing later revisions of the same source.
Source hashes and exact row provenance change with revisions; temporary source
IDs are not permanent ECC case IDs. Existing source mappings and operator review
must resolve substantive requirement wording changes before a future import.

Default stdout contains counts, allowlisted status buckets, hashes and warnings;
it excludes captions, notes, debtor details and folder links. To review row-level
source data, explicitly provide `--private-output /authorized/private/preview.json`.
That file is created exclusively with owner-only POSIX permissions and cannot
overwrite an existing file. It contains restricted source data: do not commit,
upload into a public issue, or use it as a frontend fixture.

An optional `--reference-evidence-count` compares the historical workbook count
to a separately sourced reference. It never turns that reference into a live
provider inventory or creates document records. The retained November10aggregate
receipt uses206from the handoff; both workbook counts were207. The discrepancy is
deliberately unresolved pending fresh file-ID/version/hash reconciliation.

Validation:

```bash
python3 -m unittest discover -s tests/legal -v
```

Nine synthetic tests pass, covering cross-workbook deduplication/provenance,
namespaced matter identity and revision evidence, blank versus explicit zero,
strict currency syntax, orphan/conflicting requirements, duplicate IDs, formulas
and unmapped columns, snapshot-count warnings, aggregate privacy and private-file
permissions. The actual supplied files were also read:27matters,81unique requests
with dual provenance,81unknown monetary cells, no verified award/collectible
balance, and no provider/database writes. See SOURCE_IMPORT_PREVIEW_20261110.json.

This is the preview portion of issue215. Persisted staging/commit/revision
reconciliation remains dependent on the accepted native legal model and scoped
write contract in issue214. Do not interpret this tool's successful preview as
production import or legal verification.
