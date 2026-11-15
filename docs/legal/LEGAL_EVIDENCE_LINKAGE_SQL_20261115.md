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

## v2 corrections (this revision)

**Contract (`shared/legal/evidenceLink.ts`).**
- *Nullable fields are required.* `requirementId`, `documentVersionId` and `withdrawnAt` must be PRESENT on a parsed row; omitted or `undefined` is refused, only an explicit `null` is the legacy shape. Before, a bound row with `withdrawnAt` dropped parsed as an
  active binding and entered the packet manifest.
- *Instants are real or rejected.* Strict RFC 3339 with an explicit zone (`Z` or `+/-HH:MM`); impossible dates (Feb 30, Apr 31, Feb 29 in 1900 or 2025), month 13, hour 24, second 60 and zone-less values are rejected, never normalized to a neighbouring day (`2026-02-30` used to become March 2).
  Leap years (2000, 2024) and valid offsets are accepted and converted exactly to UTC.
- *Revisions match the column.* Rows 1..2147483647 (PostgreSQL integer). A request's expected revision is 1..2147483646, because it writes `expected + 1`; the successor is a checked addition. Values up to `Number.MAX_SAFE_INTEGER` are rejected. Both a transition
  at the upper boundary and its replay (row at 2147483647, expected 2147483646) are valid; a row already at the maximum cannot be advanced. SQL mirrors this: the commands refuse `expected > 2147483646` with `22023` instead of overflowing.

**Apply preconditions (003).** It now verifies ALL of 002 (each of the seven references exactly as 002 produces them: single column, target `id_uuid`, `RESTRICT`, no ON UPDATE action, not deferrable, validated), the revision trigger (exactly one trigger bound to `legal_evidence_guard()`,
a BEFORE UPDATE row trigger, enabled in the origin session), and the EXACT 001 journal CHECK (the five values) and policy (command, roles, permissive flag, USING **and** WITH CHECK, one policy only). The expected forms are built by the same server on transient temp tables (named `zz_exp_*`, dropped
immediately) and compared by deparsed text, so there is no substring matching. Anything else refuses atomically; an altered WITH CHECK is refused, never replaced. Consequence: a disabled revision trigger can no longer be installed over, so a direct attachment UPDATE with no revision bump cannot succeed.

**Rollback shape (003).** Before removing or restoring anything it validates the exact foreign key (target, columns, delete/update actions, match, deferrability, validity), the withdrawal CHECK expression, the binding index (unique, valid, ordered key columns, partial predicate and
NULLS NOT DISTINCT semantics), all three trigger definitions (function, timing, events, enablement, WHEN) and the six-value journal CHECK and complete journal policy. A tampered install is refused with the complete schema and every row preserved. The documented valid cleanup after a lone 001 rollback is retained.

## Proof (private PostgreSQL 16 reconstruction, local only)

Runs on the corrected combined reconstruction (catalog-verified key shapes relayed by Codex; reconstructed rows).

| Group | Checks |
| --- | --- |
| Main combined-state suite: legacy unbound, object delta, insert bypass, attach, shared versions, duplicates incl. NULL requirement, replays, invalid versions, stale/omitted/skipped revisions, **integer-boundary revisions**, actor/scope/context, immutability, confidence guard, withdrawal, atomicity, journal privacy, isolation | 38 |
| Apply refusals with unchanged-schema proof: missing 001/D1/002, partial 002 (three shapes), only-one-property-FK, revision trigger missing/disabled/replica/wrongly bound/reshaped, journal policy USING/WITH CHECK/mask/extra policy altered, dimension CHECK extra/missing/true, disabled-trigger attack | 46 |
| Rollback: bound, withdrawn, journal custody, exact inverse, journal preserved, wrong-order residuals and cleanup (retained), D1 dependency order, unexpected shapes, **tampered policy (WITH CHECK, USING, mask), CHECK, index predicate/keys/null semantics, FK actions, trigger WHEN/enablement/timing, dimension CHECK** | 47 |
| Concurrency (real parallel sessions) | 5 |
| Schema targeting: look-alike schema, TEMP relations, sequences, catalog tables, look-alike `legal_actor()` | 12 |
| **Total on the real proposal** | **148/148** |
| Negative controls (the same group must fail with ONE protection removed; 20 for the original behaviour, 20 for v2: partial-002 detection, trigger enablement/shape/binding, policy USING/WITH CHECK/extra policy, CHECK equality, command bound, and each rollback shape comparison) | 40/40 |

Against the first revision of the SQL the same suite scores 86/148 and catches 19/40 controls (the v2 checks are what fail), so the reproductions are kept as executable evidence.
Pure contract: `tests/unit/legal/evidence-link.test.ts` (25) and `evidence-link-controls.test.ts` (9: each loads a copy of the module with one protection removed and must fail the same behaviour checks).

## Activation gates (all remain open)

- **Document authorization is not established.** `planAttach`/`planWithdraw` require an explicit `{matter: true, document: true}` decision and cannot verify it; every authority producer is unbound. The commands are SECURITY INVOKER over
  tables the runtime role can already write, so they only protect integrity. An attach of an unknown version id is distinguishable (`23503`) from a known one; the caller-facing existence oracle must be closed by the document-authority check
  that precedes any call. The D1 document status (retired) and classification are not checked in SQL.
- Fresh property identity (verified same-row `id_uuid`-to-`id` join), owner/property association, classification intersection and journal-reader intersection with D1 authority are reader work, unbound.
- Installed behaviour, live constraint/trigger names, lock duration, scope mapping, backfill, grants, handler, UI, provider receipts, packet manifests in production and any legal-retention requirement.
- Session-level triggers can be disabled by a superuser (`session_replication_role`), as with 001.
