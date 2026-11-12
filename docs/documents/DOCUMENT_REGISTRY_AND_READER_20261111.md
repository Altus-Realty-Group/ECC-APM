# Document registry and protected reader foundation (D1)

Assignment ECC-D1-CLAUDE-v1, corrected by ECC-D1-CLAUDE-v2. Source only: nothing is applied, mounted, bound or activated. Decision record:
[ADR-0003](adr/ADR-0003-document-registry-and-protected-reader.md). Schema proposal: `schema/001_document_registry.proposal.sql`
(rollback: `...rollback.proposal.sql`). Code: `shared/documents/`, `server/lib/documents/`. Stacked on A1 (PR #229, `5e3092b`); compatible with the
PR #232 projection (`e1a5ae2`).

## Layout versus identity
The visible layout is `ECC/Production/Assets Under Management/<Ownership>/0. Ownership Documents/<5 sections>` and
`<Property address>/<5 property sections>`. It is presentation. A document's identity, versions, links, classification and delivery
state are registry metadata; native `owners.id` (integer) and `properties.id` (bigint) are the only ids the UI and reader use.
The rejected Properties/Organizations tree is not restored. Originals are never touched; any future intake is COPY ONLY.

## Reuse decision (read-only metadata, 2026-11-11)
No existing table is reused for the registry. `files_new` is closest (0 rows; `sha256`, `dropbox_id`, `category`) but has one association, no
versions, no classification, no delivery state, a stored raw path, a permissive `authenticated` SELECT `true` policy and anon/authenticated
DML grants. `file_assets` stores raw paths and `shared_link_url`. `file_sync_audit` is path-based (and lists `CREATE_SHARED_LINK`).
`files` (50 rows), `doorloop_raw_files` (3,666 rows) and `work_order_files` are legacy source evidence. All stay untouched, including their grants.
`owners`, `properties` and `property_owners` (37 / 191 / 190 links; PK `(property_id, owner_id)`; today one owner per property) are reused as the identity anchors.

## Model
| Table | Grain | Key rules |
| --- | --- | --- |
| `document_records` | one document | exactly one home (owner OR property); section must fit the home kind; explicit classification (no default); immutable except one-way retirement |
| `document_property_links` | one owner-home document covering one property | composite FK to `property_owners(property_id, owner_id)` and to the record's home owner: an agreement covers only its owner's properties, stored once |
| `document_versions` | one immutable version | contiguous numbers; 64-hex SHA-256; size ≤ JS safe integer; valid media type; non-blank provider identity (tab/newline-only is blank); unique provider revision; never updated or deleted |
| `document_deliveries` | one append-only receipt | `verified` requires digest and size and a composite FK equal to the registered version's; a non-verified receipt must carry neither; sequence numbers are unique; the latest receipt decides (duplicate or malformed sequences reconcile, in any input order) |

Classifications: `general`, `confidential` (readable once authorized), `restricted`, `financial_tax` (default-deny). **Minimum classification rule**: a `financial-tax` section record must be `financial_tax` or `restricted` (SQL CHECK), and the reader treats any row filed there as also needing `financial_tax`, so nothing in that section is readable under the default policy. Provider identity is an opaque
object reference and revision, never a path or URL. Views `document_current_versions` and `document_latest_deliveries` (`security_invoker`) support the future store.

## Reader
`createDocumentReader(deps)` takes only injected ports (`authority`, `scopes`, `store`, `content`, `classificationPolicy`, `now`). Defaults deny.
* **Effective authorization state**: A1 binding + the target's `scope_ref` mapping + the allowed classifications + the authorized linked owners.
  It binds every cursor and is **recomputed from scratch immediately before any metadata or bytes leave**; a change in permission, mapping,
  classification policy or linked-owner authorization during the reads withholds the result (`denied` if authority is gone, `stale` if it changed).
* **List** `read({sessionId, context, cursor?, limit?, search?, section?})`: A1 decision first; the owner/property must map to a `scope_ref` in the
  decision (an unmapped one is denied before any registry query); allowed classifications are computed (default-deny classes need an explicit policy
  allow); for property contexts each linked agreement's HOME owner must also be authorized. The store receives the filter and applies it before
  search, count and paging; a row outside the filter is a contract violation and fails closed. **Linked rows need exact evidence**: the registry
  link row for that document and that property, naming the home owner. Page size default 50, max 100; cursors are keyset positions bound to context,
  filters and the effective authorization state (a stale cursor is refused and carries no authority).
* **Download** `download({sessionId, context, documentId, versionId})`: identifiers are opaque (no path, URL, dot or slash); re-authorizes; the
  document must be visible in THIS context (otherwise `missing`, indistinguishable from absent); the version must be the current one (older is
  `stale`, unknown is `missing`); delivery must be `verified`; delivered bytes must equal the registered size and SHA-256 (else `conflict`, no bytes);
  after the provider read the authorization is recomputed and the registry row is re-read: it must still be visible, the same version and still verified.
* **Port responses are validated.** A malformed row (null, wrong types, missing version, invalid media type, blank provider fields, receipts that are
  not receipts), a non-array list, a bad count, bad linked owners or a bad authority decision returns a bounded `unavailable` containing no metadata;
  a thrown exception from any port is caught the same way. The configured `maxDownloadBytes` must be a safe integer >= 1 (NaN, Infinity, 0, negative,
  fractional or non-numeric values disable downloads before any port is touched).
* Result kinds match the PR #232 adapter: `ready | unavailable | denied | missing | stale | conflict`. The reader returns verified bytes with
  identity and metadata; wrapping them as the UI's `{documentId, versionId, file: Blob}` is the binder's job (Codex).
* `createUnboundDocumentReader()` is the only reader available without binding: every request is `unavailable` and no port is touched.

## Validation
| Requirement | Evidence |
| --- | --- |
| Default-unbound denial; unmapped scope denial | `tests/unit/documents/reader.test.ts` (spied ports show zero calls) |
| v2 corrections: permission/mapping/linked-owner changes during asynchronous work, effective-state cursors, registry change during the provider read | `tests/unit/documents/corrections.test.ts` |
| v2: exact document-to-property link evidence, wrong-property documents from the same owner, minimum classification rule, invariant parity, reversed duplicate receipts, invalid bounds, malformed port responses | same |
| Cross-company, cross-owner, cross-property denial | same; denied before any list/count/get/bytes |
| Restricted/financial filtering before search and count; explicit policy; store that ignores the filter fails closed | same |
| Linked agreements: one stored record under several properties; no unrelated owner documents; home owner must be authorized | same |
| Stale and missing versions; path/URL identifiers rejected before any lookup | same |
| Verified delivery required; checksum, size, oversize and provider failures return no bytes | same |
| Session revoked/changed/expired during the read withholds the result; session/grant states from the real A1 decision | same |
| Bounded pagination, cursor binding, clamping, forged cursor | same |
| PR #232 projection rules accepted; no provider reference, path, URL, digest or classification in the list | same (a mirror of the PR #232 rules, labelled) |
| Immutable versions, retry/conflict planning, receipt checks, cursors | `tests/unit/documents/model.test.ts`, `corrections.test.ts` |
| Registry constraints on a private PostgreSQL 16 reconstruction of the inspected keys (links, versions, receipts, immutability, default-deny, legacy untouched, rollback, pre-existing-role refusal) | `tests/documents-db` (`npm run test:documents-db`; not run in hosted CI). v2 adds the minimum classification CHECK, media-type and blank-field parity lists executed against the real constraints, partial-digest receipts and duplicate sequences |

Each reader guard and each SQL guard was mutation-checked (removing it fails a test). The SQL filter predicates are defined by the `ListFilter`
contract and exercised against an in-memory store that implements it; the real store binding is part of the unbound gate.

## Remaining gates (not in this PR)
Accepted resource-grant producer and `scope_ref` registry (A1); verified owner/property to `scope_ref` mapping; RLS scope policies for the new tables;
applying the schema and creating the runtime role credentials; a real store and a provider content source with verified delivery receipts; a
classification policy for `restricted`/`financial_tax`; mounting a handler and the browser adapter; live verification. Rollback: revert the PR.
