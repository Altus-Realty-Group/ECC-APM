# ECC Superiority Implementation Master Plan V1

Status: CANONICAL PLANNING AUTHORITY - merged through PR #103; implementation and mutation gates still require current authorization  
Product owner: Dion DePaoli  
Repository: `Altus-Realty-Group/Replit_Front_End_ECC`  
Baseline audited: `main` at `15f670a09c7a0fc029ae8e417efaddd002ba61ec` on 2026-08-04

## 1. Executive directive

ECC will become the daily operating command center for Altus property and asset operations. It will not be a decorative dashboard over DoorLoop, Property Matrix, or another vendor. External systems may temporarily execute specialized transactions behind governed adapters, but they may not own Altus canonical identity, URLs, cross-system policy, evidence, or enterprise audit history.

ECC wins by combining complete property-management operations with capabilities conventional systems do not provide: acquisition-to-disposition continuity, evidence-backed field work, governed construction handoffs, policy-aware decisions, asset health, legal readiness, and explainable next actions.

North Star:

> For every asset, ECC shows its current physical condition, financial position, contractual obligations, operating risks, missing evidence, responsible person, and next required action, and allows an authorized operator to complete that action without losing asset context.

This is an implementation program, not a claim that the capabilities below already exist.

## 2. Corrected architecture

These decisions override stale historical ECC language.

| Subject | Current decision |
| --- | --- |
| Control Plane | Existing Altus product for identity, authentication, company membership, roles, and access. It replaced the former Altus Core concept. |
| Supabase/PostgreSQL | Data-platform and database layer. It is not interchangeable with Control Plane. Exact ECC target lineage must be verified before mutation. |
| Altus Core | Not a current product or architecture component. |
| Genesis | Not an existing product, service, repository, or deployed engine. Historical Genesis documents are concept inputs only. |
| ECC | An early Altus application with its own paused/older timeline. This repo is its frontend ownership layer and contains local adapter/proxy surfaces. |
| Shared bridge/event bus | Not presumed to exist. Creating one requires a separate architecture decision, owner, repo, security model, and deployment plan. |
| Vendors | DoorLoop and any successor are replaceable processors/sources, never enterprise truth. |
| Data authority | Database first, approved API fallback second, calculation last. Calculations expose inputs, formula version, timestamp, and provenance. |

## 3. Verified repository baseline

The 2026-08-04 audit established:

- React 18, TypeScript, Vite, and `wouter`
- TanStack Query and repo-local ECC resolvers
- TanStack Table, `cmdk`, `dnd-kit`, and Altus UI primitives
- Express/TypeScript local server and adapter/proxy patterns
- database libraries are present, but package presence does not prove target or runtime authority
- Properties and Units command-surface scaffolds exist
- property, unit, lease, tenant, and owner card guardrails exist
- validation commands include `npm run guardrail`, `npm run build`, and `npm run ecc:smoke`
- `docs/roadmaps/ECC_Frontend_Genesis_Rebuild.md` is stale: wrong product assumption, outdated owner, fixed counts, old UI-library choice, and unverified architecture claims
- `AGENTS.md` requires `codex/*` branches and prohibits unapproved deployment, target wiring, Supabase, secret, and cross-repo mutations

No runtime, schema, vendor-account, or production-readiness claim is established by this documentation audit.

## 4. Definition of "better than Property Matrix"

Feature count is insufficient. ECC must complete commodity work reliably and then extend beyond it.

