# Documentation status

Dion requested this full ownership and property layout on November 11, 2026,
and approved documenting it and continuing. The recommended layout below keeps
ownership-first browsing in ECC and the parent standard's canonical Properties
storage. The extra physical owner directory is an alternative, not an accepted
storage exception. No existing source folder will be moved or deleted.

Operational folder identities and the detailed source-label appendix are kept
private. This repository contains only the sanitized design and aggregate
receipt. The detailed working plan is ECC_Ownership_and_Folder_Plan_2026-11-11.md.

# ECC ownership, property, and document folder plan
Date: November 11, 2026
Status: full proposed hierarchy; only ECC and ECC/Production are currently provisioned.
Original legal and Assets Under Management folders remain intact. All future intake is COPY ONLY.

## 1. Basis and ownership model
Read-only review covered all 44 immediate ownership folders in Assets Under Management and their 307 immediate children: 287 folders/mounts and 20 files. Two asset-folder templates and three property folders were inspected. The shared template has Tenant Documents, Property Pics & Video, Improvements & Construction, Legal, and Insurance. These are source labels, not proof of current ownership, current management status, or distinct properties. The 287 includes templates, onboarding work, owner documents, and other non-property folders.

ECC's primary navigation will be Ownership -> Property -> Unit/Lease, Project, or Legal Matter -> Documents. Each ownership card shows its properties and owner-level records. Each property card exposes the familiar five sections plus identity, inspections, accounting, and reports. One property/document has one primary registered identity; additional owners and matters use references.

## 2. Parent standard and the ownership grouping decision
The parent directions refer to ALTUS-APP-FILES-2026-09-20 v2.1. Its fixed storage hierarchy is:
Altus App Folder/ECC/Production/<Collection>/<record-slug__record-uuid>/<Category>/<optional-subcategory>/<Lifecycle>/<document-uuid>/<Filename>

The standard requires Properties as the primary collection for property documents, Organizations for owner/entity records, and registered IDs before filing. Consequently ownership grouping is implemented in the ECC gateway through verified owner-to-property references. Owner cards show their property folders, while the property document is stored once under Properties. This keeps the parent rules and avoids relocating every property file when ownership changes.

A literal owner directory inserted before the property record would change the parent hierarchy. That alternative is documented for review, not silently applied:
ECC/Production/Properties/<owner-slug__owner-uuid>/<property-slug__property-uuid>/...
It requires an explicit ECC storage exception. Until such an exception is accepted, do not create that extra storage level. The recommended plan below retains ownership-first browsing and the standard's canonical storage path.

## 3. Complete collection plan
All paths below are relative to Altus App Folder/ECC/Production. Angle brackets are placeholders, never literal folder names.

| Collection | Record | Purpose |
| --- | --- | --- |
| Organizations | <owner-or-entity-slug__UUID> | Owner onboarding, management agreements, entity records, portfolio reports and correspondence |
| Properties | <address-slug__UUID> | One canonical property record, with verified ownership, units, leases, projects and matters linked in ECC |
| Projects | <standalone-project-slug__UUID> | Standalone work without an established property; property-linked work remains filed under Properties |
| Deals | <standalone-deal-slug__UUID> | Standalone acquisition/disposition work; property-linked evidence remains under Properties |
| Operations | <work-item-or-intake-batch-slug__UUID> | Restricted unmatched intake, legal intake, migration reconciliation, operational work |
| Reference | <library-record-slug__UUID> | Approved reusable templates, checklist definitions, court reference material and folder specifications |

Only applicable collections and categories are provisioned on demand. Development and Staging use separate bindings when needed; their labels alone do not isolate access.

## 4. Ownership card and owner record
Each owner/entity card contains identity and verified contacts, management status, ownership interests with effective dates, properties, agreements, portfolio financial reports, legal matters and activity. Directory labels do not prove legal ownership.

Owner record subfolders:
- 01_Property_and_Identity/Entity_and_Onboarding
- 06_Contracts_and_Approvals/Management_Agreements
- 07_Financial_and_Closing/Owner_Accounting
- 08_Reports_and_Analysis/Portfolio_Reports
- 11_Administration/Owner_Correspondence
- 11_Administration/Legal
- 10_Exchange_and_Delivery/Owner_Packets

Each applicable subfolder continues through <Lifecycle>/<document-uuid>/<standard filename>. Property-specific documents remain in the property record, with authorized registered references on the owner card. Tax and banking documents require their own restricted access; a shared owner folder does not automatically authorize them.

## 5. Property record: full document sections
| Category | App subfolders | Familiar operating section |
| --- | --- | --- |
| 01_Property_and_Identity | Assessor_and_GIS; Title_and_Parcel; Ownership_Evidence; Property_Setup | Property identity |
| 02_Photos_and_Video | Exterior; Interior; Walkthroughs; Before_and_After; Marketing | Property Pics & Video |
| 03_Plans_and_Measurements | Floor_Plans; Surveys; Room_Measurements | Plans and measurements |
| 04_Inspections_and_Condition | Move_In; Periodic; Move_Out; Maintenance; Safety | Inspections |
| 05_Scope_and_Estimates | Construction; Maintenance; Bids; Change_Proposals | Improvements & Construction |
| 06_Contracts_and_Approvals | Leases_and_Addenda; Tenant_Notices; Construction_Agreements; Insurance | Tenant Documents, construction and insurance |
| 07_Financial_and_Closing | Rent_and_Payment_Evidence; Invoices_and_Receipts; Deposits; Acquisition_and_Disposition; Insurance_Claims | Accounting |
| 08_Reports_and_Analysis | Owner_Reports; Property_Reports; Construction_Reports | Reports |
| 09_Permits_Utilities_and_Warranties | Permits; Utilities; Warranties | Property operations |
| 10_Exchange_and_Delivery | Attorney_Packets; Owner_Packets; Approved_Exports | Delivery bundles |
| 11_Administration | Tenant_Correspondence; Owner_Correspondence; Legal; Insurance_Correspondence; Vendor_Correspondence | Tenant Documents, Legal and Insurance |
| 12_Reference_and_Templates | Property_Specific_Reference | Applicable reference material only |

