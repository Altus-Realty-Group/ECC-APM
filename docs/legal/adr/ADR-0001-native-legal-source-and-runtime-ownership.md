# ADR-0001: Native Supabase legal source and runtime ownership

Status: Proposed (source only; nothing applied to any database)
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
6. **Money**: integer cents, `NULL` = unknown, never defaulted to 0; currency required with an amount. An award is stored
   once; obligor rows carry no amounts, so joint liability cannot multiply it.
7. **Audit**: `legal_case_events` is the single append-only journal (no UPDATE/DELETE for runtime role).
   `case_history` is frozen as legacy read-only. Revisions use optimistic concurrency (`revision` column, compare-and-set).
8. **Runtime ownership**: the Express server is the only caller. It must use a dedicated non-bypass database role
   (`ecc_legal_runtime`), set a transaction-local verified authorization context (`ecc.scope_refs`, `ecc.actor`), and
   fail closed when absent. anon/authenticated DML on legal tables is revoked (proposal only).
9. **Company authorization**: `scope_ref` is an opaque reference mapped to central identity grants. The mapping is an
   OPEN BLOCKER; `accountId` is a person, not a company. No authority is inferred from names.
10. **Crosswalks**: legal FKs use `id_uuid`; integer ids appear only in legacy staging and in `legal_source_links`.

## Consequences

* Nothing here is installed. Applying requires a separate reviewed migration owned by Codex/Dion.
* Until the scope-to-grant mapping exists, runtime reads must return nothing rather than everything.
* Server code does not change in this PR; no handler is reactivated.

## Evidence classes

* Source-only: this PR's files and tests (local isolated PostgreSQL 16 using a labelled reconstruction of the schema).
* Read-only live metadata (2026-11-10): the findings in Context.
* Unverified: the 27 supplied matters, the 81 blank money cells, central grants, installed behaviour.
