# Combined legal (L1) + document (D1) database rehearsal - 2026-11-12

Three evidence classes are kept apart throughout:

- **Reconstructed proof** (what this rehearsal establishes): the L1 and D1 proposals, applied in order to one private PostgreSQL 16 database built from synthetic rows
  on a throwaway cluster (unix socket, no network, no credentials). Nothing was applied anywhere real.
- **Catalog-verified metadata**: read-only catalog inspection by Codex, relayed in task ECC-COMBINED-DB-v2 (2026-11-14), plus the earlier read-only observations
  recorded in `DATABASE_ARCHITECTURE.md`. The rehearsal did not itself query any live catalog or business row; it asserts that its reconstruction matches
  the relayed definitions (`CATALOG-SHAPE` checks), which is not a live check.
- **Installed behaviour**: none. No proposal is installed; nothing about live behaviour, grants or data is established.

Both schema files remain proposals; no production SQL, grant, backfill, runtime binding, workflow or service was added. Rollback scripts are never run automatically.

Run: `npm run test:legal-documents-db` (bash + PostgreSQL 16 server binaries; it SKIPs, not passes, when they are absent).
Files: `tests/legal-documents-db/` (`baseline.sql`, `populate.sql`, `fp.sql`, `tests.sql`, `rb_assert.sql`, `run.sh`).
Inputs, unchanged: `docs/legal/schema/001_native_legal_foundation.{proposal,rollback.proposal}.sql` (L1, issue #214) and
`docs/documents/schema/001_document_registry.{proposal,rollback.proposal}.sql` (D1).

## Result on base `315b4bccf127a744f250942f4ae9bae0d8f5e950` (corrected reconstruction, v2)

| Section | Checks | What it covers |
| --- | --- | --- |
| Main combined proof | 55/55 | L1 then D1 on one baseline: baseline preservation, identity anchors, role custody, default-deny, cross-role isolation, constraints of both proposals, shared-key custody |
| Negative controls | 8/8 | The same suite is run against eight deliberately broken installs or baselines and must fail on the named check (a crash does not count as a catch) |
| Rollback rehearsal | 34/34 | Populated refusal, independent partial rollbacks, documented empty cleanup, residual state |
| Role custody | 11/11 | Preexisting-role refusal, cross-role privilege and foreign-ownership refusal |
| Unresolved-blocker reproduction | 12/12 | All four references, baseline versus L1 alone; see "Unresolved acceptance blocker" below |

The two component suites still pass unchanged on this host (`test:legal-db` 57/57, 7/7, 11/11; `test:documents-db` 36/36, 3/3, 3/3).

## Baseline reconciliation (no identity is inferred)

The first version of this reconstruction guessed the key shapes of `units`, `tenants`, `leases` and `owners` and modelled `id_uuid` as a primary key or
constraint. The catalog-verified definitions below replace those guesses; `baseline.sql` now follows them.

| Element | Class | Definition used |
| --- | --- | --- |
| `properties.id`, `units.id`, `leases.id` | Catalog-verified | bigint PRIMARY KEY |
| `owners.id`, `tenants.id` | Catalog-verified | integer PRIMARY KEY |
| `id_uuid` on owners, properties, units, tenants, leases | Catalog-verified | uuid NOT NULL with a standalone UNIQUE index; not a primary key, not a constraint |
| `property_owners.property_id`, `owner_id` | Catalog-verified | both bigint; PRIMARY KEY (property_id, owner_id); FKs to properties.id and owners.id |
| `legal_cases.id` | Catalog-verified | uuid PRIMARY KEY |
| `legal_cases` property/unit/tenant/lease references | Catalog-verified | uuid, target `id_uuid`, ON DELETE SET NULL |
| two overlapping case_type CHECKs, global UNIQUE NOT NULL case_number, events/history/tags without FKs, anon/authenticated DML grants | Earlier read-only observation (2026-11-10) | as observed |
| legacy file tables, grants, permissive `files_new` policy | Earlier read-only observation (2026-11-11) | as observed, synthetic rows |
| column defaults, identity/sequence behaviour, all other columns, all rows | Reconstructed, unverified | no default declared on any key; the suite supplies keys explicitly |
| pairing of `id` and `id_uuid` | None | **No pairing is assumed.** In every synthetic table the two keys are deliberately crossed (property 42 holds uuid ...0043, unit 5001 holds ...0002, ...) and a check asserts that no suffix matches |

Negative controls m7 (tenants.id as bigint) and m8 (id_uuid as a UNIQUE constraint instead of a standalone index) prove the `CATALOG-SHAPE` checks reject a
deviating baseline.

Identity result: every L1 foreign key into the baseline targets `id_uuid`; every D1 foreign key targets the native numeric keys (`owners.id`, `properties.id`, the `property_owners` primary key; D1 never touches `id_uuid`); no foreign key, view, policy, trigger or function body links the two domains. A matter-to-document or
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
  (5) anon revoke removed from L1, (6) same-matter FK weakened, (7) baseline `tenants.id` as bigint, (8) baseline `id_uuid` as a UNIQUE constraint instead of a standalone index. Each fails the named check. A mutation that changes nothing fails the run.

## Rollback semantics

- Populated: each rollback refuses with its custody message and changes nothing (whole-schema fingerprint, ACLs, roles, row counts compared).
- Independent: with D1 empty, D1 rolls back without touching L1; with L1's seven new tables empty, L1 rolls back without touching D1.
- D1 on empty tables is an **exact inverse** of its apply (fingerprint equals the post-L1 state).
- **L1 rollback is partial cleanup, not restoration.** After it, additive columns, the union case_type CHECK, nullable case_number without its global
  UNIQUE, the NOT VALID journal FK, enabled RLS and revoked anon/authenticated grants remain. The legacy legal tables are not the original baseline,
  and the original grants are deliberately not restored. Original legal rows survive.
- A privilege held by one runtime role on the other domain's table, or an unrelated object owned by a runtime role, makes the matching rollback refuse; nothing is revoked silently.

## Unresolved acceptance blocker (reported, not fixed)

L1's `legal_matter_guard` (BEFORE UPDATE on `legal_cases`, revision compare-and-set) also fires for the catalog-verified referential action
`ON DELETE SET NULL` on `legal_cases.{property,unit,tenant,lease}_id`. The cascade UPDATE carries an unchanged revision, so the guard raises
`40001 legal: stale or omitted revision (expected 2, got 1)` and the parent delete fails. Reproduced for **all four references**, on L1 alone (D1 not
installed); each works on the baseline before L1 (the reference becomes NULL), and the refused delete leaves the parent row and the reference intact.
Example (the suite runs it for properties, units, tenants and leases):

```sql
-- baseline only: works, legal_cases.property_id becomes NULL
insert into properties(id,id_uuid) values (91,'00000000-0000-4000-8000-0000000e0091');
insert into legal_cases(case_number,case_type,status,property_id) values ('B91','other','draft','00000000-0000-4000-8000-0000000e0091');
delete from properties where id=91;
-- after docs/legal/schema/001_native_legal_foundation.proposal.sql: the same shape fails
insert into properties(id,id_uuid) values (95,'00000000-0000-4000-8000-0000000e0095');
insert into legal_cases(case_number,case_type,status,property_id) values ('L95','other','draft','00000000-0000-4000-8000-0000000e0095');
delete from properties where id=95;   -- ERROR: legal: stale or omitted revision (expected 2, got 1)
```

Effect: deleting any property/unit/tenant/lease that a legacy case still references is blocked, with an error that does not name the cause, instead of
nulling the reference. An unreferenced parent still deletes normally. **L1 must not be installed until this is resolved** (see the separate L1 correction
proposal; it is intentionally not part of this PR). The suite pins current behaviour, so a deliberate fix must update that check and this record.

## Not established (unresolved gates)

Installed or live behaviour; column defaults and identity behaviour of the key columns, and every column not listed as catalog-verified; any
owner/property/matter-to-`scope_ref` mapping and D1 scope policies; resource-grant producer and runtime role credentials; backfill of existing
legal rows; matter-to-document or party-to-court links; connection pooling and per-transaction context reset; performance and concurrency of the
combined install (only the L1 rollback race is covered, by the component suite); and resolution of the L1 reference-protection blocker above.
