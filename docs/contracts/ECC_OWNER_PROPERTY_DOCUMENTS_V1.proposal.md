# ECC owner and property documents - implementation proposal

Status: proposed and unbound. No accepted registry, schema, transport or runtime
authorization is established by this document.

## Verified source and reuse

Current main source was read November 11, 2026. `FilesTab.tsx` already scopes
requests by entity, refId, source and session epoch. `fileReader.ts` accepts
`{items}` with names, sizes, dates and optional HTTPS links. A valid link is
not proof of document identity, authorized delivery or download access.
`server/routes/files.ts` declares Dropbox 501 and DoorLoop 503 placeholders,
but server/index.ts does not mount that router. These are source declarations,
not verified runtime responses. PR #232 replaces owner/property Files notices
with the scoped document UI and an explicitly unbound adapter.

Reuse existing FilesTab/session patterns after the producer is accepted. Do
not activate a placeholder reader to populate folders. An unavailable registry
or authorization source must not become a successful empty file list.

## Registry and authorization boundary

Requests identify the owner/property by its existing native ID. The trusted
server resolves current company scope and grants; client IDs and folder names
do not establish authority. Preserve native ID types, rather than allocating
new owner/property UUIDs for directory placement.

The accepted registry must represent document/version identity, record grain,
owner and property associations, section, original filename, media/size/hash,
source provenance, Dropbox identity/revision/location, delivery state, access
classification, creator, effective dates and audit history. A management
agreement may link several covered properties without duplicating its bytes.
Discoverability links do not grant download access.

Inspect existing file/document tables, keys, writers and policies before
choosing persistence. The earlier legal review found an empty `files_new`
candidate with permissive authenticated SELECT; that is not fresh schema or
access proof. No new registry table or policy is selected here. Net database
objects added: zero.

## Required behavior

| Operation | Behavior |
| --- | --- |
| Owner card Files | List authorized Ownership Documents grouped into its five sections |
| Property card Files | List its five property sections plus individually authorized linked owner agreements |
| Unit, lease, tenant, project or matter | Retrieve authorized registered references to the same versions |
| Search/count/preview | Filter authorization and classification first; denied items leak no metadata or counts |
| Open/download | Recheck actor, scope, document and version; require verified delivery; resolve registered provider identity |
| Missing or changed revision | Require reconciliation; never find a substitute file by name |
| Upload/copy | Stage privately, register provenance/idempotency, verify delivered bytes and record receipt |
| Retry/version | Same identity requires same bytes; atomic revision allocation; reconcile collisions |
| Save/reload | Invalidate relevant keys and reread committed metadata; reject old-session responses |
| Ownership change | Preserve historical associations; new ownership does not authorize prior-owner confidential files |

Folder placement, legal verification, business approval and delivery are
separate states. Unavailable, denied, missing, stale, conflict, failed delivery,
empty and loading stay distinct. An unverified delivery has no successful Open
action. Temporary links are never durable document identity.

## Bounded implementation sequence

1. Inventory actual registry candidates and governed scope/grant sources;
   record the reuse decision before SQL or persistent integration.
2. Bind accepted owner/property IDs to provider folders; review exact COPY
   mapping and private destination access. Sources remain untouched.
3. Bind the protected registry list and version-download reader using accepted
   authorization and a non-bypass server context.
4. Wire the actual owner/property file tabs, grouped as the simple folder plan,
   with session/error-state tests and browser acceptance.
5. Implement idempotent staging/copy/upload, versioning, checksum receipts and
   post-write reread against the accepted transport.

No runtime binding, final UI, live schema application or document copy is
performed by this proposal. The outward list needs document/version identity,
display name, section, direct/linked association, date/media metadata and
truthful delivery/open capability. Accept its exact wire shape together with
the producer and existing parser; no new installed endpoint is declared here.

## Operational acceptance

- One management agreement appears on its owner and two explicitly covered
  property cards without duplicate storage.
- A property lease is found through its property/tenancy without unrelated
  properties or owner records.
- A property-only viewer cannot discover or download owner banking/tax files;
  prove direct access, search, totals, revocation and session replacement.
- Historical owner confidentiality survives an ownership change.
- Prove upload/reload, pending/failed delivery, hash/revision mismatch,
  idempotent retry and concurrent revision allocation.
- Prove original property and legal files remain intact after COPY intake.

These are future acceptance requirements, not completed runtime tests. No live
performance or authorization proof is claimed. Source rollback reverts this
documentation; removing empty created folders requires an explicit request.