| Capability | Required parity | Altus superiority |
| --- | --- | --- |
| Portfolio operations | Search, saved views, bulk actions, history | One asset context from acquisition through disposition |
| Accounting | Double-entry books, subledgers, AP, reconciliation, statements, close | Every amount traces to source, evidence, approval, bank state, and asset strategy |
| Leasing | Applications, leases, charges, receipts, notices, renewals | Decisions tied to market, condition, policy, and verified economics |
| Maintenance | Intake, assignment, schedule, invoice, payment | Field evidence, cost governance, construction escalation, recurrence, and asset impact |
| Portals | Tenant, owner, and vendor self-service | Permission-filtered commands over the same canonical records |
| Communications | Templates, messages, delivery state | Conversation-to-action linkage with official M365 channels and evidence retention |
| Documents | Templates, signatures, indexed files | Evidence graph, lineage, retention, legal packets, and portable export |
| Reporting | Operational and financial report library | Governed report builder, asset health, capital outlook, and exception intelligence |
| Automation | Scheduled and event-driven actions | Versioned, explainable workflows with authority, approval, conflict, retry, and rollback |
| Audit | Edit history | Immutable command history with actor, authority, reason, delta, evidence, and correlation ID |
| Ecosystem | Integrations | Explicit handoffs among Altus apps without identity or evidence loss |

ECC may be called superior only after a scored acceptance run proves:

1. Application through active lease completes without an off-system spreadsheet.
2. Maintenance intake through approved payment completes with linked evidence.
3. Month-end reconciles property, owner, tenant, deposit, bank, AP, and GL balances.
4. Owners can trace statement figures and see asset health and capital needs.
5. Tenant, owner, and vendor portals complete their primary workflows safely.
6. Executives see financial, legal, vacancy, evidence, maintenance, and capital exceptions in one queue.
7. Auditors can reconstruct every material mutation.
8. A vendor adapter can be replaced without changing canonical IDs or frontend URLs.

## 5. Permanent system boundaries

| System | Permanent responsibility | ECC relationship |
| --- | --- | --- |
| Control Plane | Identity and access | ECC consumes verified auth context; it does not duplicate identity authority. |
| Supabase/PostgreSQL | Approved canonical operational data | ECC uses verified contracts and authorized server paths only. |
| ECC | Daily property/asset operating command center | Owns operator UX, asset context, exceptions, and governed property-management commands. |
| Price Engine | Underwriting, pricing, scenarios | Approved acquisition assumptions hand off to ECC; ECC does not reimplement underwriting. |
| Deal Room | Brokerage, offers, closings, investors/capital | Approved transactions hand off parties, asset, terms, documents, and decisions. |
| Field App | Field facts, inspections, media, measurements, QR evidence | ECC issues/consumes commands and evidence; it does not invent field facts. |
| Construction Manager | Rehab and capital projects | ECC escalates qualifying work and consumes schedule, cost, evidence, and acceptance. |
| Mission Control | Software delivery and governance | Tracks engineering state; it is not ECC business-data storage. |
| BluePrints | SOPs, training, institutional knowledge | ECC links contextual approved knowledge. |
| Microsoft 365 | Official email, calls, meetings, collaboration | ECC links approved server-side metadata/actions without exposing credentials. |
| DoorLoop/successor | Temporary/specialized transaction execution | Governed vendor-neutral adapter only. |

Boundary changes require an architecture decision record.

## 6. Target architecture and data model

### Experience layer

- role-based home and exception inbox
- global search and command palette
- Type A operational tables, Type B dashboards, Type C Asset Cards/workflows
- tenant, owner, and vendor portal views
- accessible responsive black/white/graphite/gold layouts; orange is prohibited

### ECC application layer

- typed frontend adapters, response envelopes, query keys, and provenance
- idempotent command handlers and server-side authorization
- Control Plane-derived scopes and permission-denied states
- validation/state-machine enforcement
- server-side integrations, jobs, retries, and audit/command emission
- no privileged vendor, database, Microsoft, payment, signature, or admin credentials in the browser

### Canonical data layer

Before schema work, verify exact Supabase project, environment, owner, migration ledger, schemas, RLS, and consumers. Required domain groups:

- companies, legal entities, portfolios, properties, units, ownership interests
- people, organizations, owners, applicants, tenants, occupants, vendors, contacts
- applications, screening status, leases, renewals, notices, move events
- tasks, work orders, inspections, estimates, bids, approvals, invoices, appointments
- books, accounts, periods, journals/lines, subledgers, charges, receipts, bills, payments, refunds, credits, deposits, reconciliations
- bank accounts, statement imports, matches, reconciliation sessions, exceptions
- communications, participants, templates, delivery, consent, retention
- documents, versions, signatures, evidence, classifications, retention holds
- policies, versions, applicability, conflicts, exceptions, overrides, approvals
- legal cases, notices, deadlines, service proof, balances, filings, packets
- insurance, utilities, registrations, compliance obligations
- onboarding, construction handoffs, operating/capital plans, refinance, disposition
- commands, jobs, integration events, retries, errors, audits, correlation lineage

