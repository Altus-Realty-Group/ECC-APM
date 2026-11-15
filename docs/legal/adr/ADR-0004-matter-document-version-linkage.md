# ADR-0004: Matter evidence pins the existing document version

Date: 2026-11-15
Status: PROPOSED DESIGN; no DDL, runtime contract or authorization producer activated.
Scope: L4 / issue #217. Owner: ECC. Sources: L1 and D1 proposal SQL,
`shared/documents/model.ts`, `server/lib/documents/ports.ts`, L6 projections,
and the corrected combined/reference-protection reconstructions.

## Problem

`legal_evidence_refs.storage_ref` is opaque text, not a D1 identity. L6 evidence
names, URLs and confidence do not identify an immutable document version.
D1 owner/property document access does not establish access to a legal matter.
Neither folder placement nor an offline copy match supplies either authority.

## Decision proposed for the next bounded implementation

Reuse `legal_evidence_refs`, `document_versions`, `document_records`,
`legal_matter_properties`, `properties`, `document_property_links`, the existing
A1 decision boundary and append-only legal journal. Add no registry table.

A future additive SQL proposal adds `document_version_id uuid NULL` to
`legal_evidence_refs`, referencing `public.document_versions(id) ON DELETE
RESTRICT`, plus `withdrawn_at timestamptz NULL` for explicit withdrawal.
These are design targets, not existing columns. No SQL is included in this PR.

Store only the version key. Derive document identity, digest, size, media type
and provider identity through that immutable version. Do not store another
copy of those facts or a separately editable document_id. One evidence ref
binds at most one version; many refs may point to the same registered version.
A partial unique index on (matter_id, document_version_id), where the version
is non-null, prevents repeated attachments for one matter, including withdrawn
ones. A repeat is an idempotent request or a conflict, never a new duplicate.
A replacement uses a NEW registered version and a new evidence ref; it does
not retarget an existing attachment. Reusing a withdrawn attachment is not an
implicit restore operation.

States are derived: null version = legacy/unbound; non-null version with null
withdrawal = active binding; non-null withdrawal = withdrawn binding. A CHECK
requires a version for any withdrawal. Existing rows remain unbound, regardless
of storage_ref, filename, restricted=false or confidence. No automatic backfill.

New evidence refs must begin unbound. Direct INSERT with a version or withdrawal
is refused, so the INSERT path cannot bypass guarded attachment and its journal.
The future writer permits one null-to-version attachment and one null-to-time
withdrawal, each with the expected evidence revision, required trusted actor,
current matter authority and document authority. Version and matter are immutable
once bound. The server supplies withdrawal time. A dedicated reviewed command
must lock/check the evidence revision, persist the change and append a content-free
journal event in one transaction. Existing confidence revision checks remain
intact; attachment never changes confidence or requirement status automatically.
No direct browser SQL or new runtime grants are authorized by this decision.

## Property identity and initial scope

Do not create a UUID-to-integer guessing table. A verified lookup joins
legal_matter_properties.property_id -> properties.id_uuid and reads properties.id
from THAT SAME ROW. Both key families are already on the property relation in
the catalog-verified reconstruction. Missing or ambiguous results deny; safe
integer conversion must reject out-of-range bigint values rather than round.

Initial readers support property-associated evidence only. A direct property
home must match a linked matter property. An owner-home document additionally
needs the exact D1 (document, owner, property) link and authorization for the
home owner, using D1's existing link semantics. Scope equality alone is not
association evidence. No unbound owner-to-matter relationship is invented.
Non-property matters and owner-only evidence remain unavailable until a separate
explicit association design is accepted.

## Authorization intersection

Every list/search/count/download needs fresh matter authority AND D1 target
and classification authority. The governed matter-scope and target-scope mappings
must agree with the accepted grant model; all producers remain unbound today.
A database context setting filters a trusted context; it does not authenticate a
grant. No service-role fallback or client-supplied permission boolean is allowed.

D1 classification never becomes weaker because L1 restricted=false. L1 restricted
may only narrow visibility. Restricted or financial-tax permission cannot be
inferred from confidence, actor assignment, folder name, document ownership or
a possession/rent award. Financial-tax section rules still require EVERY class
returned by D1 requiredClassifications. If an initial public-only legal reader
cannot honor a restricted request, return denied without restricted metadata.

Filter on the server before metadata, search hits, counts, page cursors or packet
manifests. Missing authority never becomes a ready empty success. Hidden required
exhibits block completeness without disclosing their names, IDs, URLs or counts.
Final authority and expiry checks follow all asynchronous store/provider reads;
cache/session boundaries remain those of A1 and the existing UI.

## Current versus pinned historical versions

D1's existing reader only downloads the current version. Do not change that
behavior silently. The initial L4 binder may reuse it only if the pinned evidence
version remains current and verified; otherwise return stale or unavailable and
withhold metadata/bytes. Never substitute the newest version for the pinned one.
A later explicit historical-version reader requires separate authorization,
receipt/byte checks, withdrawal/retirement policy and final revalidation tests.
An immutable packet manifest alone cannot provide that capability.

## Alternatives rejected

- Parsing storage_ref, folder names or numeric/UUID suffixes: no identity proof.
- Duplicating D1 versions in a legal-document table: competing canonical facts.
- A new many-to-many table for this initial one-ref/one-version relationship:
  existing evidence refs already own matter, requirement, revision and confidence.
- Copying an owner agreement into each property or matter: keep one D1 document
  and verified associations, including the approved ownership-documents layout.
- Treating source-to-copy reconciliation as authenticated delivery: offline
  matching evidence carries no provider, grant or judgment authority.

## Compatibility, rollback and custody

Implementation must be additive after L1+002 and D1, with fresh catalog checks
and private PG16 proofs. Existing legacy refs and their storage_ref values stay
unchanged. App readers remain unavailable for unbound refs; no inferred success.
A future rollback refuses while ANY bound/withdrawn attachment exists, preserves
journal rows, and never removes documents, versions or original Dropbox files.
No automatic proposal apply/rollback runs from a source revert.

## Consequences and acceptance

Expected future object delta: zero new tables, roles, policies or views; two
columns, one FK, one CHECK, one partial unique index and guarded attachment/
withdrawal behavior plus journal events. Exact SQL/functions are a separate PR.
See [the acceptance matrix](../LEGAL_EVIDENCE_LINKAGE_ACCEPTANCE_20261115.md) for implementation gates.
No performance or installed-access claim is made. No producer, handler, UI
binding, file copy, backfill or packet export is implemented here.
