# ECC-native Legal Operations product contract

Status: source specification and intake preview; no live legal API or product UI
acceptance. Sponsor: Dion. Existing domain: U08 / issue197, campaign171.
Work queue: [launch and legal slices](../work-orders/ECC_LAUNCH_AND_NATIVE_LEGAL_20261110.md).

## Ownership and workflow

ECC owns internal case state, party participation, tasks, court-event tracking,
evidence review, judgment accounting and attorney packet preparation. DoorLoop
may supply governed tenancy, property, owner, lease, ledger and payment references.
It is not the litigation engine or a source of court-entered judgment status.
Court orders/dockets control legal disposition; approved accounting evidence
controls judgment entries. Preserve differences for reconciliation.

A matter can have no tenant, multiple parties, multiple properties and multiple
awards. A party can participate in several matters. A joint award is counted
once, regardless of the number of liable parties. An owner/property-management
relationship does not establish legal creditor identity. Do not merge records
by caption, person name, email, property address or amount.

Keep these dimensions separate, with actor/source/time history:

| Dimension | Meaning |
| --- | --- |
| Matter lifecycle | Intake, assembly, attorney review, filed, court activity, disposition, closed; reviewed reopen/stay/appeal/transfer/archive |
| Judgment verification | None known, alleged, order located, court-verified monetary award, disputed, stayed/vacated, satisfied |
| Collection readiness | Missing evidence, accounting reconciliation, legal review, approved referral, enforcement, payment plan, collected, no further action |
| Evidence confidence | Filename hint, content reviewed, signed/file-stamped copy verified, docket validated, attorney confirmed |

Lifecycle labels are proposed domain values, not a claim that current database
constraints support them. Claude L1 must resolve both existing case-type checks,
identity uniqueness and company scope before any authoritative write.

## Existing code and database reuse

Source entry point: /ops/legal/case-manager and LegalCaseManagerPage. Reuse
OperationsRecoveryPage/operationsRegistry, session-bound query-cache safeguards,
CardShell/CardPanel, existing linked-card conventions and the common dense table
and navigation system. Preserve the unverified-domain gate until a real producer
is accepted. Existing property/unit/lease/tenant/owner Legal tabs must consume
the same native legal contract rather than independent case copies.

Live candidates include legal_cases, legal_case_events, case_history, case_tags,
two differently typed staging models, files/file_assets/tasks and audit tables.
Their existence does not establish a writable service or a scoped API. In the
read-only census, legal_cases and events/history/tags contain no rows; the older
integer-based staging table has216rows. Do not delete or import over those rows.
Review source identity, consumer lineage and the actual UUID crosswalks first.

## Dashboard and asset cards

The Legal Command View must let an operator select a metric or queue item and
open the relevant filtered records. Black/white/gold; no orange. Use ECC's shared
shell and legible controls at desktop and390px. Avoid a dashboard of unclickable
KPI decorations.

| Surface | Required behavior |
| --- | --- |
| Legal dashboard | Open matters by category, sourced upcoming court events, action queue, attorney-review queue, unverified orders and source age |
| Financial measures | Verified award balances as of a named date, counted once per award; unverified claims shown separately with coverage |
| Matter register | Search/filter by caption, docket, creditor, property, attorney, type, lifecycle, verification and readiness; real total versus loaded count |
| Matter asset card | Caption, matter type, verified court/creditor, related parties/properties, source state, assigned owner and next action |
| Card tabs | Overview, Timeline, Documents, Judgment & Ledger, Tasks/Missing Evidence, Correspondence, Court Events, Attorney Packet and Audit |
| Related asset cards | Same case references on authorized property, unit, lease, tenant and owner cards using explicit ID crosswalks |
| Central missing records | One cross-case queue of requirements, responsible actor/queue, source status and aging only from known dates |
| Collections workbench | Only evidence-verified and expressly approved obligations; balances/approvals/source dates visible; no automatic enforcement |

On this supplied snapshot the legitimate initial financial display is **Not
verified / Not reported**, not a manufactured $0 receivable. A count of zero
verified awards can be shown only with its coverage/source context; it does not
mean no legal judgments exist. All27source rows are preliminary matters.
An OPEN request with no request/due date must not become overdue automatically.

API errors, no records, partial results, lack of permission, stale data and missing
data are different states. Source/current-company context changes must purge
private cached rows, selections, search results and open document previews.

## Proposed contract surfaces

