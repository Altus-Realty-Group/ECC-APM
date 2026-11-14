# Combined legal (L1) + document (D1) database rehearsal - 2026-11-12

Evidence class: **local PostgreSQL 16 reconstruction proof**. Nothing here is installed or live proof. The rehearsal
ran on a throwaway private cluster (unix socket, no network, no credentials), with synthetic rows only. No live catalog or
business row was read for it. Both schema files remain proposals; no production SQL, grant, backfill, runtime binding,
workflow or service was added. Rollback scripts are never run automatically.

Run: `npm run test:legal-documents-db` (bash + PostgreSQL 16 server binaries; it SKIPs, not passes, when they are absent).
Files: `tests/legal-documents-db/` (`baseline.sql`, `populate.sql`, `fp.sql`, `tests.sql`, `rb_assert.sql`, `run.sh`).
Inputs, unchanged: `docs/legal/schema/001_native_legal_foundation.{proposal,rollback.proposal}.sql` (L1, issue #214) and
`docs/documents/schema/001_document_registry.{proposal,rollback.proposal}.sql` (D1).

## Result on base `315b4bccf127a744f250942f4ae9bae0d8f5e950`

| Section | Checks | What it covers |
| --- | --- | --- |
| Main combined proof | 51/51 | L1 then D1 on one baseline: baseline preservation, identity anchors, role custody, default-deny, cross-role isolation, constraints of both proposals, shared-key custody |
| Negative controls | 6/6 | The same suite is run against six deliberately broken installs and must fail on the named check (a crash does not count as a catch) |
| Rollback rehearsal | 34/34 | Populated refusal, independent partial rollbacks, documented empty cleanup, residual state |
| Role custody | 11/11 | Preexisting-role refusal, cross-role privilege and foreign-ownership refusal |
| Known-incompatibility reproduction | 3/3 | See "Incompatibility found" below |

The two component suites still pass unchanged on this host (`test:legal-db` 57/57, 7/7, 11/11; `test:documents-db` 36/36, 3/3, 3/3).

## Baseline reconciliation (no identity is inferred)

The two component reconstructions were taken from different read-only observations and are not mutually consistent as
written. The combined `baseline.sql` is the weakest reading that satisfies both observations.

| Element | L1 evidence (2026-11-10) | D1 evidence (2026-11-11) | Combined reconstruction | Status |
| --- | --- | --- | --- | --- |
| `properties` keys | FKs target `id_uuid`; component file: `id_uuid` PK + serial `id` | `id` bigint PK | `id` bigint PK **and** a separate `id_uuid` uuid UNIQUE NOT NULL | Reconstruction choice. Live PK/type of each key **unverified** |
| `units`, `tenants`, `leases` | `id_uuid` is the FK target | not used | `id serial`, `id_uuid` uuid PK (as in the L1 file) | Unverified |
| `owners`, `property_owners` | not used | `owners.id` integer PK; `property_owners` PK `(property_id, owner_id)` with FKs | as observed | Observed metadata (D1) |
| `legal_cases` and journal/history/tags | uuid PK, two overlapping case_type CHECKs, global UNIQUE case_number, no FKs, anon/authenticated DML | not used | as observed | Observed metadata (L1) |
| Legacy file tables | not used | `files` (50), `files_new` with permissive authenticated SELECT policy, grants | as observed, with synthetic rows | Observed metadata (D1) |
| Pairing of `id` and `id_uuid` | none | none | **No pairing is assumed.** Synthetic rows are crossed (numeric 42 holds uuid ...0043, numeric 43 holds ...0042) so any suffix/ordinal equivalence would hit the wrong property | Deliberate trap |

Identity result: every L1 foreign key into the baseline targets `id_uuid`; every D1 foreign key targets the native numeric
keys; no foreign key, view, policy, trigger or function body links the two domains. A matter-to-document or
matter-to-owner association therefore does not exist yet and must be a separately reviewed, explicit mapping.

## Apply order

No repository document states an apply order. This rehearsal uses **L1 then D1** (the order of the architecture record and
of the issues). Applying D1 then L1 also applies cleanly on the reconstruction; that is reported as information only and is not
counted. The two proposals share no object name, table, function or role.

## What is checked

- **Preservation:** structure, constraints, ACLs and policies of the nine untouched baseline tables are identical before and after
  both proposals; all 13 baseline tables keep their rows byte-for-byte (legal tables compared on their original columns); D1
  changes nothing in any L1 object; legacy file grants and policy are unchanged; baseline legal rows stay unscoped.
- **Role custody:** both roles are NOLOGIN, NOBYPASSRLS, not superuser, own nothing, have no memberships and no CREATE.
  Their effective privileges equal the documented lists exactly: L1 role on its 11 tables and one view, D1 role SELECT-only on
  four tables and two views, nothing on the baseline or on the other domain. anon/authenticated/PUBLIC hold nothing on any new object.
- **Default-deny and isolation:** D1 tables have RLS and no policy, so the D1 role reads zero rows while rows exist, even with
  the L1 scope/actor/restricted-evidence settings in force. The L1 role with a valid scope sees only its scope and is refused
  (42501) on every D1 object, baseline table and legacy file table; the D1 role is refused on every L1 object.
- **Constraints (both proposals, combined state):** case_type union, docket identity per scope, amount/currency pairing and unknown-is-NULL,
  same-matter composite FKs, revision compare-and-set, immutable matter_id, append-only journal, initial dimensions; owner/property home
  rules, mandatory classification and the financial-tax minimum, ownership-backed links, contiguous immutable versions, verified receipts.
- **Shared-key custody:** a property cited by a document link or an L1 matter link cannot be deleted; an owner with a document home cannot be deleted.
- **Negative controls:** (1) D1 role granted a legal table, (2) financial-tax CHECK removed, (3) L1 role created BYPASSRLS, (4) a policy opens D1,
  (5) anon revoke removed from L1, (6) same-matter FK weakened. Each fails the named check. A mutation that changes nothing fails the run.

## Rollback semantics

- Populated: each rollback refuses with its custody message and changes nothing (whole-schema fingerprint, ACLs, roles, row counts compared).
- Independent: with D1 empty, D1 rolls back without touching L1; with L1's seven new tables empty, L1 rolls back without touching D1.
- D1 on empty tables is an **exact inverse** of its apply (fingerprint equals the post-L1 state).
- **L1 rollback is partial cleanup, not restoration.** After it, additive columns, the union case_type CHECK, nullable case_number without its global
  UNIQUE, the NOT VALID journal FK, enabled RLS and revoked anon/authenticated grants remain. The legacy legal tables are not the original baseline,
  and the original grants are deliberately not restored. Original legal rows survive.
- A privilege held by one runtime role on the other domain's table, or an unrelated object owned by a runtime role, makes the matching rollback refuse; nothing is revoked silently.

## Incompatibility found (reported, not fixed)

L1's `legal_matter_guard` (BEFORE UPDATE on `legal_cases`, revision compare-and-set) also fires for the baseline referential action
`ON DELETE SET NULL` on `legal_cases.{property,unit,tenant,lease}_id`. The cascade UPDATE carries an unchanged revision, so the guard raises
`40001 legal: stale or omitted revision (expected 2, got 1)` and the parent delete fails. Reproduced on L1 alone (D1 not installed); it works before L1:

```sql
-- baseline only: works, legal_cases.property_id becomes NULL
insert into properties(id,name,id_uuid) values (91,'x','00000000-0000-4000-8000-000000000091');
insert into legal_cases(case_number,case_type,status,property_id) values ('R1','other','draft','00000000-0000-4000-8000-000000000091');
delete from properties where id=91;
-- after docs/legal/schema/001_native_legal_foundation.proposal.sql: the same shape fails
insert into properties(id,name,id_uuid) values (92,'x','00000000-0000-4000-8000-000000000092');
insert into legal_cases(case_number,case_type,status,property_id) values ('R2','other','draft','00000000-0000-4000-8000-000000000092');
delete from properties where id=92;   -- ERROR: legal: stale or omitted revision (expected 2, got 1)
```

Effect: deleting any property/unit/tenant/lease that a legacy case still references is blocked until the reference is cleared, instead of nulling it.
Whether that is acceptable custody or needs a guard exemption for referential updates is an L1 design decision; no proposal was changed. The suite pins the
current behaviour, so a deliberate fix must update that check and this record.

## Not established (unresolved gates)

Installed or live behaviour; the live catalog types/keys of `properties`, `units`, `tenants`, `leases` (reconstruction choices above); any
owner/property/matter-to-`scope_ref` mapping and D1 scope policies; resource-grant producer and runtime role credentials; backfill of existing
legal rows; matter-to-document or party-to-court links; connection pooling and per-transaction context reset; performance and concurrency of the
combined install (only the L1 rollback race is covered, by the component suite); and the L1 revision-guard decision above.
