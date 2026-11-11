# Native legal model (L1, issue #214)

Source-only design. Nothing here is installed. See [ADR-0001](adr/ADR-0001-native-legal-source-and-runtime-ownership.md).
Proposal SQL: `docs/legal/schema/001_native_legal_foundation.proposal.sql` (rollback: `...rollback.proposal.sql`).
Contracts: `shared/legal/contracts.ts`. No private captions, rows, links or documents appear in this repository.

## Grains and relationships

| Table | Grain | Key relationships |
| --- | --- | --- |
| `legal_cases` (reused) | one matter | scope_ref; docket identity (scope_ref, court_ref, docket_number) unique when known |
| `legal_parties` | one party in one matter (many per matter) | matter_id; optional tenants(id_uuid) |
| `legal_matter_properties` | one property/unit/lease link (many per matter) | matter_id; properties/units/leases `id_uuid` |
| `legal_awards` | one specific award | matter_id; amount_cents NULL = unknown; own verification + readiness |
| `legal_award_obligors` | one party liable on one award | no amount column; `matter_id` plus composite FKs force award and party into the same matter |
| `legal_evidence_requirements` | one requirement per matter | unique (matter_id, requirement_key) |
| `legal_evidence_refs` | one opaque evidence pointer | confidence (guarded, revisioned, journalled); optional requirement must be in the same matter; `restricted` masked unless `ecc.restricted_evidence=on` |
| `legal_source_links` | one external/legacy identifier | crosswalk only; never the matter key |
| `legal_case_events` | one journal entry (append-only) | dimension, actor, source, subject |

## Separate dimensions
Lifecycle (matter, `legal_cases.status`), judgment verification (award), collection readiness (award),
evidence confidence (evidence ref). No field is derived from another. Legacy `legal_cases.collection_status` remains for
compatibility; new readiness lives on the award.

## Resolved conflicts
* **Case types**: two overlapping CHECKs replaced by one union list; `collections` and `eviction_and_damages` become writable.
* **Docket identity**: `case_number` nullable and non-unique; unique key is (scope_ref, court_ref, docket_number).
* **Company authorization**: policies filter rows by `scope_ref` against a trusted, server-supplied transaction-local context;
  an empty context sees nothing. They do NOT authenticate or verify grants (the runtime role can set its own settings;
  proven as a documented limitation). Issuer verification, `scope_ref` to central-grant mapping (Codex, #211/#221) and
  per-transaction reset / pool isolation are activation gates, not part of this PR.
* **Money**: amount and currency both present or both absent in SQL and TypeScript; zero is a recorded zero; SQL caps amounts
  at `Number.MAX_SAFE_INTEGER` and readers reject anything larger instead of rounding.
* **UUID/integer crosswalks**: legal FKs use `id_uuid`; integer ids only in legacy staging and `legal_source_links.legacy_int_id`.
* **Legacy rows**: existing matters keep `scope_ref` NULL (invisible to the runtime role until a reviewed backfill). The 216 staging rows are not read or modified.

## Write protocol and journal visibility
* **Revisions**: a caller that read revision r writes revision r + 1. A write that omits the column or carries a stale value is
  rejected (SQLSTATE 40001). Direct table UPDATE remains the write path in this proposal; sanctioned write functions are a
  possible later hardening, not part of this PR.
* **Birth values**: awards are created `unverified` / `not_ready` and evidence references `unreviewed`, at revision 1; any later
  move is a guarded, journalled UPDATE. Initial matter lifecycle on INSERT is not journalled in this proposal.
* **Journal reads**: `evidence_confidence` journal rows are visible only to callers who can see the evidence reference itself, so
  restricted evidence changes are not exposed to unentitled callers in the same scope.
* **Property links** are unique on (matter, property, unit, lease) with NULLs treated as equal (PostgreSQL 15+).

## Rollback limits
`docs/legal/schema/001_native_legal_foundation.rollback.proposal.sql` is a guarded, PARTIAL cleanup. It refuses while any new
table holds rows. It removes the new tables, view, triggers, functions, runtime policies, runtime privileges and the role.
It retains: added columns and indexes, the union `case_type` check (the original conflicting pair is not recreated),
nullable `case_number` (global unique not recreated), the NOT VALID journal FK, enabled RLS, and the revoked
anon/authenticated/PUBLIC grants (not restored). The result is not the original schema or permissions. Role custody fails closed: the proposal
refuses to run if `ecc_legal_runtime` already exists (it never adopts a role), and the rollback uses explicit revokes on the
known legal objects only (no `DROP OWNED`). The rollback locks the new tables ACCESS EXCLUSIVE before counting rows and holds the locks through the drop. If the role owns anything, holds any other privilege, or has dependencies in
another database, the rollback raises and, run with `ON_ERROR_STOP`, changes nothing. Removing such a role is a human decision.

## Open blockers
1. scope_ref to central-grant mapping (needs Control Plane contract).
2. Runtime role credentials and server wiring (server uses service-role today; must move to `ecc_legal_runtime` in a separate PR).
3. Backfill of scope on existing matters; the 27 supplied matters remain unverified and the 81 blank money cells stay blank (no awards created).
4. Applying the migration (Codex/Dion), plus installed/live proof.

## Proof
Local isolated PostgreSQL 16: `npm run test:legal-db` (49 main checks plus 7 rollback checks). Contracts: `tests/unit/legal/*`. Live behaviour is unproven.
