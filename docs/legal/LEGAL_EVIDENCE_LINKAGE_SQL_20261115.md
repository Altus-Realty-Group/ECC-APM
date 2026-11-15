# L4 evidence linkage: SQL proposal 003 and proof - 2026-11-15

Source-only implementation of [ADR-0004](adr/ADR-0004-matter-document-version-linkage.md) against its [acceptance matrix](LEGAL_EVIDENCE_LINKAGE_ACCEPTANCE_20261115.md).
Nothing is applied: no live SQL, backfill, grant, access-opening policy, authentication producer, mounted handler, provider call, UI edit or file copy.
**SQL integrity does not establish document authorization.** Binding a registered D1 version to matter evidence proves the version exists and is bound exactly once. It grants nobody access
to the matter, the document, its classification or its bytes; that activation gate stays open and explicit (below).

Files: `docs/legal/schema/003_legal_evidence_linkage.{proposal,rollback.proposal}.sql`, `shared/legal/evidenceLink.ts`, `tests/unit/legal/evidence-link.test.ts`, proof `tests/legal-evidence-link-db/`
(`npm run test:legal-evidence-link-db`). 001, D1, 002 and #238 are unchanged.

## Object delta (reused, not duplicated)

Reuses `legal_evidence_refs`, D1 `document_versions`, the append-only journal and the existing revision/confidence guards. **Zero new tables, views, roles, grants or policies.**

| Object | Change |
| --- | --- |
| `legal_evidence_refs.document_version_id uuid NULL` | FK `document_versions(id) ON DELETE RESTRICT`; the only link to a document. Document id, digest, size, media type and provider are read through the immutable version, never copied |
| `legal_evidence_refs.withdrawn_at timestamptz NULL` | server clock only; CHECK: a withdrawal requires a version |
| partial UNIQUE `(matter_id, requirement_id, document_version_id) NULLS NOT DISTINCT WHERE document_version_id IS NOT NULL` | one binding per matter/requirement/version, an unassigned (NULL) requirement included, withdrawn rows included |
| 3 triggers + 3 functions | insert guard (born unbound); update guard (immutability, one attach, one withdraw, actor, nothing else changes, server time); AFTER-UPDATE journal (same statement) |
| 2 commands `legal_attach_evidence_version`, `legal_withdraw_evidence_version` | SECURITY INVOKER, pinned `search_path`: they add **no privilege**; the caller's own RLS and table rights decide |
| `legal_case_events` | dimension CHECK extended in place with `evidence_attachment` (same name); policy `legal_case_events_rt` replaced with the evidence-subject mask extended to the new dimension |

States are derived: NULL version = unbound (every legacy row), version without withdrawal = active, version with withdrawal = withdrawn. Existing rows stay unbound whatever their `storage_ref`,
filename, `restricted` or confidence say; `storage_ref` is never parsed into an identity; there is no backfill.

## Behaviour

- **Direct INSERT cannot bypass:** any insert with a version or a withdrawal is refused `23514`, for the owner and the runtime role alike.
- **Guarded attach/withdraw:** a null-to-version and a null-to-time transition each need the expected revision (001's revision guard, `40001` if missing, stale or skipped), a trusted actor (`42501` without), change nothing
  else (confidence, requirement, `restricted`, `storage_ref`), and append exactly one content-free journal event (states and subject id only) in the same statement. A failing journal append fails the whole statement.
- **Immutable once bound:** version, matter and requirement cannot be retargeted, unbound, restored or re-withdrawn (`23514`). A replacement is a NEW version on a NEW ref; reuse of a withdrawn binding is never an implicit restore.
- **Duplicates and replays:** a second ref for the same matter/requirement/version is `23505` (no second row, no second event). An exact replay (same version at `expected + 1`) returns `already_attached` / `already_withdrawn`
  and writes nothing. One version may support distinct requirements and other matters through separate refs; no bytes are copied.
- **Confidence and same-matter integrity are preserved:** confidence changes still need revision+1 and journal `evidence_confidence`; a requirement of another matter is refused by the existing composite FK.
- **Journal privacy:** attachment and withdrawal events follow the same evidence-subject mask as confidence events: visible only if the evidence row itself is visible to the caller (restricted evidence needs the restricted context).
  Wrong-scope and no-context callers see none, and counts and ids do not leak. The owner (no RLS) still sees every row: the mask is a runtime boundary, not a deletion.
- **Unavailable is indistinguishable:** wrong scope, no context, no actor and a missing row all return the same `42501`.

## Apply order and rollback

Apply 001, D1, 002, then 003 (it refuses otherwise, and refuses a second apply or a changed journal CHECK/policy). Roll back **003 first**.
Rollback refuses, changing nothing, while any evidence ref is bound or withdrawn, and while any attachment/withdrawal journal event exists (even if the evidence row was later removed): unbinding is impossible by design and the
journal is append-only. It also refuses an install that is not exactly what 003 created. An empty rollback is an exact inverse (the whole-schema fingerprint equals the pre-003 state, including the restored journal CHECK
and original 001 policy text; a re-apply works) and preserves every journal row. D1's own rollback cannot run while the 003 foreign key exists (a dependency error, safe, no change). Rolling back 001 first (its tables must
be empty) leaves the extended journal CHECK and the five functions as residuals until 003's rollback runs, which then skips the dropped table and policy.

