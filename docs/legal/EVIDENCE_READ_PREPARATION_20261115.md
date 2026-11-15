# Evidence read preparation (source only)

`server/lib/legal/evidenceReadPlan.ts` is an unmounted, pure consistency boundary
for L4 reader preparation. It returns `planned`, never `ready`, `allowed` or bytes.
It performs no database, network, provider or authority calls. Production adapters
remain unbound. A caller must not return its result as an authorized browser
response or use it to bypass D1. A valid supplied snapshot is not proof of its
provenance; a real store must separately establish the joins and current state.

## Reused sources

- L1 `parseMatter` and corrected L4 `parseEvidenceRef`/`deriveBindingState` validate
  matter/evidence identity, revision and explicit nullable binding fields.
- D1 `isStoreRow` validates registered-version metadata; classification and section
  rules reuse the document model. No D1 shape or behavior is changed.
- `propertyRows` is a bounded projection of the SAME `properties` rows, carrying
  native numeric id and UUID id_uuid. `matterProperties` projects the requested
  matter's legal_matter_properties relationships. No suffix, ordinal or cast pairs
  the key families. Duplicate UUID/numeric mappings are conflicts.
- `documentStatus` explicitly projects canonical document_records.status. Missing
  status cannot imply active; retired records are unavailable to the planned read.
  This adds no stored field and changes no existing D1 port.

## Planned context

A direct property document must belong to a property actually linked to the
requested matter. Owner agreements need the exact D1 document/owner/property link
and that property must be on the matter. Owner-only access, same-company scope
and folder names are insufficient. Several unit/lease matter links may refer to
one property; they do not create duplicate document targets.

The pinned version must equal the D1 current version. A mismatch returns stale,
never the newest version. Unbound legacy refs stay unavailable even when their
storageRef looks like a version id. Withdrawn refs and retired records do not
produce plans. This initial public-only helper withholds restricted and default-
deny financial/tax classifications rather than inventing entitlements.

Only matter/evidence IDs and revision, advisory scope_ref, native property target
and document/version IDs leave the helper. Names, paths, URLs, provider identities,
receipts, raw errors and hashes do not. Input arrays are bounded at 1000 and no
input is mutated. Invalid snapshots produce fixed non-identifying failures.

## Mandatory work after preparation

A protected reader must authenticate BOTH matter and D1 target/classification
access, verify trusted scope mappings and exact associations, obtain fresh
snapshots, require verified current delivery, check bytes/hash/size, and revalidate
all authority and revisions after asynchronous work. Session changes and denial
must purge any prior result through the existing shared boundary. A version plan
with no receipt can exist; it is deliberately NOT verified delivery.

No protected reader, handler, SQL query, cache, database policy, write command,
provider binding, UI download, packet export or live access is implemented by this
slice. SQL integrity proof and offline COPY ONLY reconciliation remain separate
from authenticated document delivery. Historical downloads need their own reader.

## Validation and rollback

Synthetic unit cases cover crossed UUID/numeric keys, identity conflicts,
withdrawal/unbound/status gates, old pins, missing/duplicate/unsafe mappings,
exact owner links, minimum classifications, bounded malformed input and input
immutability. Typecheck/build and the full unit suite are required on the source
head. No installed/PG/runtime performance or browser acceptance claim applies to
this unmounted helper. Revert the source slice; no database/file rollback exists.
