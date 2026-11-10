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
| `legal_award_obligors` | one party liable on one award | no amount column, so joint liability cannot multiply an award |
| `legal_evidence_requirements` | one requirement per matter | unique (matter_id, requirement_key) |
| `legal_evidence_refs` | one opaque evidence pointer | confidence; `restricted` masked unless `ecc.restricted_evidence=on` |
| `legal_source_links` | one external/legacy identifier | crosswalk only; never the matter key |
| `legal_case_events` | one journal entry (append-only) | dimension, actor, source, subject |

## Separate dimensions
Lifecycle (matter, `legal_cases.status`), judgment verification (award), collection readiness (award),
evidence confidence (evidence ref). No field is derived from another. Legacy `legal_cases.collection_status` remains for
compatibility; new readiness lives on the award.

## Resolved conflicts
* **Case types**: two overlapping CHECKs replaced by one union list; `collections` and `eviction_and_damages` become writable.
* **Docket identity**: `case_number` nullable and non-unique; unique key is (scope_ref, court_ref, docket_number).
* **Company authorization**: `scope_ref` enforced by RLS through a transaction-local verified context; empty context sees nothing.
  Mapping of `scope_ref` to central identity grants is an OPEN BLOCKER (no company tables exist in this database).
* **UUID/integer crosswalks**: legal FKs use `id_uuid`; integer ids only in legacy staging and `legal_source_links.legacy_int_id`.
* **Legacy rows**: existing matters keep `scope_ref` NULL (invisible to the runtime role until a reviewed backfill). The 216 staging rows are not read or modified.

## Open blockers
1. scope_ref to central-grant mapping (needs Control Plane contract).
2. Runtime role credentials and server wiring (server uses service-role today; must move to `ecc_legal_runtime` in a separate PR).
3. Backfill of scope on existing matters; the 27 supplied matters remain unverified and the 81 blank money cells stay blank (no awards created).
4. Applying the migration (Codex/Dion), plus installed/live proof.

## Proof
Local isolated PostgreSQL 16: `npm run test:legal-db` (29 checks). Contracts: `tests/unit/legal/*`. Live behaviour is unproven.
