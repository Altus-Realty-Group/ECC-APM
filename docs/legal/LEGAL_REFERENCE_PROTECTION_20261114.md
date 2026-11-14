# L1 reference protection (ON DELETE RESTRICT) - proposal, 2026-11-14

Technical reference-preservation proposal. **It is not a legal retention determination**: it only stops the database from deleting or silently
rewriting a record that a legal row still points at. Source-only: nothing is applied, no live SQL, grant, credential, backfill or runtime binding.

Files: `docs/legal/schema/002_legal_reference_protection.proposal.sql`, `docs/legal/schema/002_legal_reference_protection.rollback.proposal.sql`;
proof `tests/legal-reference-protection-db/` (`npm run test:legal-reference-protection-db`). Stacked on the combined rehearsal
(`docs/database/COMBINED_LEGAL_DOCUMENTS_DB_REHEARSAL_20261112.md`, PR #238), which reproduced the problem. `001` and the D1 files are unchanged.

## Problem

1. `legal_cases.{property,unit,tenant,lease}_id` reference `id_uuid` with the catalog-verified `ON DELETE SET NULL`. 001's `legal_matter_guard` (revision
   compare-and-set) also fires for that referential UPDATE, so deleting a referenced parent fails `40001 stale or omitted revision` with an error that does not name the cause.
2. 001's `legal_matter_properties.unit_id` and `lease_id` are also `SET NULL`, under a `UNIQUE NULLS NOT DISTINCT (matter_id, property_id, unit_id, lease_id)`.
   Deleting a linked unit/lease rewrites the link to NULL and can collide (`23505`) with an existing property-only link: an accidental, implicit change to legal links.

## Change

The six references become `ON DELETE RESTRICT` (`legal_cases` property/unit/tenant/lease and `legal_matter_properties` unit/lease). A referenced parent can no longer be deleted
(`23503`, naming the constraint); nothing is nulled, merged or deleted implicitly.

Unchanged by design: `legal_matter_guard` and every revision check (no trigger-depth test, no exemption; the suite asserts the function text is byte-identical to 001);
the `NULLS NOT DISTINCT` unique; `legal_matter_properties.property_id` (already RESTRICT, only verified); roles, grants, RLS and policies. **Out of scope and still `SET NULL`:**
`legal_parties.tenant_id` (the delete rewrites a party row, not a revisioned matter or a unique link; a separate decision).

Constraints are identified by exact child column, target (`id_uuid` of the named parent) and action, never by name. The script validates all seven definitions first
(the six plus the link `property_id` RESTRICT) and refuses, changing nothing, on anything unexpected or ambiguous: a second FK on the column, a composite FK, a different
target or ON UPDATE action, DEFERRABLE, unvalidated, partition-child, or an unexpected current delete action (including "already RESTRICT": it is a one-time apply).
Names are preserved, so existing references to them keep working.

## Clearing a reference (explicit, revisioned, authorized)

- `legal_cases`: `UPDATE legal_cases SET property_id = NULL, ... , revision = revision + 1 WHERE id = ...` by the scoped runtime role. A missing, stale or skipped revision
  still fails `40001`; a caller outside the matter's scope updates 0 rows and cannot move a case into its own scope (`42501`).
- `legal_matter_properties`: `UPDATE ... SET unit_id = NULL` (scoped). If the result would duplicate another link of the same matter/property it fails `23505`; **a person resolves the
  duplicate; no script merges or deletes links.**
- After the references are cleared, the former parent deletes normally. An unreferenced parent always deletes normally.

## Apply order

`001_native_legal_foundation` first, then `002`, in the same maintenance window and before any runtime use of the legal tables. D1 is independent of both (its position does not matter; the
suite applies 001, D1, 002). 002 refuses if 001 is not installed. Until 002 is applied the 001 defect above is live, so **002 is a prerequisite for installing 001**, not an optional hardening.

## Rollback consequences

`002_legal_reference_protection.rollback.proposal.sql` restores `ON DELETE SET NULL` on the six references and nothing else. It is a partial cleanup, never a restore of data.

- **Order: roll back 002 before 001.** The reverse order works but leaves a **residual restriction**: after a lone 001 rollback the `legal_cases` references stay RESTRICT
  (referenced parents stay undeletable, unlike the original baseline) until 002's rollback runs, which then skips the already-dropped `legal_matter_properties`.
- **Populated refusal.** While 001's guard is installed, restoring SET NULL would bring the defect back, so the script refuses (nothing changes) if any of the four `legal_cases` references
  or `legal_matter_properties.unit_id/lease_id` is populated. Unlink first, using the revisioned/explicit paths above. Note the baseline legal rows usually carry populated references.
- **Guard gone.** If 001 was already rolled back, SET NULL is the baseline behaviour and is restored even with populated `legal_cases` references.
- **After 002 then 001 are rolled back,** the legal_cases references are the baseline `SET NULL` again; the other documented 001 residuals (columns, union case_type check, nullable case_number,
  RLS on, revoked anon/authenticated grants) remain as described in the 001 rollback header.
- **Rolling back 002 while 001 stays installed** (references empty) re-exposes the 001 defect for any later reference. That state should not be run in production.
- It refuses a definition it did not produce (not exactly the RESTRICT shape), so it cannot "restore" something 002 never applied.

## Proof (private PostgreSQL 16 reconstruction; local only)

Run on the corrected combined baseline (catalog-verified key shapes, relayed by Codex; reconstructed rows). Result on this head:

| Section | Checks |
| --- | --- |
| Main (001 + D1 + 002): RESTRICT on all six, 23503 and row preservation for every referenced parent, collision no longer produces an accidental SET NULL, NULLS NOT DISTINCT still enforced, unreferenced parents delete, missing/stale/skipped revisions fail 40001 (owner and scoped role), wrong-scope and no-context unlinking changes nothing, authorized revisioned unlink works, colliding link unlink refused, guard and everything else byte-identical | 21/21 |
| Negative controls (same suite must fail): half-applied link table, NO ACTION instead of RESTRICT, guard with a depth exemption, one `legal_cases` reference skipped | 4/4 |
| Existing combined suite (isolation, custody, constraints, baseline preservation) run with 002 applied in its legal step: exactly one check flips, the pinned former blocker | 2/2 |
| 002 apply refusals (duplicate FK, ON UPDATE CASCADE, already RESTRICT, DEFERRABLE, wrong target key, link property_id not RESTRICT, 001 missing, second apply) and unchanged-schema proof | 14/14 |
| Rollback: populated refusals, correct order, wrong-order residual, guard-gone case, never-applied refusal, 001 and D1 populated refusals unchanged with 002 applied | 16/16 |

`npm run test:legal-documents-db` (the #238 suite, which pins the former blocker) is unchanged and still passes.

## Not established

Installed or live behaviour; the live constraint names, deferrability and validation state of the six references (only catalog-verified columns, targets and the SET NULL action are relied on; the script
discovers names and refuses on any difference); `legal_parties.tenant_id`; lock duration on live tables (it takes ACCESS EXCLUSIVE on the two child tables; size and window are unmeasured); how application code
will surface `23503` to a user; whether product wants an unlink workflow with a journal entry; scope mapping, backfill and credentials; any legal-retention requirement.
