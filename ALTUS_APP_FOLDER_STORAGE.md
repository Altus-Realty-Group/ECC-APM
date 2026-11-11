# Altus App Folder storage standard - ECC adoption

Standard reference: ALTUS-APP-FILES-2026-09-20, version 2.1.
Owner and escalation: Dion DePaoli. Confirmed as a standing standard on 2026-09-20.
Audience: this repository's PMs and maintainers.

Source pin: company-blueprints commit `890cee159d58a2aaed6dd67385e254b924513962`,
blob `5d410746937c23828dc3774989105c5c61cc40ad`. ECC adoption recorded November 11, 2026.

ECC layout: [ownership, property and rollout plan](docs/legal/ECC_APP_FOLDER_LAYOUT_AND_ROLLOUT_20261111.md).
The ECC app root and Production folder exist. Provision other folders on demand
using registered identities. Preserve all existing legal and property folders;
intake is copy-only. No storage exception or live registry authorization is
created by this document.

## ECC layout correction - November 11, 2026

Dion rejected the expanded canonical-category hierarchy and directed ECC to
mirror Assets Under Management. ECC uses ownership name / property address /
the existing five property subfolders, under ECC/Production/Assets Under
Management. This explicit ECC instruction supersedes conflicting placement
rules in the reproduced company standard below for ECC only. Preserve all
original source folders; intake is copy-only. Keep identities, authorization,
versions and delivery receipts in the registry behind the familiar hierarchy.
The corrected local plan is [ECC folder layout](docs/legal/ECC_APP_FOLDER_LAYOUT_AND_ROLLOUT_20261111.md).
The previously proposed canonical path builder is withdrawn; it is not a live
integration. This does not amend sibling apps or the company standard.

## Local responsibility

This repository adopts the common file organization specification below for its own applicable file work and locally maintained standards/templates. It records the owner's storage direction without assigning work or implementation authority over sibling projects. Product execution remains with the owning repository. No external project context needs to be loaded for this local adoption.

Use the company-controlled master folder named Altus App Folder and the approved local app folder binding. Do not provision an additional app folder merely because this repository contains this standard. Shared Assets is reserved for deliberately shared documents with a named steward. Existing employee folders remain in place; employee synchronization is deferred.

Supabase is the intended app-document registry for identity, permissions, versions, storage locations and delivery receipts. Private object storage may stage bytes until verified Dropbox delivery. This does not create a database here, replace existing governance records, or move the staff-facing operating manual. Reuse documents by authorized registered reference, preserving full files and originals. Use a reviewed shared transport contract; keep credentials server-side, scoped and unshared between consumer apps. Retired integrations remain retired pending separately approved replacement work.

Inputs: Dion's storage direction and verified local file requirements. Outputs: compliant local storage designs and review evidence. Related workflow/SOP: the specification and acceptance requirements below. GitHub owns this source document; verified operational records own delivery truth. No runtime, deployment, database, staff-sharing or publication change is performed by this adoption. Changes and approved exceptions are recorded in Git history and require Dion's approval.

## Universal directory and filename standard (version 2)

Effective 2026-09-20. Applies to new app-managed files and future participating apps. PMs implement this common structure; app-specific extensions belong below the category level. This is a documentation standard, not proof of implemented enforcement.

### Directory hierarchy

`Altus App Folder/<App>/Production/<Collection>/<Record>/<Category>/<Lifecycle>/<Document UUID>/<Filename>`

Use the same hierarchy under `Development` and `Staging` when needed. Create folders on demand, not empty trees for every possible category. Environments require separate service authorization/bindings; a folder label alone is not isolation.

| Level | Standard |
| --- | --- |
| App | Approved local app display name and verified folder binding; register a new name before use |
| Environment | Production, Staging, Development |
| Collection | Properties, Projects, Deals, Organizations, Operations, or Reference |
| Record | Readable slug followed by `__<full record UUID>`; freeze the folder name after creation |
| Category | Numbered category from the table below |
| Lifecycle | Originals, Working, Published, or Archive |
| Document | Full immutable document UUID; groups versions and related renditions |
| Filename | Date, descriptive type, document UUID, revision, optional rendition, extension |

Property-linked documents use Properties as their primary collection. Associate projects, deals, inspections, units, and scenarios through registry mappings; do not duplicate a property document into those collections. Standalone projects/deals use their own collection. Operations uses a registered work item or batch; Reference uses a registered library record. Register an ID before filing. If business identity is unresolved, retain a restricted intake record and private staging; never guess a property mapping.

Existing app record UUIDs remain valid within their app and collection namespace. Shared identity mappings require verification; equal-looking addresses or UUIDs from different systems are not proof of a match. Record names are labels, never authorization or join keys. Normal address corrections update display metadata without forcing folder moves.

### Common categories