Not every property gets every empty directory. The plan is complete; physical folders are created when registered documents need them.

## 6. Units, leases, projects and tenants
The gateway groups property records by Unit -> Lease/Tenancy -> Documents. Stable unit and tenancy IDs distinguish two tenants with the same name, successive leases, and multiple units at one address. Unit/lease/person names are display labels and search fields, not access keys.

Property document registry mappings identify unit, lease, project, owner and matter associations. ECC applies these filters to the canonical category folders; it does not duplicate every file under a second tenant or unit hierarchy. Applications and identity/financial evidence are restricted separately from executed leases, notices and general property media.

Construction scopes, estimates, plans, contracts, invoices, permits, progress photos and final reports follow their specific categories. Construction Manager can consume authorized registered references without moving ECC-owned files or creating independent copies.

## 7. Legal matter organization
The gateway groups Legal -> Matter -> the sections below. A registered native matter ID links each document to property, tenancy, parties and owner scopes as verified. A source folder name or docket string alone never supplies those mappings.

| Legal section | Canonical filing |
| --- | --- |
| Intake and case identity | 11_Administration/Legal/Intake |
| Pleadings and filings | 11_Administration/Legal/Filings |
| Service and notices | 11_Administration/Legal/Service |
| Court events and orders | 11_Administration/Legal/Court |
| Judgment evidence | 11_Administration/Legal/Judgment |
| Collection evidence | 11_Administration/Legal/Collections |
| Attorney and party correspondence | 11_Administration/Legal/Correspondence |
| Payment and damage evidence | 07_Financial_and_Closing/<specific subfolder>, linked to matter |
| Leases, photos, inspections | Their original canonical categories, linked to matter |
| Attorney/court packet | 10_Exchange_and_Delivery/Attorney_Packets, derived manifest with approved audience |
| Checklist and tasks | Native workflow records; file attachments follow their canonical category |
| Audit | Append-only business/delivery records; no editable audit-folder substitute |

A property-linked matter files its documents under Properties. An entity-only matter uses Organizations. An unresolved matter stays in a restricted registered Operations intake batch until the mapping is accepted. Joint awards are counted once. Missing money remains unknown; file existence never verifies a judgment.

## 8. Lifecycle, names, registry and access
Every document branch continues through Originals, Working, Published or Archive as applicable, followed by a full document UUID. Originals preserves imported bytes and retains received filename/source metadata. Published means approved, not public. Archive means retained, not deleted. New versions are immutable; older revisions are superseded in metadata, not automatically moved.

Filename:
YYYY-MM-DD__document-type__<full-document-uuid>__v0001[__rendition].ext

Use the UTC intake/generation date; store source effective dates separately. Registered record slugs use lowercase ASCII, maximum 40 characters, and full UUIDs. Document-type slugs are at most 32 characters; file extensions match validated media type. Reject traversal, separators, reserved names, unsafe endings, case collisions and paths exceeding 400 relative characters.

Supabase owns document identity, scope, business mappings, original name, revision, checksum, byte size, source provenance, location, approval, access and delivery state. Folder paths and addresses are not authorization keys. A Dropbox folder ID identifies a location, not a native owner/property UUID. The gateway serves authorized registered verified versions, with truthful pending/failed/stale/denied states.

Confidential copies require actual Dropbox destination access controls plus app authorization before delivery. Existing sharing must not be broadened. No application login can revoke access to a raw Dropbox link already shared outside that app.

## 9. Copy and rollout sequence
1. Retain the source ownership/property/legal folder trees unchanged.
2. Reconcile source labels to authoritative owner, property, unit, tenancy and matter IDs. Keep ambiguous matches pending.
3. Register destination records and document identities. Preserve owner/entity spellings in source provenance; do not silently merge trusts or LLCs.
4. Produce an exact private copy manifest: source ID/revision, original path, byte size/hash, destination identity/path, classification and intended access.
5. Verify destination ACLs and server authorization. Stage privately until protected delivery is ready.
6. Copy, never move. Verify bytes, destination IDs/revisions and registry delivery receipts. Retry idempotently and reconcile collisions.
7. Expose ownership-first cards and document browsing in ECC using verified registry relationships.
8. Prove allowed/denied/revoked access, concurrent revision allocation, retries, stale sources, failed copies and original-source preservation.

Legal intake coverage remains all 211 discovered files, including four workbooks; 207 is only the candidate evidence count. No new copy is authorized to omit source workbooks.

## 10. Concrete current status
Created and verified: /Altus App Folder/ECC and /Altus App Folder/ECC/Production.
Read-only source survey: complete at owner and immediate child levels; five template/property samples inspected. No exhaustive descendant inventory, current ownership verification, registry registration, document copy, access change, or gateway activation has been performed.
Next provisioning uses verified registered identities, not generated placeholder owner/property IDs. The source-name appendix below is an intake checklist, not a list of current legal owners or unique managed assets.