## Proof (private PostgreSQL 16 reconstruction, local only)

Runs on the corrected combined reconstruction (catalog-verified key shapes relayed by Codex; reconstructed rows).

| Section | Checks |
| --- | --- |
| Main combined-state suite: legacy unbound, object delta, insert bypass (owner and role), valid attach, shared version across requirements and matters, duplicates incl. NULL requirement, replays, invalid versions, stale/omitted/skipped revisions, actor/scope/context, immutability, confidence guard, withdrawal, atomicity, journal privacy, isolation | 36 |
| Apply refusals (002/D1/001 missing, second apply, changed CHECK, changed policy, partial earlier apply) with unchanged-schema proof | 10 |
| Rollback: bound, withdrawn, journal custody, exact inverse, journal preserved, wrong order residuals and cleanup, D1 dependency order, unexpected trigger and index shapes | 21 |
| Concurrency (real parallel sessions): same slot on two refs, lost-reply retry, two versions on one ref, rollback racing an attach | 5 |
| Schema targeting: look-alike schema, TEMP relations, sequences, catalog tables and a look-alike `legal_actor()` ahead in search_path, populated and empty, apply, rollback and the commands | 12 |
| **Total on the real proposal** | **84/84** |
| Negative controls (the same group must fail with ONE protection removed): insert guard, retarget check, journal mask, NULLS NOT DISTINCT, server withdrawal time, journal trigger, actor requirement, other-field protection, replay detection, SECURITY DEFINER, unbound-withdraw protection, rollback bound/journal/shape checks, unqualified ALTER/LOCK/count/catalog, search_path resolution, row-lock serialization | 20/20 |

Pure contract (`shared/legal/evidenceLink.ts`, 16 unit tests): request parsing (canonical uuids only; no filename/path/URL/digest/`storageRef`; no caller withdrawal time), derived state, attach/withdraw plans with replay, the binding
key (an unassigned requirement is a real key part), conflict search, manifest deduplication by immutable version (active bindings only), content-free journal events, and the explicit authority gate.

## Activation gates (all remain open)

- **Document authorization is not established.** `planAttach`/`planWithdraw` require an explicit `{matter: true, document: true}` decision and cannot verify it; every authority producer is unbound. The commands are SECURITY INVOKER over
  tables the runtime role can already write, so they only protect integrity. An attach of an unknown version id is distinguishable (`23503`) from a known one; the caller-facing existence oracle must be closed by the document-authority check
  that precedes any call. The D1 document status (retired) and classification are not checked in SQL.
- Fresh property identity (verified same-row `id_uuid`-to-`id` join), owner/property association, classification intersection and journal-reader intersection with D1 authority are reader work, unbound.
- Installed behaviour, live constraint/trigger names, lock duration, scope mapping, backfill, grants, handler, UI, provider receipts, packet manifests in production and any legal-retention requirement.
- Session-level triggers can be disabled by a superuser (`session_replication_role`), as with 001.