### Vendor-neutral integration

External mappings use `system`, `entity_type`, `canonical_id`, `external_id`, `external_parent_id`, `external_version`, `external_updated_at`, ingestion/writeback timestamps, sync/reconciliation state, and source hash.

Flow:

1. Store restricted raw payload, timestamp, and hash.
2. Validate and normalize into approved contracts.
3. Preserve external mapping without exposing it as frontend identity.
4. Detect conflicts, deletes, stale state, and incompatible versions.
5. Queue authorized writes with idempotency key, before state, mutation, and correlation ID.
6. Execute server-side, record response/retry/reconciliation, and surface exceptions in ECC.

Direct browser-to-vendor mutations are prohibited.

## 7. Core product modules

### Operator home

Personal, team, and executive queues must show late, blocked, unassigned, financially imbalanced, legally exposed, evidence-deficient, approval-pending, and deteriorating assets, with owner, due date, SLA, escalation, bulk actions, calendar, and command history.

### Unified Asset Card

Property-centric context with unit, lease, tenant, owner, vendor, and project switching. Required tabs: Overview, Operations, Leasing, Financials, Construction, Legal/Compliance, Communications, Files/Evidence, Policies, and Audit. The right rail always shows asset health, financial exceptions, legal deadlines, evidence gaps, approvals, and next actions.

### Leasing and resident lifecycle

Application intake, screening status, decision proof, lease generation/signature/activation, charges, receipts, delinquency, payment plans, notices, renewals, move-in, condition attestation, requests, move-out, deposit disposition, damages, collections, and archive.

### Maintenance, field, and vendors

End-to-end chain:

`request -> triage -> responsibility -> approval -> vendor -> schedule -> evidence -> invoice -> payment -> communication -> close -> recurrence analysis`

Include emergency classification, duplicate detection, warranty/policy, vendor qualification/insurance/rate cards, bids, Field App proof, change control, Construction Manager escalation, root cause, tenant impact, and asset impact.

### Financial control plane

Required: entity books, canonical COA, balanced double-entry journals, property/unit/lease/tenant/owner/vendor/project dimensions, tenant/deposit/owner/AP subledgers, charges/receipts/bills/payments/credits/refunds/fees/draws/distributions, bank reconciliation, trust/deposit liability controls, ownership percentages/reserves/contributions, management fees, statements, budgets, forecasts, financial reports, periods/locks, approvals, reversals, and source-to-bank traceability.

No destructive posted-journal edits. Corrections use reversal and replacement. Financial authority begins only after approved shadow reconciliation.

### Communications and documents

Channel-independent conversations, approved server-side M365/SMS/portal adapters, consent/opt-out/delivery/failure, approved templates, contextual links, document generation/signature, retention, legal hold, and portable evidence export. M365 remains the official enterprise communication platform.

### External portals

- Tenant: balance, payments, lease/docs, maintenance, appointments, notices, condition attestation
- Owner: statements, cash, approvals, contributions/distributions, docs, health, capital outlook
- Vendor: work, scheduling, scope, messages, evidence, invoices, payment/compliance status

Portals are permission-filtered views/commands over canonical records, not separate truth.

### Legal, compliance, reporting, and intelligence

Indiana-reviewed notice/deadline workflows, case/service evidence, court/attorney packets, insurance/registration/inspection obligations, governed report catalog/builder, semantic metric registry, reproducible snapshots, anomaly/exception detection, asset health, capital outlook, and vendor performance.

AI remains advisory until explicitly granted bounded authority. Recommendations show source evidence, confidence, policy, and approval state.

## 8. UX, security, and integrity standards

