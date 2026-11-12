# ADR-0001: Native Supabase legal source and runtime ownership

Status: Proposed (source only; nothing applied to any database). Revised 2026-11-11 after Codex source review of 73737d6 (ECC-LEGAL-CLAUDE-v2).
Date: 2026-11-10
Assignment: ECC-LEGAL-CLAUDE-v1, issue #214 (L1)
Base: `8ccab7082b9dbf81f08209c95675f9f9c728a47d`

## Context

ECC legal workflows (evictions, damages, collections, judgments) need one system of record.
DoorLoop is not the legal workflow engine. The repository protects backend ownership and
wiring (AGENTS.md), and `server/db.ts` talks to Supabase with the service-role key, which
bypasses RLS. Read-only metadata at 2026-11-10 shows:

* `legal_cases` (uuid PK) already exists and is the natural matter root.
* Two overlapping `case_type` CHECKs (`legal_cases_case_type_check`, `legal_cases_case_type_chk`).
  Their intersection excludes `collections` and `eviction_and_damages`, so those values cannot be written.
* `case_number` is globally UNIQUE and NOT NULL. Docket identity is really (jurisdiction, court, docket number),
  and an unknown docket is a legitimate state.
* `status` mixes matter lifecycle with judgment outcome; `collection_status` is a separate column already.
* One tenant / lease / unit / property per matter: no multiple parties, no multiple properties.
* `legal_case_events`, `case_history`, `case_tags` carry no foreign keys; two audit journals overlap.
* No company or membership tables exist in this database. Central identity (Control Plane) is the authority.
* anon/authenticated hold DML grants on the legal tables, protected only by RLS default-deny.
* Core entities have integer `id` and uuid `id_uuid`; legal FKs target `id_uuid`; legacy staging uses integer ids.

## Decision

1. **Source of truth**: native Supabase (PostgreSQL) tables owned by ECC. `legal_cases` is reused as the matter root;
   no parallel case tables are created for UI cards (cards are projections).
2. **Additive only**: new tables for parties, matter-property links, awards, award obligors, evidence requirements,
   evidence references and source links. Existing columns are not dropped; the 216 legacy staging rows are not touched.
3. **Case-type resolution**: drop the two overlapping CHECKs and replace with one named constraint carrying the union
   of both lists (`eviction, damages, eviction_and_damages, collections, quiet_title, foreclosure, other`).
4. **Docket identity**: (`scope_ref`, `court_ref`, `docket_number`) unique where docket is known; `case_number` becomes
   nullable. The internal matter UUID is never a workbook or court identifier.
5. **Four independent dimensions**: matter lifecycle (matter), judgment verification (per award), collection readiness
   (per award), evidence confidence (per evidence reference). Each changes only through the journal with actor, source, time.
6. **Money**: integer cents, `NULL` = unknown, never defaulted to 0. Amount and currency are both present or both absent,
   in SQL (`CHECK ((amount_cents IS NULL) = (currency IS NULL))`) and in `parseMoney`. SQL caps `amount_cents` at
   9007199254740991 (JS `Number.MAX_SAFE_INTEGER`), so the database cannot hold a value the contract would have to round;
   a reader receiving anything larger (number, string or bigint) rejects it rather than truncating. An award is stored
   once; obligor rows carry no amounts, so joint liability cannot multiply it. `totalAwards` rejects repeated award ids
   and any non-safe-integer total.
6a. **Matter integrity** is enforced by the database, not by RLS: obligors and evidence references carry `matter_id` and
   composite foreign keys to the award, party and requirement, so a cross-matter (or cross-scope) link cannot be stored;
   `matter_id` is immutable on every child table, so reassigning a parent is rejected as well as inserting a bad link.
7. **Audit**: `legal_case_events` is the single append-only journal (no UPDATE/DELETE for runtime role).
   `case_history` is frozen as legacy read-only. Revisions use optimistic concurrency: the caller writes revision = read + 1 and the database rejects stale or omitted revisions. New awards and evidence references can only be created at the default dimension values; evidence-confidence journal rows follow the evidence reference's own visibility.
   All four dimensions are guarded and journalled with actor, source and time by triggers: lifecycle (matter), judgment
   verification and collection readiness (award), evidence confidence (evidence reference). A change without a verified
   actor context, or with a stale revision, is refused and not applied. Scope of the claim: this is source-level, proven on
   a synthetic local database only.
8. **Runtime ownership**: the Express server is the only caller. It uses a dedicated non-bypass database role
   (`ecc_legal_runtime`) and supplies a transaction-local context (`ecc.scope_refs`, `ecc.actor`); policies fail closed when
   it is absent. anon/authenticated DML on legal tables is revoked (proposal only).
   **What the custom-setting policies are**: they FILTER rows by a trusted, server-supplied context. They do not
   authenticate anyone or verify grants. The runtime role can set its own custom settings (a documented limitation, proven
   in the local tests), so `NOBYPASSRLS` is not independent grant verification. **Activation gates** (not installed here):
   (a) real issuer verification and `scope_ref` to central-grant mapping, owned by Codex under #211/#221; (b) per-transaction
   context with reset and pool isolation (`set_config(..., true)` only; never session-level on a pooled connection).
9. **Company authorization**: `scope_ref` is an opaque reference mapped to central identity grants. The mapping is an
   OPEN BLOCKER; `accountId` is a person, not a company. No authority is inferred from names.
10. **Crosswalks**: legal FKs use `id_uuid`; integer ids appear only in legacy staging and in `legal_source_links`.

## Consequences

* Nothing here is installed. Applying requires a separate reviewed migration owned by Codex/Dion.
* The rollback proposal is a PARTIAL cleanup, not a restore. It removes the new tables, triggers, functions, runtime policies,
  runtime privileges and role, but keeps added columns, the union `case_type` check, nullable `case_number` (global unique
  not recreated), the NOT VALID journal FK, enabled RLS and the revoked anon/authenticated/PUBLIC grants. Restoring those
  grants is a separate security decision. See the header of the rollback proposal for the exact list.
* Role custody is fail-closed: the proposal refuses a preexisting `ecc_legal_runtime`; the rollback uses bounded revokes (no
  `DROP OWNED`) and refuses, changing nothing, if the role owns or holds anything beyond the known legal objects.
* Until the scope-to-grant mapping exists, runtime reads must return nothing rather than everything.
* Server code does not change in this PR; no handler is reactivated.

## Evidence classes

* Source-only: this PR's files and tests (local isolated PostgreSQL 16 using a labelled reconstruction of the schema).
* Read-only live metadata (2026-11-10): the findings in Context.
* Unverified: the 27 supplied matters, the 81 blank money cells, central grants, installed behaviour.
