# ADR-0003: Document registry and protected reader

Status: Proposed (source only; nothing applied or activated). Assignment ECC-D1-CLAUDE-v1; corrected by ECC-D1-CLAUDE-v2 after Codex's independent reproduction on `d0a629c`.
Date: 2026-11-11. Stacked on the reviewed A1 head `5e3092bcd4ac64b41e7a902201a57db58d445dee` (PR #229).
Compatibility target: PR #232 projection at `e1a5ae2dd8d8edf1814571f90b8d1a83ce618375`.

## Context

* PR #232 (draft) renders owner and property document tabs against an **unbound** adapter. Its projection: native integer
  owner/property IDs, opaque string `id`/`versionId`, ten fixed section IDs, `association` `direct|linked-owner`, `delivery`
  `verified|pending|failed|reconciliation`, at most 500 rows; downloads return `{kind:'ready', documentId, versionId, file}`.
* The approved visible layout is `ECC/Production/Assets Under Management/<Ownership>/0. Ownership Documents/<5 sections>` plus
  `<Property address>/<5 property sections>`. It is a presentation layout. Identities and versions are database metadata.
* A1 (PR #229) supplies the fail-closed read decision (`ReadContext` with `scopeRefs`, `validUntilMs`, `binding`) and the leased
  database seam. It also lists the accepted resource-grant producer and the `scope_ref` registry source as **unbound**.

### Reuse comparison (read-only metadata, project AltusCommandCenter, 2026-11-11; earlier `files_new` observations treated as historical)

| Candidate | Fresh observation | Verdict |
| --- | --- | --- |
| `files_new` | 0 rows; `related_type`/`related_id` (ONE association); `dropbox_path`, `dropbox_id`, `sha256`, `category`; FK `uploaded_by`->`users`; anon/authenticated INSERT/UPDATE/DELETE/SELECT grants; policy `p_select_authenticated_files` = `true` | Closest, but one association (an agreement covering several properties would duplicate rows), no immutable versions, no classification, no delivery state, stores a raw provider path, and a permissive `true` read policy. Adopting it means changing its meaning and keeping that policy. **Not reused.** |
| `file_assets` | 0 rows; `entity_type` check (Property/Unit/Lease/Tenant/Owner/...), `dropbox_path`, `shared_link_url`, `shared_link_expires_at`; no checksum | Stores raw paths and shared links, the pattern this design rejects; one entity; no versions. **Not reused.** |
| `file_sync_audit` | 0 rows; event types include `CREATE_SHARED_LINK` and `DELETE`; `dropbox_path` | Path-based audit with no actor identity or checksum; cannot express a verified delivery receipt. **Not reused.** |
| `files` / `v_doorloop_files_v5d` | 50 rows; DoorLoop-origin; raw `download_url`; single `related_to_*` | Legacy source evidence. Untouched. **Not reused.** |
| `doorloop_raw_files` / `files_all_v` | 3,666 rows of raw import JSON; anon/authenticated DML grants | Raw import evidence. Untouched. **Not reused.** |
| `work_order_files` | 0 rows; join to `files` | Work-order specific. Untouched. |
| `owners.id` integer PK, `properties.id` bigint PK, `property_owners(property_id, owner_id)` PK + FKs | 37 owners, 191 properties, 190 links, one owner per property today | **Reused as the identity anchors.** Documents reference these native IDs, not UUIDs. |

No registry for documents, immutable versions or delivery receipts exists. The legacy tables are not modified, backfilled or dropped.

## Decision

1. **Additive registry** (proposal only): `document_records` (identity), `document_versions` (immutable), `document_property_links`
   (an owner-home document covering properties), `document_deliveries` (append-only verified delivery receipts). Native `owners(id)`
   / `properties(id)` are referenced directly; PR #232's integer context IDs map one-to-one.
2. **One home, explicit links**: every record has exactly one home, an owner or a property. An owner agreement is stored ONCE and
   linked to each covered property; a composite FK to `property_owners(property_id, owner_id)` guarantees a covered property
   belongs to the home owner. No bytes or rows are duplicated per property.
3. **Immutable versions**: a version row is never updated or deleted; a new revision is a new version. It carries byte size and a
   64-hex SHA-256. Provider identity is an opaque provider object reference and revision, unique per version; never a path or URL.
4. **Verified delivery**: a receipt is append-only. `verified` requires a recorded SHA-256 and size that equal the version's, enforced
   by a composite foreign key. The latest receipt decides the state; a later failure or reconciliation supersedes a verified one.
5. **Classification** (`general`, `confidential`, `restricted`, `financial_tax`) is fixed at record creation. `financial_tax` and
   `restricted` are default-deny: they are readable only when an injected classification policy allows them for the authorized
   context. No policy is bound, so they are denied. **Minimum classification rule** (one rule, in the reader and the SQL CHECK): a
   record in the `financial-tax` section is financial/tax material whatever it was declared as. It must be declared `financial_tax` or
   `restricted` (SQL), and a row that arrives declared anything else is treated as also needing `financial_tax` (reader), so it is
   never readable under the default policy. There is no implicit financial/tax access.
6. **Protected reader foundation** (`server/lib/documents`, injected ports, A1-based): resolve the registered IDs server-side; the
   browser sends only the context and opaque document/version IDs; no provider path or shared URL is accepted or returned.
   Authority comes from A1 (`ReadContext`); the owner/property to `scope_ref` mapping is an **injected port whose default returns
   nothing**, so every request is denied until it is bound.
7. **Filter before search/count**: the store receives the authorized scope, the home targets and the allowed classifications, so
   restricted rows never contribute to a search hit or a total. A store that returns a row outside that filter, or a malformed row or
   response of any kind, is a contract violation and fails closed with a bounded `unavailable` that carries no metadata.
   **Exact link evidence**: a linked agreement under a property is shown only with the exact registry link row for THAT document and THAT
   property (naming the home owner); a home-owner match alone is not evidence that this property is covered.
8. **Downloads and revalidation**: a download re-authorizes the registered document and version, requires that the version is current and
   its latest receipt is verified, then validates delivered bytes (size and SHA-256); mismatch is a conflict and returns no bytes. The
   reader computes an **effective authorization state** (A1 binding + the target's scope mapping + the allowed classifications + the
   authorized linked owners). Immediately before ANY metadata or bytes leave, that state is recomputed from scratch and must equal the state
   the work was done under, and the registry row must still be visible under the fresh filter with the same version and verified delivery;
   otherwise the result is withheld (`denied` if authority is gone, `stale` if it changed). Cursors are bound to this effective state, not
   only to the A1 binding. The configured download bound must be a safe integer >= 1, validated before any I/O; otherwise downloads are
   unavailable.
9. **Database posture**: new tables enable RLS with **no policy** (default-deny) and are not granted to anon/authenticated. A
   dedicated runtime role is created (refusing a pre-existing one). Scope policies are an activation gate because the owner/property
   mapping is not accepted.

## Consequences

* Nothing here is applied. The proposal is proven only on an isolated local PostgreSQL reconstruction of the inspected keys.
* Legal custody and future intake: originals stay untouched; any intake is COPY ONLY and is out of scope.
* Rollback: revert the PR. The rollback proposal drops only empty new tables and a role that owns nothing else.

## Evidence classes
Read-only live metadata (2026-11-11): the table above. Source-only: this PR. Read-only source references: PR #232 `e1a5ae2`, PR #229
`5e3092b`. Unverified: owner/property to `scope_ref` mapping, resource-grant producer, provider receipts, any live byte delivery.