Shared components must cover application shell, entity context, search/command palette, saved grids, forms/validation/approvals, provenance/freshness, financial/reconciliation tables, command timeline, evidence viewer, policy rail, maps/floor plans/media, and job/exception status.

All workflows include loading, empty, stale, partial, offline, permission-denied, conflict, retry, and error states. Primary workflows target WCAG 2.2 AA.

Every mutation records actor, subject, membership, role/action authority, scope, reason, before/after or delta, source/version, evidence, idempotency key, correlation ID, timestamp, and result.

Controls: deny by default; server-side authorization; aligned RLS/API enforcement; segregation of financial/legal duties; managed credentials; audit-safe support; replay/rate/session protection; PII/financial minimization and retention; CI scans for secrets, contracts, migrations, authorization, dependencies, and accessibility.

## 9. Delivery program

Work ships in narrow slices that normally complete in minutes or hours. Recheck fast CI at short intervals and act on failures; do not manufacture hour-long idle gaps.

### Phase 0 - Recovery and truth

- `ECC-R0-01`: inventory routes, pages, components, resolvers, server endpoints, env names, migrations, workflows, tests, and abandoned paths
- `ECC-R0-02`: verify runtime repo/branch/SHA and authenticated route inventory
- `ECC-R0-03`: separately authorized read-only Supabase lineage/schema metadata audit
- `ECC-R0-04`: vendor integration and mutation-capability inventory without secret exposure
- `ECC-R0-05`: reconcile historical claims against code, DB, API, runtime, and vendor proof
- `ECC-R0-06`: capability registry using `WORKING`, `PARTIAL`, `SCAFFOLD`, `STALE`, `PROPOSED`, `BLOCKED`

Exit: exact targets, owners, maturity, missing contracts, and prioritized defects are proven.

### Phase 1 - Foundation

- roadmap/ADR/capability registry; Altus design tokens; shell/navigation/context/search
- Type A grid with saved views, filters, selection, bulk actions, export, URL state
- typed envelope/error/provenance/freshness contracts
- role-aware routes, safe-off flags, permission states
- CI proof for build, typecheck, lint, unit, route smoke, accessibility, visual checks

Exit: verified read paths work and missing contracts fail honestly without fabricated values.

### Phase 2 - Daily command center

Personal/team/executive exceptions, tasks, owners, dates, SLAs, escalation, approvals, saved views, bulk commands, calendar, job/retry/sync state, and daily/weekly/month-end queues.

Exit: operators find, assign, act on, and prove every critical exception from one place.

### Phase 3 - Unified Asset Card

Property shell/right rail, entity switchers, all required tabs, evidence completeness, next actions, relationship graph, and acquisition-to-disposition timeline.

Exit: material records/actions are reachable in seconds with no external IDs in routes.

### Phase 4 - Leasing and tenant lifecycle

Application through move-out, deposit disposition, damages, collections, and archive.

Exit: standard resident lifecycle completes without a spreadsheet or unlinked document.

### Phase 5 - Maintenance/field/vendor lifecycle

Request through evidence, approved invoice/payment readiness, communications, construction escalation, closure, and recurrence.

Exit: every material work order links responsibility, proof, cost, approval, payment, and asset impact.

### Phase 6 - Financial shadow ledger

- approved accounting architecture and authority matrix
- journal engine and reversal rules
- tenant/lease/deposit/owner/vendor/AP subledgers
- complete transaction set, bank matching/reconciliation, statements/reports
- opening balances, history, vendor-to-ECC shadow comparison, exception queue

Exit: three consecutive approved closes reconcile by bank, book, property, owner, tenant, deposit liability, AP, and GL. Tolerance is zero unless an exception class is explicitly approved.

### Phase 7 - Portals, communications, documents, payments

Persona portals, server-side communications, templates/consent/delivery, documents/signatures, payments, support, and audit/evidence exports.

Exit: each persona completes top workflows with correct boundaries, mobile usability, delivery proof, and canonical updates.

### Phase 8 - Legal, compliance, reporting, automation