Define versioned schemas before Grok binds them; names below are proposed schema
names, not new deployed endpoints. Include authorized stable IDs, nullable facts,
source/as-of/coverage, revision tokens and trusted allowed actions.

- LegalDashboardV1: counts by dimension, dated court events, actionable queues,
  verified balance/coverage and separate unverified-source counts.
- LegalMatterSummaryV1 / LegalMatterDetailV1: internal UUID, source maps, safe
  caption, dimensions, parties/capacities, relations, court/creditor evidence,
  timestamps and revision. Internal card IDs are not workbook JC identifiers.
- LegalRequirementV1: linked case/source row, requirement type/description,
  missing versus unverified reason, source status, verified actor assignment,
  known dates only, evidence resolution and revision.
- LegalEvidenceReferenceV1: immutable document/version ID, provider ID/revision,
  source/copy relation, classification/confidence and access label. Restricted
  filenames and URLs must be absent for unauthorized actors.
- LegalJudgmentLedgerV1: one award and obligations; immutable entries/reversals,
  explicit currency units, authority/provenance, as-of date and reconciliation.
- LegalAttorneyPacketV1: internal-review snapshot, chronological manifest,
  unresolved gaps, access-specific exhibit set and export/audit receipt.

Writes require server-side actor/company/case authorization, concurrency checks,
transactional audit, returned revision, cache invalidation and reread/reload proof.
Never accept company authorization from a query parameter or editable user claim.
Do not solve missing actor authority by adding public/service-key browser access.

## Evidence and file organization

Preserve the approved existing debtor/matter-first Dropbox archive, with these
sections where useful: case summary; court filings/judgments; applications/ID;
lease/contracts; financial ledgers; damage evidence; notices/correspondence;
collections/enforcement. Multiple legal cases for the same debtor must have
distinct immutable case identities even if the human filing labels overlap.

The central missing-record register is an ECC view, not a missing-documents
folder. Preserve originals, source filenames and source-to-copy links; no mass
move or rename. Existing historical folder placement is an explicit case-specific
exception. Future app-managed outputs follow the common storage hierarchy without
relocating this archive implicitly.

Discover actual provider file IDs/versions/hashes with fresh inventory and cursor
receipts. Folder counts do not create file records. Filename heuristics can
suggest sections but cannot verify a signed/entered order or decide a legal state.
Support duplicate/conflicting/proposed/signed/entered evidence review explicitly.
Restricted IDs/applications require independent entitlement for listing, search,
preview, download and export; a UI-hidden button is insufficient protection.

## Intake and verified financial accounting

The source mapping and aggregate dry-run live in
SOURCE_IMPORT_PREVIEW_20261110.json. The offline preview command validates exact
headers, preserves blank versus actual zero, and deduplicates identical embedded
and standalone requirement rows while retaining both provenance references.

Temporary matter keys use a stable logical source namespace. File hash, worksheet,
row number and exact row-payload hash provide revision evidence. Durable ECC IDs
are generated/reused only through the eventual accepted source map and reviewed
import transaction. Requirement wording/target changes need persisted source-map
and conflict review: description-based preview keys are NOT a complete automatic
cross-revision matcher. No workbook caption is an identity match.

The27folder summaries are not per-file manifests. Their historical totals207
conflict with the handoff's later206evidence count. Preserve the discrepancy until
a fresh Dropbox reconciliation explains it. No raw client payloads enter GitHub.

Judgment accounting requires entered-order/creditor evidence and approved ledger
entries. A snapshot total payment is not a payment history; balance-at-filing is
not a judgment award. Source amounts, including explicit zeros, stay unverified
until reviewed. Payments/credits/fees/interest require authority and provenance;
reversals reference immutable originals. Do not apply a default interest rate,
filing deadline or recovery forecast from general assumptions.

## Attorney packets and acceptance

Internal-review packets include caption/court/parties and capacity, verified
orders, ledger as-of/reconciliation, chronology, evidence manifest, gaps and
referral authorization. Export only for an authorized internal reviewer with
scope-specific exhibits. Sending to counsel, debtor contact, public sharing,
court filing and enforcement are separate expressly approved actions.

Acceptance requires actual authorized case creation/linking, reviewed evidence,
task resolution, source-backed events, ledger reversals, internal packet export,
audit and reload persistence. Prove wrong-company/denied/revoked/stale-session,
restricted-file-ID guessing, API failures, cursor retry and desktop/mobile behavior.
Use sanitized repository fixtures; review ambiguous real matters privately.
No production import, schema/access mutation, deployment or attorney send occurs
from this source-preparation PR.
