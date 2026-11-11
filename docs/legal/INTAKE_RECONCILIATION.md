# Offline intake revision comparison

This extends the private preview from PR222 / issue215. It compares two source
observations and produces a review plan. It is not persisted staging, an approved
baseline, canonical identity matching or a database import. No API/database client,
commit action, automatic legal-state change or provider call exists in this tool.

Generate a private preview using the existing workbook tool, then compare it with
a retained previous preview of the same logical source namespace:

```bash
python3 scripts/legal_intake_reconciliation.py --current-preview /private/current.json --previous-preview /private/previous.json --private-output /private/new-review-plan.json
```

`--previous-preview` and `--private-output` are optional. Without a previous
preview, all input records require review. Stdout reports fixed aggregate counts
only. The optional new private plan is created exclusively with0600 permissions;
it preserves both complete before/after source records and their provenance.
Existing files and symlinks cannot be overwritten. Never commit private previews,
plans, source workbooks, names, captions or links to GitHub.

## Comparison rules

| Observation | Disposition | Consequence |
| --- | --- | --- |
| Same source key, payload and provenance | replay | No new canonical record or write |
| Same payload, revised file/row receipts | provenance_refresh | Retain changed observation; no duplicate matter/requirement |
| Same source key, changed payload | revision_review | Preserve before/after; no automatic overwrite |
| Reused matter ID with changed caption | identity_review, including child requirements | Require identity review; do not reuse previous person's requirements silently |
| Requirement wording/recipient key disappears while another appears for the same matter | identity_review plus source_absent_review | Do not assume a new obligation or merge by row position/name |
| Row no longer present | source_absent_review | Never delete/close the historical record automatically |
| New source key | new_source_review | Candidate source observation only, with no canonical ID |

The tool validates the known preview mapping, namespaced keys, payload receipts,
source-file references, parent links, nullable money and derived source fields.
It rejects duplicate keys/row receipts, non-finite numbers (including JSON1e400),
nested cell values and previews attempting to assign actors, deadlines, sends or
judgment verification. It ignores supplied summary labels when calculating its own
aggregate output. A file hash inside a preview is a claimed receipt, not a digital
signature or proof that the underlying workbook or legal fact is authentic.

All plan actions have `can_commit:false`. Replay/provenance refresh describes an
observation comparison; it does not approve an import. Temporary case IDs remain
namespaced source IDs. No native UUID is generated or inferred. Requirement
wording changes remain a private operator-review problem until an accepted,
persisted source crosswalk and protected write protocol exist.

Unknown monetary cells remain unknown, recorded zero stays zero, and money is
always an unverified source observation. Folder counts remain historical counts;
the207/206 discrepancy is not resolved by this comparison and no document records
are created. The original27/81 source aggregate remains separately retained; tests
use synthetic data, including deliberate zero-value cases, not private records.

Run `python3 -m unittest discover -s tests/legal -v`. Tests exercise actual preview
output, exact replay, row reordering/movement, changed fields and identities,
missing rows, dual provenance, malformed/tampered receipts, parent quarantine,
privacy and exclusive output. Installed import, live data, scoped authorization,
canonical source mappings and provider inventory remain unproven and disabled.

Rollback: revert this comparison-tool commit. Private review outputs are operator
custody files; reverting code does not delete them. No database rollback applies.