Reviewed workflows, deadlines/service proof, packets, compliance calendar, metrics, report builder, snapshots, health/capital/anomaly intelligence, versioned policies/workflows, approvals, conflicts, retry, rollback, and AI advisory proof.

Exit: workflows are versioned, explainable, appropriately reversible, and fully evidenced.

### Phase 9 - Vendor independence and cutover

For each capability: identify authority/export; prove mapping/history; run read/shadow; reconcile; pilot limited portfolio; obtain operations/accounting/security/legal approval; cut over with rollback; verify; revoke obsolete write paths; retain exports/evidence. No big-bang migration.

## 10. Cross-application handoffs

Every handoff includes canonical IDs, source/destination, decision/authority, state/time, assumptions/version, documents/evidence, responsible party, acceptance, retry/error, and correlation/command lineage.

Priority: Deal Room closing -> ECC onboarding; Price Engine scenario -> ECC baseline; ECC capital work -> Construction Manager; Construction Manager completion -> Field App acceptance -> ECC operations/accounting; ECC inspection -> Field App evidence; ECC disposition -> Deal Room.

## 11. Definition of done

Each slice proves applicable items:

- exact base/head SHA and narrow affected-system scope
- typed contract or explicit no-contract-change statement
- separately authorized migration/rollback if needed
- authorization and negative-access tests
- database/API/calculation provenance and null/zero/stale/partial/conflict/error behavior
- unit, integration, route smoke, E2E, accessibility, responsive, and visual proof as applicable
- idempotency/replay/reconciliation and audit-event proof for mutations/integrations
- docs, ADR, capability registry, and operator SOP updated
- CI green on exact head and runtime proof only after SHA alignment

Screenshots never override CI, code, database, API, or aligned runtime evidence.

## 12. Initial reliability targets

- p95 cached command-center view under 2 seconds on supported desktop broadband
- p95 interactive filtering under 300 ms after data availability
- background command status visible within 5 seconds
- no silent mutation failure; every failure has retry/owner/correlation state
- currency as integer minor units or approved exact decimals, never binary floating point
- UTC storage with explicit display timezone
- zero unauthorized cross-company/property exposure in automated tests
- recovery/availability objectives defined before financial authority

## 13. Dion approval gates

This plan does not silently decide:

- exact ECC Supabase target and schema ownership
- whether ECC is resumed in place, rebuilt, renamed, or decomposed
- first vendor capability to replace
- books, accounting method, trust structure, processors, cutover criteria
- payment/e-signature vendors and portal launch order
- approved Indiana legal templates/reviewer
- whether a shared integration service is justified
- production pilot portfolio and cutover windows

Agents may prepare evidence and options, not infer approval.

## 14. Next-AI pickup instructions

After this plan is merged:

1. Read `AGENTS.md`, this file, and `docs/roadmap/CANONICAL_COMPONENT_ADOPTION_PLAN.md` completely.
2. Verify current `main` SHA and this file on that baseline.
3. Open one narrow `codex/*` branch for `ECC-R0-01` only.
4. Produce a code-backed inventory of routes, pages, resolvers, server endpoints, adapters, env variable names, workflows, scripts, tests, migrations, stale code, and runtime assumptions.
5. Publish a capability registry with file evidence and maturity labels; do not mutate DB or deployment.
6. Run guardrail, build, and route smoke; report missing typecheck/lint/test coverage honestly.
7. Open a draft PR with exact base/head, proof, findings, and the next smallest executable slice.
8. Continue recovery in short increments and act immediately on failed checks.

First recommended post-recovery implementation: `ECC-F1-01`, consolidating roadmap index, ADRs, capability registry, and stale-document classifications without changing runtime, adapters, database wiring, or deployments.

## 15. Authority statement

This is the proposed master ECC roadmap. Historical files are provenance, not proof. Conflicts with current Dion decisions, repository instructions, code, database metadata, authenticated APIs, or aligned runtime evidence must be surfaced and reconciled.

The goal is not an ECC that merely looks better. It must operate better: complete workflows, defensible financial integrity, faster exception resolution, stronger evidence, safer permissions, clearer ownership, and vendor independence across the Altus asset lifecycle.
