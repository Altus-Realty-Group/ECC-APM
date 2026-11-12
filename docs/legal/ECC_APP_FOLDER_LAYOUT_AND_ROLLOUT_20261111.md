# ECC ownership and property document layout
Updated November 11, 2026. Replaces the earlier expanded folder proposal.

## Folder layout
Base: /Altus App Folder/ECC/Production/Assets Under Management

For each ownership entity:
- <Ownership name>
  - 0.  Ownership Documents
    - 1.  Property Management Contracts
    - 2.  Entity & Ownership Records
    - 3.  Financial & Tax Documents
    - 4.  Owner Statements & Reports
    - 5.  Correspondence
  - <Property address>
    - 1.  Tenant Documents
    - 2.  Property Pics & Video
    - 3.  Improvements & Construction
    - 4.  Legal
    - 5.  Insurance
  - <Next property address>
    - The same five property folders

Ownership Documents sits beside the property addresses, not inside a property.
Keep the five existing property section names unchanged. Other ownership-related
documents belong in the closest ownership section; add a new section only when
there is a recurring business need.

## What goes where
| Document | Filing location | ECC retrieval |
| --- | --- | --- |
| Property management agreement, amendments, termination or renewal | Ownership Documents / Property Management Contracts | Owner card; linked property cards for the agreement's verified covered properties |
| LLC, trust, authorized signatory, ownership and onboarding records | Ownership Documents / Entity & Ownership Records | Owner card; property ownership context through verified links |
| W-9, owner-level banking or tax documents | Ownership Documents / Financial & Tax Documents | Separately restricted owner-document access; ordinary owner access does not automatically authorize these |
| Portfolio statements and owner reports | Ownership Documents / Owner Statements & Reports | Owner card, with exact reporting period and covered properties |
| Owner-level email, letters and notices | Ownership Documents / Correspondence | Owner card; associated property/matter only where explicitly linked |
| Tenant lease, application or tenant notice | Property / Tenant Documents | Property, unit, lease or tenant card according to verified links and access |
| Property photos and videos | Property / Property Pics & Video | Property card; approved project or condition references |
| Scopes, construction contracts, POs, change orders and invoices | Property / Improvements & Construction | Property and related project card |
| Property legal filings, orders and correspondence | Property / Legal | Property and legal matter card |
| Property policy, renewal and claim records | Property / Insurance | Property card; related claim/workflow where linked |

An agreement covering several properties is one owner-level document with
explicit property associations. A portfolio report remains owner-level. A
property-only document stays with that property. Do not duplicate a whole
owner folder beneath each property, or grant access to all owner documents
merely because someone can view one of its properties.

## How ECC stores documents
1. Select the owner record. Select a property only when the document belongs
   to that property, or explicitly link covered properties for an owner document.
2. Select one of the simple sections above. ECC shows the filing destination.
3. Register the document's identity, record associations, original filename,
   revision, source provenance, access classification and delivery state.
4. Deliver the full file to the registered Dropbox location; verify file ID,
   revision, byte size and checksum before marking delivery verified.
5. Retain versions and audit history in database records. Do not add UUID or
   lifecycle directory trees to the familiar visible folder hierarchy.

The backend owns metadata and delivery receipts; Dropbox holds the full file.
Folder names are labels, not native identity or access authority. Do not infer
owner/property relationships from an address or source folder name.

## How ECC retrieves documents
- Owner card: Ownership Documents, grouped into the five sections above.
- Property card: the same five property sections as the current archive;
  applicable management agreements appear as linked owner documents.
- Unit, lease, tenant, project and legal matter cards: authorized references to
  the same registered documents, with no additional stored copies.
- Search: authorized database metadata, limited to the current owner/property
  context. Apply classification restrictions before search, counts or previews.
- Open/download: recheck current actor, scope, document and version access, then
  resolve its registered Dropbox identity. Do not expose a master-folder link
  as a replacement for document authorization.
- An owner change retains historical ownership and agreement associations.
  Do not expose the prior owner's banking, tax or correspondence to the new
  owner, or automatically reparent historical documents.

Show loading, empty, unavailable, denied, missing, stale, conflict and failed
delivery distinctly. A denied document must not leak its name or existence.
Failed/unverified delivery must never produce a successful Open action.

## Original-folder handling
All original Assets Under Management and legal folders stay intact.
Intake is COPY ONLY. Preserve source provenance, reconcile collisions and
ambiguous mappings, and verify destination access before confidential delivery.
Do not move, delete or silently overwrite originals.

## Local layout direction
Dion explicitly directed ECC to mirror Assets Under Management and include
owner-level contracts and documents. This ECC layout supersedes the expanded
Properties/Organizations category-tree proposal. It does not change other
apps or amend the shared company standard. Registry, access, versioning and
verified delivery requirements continue behind this simple hierarchy.

## Verified implementation status - updated after provisioning
Created and verified: ECC/Production/Assets Under Management plus 44 ownership folders,
44 Ownership Documents roots and 220 numbered section folders. A fresh complete
listing confirms 308 total folders and zero files. The 43-entry empty-folder
copy job completed with 43 successes and no failures.
Not yet created: property folders and document contents.
No files have been copied, moved, deleted or shared by this work.

Source review: the old file router declares a Dropbox 501 placeholder, but it
is not mounted in server/index.ts; that declaration is not runtime proof.
PR #232 now implements the actual owner/property Files UI, with an explicitly
unbound production adapter. Its 405 local unit tests pass; browser acceptance
and live registry/authorization/delivery binding remain open. The
generic FilesTab sends record table/ref_id to the unbound file readers; its
current list fields do not carry the complete registry/authorization contract.
Documenting this plan does not make those readers operational.

The implementation sequence and acceptance are recorded in
[ECC owner/property document retrieval proposal](../contracts/ECC_OWNER_PROPERTY_DOCUMENTS_V1.proposal.md).