| Folder | Contents |
| --- | --- |
| 01_Property_and_Identity | Property source records, assessor/GIS, identity evidence |
| 02_Photos_and_Video | Photos, walkthroughs, audio, related media |
| 03_Plans_and_Measurements | Floor plans, drawings, surveys, measurements |
| 04_Inspections_and_Condition | Inspections, condition assessments, QA evidence |
| 05_Scope_and_Estimates | Scopes, takeoffs, estimates, change proposals |
| 06_Contracts_and_Approvals | Agreements, executed contracts, approvals |
| 07_Financial_and_Closing | Closing statements, invoices, receipts, financial evidence |
| 08_Reports_and_Analysis | ARV, rent, underwriting, construction and investor reports |
| 09_Permits_Utilities_and_Warranties | Permits, utility records, warranties |
| 10_Exchange_and_Delivery | Deliberately generated import/export packages and delivery bundles |
| 11_Administration | Correspondence and operational supporting records |
| 12_Reference_and_Templates | Reusable templates and approved reference materials |

Use only applicable categories. New common categories require a versioned standard change; app-specific subcategories may be inserted between Category and Lifecycle. Document them locally and do not change the meaning of existing categories. Prefer the most specific category. Reusable reference documents belong to the Reference collection and normally category 12.

### Lifecycle and versions

- Originals: unaltered imported source bytes; preserve the received filename and source separately in metadata even when assigning a standard stored name.
- Working: generated drafts, analysis files, editable source, and review renditions. Preserve a new revision when saving changed bytes.
- Published: explicitly approved output versions. This means approved, not public access and not necessarily delivered.
- Archive: explicitly archived material retained under the approved retention policy. Older revisions are superseded in metadata without automatic moves.
- Imported final reports still enter Originals; their business approval state is recorded independently.
- File paths are storage placement, not workflow authority. Approval does not require moving an original or duplicating its bytes. Track approval, supersession, archive state, and current-version pointers in Supabase.
- A published rendition is immutable. A correction creates the next revision with its own review record. Avoid names such as final-final or latest; the registry identifies the current approved revision.
- Archive is not deletion. This standard introduces no automatic purge, retention period, or backup process.

### Filename grammar

`YYYY-MM-DD__document-type__<document-uuid>__v0001[__rendition].ext`

Use the UTC intake date for imports and UTC generation date for generated files; record the source document's effective date separately. Allocate revisions atomically per document, beginning v0001, increasing without reuse (expand beyond four digits if needed). One idempotency key identifies a requested document revision/rendition and reuses it on retry. Reject different bytes under the same identity.

Rendition is optional for a single file and required to distinguish same-extension outputs at one revision, e.g. signed, redacted, preview, or source. Derived/redacted renditions link to the original version and have their own access rules and byte checksums.

Machine-created slugs use lowercase ASCII letters, digits, and single hyphens. Double underscores delimit filename fields and the record-ID suffix. Keep the approved human-readable app names and fixed directory labels above unchanged. Use full UUIDs, lowercase extensions matching validated media type, a record label no longer than 40 characters, and a document-type slug no longer than 32 characters. Truncate labels only, never identifiers. Reject path separators, traversal segments, control characters, reserved device names, trailing dots/spaces, and case-insensitive collisions. Limit new relative paths under the master folder to 400 characters as an internal portability rule; reject or shorten optional labels before writing.

Example template (angle-bracket fields are placeholders, never literal stored names):

`Altus App Folder/<App>/Production/Properties/3761-jackson-st__<property-uuid>/08_Reports_and_Analysis/Originals/<document-uuid>/2026-09-20__arv-report__<document-uuid>__v0001.pdf`

### Shared documents, packages, and access

Shared Assets follows the same Environment/Collection/Record/Category/Lifecycle/Document hierarchy. Use it for material deliberately owned for shared use with an assigned steward. A document already owned by an app stays there; another app consumes its registered reference. Do not relocate a document merely because another app needs it.

A delivery/export bundle is a new derived artifact in category 10. Record a manifest of source document/version IDs, checksums, intended audience, creator, and approval. This is an intentional package, not an independent replacement for its sources.

Confidential records require actual Dropbox access controls and corresponding app authorization before delivery. Category, Published, and Shared Assets folder names never grant access. Employee/customer access remains a separately approved delivery decision.

### Registry fields and acceptance

The implementation contract must represent company/tenant scope, environment, owning app, document UUID, revision, rendition, collection and record IDs, verified cross-app mappings, category, lifecycle placement, original filename, media type, byte size, checksum algorithm/value, source/effective/intake dates, creator, approvals, access scope, staging location, Dropbox namespace/file ID/revision/path, delivery state, retries, and supersedes/derived-from references. This is a semantic contract, not permission to create duplicate tables or a new central database.

Keep processing/review state separate from delivery state. Distinguish staged, pending delivery, delivery verified, failed, and reconciliation required. A temporary URL is never the durable storage identity.

Before rollout, demonstrate deterministic paths; safe filenames; preserved original bytes; concurrent version allocation; retry deduplication; actual-path receipt persistence; authorized download integrity; denied cross-app/tenant/environment access; and truthful failure state. Existing files remain in place until a separately reviewed migration. No manual recreation of the whole tree is required from Dion.
