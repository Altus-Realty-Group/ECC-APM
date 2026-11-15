# ADR-0005: Protected read of one legal evidence download (dependencies and authorization order)

Date: 2026-11-16
Status: DECISION recorded BEFORE implementation. Source only; unmounted; no producer, route, handler, grant, credential, provider or live access.
Scope: L4 / issue #217, one evidence download. Builds on ADR-0004, the corrected 003 contracts, `planEvidenceRead` (#244, unchanged), A1 (`shared/authz`) and the D1 reader.

## Problem

`planEvidenceRead` proves a SUPPLIED snapshot is internally consistent. It is not permission, it has no provenance, and it reads nothing. A protected reader must
decide, in an order that cannot leak, whether this session may receive the bytes of the one document version pinned by one evidence reference, and must withhold
everything if anything changes while it works. The two failure modes to design out are (a) an existence oracle (a caller learns that a version, document or evidence
row exists, was replaced, or is restricted, without authority over it) and (b) delivery under authority that was revoked, remapped or expired during asynchronous reads.

## Request

The browser supplies exactly `{ sessionId, matterId, evidenceId }`. **No version id, document id, property, owner, scope, classification, status, revision or permission field is
accepted.** A request carrying any other key is refused before any port is touched. Everything else is derived server-side from the evidence row the caller is already
authorized to read. This is the first half of closing the oracle: a caller can never probe an arbitrary version or document.

## Dependencies (all injected; every default denies or is unavailable)

Existing, reused unchanged:

| Port | Source | Default |
| --- | --- | --- |
| `authority(sessionId, requestedScope)` | A1 `ReadAuthority` | unavailable |
| `scopes` (owner/property -> scope_ref) | D1 `ScopeResolver` | null (deny) |
| `classificationPolicy` | D1 | denies every default-deny class |
| `store` (`DocumentStore`) | D1 | throws (unavailable) |
| `content` (`ContentSource`) | D1 | throws (unavailable) |

New, minimal, same style (each receives the FROZEN A1 context so a real binder can run under the transaction-local database seam; none is bound here):

| Port | Returns (untrusted, validated) | Default |
| --- | --- | --- |
| `evidence.load(ctx, matterId, evidenceId)` | `{ matter, evidence, matterProperties }` from L1, filtered by the context's scopes | throws |
| `properties.rows(ctx, propertyUuids)` | `[{ id, idUuid }]` from the SAME `properties` rows | throws |
| `pinned.resolve(ctx, versionId)` | `{ documentId, documentStatus }` for the pinned version, from D1 | throws |

No production producer is invented. `createUnboundEvidenceReader()` touches no port and returns `unavailable`. Parsing reuses `parseMatter`, `parseEvidenceRef` (explicit nullable
fields), A1 `snapshotContext`/`assertContext`, D1 `isStoreRow`, `deliveryStateOf`, `bytesMatch` and the D1 reader itself for verified delivery.

## Authorization order (each step runs only if every earlier step passed)

0. **Request shape.** Exact keys, canonical UUIDs, `sessionId` string or null. Otherwise a fixed failure with zero port calls.
1. **Session authority (A1).** A fresh `authority(sessionId, null)`; denial maps to `denied`/`unavailable`. The context is validated and frozen (`snapshotContext`); an expired context denies.
2. **Matter stage.** `evidence.load` receives the frozen context. The reader requires the matter id and evidence id to match the request and **`matter.scopeRef` to be in the context's scopes**.
   An out-of-scope matter, an absent matter and an absent evidence row all return the same `missing`. No D1 port has been touched.
3. **Evidence state.** Unbound -> `unavailable`; withdrawn -> `missing`; restricted -> `denied`. The pinned version is read only from this row. (Revision is carried into the plan.)
4. **Property keys.** `properties.rows` for exactly the matter's linked property UUIDs; the numeric id comes from the SAME row (no suffix, ordinal or cast). Duplicates or gaps -> `conflict`.
5. **D1 target authority, authorization only, BEFORE any document operation.** For each candidate property (ascending, bounded): the property's scope must be one of the context's scopes, the allowed
   classifications are computed (defaults plus policy), and the authorized linked owners are computed. This mirrors the D1 reader's authorization state exactly (including its state key). If no candidate
   target is authorized the result is `denied`, **independent of whether any document or version exists**.
6. **Version resolution (the oracle step).** Only now `pinned.resolve(ctx, versionId)` maps the pinned version to its document and status. A null result, an unreadable result or a retired document returns
   the same `missing`/`unavailable` a caller without D1 authority would have seen at step 5 or later for any absent document: because step 5 already ran, the caller learns nothing the authority did not entitle.
7. **Registry row under the D1 visibility filter.** `store.get(filter, documentId)` per authorized candidate (ascending). The store applies classification and linked-owner filters BEFORE returning; a row hidden by the filter is indistinguishable from absent.
8. **Plan.** `planEvidenceRead` with the loaded snapshot. A plan is a consistency result and is never permission: it can only select what the next steps may deliver, and the plan's context must equal the authorized candidate.
9. **Delivery (D1 reader).** The D1 reader's `download` for exactly the plan's property context, document and version: its own authorization, current-version-only, verified receipt (latest receipt, matching digest and size),
   bounded provider read and byte identity (size and SHA-256). A newer version is never substituted; an older pin never reaches here (the planner returns `stale`).
10. **Revalidation from scratch.** After the asynchronous delivery, steps 1-8 run again with fresh reads. The A1 binding, the target state key (scope mapping, classifications, linked owners), the evidence
    revision/binding/withdrawal, document status, current version and the whole plan must equal the first run. Anything else withholds.
11. **Expiry.** The last thing before returning (no asynchronous work after it): the clock must still be before both authority lifetimes. Otherwise withhold.

Revoked -> `denied`; changed or expired during the work -> `stale`; unreadable -> `unavailable`. Every failure is exactly `{ kind }` with `kind` in `unavailable | denied | missing | stale | conflict`:
no identifier, name, path, provider reference, digest, status, count or reason text, and no byte. A thrown port error can never escape or be echoed. Operational events are content-free codes.

## What this does and does not establish

Authority is only as real as the injected ports. With synthetic ports the order, the oracle closure and the withhold-on-change behaviour are proven; no producer, scope registry, resource grant, document
classification policy or database seam is bound, and SQL integrity (003) is not authorization. Restricted and financial-tax classifications stay unavailable to this reader whatever a policy says: the planner
is public-only and is not widened here.

## Alternatives rejected

- Version or document id in the request: re-opens the oracle.
- Resolve the version first, authorize second: a caller without D1 authority would distinguish "exists" from "absent".
- Treat the plan as permission, or cache it across the delivery: no revalidation, revoked authority would deliver.
- Reimplement D1 delivery and integrity: a second, drifting copy of receipt and byte checks.
- Modify the D1 reader or the planner: not needed; both are reused unchanged.
- Historical or "newest" version delivery: a separate reviewed capability.

## Remaining gates

Every authority producer (central resource grants, the scope registry and the owner/property to scope mappings, the classification policy), the database seam binding for the three new ports, a provider with verified receipts,
a mounted handler and browser transport, audit/journal reads, listing, packet export, historical versions and live acceptance. None is activated here.
