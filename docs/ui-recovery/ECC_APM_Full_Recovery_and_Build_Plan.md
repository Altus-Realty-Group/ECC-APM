> Repository execution note (2026-11-16): this is the current detailed recovery/design specification, maintained with the existing recovery plan PR. Read section 14 for the consolidated revision 1.2 decisions, the [review/change safety protocol](UI_REVIEW_AND_CHANGE_SAFETY.md), and the [execution index](README.md). The merged product master plan and verified contracts retain their authority. Design approval remains pending. Publishing this plan does not activate any UI, database, provider or deployment work. Existing semantic/categorical chart rules are preserved; presentation is not restricted to grey/gold series.

# ECC APM V1.0 — Full Recovery and Build Plan

**Prepared for:** Dion DePaoli, Altus Property Management  
**Date:** November 16, 2026, America/Chicago  
**Revision:** 1.2 — consolidated advisor decisions, scope-aware actions, compact context and explicit state presentation; proposed for review  
**Scope:** Entire ECC application, historical UI recovery, operating workflows, Supabase/DoorLoop integration, files and cross-app handoffs.  
**Approval status:** This plan is presented for review. The rejected rendering sets are not approved design references. Creating this plan does not apply migrations, deploy, activate integrations or send communications.

## 1. The corrected build objective

Recover the richer ECC work from the original Replit builds, retain its information depth and established identity, and complete the system around real operational data and end-to-end workflows.

The dashboard must remain a portfolio command surface with a prominent property map, KPI indicators, financial charts, occupancy intelligence, leasing performance and an actionable operating feed. Communication, notices, payment plans, construction coordination and servicing history extend that dashboard. They do not replace it with a queue and a handful of statistics.

This plan covers the dashboard, all portfolio lists, every asset card and existing tab, operations, accounting, legal, maintenance/construction, communications, marketing, reports, analytics, investor screens, Data Hub, Systems and integration screens. It includes existing planned destinations and hidden recovery utilities, with separate readiness and access requirements.

**Retention rule:** Every recovered information capability has a destination in this plan. No chart, map, field group, action category or screen is removed merely because its feed is incomplete. A data gap is recorded and repaired. Duplicate presentations may share a component or view, but the capability and its entry point remain identifiable.

## 2. Fixed constraints — navigation, logo and theme do not change

| Fixed element | Build instruction | Acceptance evidence |
|---|---|---|
| Navigation groups, labels, order, icons and paths | Reuse `src/config/navigation.ts`, Sidebar and WorkspaceBar. Do not substitute a smaller icon rail, rename Leases to Agreements, rearrange groups, or introduce competing navigation. | Compare the resolved navigation manifest against the frozen baseline. |
| Existing availability and hidden entries | Preserve current flags during development. Completed planned destinations can be prepared behind the existing entry; activation of that entry belongs in the explicit release/readiness decision. Do not promote stubs or hidden/admin/transfer routes silently. | Availability and hidden-route diff reviewed separately from screen content. |
| Existing record tab labels and sequence | Preserve property, unit, lease, tenant, owner and legal sequences listed in section 6. Communication/work/history components are within the content area, not substitute tab systems. | Tab identity/order checks and direct-link/return-context proof. |
| Altus logo | Reuse `/brand/altus-logo.png` and `/brand/altus-mark.png` in the existing shell. Do not redraw the logo, replace it with a text wordmark, alter proportions/colors or introduce a new badge. | Asset digest and visual shell comparison. |
| Altus theme principles | Black, white and gold; no orange. Preserve the current established token system, typography hierarchy, panel treatment, spacing principles, semantic state colors and responsive shell behavior. | Token/style review plus desktop/narrow comparison. |
| Shell ownership | Reuse Sidebar, WorkspaceBar, existing page shell and navigation behaviors. Improve content inside them. No new global shell or unrelated route migration. | Existing route, collapse/flyout, keyboard and page-switch behavior retained. |
| Business data | Database first, authoritative API fallback second, calculation last. No generated operating values, random sparklines or missing-as-zero assumptions. | Source and reconciliation evidence per metric/workflow. |

Legacy exports contain multiple themes, obsolete navigation and old Azure references. Those are recovery evidence, not authority to overwrite these fixed constraints. If existing theme aliases conflict, resolve the actual cascade and reuse the approved result; do not create a new palette.

## 3. Verified recovery evidence and current-state limits

### 3.1 Original builds inspected

Read the extracted frontend files from Dropbox **ECC Reload**:

- `EstateCommand2/EstateCommand/src/features/dashboard/pages/DashboardPage.tsx`: full-width KPI ticker; 2:1 property map and priority feed; financial/leasing charts; city occupancy table. `src/styles/Dashboard.css` confirms that composition.
- Estate dashboard components: KPI ticker, map, priority feed, action center, financial snapshots, cash-flow/leasing composition, leasing funnel, city occupancy and occupancy breakdown.
- `EmpireCommandCenter1/EmpireCommandCenter/client/src/pages/CommandCenter/DashboardPage.tsx`: enhanced KPIs, portfolio health, delinquency, underperforming properties, vacancy hotspots, leasing momentum, quick actions/activity/alerts.
- Empire modules include new-lease trends, expirations, churn, unit distribution, portfolio trends and placeholder concepts for maintenance velocity/conversion.
- `AltusCommand3/AltusCommand/src/pages/dashboard/index.tsx`: linked Properties, Units, Tenants, Leases and Owners counts and entity-card entry points. Its alternate Dashboard.tsx is explicitly unused.

Source existence is not proof of historical runtime correctness. Some old calculations were explicitly mocked; some old entry wrappers were incomplete. Recover the information, visuals and intended controls selectively. Do not execute old install/restore scripts or revive legacy runtime wiring.

The detailed D01–D20 inventory is [original-build recovery inventory](ECC_Dashboard_Original_Build_Recovery_Inventory.md). This plan carries those requirements forward.

### 3.2 Current implementation evidence

The available ECC checkout is main commit `bae057406b728cb0840a1c3afcd55f5bb6767876`. The current GitHub main dashboard file and navigation file were also fetched during this review; their content confirms the restricted dashboard and navigation inventory. A file being registered/routed does not mean its backend or full workflow works.

The source navigation resolves to **13 groups, 58 destinations**: **20 existing navigation entries and 38 planned/unavailable destinations**. `src/App.tsx` contains **33 explicit route paths**, including card/detail routes, root and hidden utilities.

The database architecture record is explicitly incomplete/unverified for live ownership and binding. Consequently, proposed database objects and provider actions below require contract discovery before implementation. No claim is made here that a working inbox, provider write API, dispatch system, complete finance feed or cross-app handoff already exists.

## 4. Information plan before visual composition

### 4.1 Recovered dashboard information contract

| Area | Information retained | Decision and control | Data requirement / completion condition |
|---|---|---|---|
| Portfolio context | Managed properties, rentable units, occupancy, agreement/party/owner context | Open the exact scoped population | Accepted management/ownership/occupancy definitions; source coverage, effective dates and IDs |
| KPI indicators | Occupancy; ready/vacant; collections MTD; critical work; sourced receipts/AR/NOI where available | Drill from signal into accountable work | Separate metric contracts; currency, denominator and period; no inferred rent readiness or arbitrary ratios |
| Property map | Asset locations, selected record, status layers, geographic scope | Select asset, inspect context, open record or location work | Verified coordinates and scope; missing coordinates shown in a list, not fabricated pins |
| Priority feed | Delinquency/account concerns, expirations, urgent maintenance | Review source, contact authorized parties, prepare terms or assign work | Real record links, responsible party, reason, age, source status and permitted actions |
| Financial charts | 90-day income/expenses/NOI; longer income/expense comparison; value versus debt | Inspect variance, period, source entries or capital exposure | Accepted receipts/expense basis; valuation date/method; sourced debt; unknown history stays unknown |
| Occupancy intelligence | Distribution, historical observations, city table and totals | Identify deteriorating assets, concentrations and missing classification | Matched population/time basis; occupancy separate from readiness and construction |
| Property exceptions | Underperforming properties and vacancy hotspots | Open property/unit with reason and next review | Explicit ranking rule, exclusions, ties and data completeness |
| Leasing performance | Funnel, new leases, term-end buckets, renewals and churn | Follow up leads/showings, review terms, inspect move-outs | Cohort/period/stage definitions, effective dates and nonduplicated outcomes |
| Maintenance performance | Critical work, aging, assignment, acknowledgment, completion, reopen | Resolve stalled work and capacity constraints | Accepted task/work-order owner, event timestamps, priority and completion evidence |
| Recent activity | Actual servicing events and current commitments | Resume work and understand change | Actor, occurred/recorded dates, scope and durable source references |
| New operating controls | Two-way comms, notices, plans, approvals and cross-app handoffs | Act in context without replacing analytics | Typed Altus workflows, recipient permissions, versioned evidence and command status |

### 4.2 Proposed composition, using the original dashboard structure

1. Existing shell, logo, title, portfolio scope/date controls and compact freshness state.
2. Original KPI ticker and portfolio overview information, coordinated to avoid repeating identical values in multiple rows.
3. Estate's large property map and adjacent priority action feed. Extend the feed with communication, notice-review and approval categories. Keep the map prominent.
4. Financial/leasing row: income/expenses/NOI chart and leasing funnel, with their retained range controls.
5. Portfolio health and exceptions: occupancy distribution/history, underperformers and vacancy hotspots. Preserve Empire's richer performance concepts.
6. Leasing momentum: new leases, expirations, renewal progress and churn, with explicit time basis.
7. City occupancy table and capital/value-debt view; maintenance performance and attributable recent activity remain accessible within the dashboard composition.
8. Contextual work/conversation/history opens only when relevant. It does not consume permanent space at the cost of the map or charts.

This is a content/composition plan, not a new theme. A long dashboard may use existing in-content view controls and progressive disclosure while retaining discoverable sections. Do not move most intelligence behind an unrelated landing page or replace it with empty placeholders. The acceptance review will include a retained/recovered/improved checklist for all twenty recovery areas.

### 4.3 Common information and interaction rules

Every screen specification identifies: operator, question/decision, required fields and units, relationships, source/basis, filters, primary/secondary actions, workflow states, evidence/files/history, empty/partial/stale/denied states and narrow-screen behavior. Define those before selecting widgets.

A chart needs a reason, source, period/cohort, series/legend, null behavior, accessible table and scoped action. A carousel is suitable for photos or user-selected summaries; it cannot hide unanswered items, critical work or relevant deadlines. Tables provide search, sort, filter, per-record actions and preserved position.

One servicing/work object appears across its related screens as projections, not copied records. Ordinary correspondence, formal notice versions, issue/delivery attempts, service evidence and legal matters remain distinct linked objects.

## 5. Full existing navigation screen inventory

**Status labels describe source navigation, not production readiness.** All listed screen bodies are included in the full build scope. Existing planned labels and paths remain unchanged; no new navigation is proposed. Functional requirements and target build packages follow each entry.

### Command center

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S01 · Command center | `/dashboard` · existing navigation entry | Recover the full dashboard in section 4, including map, analytics, priority work and existing scopes/ranges. | UI01–UI03 |

### Portfolio

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S02 · Properties | `/portfolio/properties` · existing navigation entry | Search/filter managed and historical assets by owner, type, city, lifecycle and source conflict; show unit inventory, occupancy, operating context and canonical card links. | UI04 |
| S03 · Units | `/portfolio/units` · existing navigation entry | Search/sort/filter spaces by property, occupancy, readiness, construction and current agreement; distinguish unknown status; open unit and linked work. | UI04 |
| S04 · Leases | `/portfolio/leases` · existing navigation entry | Preserve Leases navigation; display typed agreement badges, actual parties/capacities, term dates, obligations and next review; filter conventional leases/options/CFDs. | UI04 |
| S05 · Tenants | `/portfolio/tenants` · existing navigation entry | People/tenancy directory with primary contact, contractual capacity, active/historical relationships and authorized contact channels; no unclassified prospect promoted to debtor. | UI04 |
| S06 · Owners | `/portfolio/owners` · existing navigation entry | Ownership entities/contacts, effective interests, linked assets, management agreement coverage, approval/reporting work and restricted financial drill-down. | UI04 |

### Reports

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S07 · Overview | `/ops/reports` · existing navigation entry | Report catalog and operational reporting hub with scope, period, source completeness, saved definitions and exact permission boundaries. | UI13 |
| S08 · Create | `/reports/create` · existing navigation entry | Choose report type/scope/period, preview source coverage, prepare versioned output, review and generate with retained filter/basis metadata. | UI13 |
| S09 · Saved | `/reports/saved` · existing navigation entry | Search saved definitions and generated versions; inspect source snapshot, status, author, authorized download and delivery history. | UI13 |
| S10 · Templates | `/reports/templates` · existing navigation entry | Manage approved report templates, versions, fields, required sources and retirement; preview before adoption. | UI13 |

### Operations

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S11 · Operations | `/ops/operations` · existing navigation entry | Cross-domain assigned work, dependencies, internal targets, approvals and escalations; launch/resume scoped playbooks and preserve return position. | UI10 |

### Legal Tracker

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S12 · Case Manager | `/ops/legal/case-manager` · existing navigation entry | Altus-owned matter list with parties/capacities, asset/agreement links, type, stage, evidence gaps, responsible team and verified dates; open the existing matter route. | UI09 |
| S13 · Advanced Legal Ops | `/ops/legal/advanced` · planned / unavailable | Supervisory legal operations: review queues, evidence/counsel referrals, unresolved execution/service issues and approved next steps; no automatic remedy selection. | UI09 |
| S14 · Legal Docs | `/ops/legal/docs` · planned / unavailable | Versioned legal documents, notice originals, court records, service proof and packet associations with restricted access and source provenance. | UI09 |
| S15 · Attorney Reports | `/ops/legal/attorney-reports` · planned / unavailable | Counsel-specific authorized report/packet review, missing items, manifest/version, delivery acknowledgment and returned outcomes. | UI09/UI13 |

### Construction & Repair

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S16 · Work Orders | `/ops/maintenance/work-orders` · existing navigation entry | Intake/triage, duplicate linking, scope, access, priority, authority, vendor/team, schedule, returned evidence, invoice association and acceptance/reopen. | UI10 |
| S17 · Vendors | `/ops/maintenance/vendors` · planned / unavailable | Vendor identity, service area/trades, contact/access, accepted qualification evidence, assignment/capacity and work history. | UI10 |
| S18 · Materials & Inventory | `/ops/maintenance/materials-inventory` · planned / unavailable | Inventory references, ownership/location, availability/reservation/use and cost evidence; reconcile the accepted stock owner and cross-app boundaries before persistence. | UI11 |
| S19 · Smart Routing | `/ops/maintenance/smart-routing` · planned / unavailable | Suggested field schedules/routes with location, access windows, urgency, capacity and constraints; dispatch remains reviewed, with acknowledgment and exceptions. | UI11 |
| S20 · AI Intelligence | `/ops/maintenance/ai-intelligence` · planned / unavailable | Evidence-linked maintenance summaries and suggestions, confidence/source gaps, stale inputs and explicit human decisions; no invented work completion. | UI11 |
| S21 · Build/Repair Projects | `/ops/maintenance/build-repair-projects` · planned / unavailable | ECC portfolio view of repair/rehab projects, milestones, scope/authority, estimates versus costs, work dependencies and Construction Manager handoff/return. | UI11 |
| S22 · Capital Projects | `/ops/maintenance/capital-projects` · planned / unavailable | Capital pipeline, approved scope, funding prerequisites, commitments, owner approvals, change review, project status and operations handover. | UI11 |

### Accounting

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S23 · Tenant Ledgers | `/ops/accounting/tenant-ledgers` · existing navigation entry | Authorized account/obligation view with posted charges, receipts, allocations, credits, deposits and disputes; shared balance counted once; source/payment handoff. | UI08 |
| S24 · Overview | `/ops/accounting/overview` · planned / unavailable | Accounting control overview: accepted balances, period/currency, reconciliation, exceptions and account drill-down; NOI distinct from cash available. | UI08 |
| S25 · Rent Collection | `/ops/accounting/rent-collection` · planned / unavailable | Due/received account work with source allocations, channel status, disputes, authorized collection contact and provider payment handoff. | UI08 |
| S26 · Expenses | `/ops/accounting/expenses` · planned / unavailable | Posted expense/invoice evidence and categories, project/work associations, review/authority, estimate/commitment/actual distinctions and accepted posting owner. | UI08/UI10 |
| S27 · Financial Reports | `/ops/accounting/financial-reports` · planned / unavailable | Income/expense/NOI, accepted statements and balance/cash reporting with basis, source version, reconciliation and export. | UI08/UI13 |
| S28 · Collections Dashboard | `/ops/accounting/collections-dashboard` · planned / unavailable | Receivable aging/exposure and accountable collections work, disputed amounts, accepted plans, notice-review state and source freshness. | UI08 |
| S29 · Collections Log | `/ops/accounting/collections-log` · planned / unavailable | Durable collection calls/messages/promises and outcomes, next follow-up, actor/evidence and scoped permissions. | UI08/UI07 |
| S30 · Payment Plans | `/ops/accounting/payment-plans` · planned / unavailable | Proposal, review, acceptance evidence, installments, source allocation, late/missed/partial states, amendment/cancellation and retained account history. | UI08 |
| S31 · Deposits | `/ops/accounting/deposits` · planned / unavailable | Deposit liability, received/held/applied/refund evidence, review and authorized execution handoff; deadlines/rules validated separately; no blanket work-order hold. | UI08 |
| S32 · Transfers | `/ops/accounting/transfers` · planned / unavailable | Transfer review, actual accounting ownership, effective date, source/destination evidence, authority, execution/reconciliation and audit. | UI08/UTIL |
| S33 · Subsidized Housing | `/ops/accounting/subsidized-housing` · planned / unavailable | Program/household/agency references, payer/tenant portions, effective periods, evidence, inspection/renewal tasks and accepted ledger links. | UI08 |
| S34 · Assistance Programs | `/ops/accounting/assistance-programs` · planned / unavailable | Assistance application/agency, approved conditions, pending/awarded/received distinctions, evidence, communications and receipt allocation. | UI08 |

### AI Analytics

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S35 · Vacancy review | `/ops/ai/vacancy-analytics` · existing navigation entry | Verified vacancy, readiness, age, pricing/media status and blockers; sources and comparable basis for recommendations; link unit/turn/marketing work. | UI12 |
| S36 · Renewal planning | `/ops/ai/renewal-forecasting` · existing navigation entry | Reported term dates, internal review windows, market/owner evidence, offer/notice/response stages and actual executed outcome; no inferred billing reversion. | UI12 |
| S37 · Risk Summary | `/ops/ai/risk-summary` · planned / unavailable | Explainable operational exceptions and missing evidence; scope and accepted prioritization; no opaque personal tenant risk score. | UI12 |
| S38 · ML Leasing Logs | `/ops/ai/ml-leasing-logs` · planned / unavailable | Versioned recommendation/input/output history, source references, operator decision and observed outcome; recommendations never become facts automatically. | UI12 |

### Communication

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S39 · Templates | `/ops/comms/templates` · existing navigation entry | SMS/email and reviewed correspondence template catalog, variables, audience/purpose rules, versions, preview, approval and retirement; formal notice policy stays separate. | UI07 |
| S40 · Queue | `/ops/comms/queue` · planned / unavailable | Central shared inbox/outbox: inbound matching, assignment, response/waiting/follow-up, drafts, recipient authorization, channel status and uncertain outcome reconciliation. | UI07 |
| S41 · Logs | `/ops/comms/logs` · planned / unavailable | Authorized cross-scope communications and delivery/reply history, searchable by person/asset/agreement/workflow; ordinary delivery distinct from legal service. | UI07 |

### Data Hub

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S42 · Overview | `/data` · existing navigation entry | Data completeness/quality overview, provider freshness, reconciliation backlog, canonical identity and affected operating modules; no raw count presented as managed portfolio truth. | DATA03 |
| S43 · Sync Audit | `/data/sync-audit` · planned / unavailable | Capture/run history, endpoint scope, pages, item counts, timestamps, versions/checksums and evidence of completeness/reconciliation. | DATA02/03 |
| S44 · Sync Management | `/data/sync-management` · planned / unavailable | Authorized sync-job review, bounded trigger/retry/pause controls, schedules, rate/budget handling and recovery; no unrestricted browser service credentials. | DATA02/03 |
| S45 · Raw Data | `/data/raw` · planned / unavailable | Restricted payload custody explorer with run/entity/source IDs, page/response metadata and safe original retrieval; row/file authorization and sensitive-data controls. | DATA01/02 |
| S46 · Sync Logs | `/data/sync-logs` · planned / unavailable | Structured capture/transform/retry/dead-letter records, correlation and affected objects; redact secrets and retain diagnostic context. | DATA02/03 |
| S47 · System Settings | `/data/system-settings` · planned / unavailable | Governed data configuration and effective version, field/source mapping review, allowed action permissions and audited change previews. | DATA03 |

### Systems

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S48 · Integrations | `/systems/integrations` · existing navigation entry | Connection capability matrix, read/write permissions, last evidence, error/recovery owner and test status for actual providers/apps. | INT01 |
| S49 · Workspace preferences | `/system/settings` · existing navigation entry | Retain Workspace preferences; supported view/density/accessibility and user preferences with existing navigation/theme defaults unchanged. | UI00 |
| S50 · Automation | `/system/automation` · planned / unavailable | Curated workflow rule schedule/configuration, scope/version, evidence prerequisites, execution limits, review, run history and safe pause/resume. | WF01/02 |
| S51 · Dropbox Files | `/integrations/dropbox` · planned / unavailable | Folder/registry mapping, authorized previews, immutable originals/versions, delivery receipts and retry/reconciliation; preserve existing legal and AUM sources. | DOC01/02 |
| S52 · CoreLogic / MLS Grid | `/integrations/corelogic` · planned / unavailable | Verified enrichment capability, source/license, requested fields, freshness/cost, record match and conflict review; no assumed market-rent API. | INT01 |
| S53 · Field App Link | `/integrations/field-app` · planned / unavailable | Actual field capability and identity mapping, proposed/verified task/evidence exchange, pending/accepted/returned/failed states and authorized deep links. | INT02 |
| S54 · Deal Room Link | `/integrations/deal-room` · planned / unavailable | Verified deal/project owner and IDs, acquisition/disposition handoff, authority/evidence, pending acknowledgment and return context. | INT03 |

### Growth

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S55 · Marketing | `/growth/marketing` · planned / unavailable | Readiness/pricing/approved media, listing draft/publish, channels, inquiries/showings/applications, failed synchronization and agreement/move-in handoff. | UI12 |

### Investor Portal

| ID / existing destination | Existing path / status | Build requirements | Package |
|---|---|---|---|
| S56 · Dashboard | `/investor/dashboard` · planned / unavailable | Investor-authorized overview of permitted ownership/portfolio performance, reporting and current material work; separate investor scope from internal manager view. | UI14 |
| S57 · Portfolio Analytics | `/investor/portfolio-analytics` · planned / unavailable | Permission-scoped asset/period performance and capital exposure with source completeness, basis and comparison; no cross-owner data leak. | UI14 |
| S58 · Financial Reports | `/investor/financial-reports` · planned / unavailable | Authorized approved report versions, distribution/contribution evidence where permitted, delivery history and restricted download. | UI14/UI13 |

## 6. Record screens, cards and all existing tabs

The 58 navigation destinations do not replace record-specific pages. Preserve `/card/property/:id`, `/card/unit/:id`, `/card/lease/:id`, `/card/tenant/:id`, `/card/owner/:id`, `/portfolio/properties/:id` and `/ops/legal/matters/:id`, with their existing route identities and return paths.

### 6.1 Lists and record entry

All five portfolio directories retain search, filters, counts, pagination, canonical record links and back/return behavior. Scope labels distinguish loaded rows from a complete managed population. Never hardcode record ID 1 or silently merge duplicate addresses. Filters persist appropriately on return; permission/session changes clear protected prior state.

### 6.2 Property card — Overview / Financials / Legal / Files

| Existing tab | Required content | Actions and linked work |
|---|---|---|
| Overview | Existing hero/media, address/type/facts, effective owner/management relationships, unit inventory, occupancy, source status, condition/construction context and current work. SFR presents one dwelling context without duplicating doors. | Open unit/owner/agreement; inspect vacancy/readiness; start/link service, inspection or capital review; prepare owner communication. |
| Financials | Preserve existing sourced rent summary and restore accepted income/expense/NOI, receivables, cost/project attribution and period comparison when their contracts are verified. | Inspect account/transaction/variance; prepare owner report; review spend authority. |
| Legal | Actual property-linked matters/notices, verified status/dates, evidence gaps and responsible person. | Open the same matter/version; request evidence; launch a permitted review. |
| Files | Property photos/video, tenant documents, improvements/construction, legal and insurance views; owner agreement linked once from ownership documents. | Preview authorized version, associate/upload, review public-use media and inspect delivery history. |

No new Related property tab. Relationships and current work are in Overview and contextual components.

### 6.3 Unit card — Overview / Related / Financials / Legal / Files

| Existing tab | Required content | Actions and linked work |
|---|---|---|
| Overview | Unit/space facts, beds/baths/area where applicable, equipment, current occupancy, condition/readiness, construction phase, contract versus asking/market rent with distinct source basis. | Inspection/service intake; make-ready review; pricing/media/listing/showing preparation; view current conversation. |
| Related | Current/historical agreements and household capacities, property/owner, service/work/project references and effective associations. | Open actual linked records and resume the same workflow. |
| Financials | Unit-attributable contract/account and work/project costs with source/period; no sibling-unit ledger substituted. | Inspect actual agreement account, estimate versus incurred work and pricing evidence. |
| Legal | Only matters/notices actually linked to this space/agreement, with reviewed capacities and evidence. | Open scoped matter or initiate fact review. |
| Files | Condition, equipment/manuals, photos, floor plans, marketing-approved selection and relevant agreement/project evidence. | Capture/link/preview/version/review permitted use. |

Occupied, vacant, under-construction, partial-handover and market-ready are explicit state variants, not independent redesigns. Commercial spaces extend the fact model without forcing residential bed/bath fields.

### 6.4 Lease card — Overview / Related / Financials / Legal / Files

Retain **Leases** in navigation and the existing route. Inside the record, make the actual agreement type explicit: lease, lease-option or contract for deed. Type-specific sections expose executed rights/obligations; they do not select a legal remedy.

| Existing tab | Required content | Actions and linked work |
|---|---|---|
| Overview | Type, all parties/capacities, space/property associations, effective term, payment/obligation schedule, deposits and type-specific option/installment milestones. | Renewal review, amendment, move-in/out, evidence request, account conversation and relevant playbook. |
| Related | Household versus contracting parties, guarantor/representative, owner/creditor role, asset and historical/future contract relationships. | Purpose-specific recipient preview and effective-date/capacity review. |
| Financials | Actual charges/receipts/allocations/credits, shared obligations, deposit liability, disputes and proposed/accepted plan terms. CFD/option balances/credits require their own accepted evidence. | Payment-provider handoff; plan proposal/review/acceptance servicing; source reconciliation. |
| Legal | Default/breach concerns, notices/versions, issue/service evidence, response/cure review and linked matters. | Reviewed stage-specific actions; no automatic legal conclusions or source-ledger freezes. |
| Files | Signed agreement, all amendments, option/CFD evidence, plan acceptance, notices and authorized account statements. | Review original/version, request missing evidence and prepare an authorized packet. |

### 6.5 Tenant card — Overview / Related / Financials / Legal / Files

| Existing tab | Required content | Actions and linked work |
|---|---|---|
| Overview | Person/contact/preference/consent, current relevant capacity and authorized communication; service/follow-up context. Primary contact is distinct from liability. | Reply/compose, assign follow-up, log call/internal note, open service request and review portal/contact state if verified. |
| Related | All actual current/historical household and contract associations, capacities/effective dates, properties/units and authorized representatives. | Review/correct classification; open canonical agreement/household context. |
| Financials | Authorized account associations and capacity; a shared balance displayed once per account, not as a separate personal debt for every occupant. | Inspect accepted account; prepare a permitted plan/contact workflow. |
| Legal | Relevant matters/notice participation with purpose-specific access; no demographic or opaque personal risk score. | Inspect actual role/evidence and authorized next action. |
| Files | Person-authorized documents, consents and linked contract/evidence with sensitive/minor restrictions. | Secure preview/request/version/association. |

Minors are restricted occupancy context, not default account or notice recipients. Authorized non-obligor adults may receive maintenance/access messages without financial disclosure.

### 6.6 Owner card — Overview / Related / Financials / Legal / Files

| Existing tab | Required content | Actions and linked work |
|---|---|---|
| Overview | Entity/contact, effective interests, management-agreement coverage, authority/approval limits, portfolio performance and open decisions. | Owner update, approval review, report preparation, contribution request. |
| Related | Owned properties/interests, management agreements, representatives, projects and effective transitions. | Open asset/agreement and inspect ownership changes without unauthorized transfers. |
| Financials | Accepted statements, contributions/distributions, cash controls, reserves/liabilities/commitments and operating performance as separate classes. | Reconcile/report; reviewed capital/distribution handoff. NOI is not available cash. |
| Legal | Owner/entity/creditor capacities and authorized relevant matters/documents. | Counsel/evidence/authority review. |
| Files | Ownership Documents: property management contracts, entity/ownership records, financial/tax documents, statements/reports and correspondence, using approved physical mapping. | Link agreement once to applicable properties; controlled versions and delivery. |

### 6.7 Legal matter — all nine existing tabs

| Existing tab | Required content / completion behavior |
|---|---|
| Overview | Actual matter type, caption/parties/capacities, asset/agreement, stage, accountable team, next reviewed decision and evidence gaps. |
| Timeline | Attributed event chronology, occurred versus recorded time, commitments, responses and source links. |
| Documents | Originals/versions, requirements, restricted evidence, request/review status and document identity. |
| Judgment | Verified award/order components, accepted monetary projection/credits/rules and unknowns; distinct from alleged rent/default balances. Preserve existing accepted legal contracts. |
| Tasks | Evidence collection, assignment, internal targets, approved deadlines, dependencies, escalation and handoff acceptance. |
| Correspondence | Linked authorized conversations and reviewed drafts; no copy of the same thread into a second truth. |
| Court | Actual case/court records, events and entered documents; verify the reported shared Timeline/Court implementation and correct its content without changing tab identity. |
| Packet | Versioned packet selection/manifest, missing evidence, review, authorized export and delivery/receipt. |
| Audit | Actor/source/version/action/outcome, correction/supersession and access-sensitive history. |

Legal workflow is Altus-owned. DoorLoop can supply tenancy/account evidence where verified, but does not own matter state, judgment accounting or legal eligibility. No statutory deadlines, remedies or notice forms are invented by the UI plan.

## 7. End-to-end workflow build scope

A reusable workflow model supplies scope, trigger evidence, version, states, responsible team, next action, dependencies, target/deadline class, communication/evidence, authority, interruption/revalidation and durable outcome. Curated playbooks serve operators; they should not need a complicated automation-builder page for routine work.

| IDs | Workflow scope included | Required completion evidence |
|---|---|---|
| W01–W05 | Owner/property onboarding, reconciliation, ownership/management transitions, household classification and typed agreement intake | Confirmed identity/authority, effective associations, reviewed terms and retained source evidence |
| W06–W10 | Readiness, media/pricing, listing/channel publication, inquiry/showing/application and execution/move-in | Per-stage approvals, exact recipient/signers, readiness and individual channel/application outcomes |
| W11–W12 | Two-way inbound/shared inbox and ordinary outbound/broadcast messaging | Identity match/review, purpose/authorization/channel, assignment, individual delivery/reply/failure state |
| W13–W17 | Account review, payment plans, monetary/non-monetary concerns and disputes | Posted source facts, terms/acceptance/allocation evidence, reviewed notices/service and explicit resolution |
| W18–W21 | Renewals, non-renewal/termination review, move-out/turnover and deposit servicing | Actual executed outcome, reviewed notices where applicable, condition/keys/account evidence and accepted deposit treatment |
| W22–W28 | Maintenance flags/intake, work orders, emergency response, recurring inspection, make-ready, capital projects and spend/invoice approval | Authority/access, acknowledgment, field/project evidence, actual costs and independent acceptance/reopen |
| W29–W32 | Owner reporting, capital contributions/distributions, lease-option and CFD servicing | Accepted balances/authority, versioned reporting, actual receipt/transaction evidence and contract-specific milestones |
| W33–W36 | Legal matters, document/compliance renewal, file/media lifecycle and construction handover | Restricted provenance/version, authorized next decisions, returned evidence and independent readiness gates |
| W37–W40 | Deal intake/exit, staff reassignment, integration reconciliation and portfolio coordination | Stable IDs, acknowledged handoff, preserved commitments/history and record-level batch results |

Unmatched inbound triage and promises-to-pay are covered within communication/account work, not silently omitted because they were later advisory additions. Emergency escalation requires an actual escalation/coverage design; no particular paid provider is mandated.

### Critical state rules

- A new payment, party correction or amendment can invalidate relevant reviewed draft facts; preserve old versions and show the delta.
- A proposed plan is not accepted; an accepted plan is not a second receivable. Cancellation does not erase receipts or restore pre-payment balances.
- Formal notices, ordinary messages, issue attempts, provider delivery and legal service evidence are distinct.
- An uncertain external outcome stays uncertain until reconciled; no blind retry or unsent reset.
- Missed access does not automatically establish a breach. Expired offers/options do not automatically rewrite contracts/billing.
- Construction completion and contribution receipts each satisfy at most part of the relevant operating gates.
- Permissions are not bypassed by a manager PIN. Sensitive drafts default to authenticated server-side, scoped and expiring storage; no persistent browser draft store by default.
- AI may summarize/triage/draft with source links; it does not decide liability, remedies, completed work or financial execution.

## 8. Database, DoorLoop and data-quality build

### 8.1 Domain and data ownership

Use the intended single Supabase/PostgreSQL architecture with three logical zones: **Imported**, **Working** and **Reconciliation**. Verify actual schema/table names and existing models before migrations. Do not create duplicate entities because historical apps or the API expose separate payloads.

| Zone / domain | Required build |
|---|---|
| Imported / custody | Retain original provider responses/payload dumps with run/entity/page/request scope, timestamps, source IDs, response/version/checksum metadata and restricted access. Do not expose secrets in dumps/logs. |
| Working / linked ECC data | Reconciled canonical records and effective associations for property/space, owners/interests, contracts/parties/households, accounts, files and workflows. Preserve Altus-only values across imports. |
| Reconciliation | Unmatched IDs, ambiguous duplicates, conflicting status/roles/dates, missing relations, stale/partial runs, transform errors and reviewed resolution history. |
| Altus-owned operations | Communication/thread/message events, workflows/tasks/approvals, legal matters/notices/evidence, notes/commitments, marketing/readiness and cross-app command references. Reuse verified existing objects first. |
| Financial boundaries | Accepted accounting and judgment models remain separate where their authority differs. Provider receipts may be evidence; no accidental duplicate ledger or synthetic CFD accounting. |

### 8.2 DoorLoop capture and supported commands

Read and follow the official DoorLoop API documentation for each implemented endpoint. Record authentication scope, pagination, filtering, rate/retry behavior, supported fields, deletes/archive behavior, webhook or polling capability and write preconditions. Do not invent endpoint names or assume a UI feature is exposed through the API.

Build bounded, scheduled ingestion in Supabase under the current direction. Capture complete runs before promoting working data; make repeated captures/transforms idempotent. Track partial runs honestly; missing rows are not automatically deleted. Reconcile source changes, soft-deleted/archived objects and recovery/replay behavior with accepted rules.

Create a capability matrix for each command: verified provider write, Altus-owned operation, provider handoff, or unsupported/unverified. Payments remain in DoorLoop under the present direction. Other future supported writes can be enabled individually after review; do not impose an unexplained permanent read-only ceiling. No automatic fee/ledger freeze.

### 8.3 Cleaning and classification

- Define **managed property**, **rentable unit**, **occupied**, **vacant**, **ready**, **current agreement**, **financial obligor**, **contact**, **occupant** and **prospect** independently.
- Validate actual management/ownership periods; raw DoorLoop property rows are not active managed property counts.
- Match stable provider/internal IDs and verified relationships. Address equality is a review signal, not authority to deduplicate or merge.
- Detect orphan relations, duplicate references, conflicting dates/roles, invalid money/currency, impossible occupancy and incomplete pagination.
- Quarantine questionable values from operational decisions; keep their originals and an accountable resolution path.
- Imported changes cannot overwrite Altus-only notes, household classifications, legal state, plan terms or authorized evidence without an explicit conflict rule.
- Reconcile dashboard totals to their scoped detail populations, account amounts to accepted entries, and chart series to the same period/basis.

### 8.4 Access and runtime

Verify the production environment binding, authenticated session, server-side authorization, RLS/grants and route-to-backend ownership. Preserve session-boundary cache purges and prevent denied/stale prior-user figures from resurfacing. Keep service credentials server-side. Document existing broad legacy exposure and consumer dependencies before any grant/policy change; no blanket revokes or new public raw-data views.

This plan does not assert live schema readiness. Each migration requires an existing-domain inventory, rehearsal, rollback and evidence before application.

## 9. Cross-app and document integration

| Integration | ECC responsibility | Other authority / prerequisites | Required round-trip proof |
|---|---|---|---|
| DoorLoop | Capture, working projections, source reconciliation and reviewed supported commands/handoffs | Verified provider API; accepted account/payment owner | Capture -> transformed record -> UI -> supported action/handoff -> outcome/reconciliation |
| Field App | Link service/inspection context, task/evidence request and pending/returned state | Verify current capture/proof versus dispatch capability; do not assume vendor execution | Same asset/task identity, authorized acknowledgment, returned evidence and ECC acceptance |
| Construction Manager | Portfolio project context, owner/authority workflow and operations handover | Specialist scope/project/execution/cost owner, verified contract | Scope/approval reference -> project -> milestone/evidence -> handover review -> readiness |
| Deal Room | Management entry/exit workflow and deal evidence reference | Verify frontend/backend owners, identity and supported handoff | Deal reference -> reviewed owner/property mapping -> onboarding/exit -> acknowledged result |
| Email and SMS | One ECC inbox and scoped conversation experience, recipients, assignments and history | Verify transports, sender/number identity, permissions/consent, threading and delivery separately | Inbound -> match/triage -> draft/review -> send -> delivery/reply/failure, with no duplicates |
| Dropbox / registry | Authorized record-linked file experience and source provenance | Current Altus/ECC folder direction, metadata identity/permissions/version and verified byte delivery | Original -> registry/version -> delivery receipt -> authorized preview/share -> history |
| CoreLogic / MLS Grid | Evidence-based enrichment requests and reconciliation | Verify actual API/license/cost/fields; do not assume rent data | Matched record -> attributed source result -> reviewed use/conflict |
| Central authorization | Enforce permitted product/scope/action across handoffs | Existing Control Plane contracts; no independent access system invented | Authorized link/command succeeds; absent permission cannot be bypassed by deep link |

Every proposed command/event records source/destination authority, version, canonical IDs, correlation/idempotency, acknowledgment, completed/failed/unknown status, returned evidence and reconciliation owner. A link opening another app is not completed work. Do not assume a shared database across apps.

Business-file hierarchy follows verified current instructions: mirror familiar ownership/property AUM organization, include ownership documents and management contracts, preserve existing legal folders and originals, copy only where intake is authorized. No mass migration/deletion or complicated replacement folder tree is part of this plan. Reconcile the reported ECC/shared storage-document discrepancy as a specific decision, not a silent folder rewrite.

## 10. Build packages and dependency sequence

The identifiers below are **proposed narrow PR/work packages**, not existing PR numbers or activated agent assignments. One active writer per branch/slice, current owner verified before edits. UI and backend ownership stay separate; cross-repository changes need explicit contracts and coordinated review.

| Package | Deliverable / bounded scope | Depends on | Acceptance evidence |
|---|---|---|---|
| PLAN00 | Freeze the navigation/logo/theme manifest; map original modules and every screen to retained/recovered/improved/new requirements | Source inventory | No unmapped destination or removed capability; exact shell/assets recorded |
| DATA01 | Verify current database/API/environment ownership; inventory existing entities, access, migrations and consumers | PLAN00 | Read-only evidence and architecture record; proposed additions grounded in existing state |
| DATA02 | DoorLoop raw capture/payload custody, bounded schedules, paging, replay and completeness | DATA01 | Original payload retained, complete/partial runs distinguished, repeated runs idempotent, failure recovery proven |
| DATA03 | Working-model identity/relations, quality classification, reconciliation and dashboard population definitions | DATA02 | Accepted managed counts, matched detail rows, quarantined conflicts and Altus-only fields preserved |
| UI00 | Existing shell/brand/theme regression baseline and reusable content primitives | PLAN00 | No nav/logo/theme drift; existing routes/tabs/keyboard/return behavior retained |
| UI01 | Dashboard recovery layout with all D01-D20 capabilities and explicitly labeled isolated fixtures | PLAN00/UI00 | Historical content/composition comparison; no deleted chart/map/field; source-state variants shown |
| UI02 | Bind dashboard portfolio, occupancy/history, geography and record drill-downs | UI01/DATA03 | Metric/detail/map reconciliation, real coordinates, source coverage, filters and unknown handling |
| UI03 | Bind dashboard financial/leasing/maintenance intelligence and extend action feed | UI02 plus accepted financial/work contracts | Correct basis/cohort, ranges, totals, actionable records and no randomized history |
| UI04 | Five portfolio lists, filters, canonical identity, effective classifications and return context | DATA03/UI00 | Correct populations and links; unknowns/duplicates/denials handled without loss of content |
| UI05 | Property/unit cards: restore every existing tab, facts/media/relationships and financial/work context | UI04/DOC01 | SFR and multifamily variants, correct unit scope, all tabs and retained historical information |
| UI06 | Lease/tenant/owner cards: typed terms, household capacities, obligations, interests and all tabs | UI04/DATA03 | Role/recipient separation, contract variants, actual linked accounts and owner authority |
| DOC01 | Reuse/complete document registry reads, permissions, original/version mappings and previews | DATA01 | Version/identity and denied-access proof; no legacy file deletion |
| DOC02 | Authorized capture/upload/copy delivery, duplicate/version review, sharing and marketing-use classification | DOC01 plus verified Dropbox contracts | Immutable originals, receipt verification, restricted-publication prevention and retry handling |
| WF01 | Curated workflow/task/approval/commitment model and scoped servicing events | DATA01/03 | One instance across scopes, versioned transitions, due-date classes and actor-preserving history |
| WF02 | Workflow UI primitives, launcher/resume, rule configuration and safe run history | WF01/UI00 | Stage-aware content, explicit next action, interruptions and recoverable drafts |
| UI07 | Communication Templates/Queue/Logs and contextual communication components | UI06/WF01 plus verified channels | Two-way round trip, unmatched triage, recipient authorization, coverage, drafts and delivery uncertainty |
| UI08 | Accounting screen family and accepted plans/collections/deposit/owner controls | UI06/WF01 plus accepted accounting contracts | Posted versus estimated, shared obligation once, plan acceptance/allocation, cancellation without balance reset |
| UI09 | Legal Case Manager, nine-tab matter, notice/service lifecycle, documents/reports/packets | UI06/DOC01/WF01 plus existing legal contracts | Versioned facts, reviewed recipients/rules, ambiguous issue recovery, verified award/account separation |
| UI10 | Maintenance/work-order/vendor intake, triage, authority/access, execution evidence and acceptance | WF01/UI05 plus verified work ownership | Request-to-work continuity, duplicate prevention, actual acknowledgment and reopen behavior |
| UI11 | Construction/capital/inventory/routing/intelligence screens and handover coordination | UI10/INT02 plus project contracts | Estimates/commitments/actuals distinct, specialist owner retained, independent readiness gates |
| UI12 | Vacancy/renewal analytics, marketing and leasing lifecycle; risk/log screens | UI05/06/WF02/DOC02 | Pricing/media/channel readiness, no inferred legal/billing changes, attributed recommendations |
| UI13 | Report catalog/create/saved/templates, accounting/legal outputs and delivery | Verified relevant domain contracts/DOC01 | Reproducible source scope/basis/version, restricted access and actual generated files |
| UI14 | Investor dashboard/analytics/reports through existing destinations | UI13 plus verified investor grants | Scope-isolation proof, no cross-owner exposure, accurate approved outputs |
| INT01 | Integrations health/capability screen, provider tests and governed settings | DATA01 | Verified versus proposed capabilities, current evidence and recovery owner; no exposed credentials |
| INT02 | Field App evidence/task and Construction Manager project handoffs in separate owning-repo slices | UI10/11 and domain contracts | Correlated authorized round trip, partial/unknown/retry/return behavior |
| INT03 | Deal Room and approved enrichment links/handoffs | DATA03/INT01 and actual app contracts | No duplicate asset or assumed transaction; acknowledged result and retained provenance |
| UTIL | Hidden admin/geocode/transfer utilities: assess, contain and implement only authorized recovery behavior | Verified permission/source/financial contracts | Hidden status retained until separate readiness decision; no unrestricted mutation |
| RELEASE | Integrate accepted slices, live read/data-quality proof, feature readiness and release package | All dependencies for included release scope | No claim of full build until every listed screen/workflow is accepted or explicitly deferred by Dion |

### Milestone sequence

**M0 — Information and preservation baseline.** PLAN00 plus source/contract discovery. Produce one screen register, recovered component inventory and unchanged shell/brand reference. This document is the proposed build plan; it is not a report that these packages are implemented.

**M1 — Full dashboard and card review.** UI00/UI01 plus detailed plans for UI04–UI06. Show the recovered dashboard and complete screen family using explicitly isolated fixtures where necessary. Complete the content/interaction review before further visual invention. Approval is concrete: retained sections, fields, controls, workflow placements and responsive layouts in the unchanged shell.

**M2 — Trustworthy core data.** DATA01–03, UI02/UI04 and verified card/document reads. Demonstrate actual managed inventory and linked records in Supabase/ECC. Do not reuse raw provider totals as business truth.

**M3 — Connected daily operations.** WF01/02, UI05–10, DOC01/02 and verified communications/account/workflow contracts. Demonstrate response, account/plan, notice evidence and repair servicing with current record scope and durable history.

**M4 — Full portfolio execution.** Complete dashboard intelligence, construction/field, marketing/renewals, all accounting/reporting screens, investor scope and Deal Room/enrichment handoffs. Future commercial extensions use the same typed model but require actual commercial requirements/contracts before activation.

**M5 — Whole-app acceptance and release.** Verify all 58 destinations, record routes/tabs and utility disposition. Produce current readiness evidence, migrations/rollback, data-freshness/recovery results and a scoped release decision. An unavailable dependency is a blocker or an explicit Dion-approved deferral, never a silently removed feature.

Packages may proceed independently where dependencies allow. Do not bind UI to guessed APIs to make a demo appear complete. Keep CI bounded, avoid duplicate expensive jobs, preserve required checks and avoid unreviewed provider calls or increased sync cadence.

## 11. Whole-app acceptance matrix

| Area / scenario | Required observable result |
|---|---|
| Navigation/brand/theme | Same groups/order/labels/icons/paths, approved logo assets and existing theme; no replacement shell or stealth route/tab changes |
| Historical retention | D01-D20 each demonstrated and mapped to its final screen/view; charts/map/financial intelligence not stripped out |
| Dashboard input/filter change | Scoped records, counts, totals, chart series and drill-down agree; source timestamps and unknown coverage remain honest |
| SFR / fourplex / apartment | No duplicated SFR door, no sibling account substitution, scalable unit inventory and correct shared building versus unit work |
| Household / communication | Non-obligor authorized adult can receive access correspondence without account disclosure; minor/default notice audiences restricted; primary contact not sole obligor |
| Two-way inbox | Inbound matching/triage, assignment, draft/review, send, reply and per-recipient failures; unknown provider outcome cannot be blindly retried |
| Payment plan | Proposal -> reviewed/accepted terms -> allocated servicing -> amendment/cancellation; posted receipts survive cancellation; disputes are not credits |
| Notice fact change | Changed payment/party/terms invalidate relevant reviewed facts; old version retained; issue/service/evidence distinct; no automatic remedy or fee freeze |
| Maintenance | Message/finding -> triage -> authorized scope/access/assignment -> acknowledged work -> evidence -> acceptance/reopen; no fake dispatch/completion |
| Construction / marketing | Returned project evidence does not auto-create market readiness; pricing/media/authority/operating gates and individual channel results remain visible |
| Owner cash / approvals | Operating NOI, cash, reserves, liabilities, commitments, contribution receipts and distribution authority are distinct |
| Lease-option / CFD | Actual type/capacity/terms/obligations visible; no automatic conversion, forfeiture or residential-lease rule reuse |
| Legal matter | All nine tabs have distinct intended content; real awards/dates only; packet/audit evidence and reviewed authority preserved |
| Staff reassignment / servicing history | New responsible person sees original actors, linked evidence and outstanding commitments; history is not rewritten |
| Documents | Original/version retained, correct associations/authorization, failed delivery visible, restricted media never published through folder placement |
| Reports / investor | Source scope/basis/version reproducible; actual file generation/delivery; investor isolation and denied-access proof |
| Data cleaning / refresh | Duplicate addresses remain reviewable, unmatched IDs quarantined, partial paging visible, repeated sync idempotent and Altus-only data retained |
| Denial/session boundary | Cached figures/drafts/selections cannot expose another user's records; permission changes respected on resume |
| Failure / recovery | Loading, empty, partial, stale, invalid, denied, dirty, saving, failed, pending and uncertain states are distinguishable; retry preserves intent without duplication |
| Responsive / accessibility | Desktop and narrow layouts retain information/action access; keyboard/focus, readable charts/tables, carousel controls and dialog return tested |
| Persistence | Accepted changes survive reload/session/server restart as applicable; isolated fixture behavior is never claimed as live persistence |
| Runtime and data proof | Exact repo/branch/SHA, endpoint/DB ownership, before/after values, browser/network results and accepted database state recorded |

A source review, passing unit test or screenshot alone does not prove live integration, usability, legal validity or production readiness. Use focused unit/contract checks for rules, database rehearsal for migrations and task-based browser proof for the real operator journeys. Broaden checks only when changes or unresolved failures justify it.

## 12. Non-negotiable completion tracking

Maintain one row per screen/tab and D01-D20 capability with: source evidence; retained/recovered/improved/new disposition; data owner; required inputs; current status; dependency; package/PR/head; tests; browser/runtime evidence; known gap; next action. Status values: planned, specified, isolated review, implemented-unbound, bound-test, live-verified, accepted, blocked or explicitly deferred by Dion.

No module is counted complete because its button opens a modal, its path is registered, an advisory says complete, its provider advertises a feature, or a sample graph renders. A screen is accepted only when its information and actions work against the accepted contracts with the required failure/recovery behavior.

### Immediate next deliverables

1. The unchanged shell/logo/theme and full historical dashboard content shown together in a recovery review.
2. Full property/unit/lease/tenant/owner/legal card specifications and retained-tab visuals, not just six cherry-picked scenes.
3. The screen and data-contract register covering all existing navigation destinations and record routes.
4. Narrow implementation packages with explicit dependency owners and testable end states after approval of the concrete design.

The PM owns consolidation and follow-through. Dion is not being asked to list routine workflows, reassemble old builds, reconcile three advisory reports or write implementation prompts to make this plan concrete.


## 13. Revision 1.1 — information, commands and page design specification

**Instruction incorporated:** Properties require maps. Quick actions must be defined. Improve the design on every page after planning its information. Existing navigation, logo and theme principles remain frozen. Review 04 is a content/layout reference, not an accepted finish standard. This revision specifies all 58 navigation destinations, six record workspaces and all 33 existing record tabs; it does not claim 58 rendered or implemented pages.

### 13.1 What the operator sees first

For every destination, answer in order: Where am I and which record/scope is selected? What has changed or needs a decision? What facts/evidence support that decision? What can I do now? What happens after I act? Put those answers on the page before styling it.

The operator record for each screen is its role and decision, minimum information, named primary action, quick actions, principal visual and stage change in section 13.5. Daily queues and cards are high-frequency; configuration and template governance are occasional. A wrong person, account, property or version has high financial/privacy/operational cost, so identity and scope stay visible throughout a command. A source label belongs with the relevant field/chart and a compact page freshness indicator; engineering caveats do not dominate the daily interface.

Use the current `#ecc-app` workspace cascade as the brand authority for content: background `#0a0a0a`, surfaces `#131313`/`#161616`/`#202020`, text `#f5f5f2`, secondary `#bcbcb5`, lines `#343430`, selected/primary `#d4af37`. Reuse Inter/Segoe UI and the existing shell. Preserve existing accepted semantic and distinguishable categorical chart colors where they communicate meaning; no forced grey/gold chart palette. Legacy token declarations alone do not justify decorative color. Gold frames selection; neutral or categorical series remain distinguishable, with red and green reserved for meaningful negative/positive state. Use labels, patterns and line shapes as well as color. No orange.

### 13.2 Property maps are a required operating component

Every property record, including SFR, two-to-four-unit, apartment, construction and future commercial contexts, includes a location map in Overview. The Properties list also has synchronized List / Map / Split controls inside the existing route. Switching those controls retains selection, scope, sort and return position. The unit opens the parent-property map with its verified entrance/access association where known. Owner/investor maps use only authorized holdings. Do not invent a new navigation section or map route.

The property map shows selected building/address, sourced coordinate-match state, street labels, orientation, map attribution and update/source context. Site/parcel outlines appear only from verified geometry; nearby portfolio assets are optional and permission-scoped. Access/entrance markers come from accepted site evidence. A unit number is not a geocode. SFR uses one dwelling/property context, without duplicate financial totals. Apartments support buildings/entrances/shared facilities; commercial adds spaces/common areas when those contracts are defined. Construction work locations reference the same asset IDs.

Map commands: **Directions**, **Schedule visit**, **Open work**, **Nearby assets**, **Map / Satellite** where licensed and supported, zoom controls and an accessible location list. Directions is an external navigation handoff; Schedule visit opens a proposal, not an automatic invite. No gate codes or private household details on a general map. A missing/rejected geocode displays the recorded address and **Review location**; no guessed pin. A map-provider failure keeps the asset/list/work usable. Map coordinates, imagery, attribution, licensing and geocoder contracts remain unverified for production; sample geography is labeled schematic in renderings.

### 13.3 One action system, with explicit consequences

Place the active primary action and quick actions together in the page command region. One gold primary action per active workflow. Up to four useful secondary actions have text plus icons; additional actions are grouped under **More actions** by Communication, Work, Documents and Administration. On narrow screens keep the primary and two frequent actions visible and put the rest in a labeled menu. Do not shrink labels to fit. Row actions are specific verbs and act only on that row; bulk selection exposes a separate count/scope command bar.

Property default quick actions are **Message**, **Create work order**, **Add servicing note**, **Attach file**. **Directions** and **Schedule visit** sit with the map, where their consequence is clear. Its primary changes with current work: **Review B2 handover**, **Triage heater report**, **Review owner decision**, or **Open property work** when there is no higher-priority decision. A neutral property page does not invent an urgent issue. Header commands stay scoped while the dock changes mode.

Clicking Message opens one dock with purpose, recipient roles, channel and draft. Clicking Create work order opens scoped intake with existing-work matches. Clicking Add servicing note opens a compact attributed note form. Clicking Attach file opens upload/link-existing, category, permitted use and audience. None of these buttons immediately contacts a person or changes an external ledger. Button text describes the next step, such as **Preview message**, **Save request**, **Request approval** or **Accept handover**, rather than ambiguous generic Review/Open everywhere.

The Context Dock has Conversation / Work / History inside the existing record tab content. One selected mode, one focus location, one active record. Conversation includes channel and purpose-specific recipient review; Work shows the active stage and dependencies; History shows the continuous attributed servicing record with source references. Switching mode retains the permission-scoped server draft and selected work. History is not repeated in an additional permanent side panel. The central inbox provides the same thread/work objects across all asset views.

#### Command contracts

The following are proposed product interactions. Execution remains unavailable until that action's accepted backend/provider contract and access are verified. The UI shows a reason and a valid next step when unavailable, rather than a dead control. Read-only navigation and internal drafts remain useful independently of provider execution.

| ID / command | First click | Required context | Commit / outcome / recovery |
|---|---|---|---|
| A01 · **Message** | Opens the dock composer for the selected entity; asks purpose before resolving people/channels. | Purpose; effective party roles; verified contact/consent; visible attachment scope. | Preview recipients and content, then Send; retain exact version and delivery attempt; unknown outcome enters reconciliation. |
| A02 · **Create work order** | Opens linked request/scope intake with property/unit fixed and existing-work matches. | Observed issue, urgency assessment, responsible person; access/authority before assignment. | Save request/work through accepted owner; shows one ID on every linked screen; assignment is a later reviewed command. |
| A03 · **Add servicing note** | Opens a small attributed note form in the current record. | Author; event date; visibility; record/work/conversation links. | Save to server; append event; corrections remain attributed; failure preserves permission-scoped draft. |
| A04 · **Attach file** | Opens upload or link-existing with category and record association. | Document identity; permitted audience; category; version; intended use. | Stage bytes → register immutable version → verify custody; failed transfer stays staged/recoverable. |
| A05 · **Directions** | Opens the confirmed address in the configured external map. | Verified address/coordinate match; destination preview. | Explicit external-link affordance; no access instructions, personal notes or gate codes embedded in the URL. |
| A06 · **Schedule visit** | Opens visit planning for the selected property/unit/work. | Purpose; proposed window; access contact; authority and consent requirements. | Save proposed visit; a calendar invitation or dispatch is a separate visible confirmation using a verified connector. |
| A07 · **Request owner approval** | Opens a scope/cost/evidence decision request. | Authorized decision-maker; management authority; amount/basis; evidence; deadline type. | Preview audience and proposal; record request/decision version; request sent is not approval received. |
| A08 · **Prepare payment plan** | Opens a schedule proposal against an exact account snapshot. | Posted obligation; covered subset; disputes; schedule; approvals; actual ledger allocations. | Preview totals/terms, review and record offered version; acceptance/activation are distinct and do not invent ledger credits. |
| A09 · **Start renewal review** | Opens a typed-agreement term comparison. | Signed terms; agreement type; review dates; market evidence; authority. | Save internal proposal; sending, acceptance and execution are separate states; expiry changes no source terms automatically. |
| A10 · **Review notice** | Opens exact notice version beside facts, audience, authority and required evidence. | Versioned facts and agreement; reviewed rules; reviewer; execution/service capability. | Review then explicit issue command where supported; fact change blocks affected approval; ambiguous issue attempt never becomes an unsent draft. |
| A11 · **Review handover** | Opens scope-versus-returned-evidence comparison. | Approved scope; linked work; completion proof; defects; approvals; final costs if required. | Accept or return with reason; readiness changes only after accepted prerequisites; acceptance does not publish a listing. |
| A12 · **Review marketing** | Opens readiness, price, copy, media and channel checklist. | Ready status; approved terms; permitted media; channel binding. | Save draft; preview; approve; publish only through verified provider command; preserve per-channel outcomes. |
| A13 · **Prepare report / packet** | Opens scope, period, basis, audience and source completeness. | Template/version; required records; permissions; source snapshot. | Generate immutable output; review preview; delivery has its own action and acknowledgment. |
| A14 · **Inspect source** | Opens a permission-scoped lineage panel. | Source identity; timestamp; value class; transform; accepted snapshot. | Read-only inspection; authorized source navigation; no automatic promotion or provider write. |
| A15 · **Assign / reassign** | Opens responsible-person selection with workload/context. | Authorized assignee; scope; target; reason; current assignment version. | Save assignment event; concurrent change requires revalidation; assignment is distinct from field acknowledgment. |
| A16 · **Save view** | Captures filters, sort, density and visible columns. | User/role scope; non-sensitive preference values. | Save scoped preferences; saved view does not persist private rows, messages or drafts in browser storage. |
| A17 · **Reconcile outcome** | Opens an unknown/conflicting attempt with provider evidence. | Attempt identity; correlation; supported status lookup; original command/version. | Record confirmed outcome or keep unknown; retry only when accepted idempotency/reconciliation contract permits. |
| A18 · **Open provider account** | Opens the account in DoorLoop with clear external destination. | Canonical provider/account association and current user authority. | Read/navigation handoff; payments remain in DoorLoop under current approved boundary. |
| A19 · **Request document** | Opens a purpose-specific missing-document request. | Required document; intended use; recipient role; permitted upload/reference route. | Preview request; send through verified channel; request remains open until matching evidence is accepted. |
| A20 · **Review configuration / automation** | Opens a versioned diff or dry-run with bounded effect. | Environment; permission; impact; verified contract; rollback/recovery. | Review explicit change; activate separately; secrets remain server-owned and never exposed in editable fields. |
| A21 · **Compare / inspect entries** | Opens selected periods, records or versions without changing them. | Compatible scope/basis; source age; selection; access. | Return to exact prior filters/selection/scroll; disagreement opens reconciliation rather than overwriting. |
| A22 · **Record disposition** | Opens a decision with evidence and reason. | Decision type; authority; evidence; affected versions. | Append decision event; retain prior history; financial/legal side effects require their own supported reviewed command. |
| A23 · **Create draft** | Creates an internal proposal/template/definition. | Type; responsible person; scope; current version and permission. | Save server-side draft; dirty state; expiry/retention; explicit review and publish/issue actions follow. |
| A24 · **Download / export** | Prepares an authorized selected version or scoped export. | Audience; permission; exact version; source/basis; selected population. | Confirm material bulk scope; export artifact records provenance; a download does not mark a report delivered. |

### 13.4 Page composition and finish standards

Six reusable page families fit the different jobs: (1) portfolio intelligence: map/charts + selected exception; (2) directory: dense table + selected preview/map; (3) record: compact identity/context, stage-aware workbench and adaptable dock; (4) workflow: step/status context + evidence/decision form; (5) document/report: readable preview + version/audience controls; (6) configuration/audit: change/run table + diff/proof. Applying one generic card grid to all six is rejected.

Use a compact context header with the actual record/address as the dominant title. Breadcrumbs and relationship links show property → space → agreement → parties → work without forcing every association into a tree. Keep many-to-many and effective-date exceptions in the actual relationship model; a conversation has messages and a notice has versions through ordinary one-to-many relationships. No giant placeholder house icon, duplicated title or repeated balance in three regions. Preserve all information with grouping and disclosure rather than removing it.

Desktop: existing 248 px expanded shell; 24–32 px content gutters; a 12-column content grid; 20–24 px main gaps; 320–380 px dock when useful. Split directory supports roughly 60/40 list/map; property uses unit/work surface plus a substantial location context. Financial charts use readable axes/units and a minimum useful plot area. No chart exists just to fill a rectangle. The dashboard retains all D01–D20 capabilities; existing in-content controls may group intelligence, but their labels/counts must keep it discoverable.

Typography: existing 28–32 px page title, 18–20 px section heading, 14 px table/body text, 12–13 px secondary labels. Tables have aligned numeric columns, tabular figures, deliberate row spacing and visible selected-row state; no essential 9–10 px text. Buttons and important row targets have at least 44 px target height. Gold reserved for selection, primary action and a chart focus. Borders are restrained; avoid repeated boxes inside boxes and decorative glow/gradients. Legal/document previews can use a light document surface inside the unchanged dark workspace.

At ~1440 px preserve clear command labels and useful map/work areas. At ~1024 px dock becomes a contextual drawer, not a squeezed third column. At 390 px preserve the existing collapsible navigation, keep scope/title/primary visible, place map and list in explicit views, and offer readable row details. Financial tables may scroll within a labeled container with their critical identity column preserved; the whole page must not overflow. Carousels are manual for media with image count, captions, next/previous and list fallback; critical work is always visible outside them. Reduced motion is respected. Focus returns to the invoking control on close.

### 13.5 All navigation destinations — information before layout

Each entry preserves its existing route, label, order and availability. “Primary” is the initial action for the named job; a selected workflow stage may replace it as stated. Quick actions open the command contracts above; they do not imply provider execution is live. Exact capabilities still require the data/contract build packages in sections 8–10.


#### Command center

**S01 · Command center** — `/dashboard` · existing navigation entry

- **Operator / decision:** Portfolio manager: where must we intervene today?
- **Information:** Managed population; locations; occupancy and readiness separately; receipts and due; open work; accountable next decisions.
- **Primary:** Open highest-priority work. **Quick actions:** Message; Create work; Add note; Save view.
- **Composition / visual:** Map + work feed; income/expense/NOI; funnel; occupancy/capital/maintenance intelligence.
- **State response:** Scope and period change every related view; unresolved critical work determines the primary action.


#### Portfolio

**S02 · Properties** — `/portfolio/properties` · existing navigation entry

- **Operator / decision:** Property manager: which property needs attention and why?
- **Information:** Address; owner; management period; type; doors; occupancy; readiness; open decisions; source exceptions.
- **Primary:** Open selected property. **Quick actions:** Message; Create work order; Add note; Attach file.
- **Composition / visual:** Linked map/list with selected-property preview and persistent filters.
- **State response:** Managed/historical changes population; missing geocodes stay in list; selection persists across views.

**S03 · Units** — `/portfolio/units` · existing navigation entry

- **Operator / decision:** Property manager: which space can be occupied or needs work?
- **Information:** Property; unit; physical occupancy; readiness; construction stage; contract association; blocker and responsible person.
- **Primary:** Open selected unit. **Quick actions:** Create work order; Review marketing; Add note; Attach file.
- **Composition / visual:** Dense unit table; selected-space readiness dependency strip; parent-property map.
- **State response:** Occupied/turn/under-construction/ready show different commands; no readiness inferred from vacancy.

**S04 · Leases** — `/portfolio/leases` · existing navigation entry

- **Operator / decision:** Contract administrator: what term or obligation requires action?
- **Information:** Agreement type; signed version; spaces and parties; effective dates; term end; obligation type; next review.
- **Primary:** Open selected agreement. **Quick actions:** Message parties; Prepare terms; Add note; Attach amendment.
- **Composition / visual:** Typed agreement table with term-horizon strip and selected record.
- **State response:** Lease/option/CFD changes fields and available work; no implicit conversion on expiry.

**S05 · Tenants** — `/portfolio/tenants` · existing navigation entry

- **Operator / decision:** Resident service team: who is this person and how can we help?
- **Information:** Identity; linked household; primary contact; contractual capacity; consent; preferred channels; unresolved interactions.
- **Primary:** Open selected person. **Quick actions:** Message; Review household; Add note; Request document.
- **Composition / visual:** People directory with compact relationship preview.
- **State response:** Unclassified person needs role review; purpose determines recipients and accessible information.

**S06 · Owners** — `/portfolio/owners` · existing navigation entry

- **Operator / decision:** Owner service team: which owner needs a decision?
- **Information:** Ownership entity; effective interests; managed assets; authority; reporting contacts; pending approvals.
- **Primary:** Open selected owner. **Quick actions:** Message owner; Request approval; Add note; Prepare report.
- **Composition / visual:** Owner list + portfolio composition and approval queue.
- **State response:** Former/current interests and delegated authority change scope; cash availability can remain unverified.


#### Reports

**S07 · Overview** — `/ops/reports` · existing navigation entry

- **Operator / decision:** Manager: which report answers the current question?
- **Information:** Report purpose; audience; source coverage; period; saved definitions; latest completed output.
- **Primary:** Create report. **Quick actions:** Open saved; Preview template; Inspect sources; Export authorized output.
- **Composition / visual:** Curated report catalog with latest runs and source-coverage strip.
- **State response:** Incomplete sources remain explicit before output; previous outputs remain immutable.

**S08 · Create** — `/reports/create` · existing navigation entry

- **Operator / decision:** Report author: can this output be generated and shared?
- **Information:** Template; audience; portfolio scope; period and basis; required sources; preview; access.
- **Primary:** Generate preview. **Quick actions:** Change scope; Save definition; Inspect coverage; Cancel.
- **Composition / visual:** Step-based editor with document preview and source checklist.
- **State response:** Draft → preview → generated version → reviewed delivery; generation and delivery are separate.

**S09 · Saved** — `/reports/saved` · existing navigation entry

- **Operator / decision:** Report consumer: which definition/version is authoritative?
- **Information:** Definition; version; author; generation time; source snapshot; delivery status; authorized audience.
- **Primary:** Open selected version. **Quick actions:** Generate new version; Download; Inspect delivery; Save view.
- **Composition / visual:** Versioned output table and side-by-side metadata preview.
- **State response:** Failed generation preserves prior output; retired definitions cannot silently regenerate.

**S10 · Templates** — `/reports/templates` · existing navigation entry

- **Operator / decision:** Report administrator: which reusable definition should be used?
- **Information:** Template purpose; fields; source requirements; approved version; owner; retirement status.
- **Primary:** Preview selected template. **Quick actions:** Create draft version; Compare versions; Request review; Retire.
- **Composition / visual:** Template library + field/source diff.
- **State response:** Draft/reviewed/retired changes permissions; template edits do not rewrite prior reports.


#### Operations

**S11 · Operations** — `/ops/operations` · existing navigation entry

- **Operator / decision:** Operations lead: who owns the next decision and what blocks it?
- **Information:** One work ID; asset links; stage; responsible person; next step; target; dependencies; latest event.
- **Primary:** Resume selected workflow. **Quick actions:** Create work; Assign owner; Add note; Request approval.
- **Composition / visual:** Operational table/board with selected stage-aware workbench.
- **State response:** Blocked work shows dependency resolution; returned evidence shows acceptance; overdue is based on declared target.


#### Legal Tracker

**S12 · Case Manager** — `/ops/legal/case-manager` · existing navigation entry

- **Operator / decision:** Legal coordinator: what matter needs evidence or review?
- **Information:** Matter type; asset/agreement; parties/capacities; current stage; counsel; verified dates; evidence gaps.
- **Primary:** Open selected matter. **Quick actions:** Add matter; Add note; Attach evidence; Prepare packet.
- **Composition / visual:** Matter table + stage distribution and selected matter summary.
- **State response:** Draft/review/issued/service/court/judgment/recovery stages change the primary action.

**S13 · Advanced Legal Ops** — `/ops/legal/advanced` · planned / unavailable

- **Operator / decision:** Legal supervisor: what reviewed decision is missing?
- **Information:** Review owner; stale facts; evidence completeness; issue/service attempts; counsel dependencies.
- **Primary:** Open next review. **Quick actions:** Assign reviewer; Request evidence; Record decision; Prepare referral.
- **Composition / visual:** Review queue and dependency/evidence matrix.
- **State response:** Unknown execution outcome routes to reconciliation; no blind retry or remedy selection.

**S14 · Legal Docs** — `/ops/legal/docs` · planned / unavailable

- **Operator / decision:** Legal document custodian: which exact version is needed?
- **Information:** Document identity; version; type; issuer; dates; matter links; service evidence; access.
- **Primary:** Open selected document. **Quick actions:** Attach original; Compare versions; Link matter; Prepare packet.
- **Composition / visual:** Document table with readable preview and version rail.
- **State response:** Originals remain immutable; missing version/service proof appears as an actionable gap.

**S15 · Attorney Reports** — `/ops/legal/attorney-reports` · planned / unavailable

- **Operator / decision:** Legal coordinator: is the counsel packet complete and authorized?
- **Information:** Counsel; engagement scope; matter; manifest; versions; missing items; reviewed audience.
- **Primary:** Preview counsel packet. **Quick actions:** Request missing file; Save manifest; Review recipients; Inspect receipt.
- **Composition / visual:** Packet manifest beside document preview.
- **State response:** Preparation → review → delivery attempt → acknowledgment; failure preserves exact packet version.


#### Construction & Repair

**S16 · Work Orders** — `/ops/maintenance/work-orders` · existing navigation entry

- **Operator / decision:** Maintenance coordinator: what repair can proceed now?
- **Information:** Request; duplicate links; urgency; property/map; scope; access; authority; assignee; acknowledgment; evidence.
- **Primary:** Resume selected work order. **Quick actions:** Create work order; Message access contact; Add note; Attach evidence.
- **Composition / visual:** Dense work board + scope/access/assignment/evidence workbench.
- **State response:** Triage, authorization, assignment, returned evidence and acceptance each have distinct primary actions.

**S17 · Vendors** — `/ops/maintenance/vendors` · planned / unavailable

- **Operator / decision:** Vendor coordinator: who can perform the reviewed work?
- **Information:** Trade; area; availability; contact; qualification evidence; current assignments; history.
- **Primary:** Open selected vendor. **Quick actions:** Contact vendor; Request evidence; Review assignment; Add note.
- **Composition / visual:** Vendor directory with capacity/coverage and selected qualification record.
- **State response:** Missing qualification or capacity blocks assignment, not contact; expired evidence remains visible.

**S18 · Materials & Inventory** — `/ops/maintenance/materials-inventory` · planned / unavailable

- **Operator / decision:** Inventory coordinator: what stock is actually available?
- **Information:** Item; serial/batch; stock owner; location; on-hand/reserved/available; condition; accepted movements.
- **Primary:** Review selected stock. **Quick actions:** Request reservation; Record evidence; Inspect movement; Add note.
- **Composition / visual:** Location/stock table and movement ledger.
- **State response:** Reservation/use/return reconcile to accepted inventory owner; incomplete counts are unknown.

**S19 · Smart Routing** — `/ops/maintenance/smart-routing` · planned / unavailable

- **Operator / decision:** Field coordinator: is the route feasible and authorized?
- **Information:** Work locations; access windows; urgency; trade; capacity; travel assumption; assignment status.
- **Primary:** Review route proposal. **Quick actions:** Select work; Inspect access; Save proposal; Request dispatch.
- **Composition / visual:** Route map + ordered job list + access/conflict strip.
- **State response:** Planning differs from dispatch; no optimized route is treated as field acknowledgment.

**S20 · AI Intelligence** — `/ops/maintenance/ai-intelligence` · planned / unavailable

- **Operator / decision:** Maintenance lead: which suggestion is supported by evidence?
- **Information:** Repeated issues; task history; source dates; observed patterns; confidence; missing inputs.
- **Primary:** Inspect selected finding. **Quick actions:** Open evidence; Create review task; Dismiss with reason; Add note.
- **Composition / visual:** Ranked finding list with evidence comparison.
- **State response:** Suggestions remain proposals; new evidence changes ranking, not source facts or work completion.

**S21 · Build/Repair Projects** — `/ops/maintenance/build-repair-projects` · planned / unavailable

- **Operator / decision:** Project coordinator: what is needed for operations handover?
- **Information:** Project ID; asset; approved scope; milestones; commitments; issues; completion evidence; CM link.
- **Primary:** Resume selected project. **Quick actions:** Open Construction Manager; Request approval; Add note; Attach evidence.
- **Composition / visual:** Milestone dependency timeline + cost/commitment view + handover checklist.
- **State response:** Proposed/active/returned/accepted stages change commands; completion report is not acceptance.

**S22 · Capital Projects** — `/ops/maintenance/capital-projects` · planned / unavailable

- **Operator / decision:** Asset manager: which capital commitment is ready for a decision?
- **Information:** Business case; scope; funding; authority; commitments; reserves/payables; risk; approved changes.
- **Primary:** Review capital decision. **Quick actions:** Inspect funding; Request owner approval; Open project; Add note.
- **Composition / visual:** Capital pipeline and funding/commitment waterfall with source basis.
- **State response:** Contribution is one prerequisite; approval depends on all accepted conditions.


#### Accounting

**S23 · Tenant Ledgers** — `/ops/accounting/tenant-ledgers` · existing navigation entry

- **Operator / decision:** Account specialist: what posted account facts require action?
- **Information:** Account/obligation; charges; receipts; allocations; credits; disputed amount; deposits; plan association.
- **Primary:** Open selected account. **Quick actions:** Message obligors; Prepare payment plan; Inspect source; Add note.
- **Composition / visual:** Posted-entry table + aging + servicing terms.
- **State response:** Unreconciled/stale source changes mutation availability; shared account is counted once.

**S24 · Overview** — `/ops/accounting/overview` · planned / unavailable

- **Operator / decision:** Accounting lead: what exception requires reconciliation?
- **Information:** Period; basis; receipts/expenses; accounts; reconciliation exceptions; commitments; source coverage.
- **Primary:** Review accounting exceptions. **Quick actions:** Open ledgers; Prepare report; Inspect source; Save view.
- **Composition / visual:** Financial summary and exception table with reconciled totals.
- **State response:** Close/reconciliation stage changes work; reported revenue is not collected cash or NOI.

**S25 · Rent Collection** — `/ops/accounting/rent-collection` · planned / unavailable

- **Operator / decision:** Collection specialist: what receivable needs follow-up?
- **Information:** Due/received; remaining balance; payer/obligation; payment status; allocation; permitted contact.
- **Primary:** Open selected collection. **Quick actions:** Message obligors; Inspect provider payment; Prepare plan; Add note.
- **Composition / visual:** Collection table + period progress and unapplied receipt strip.
- **State response:** Pending/posted/reversed are explicit; payment entry remains in DoorLoop unless a command is verified.

**S26 · Expenses** — `/ops/accounting/expenses` · planned / unavailable

- **Operator / decision:** Accounting specialist: is this expense supported and classified?
- **Information:** Vendor; property/project; amount; invoice version; cost category; authority; posting status.
- **Primary:** Review selected expense. **Quick actions:** Attach invoice; Inspect source entry; Request approval; Add note.
- **Composition / visual:** Expense table + budget/actual/commitment comparison when sourced.
- **State response:** Unposted invoices differ from posted expenses; missing classifications route to review.

**S27 · Financial Reports** — `/ops/accounting/financial-reports` · planned / unavailable

- **Operator / decision:** Accounting lead: which financial report basis is required?
- **Information:** Cash/accrual basis as supported; scope; period; statement type; sources; reconciliation state.
- **Primary:** Preview financial report. **Quick actions:** Change basis; Inspect entries; Save definition; Download version.
- **Composition / visual:** Statement preview with basis and reconciliation bridge.
- **State response:** Basis/scope changes update all series and totals; unsupported basis is unavailable.

**S28 · Collections Dashboard** — `/ops/accounting/collections-dashboard` · planned / unavailable

- **Operator / decision:** Collections manager: which account needs the next servicing decision?
- **Information:** Aging; dispute; plan state; communication; notice/matter links; last contact; accountable owner.
- **Primary:** Resume selected account review. **Quick actions:** Message obligors; Prepare plan; Open matter; Add note.
- **Composition / visual:** Aging distribution + prioritized servicing queue.
- **State response:** A disputed item stays posted until actual ledger action; concern does not automatically issue notice.

**S29 · Collections Log** — `/ops/accounting/collections-log` · planned / unavailable

- **Operator / decision:** Collections team: what actually happened on this account?
- **Information:** Attributed event; occurrence/recording time; account; communication; plan; notice; next commitment.
- **Primary:** Open selected event. **Quick actions:** Add servicing note; Open account; Inspect evidence; Export authorized history.
- **Composition / visual:** Searchable continuous servicing timeline/table.
- **State response:** Corrections append attributed events; no silent erasure of prior history.

**S30 · Payment Plans** — `/ops/accounting/payment-plans` · planned / unavailable

- **Operator / decision:** Servicing specialist: what terms need preparation or follow-up?
- **Information:** Posted balance; plan-covered subset; dispute; schedule; signed acceptance; installments; actual allocations.
- **Primary:** Resume selected plan. **Quick actions:** Prepare proposal; Message obligors; Inspect receipts; Add note.
- **Composition / visual:** Installment schedule + proposed/accepted/actual comparison.
- **State response:** Offered/accepted/active/satisfied/cancelled have explicit transitions; cancel never restores a fictitious balance.

**S31 · Deposits** — `/ops/accounting/deposits` · planned / unavailable

- **Operator / decision:** Deposit specialist: what liability or disposition needs review?
- **Information:** Held deposit; holder/source; agreement; move dates; evidence; approved disposition; statutory basis source.
- **Primary:** Review selected deposit. **Quick actions:** Inspect source; Attach evidence; Prepare disposition; Add note.
- **Composition / visual:** Liability table + evidence-backed disposition worksheet.
- **State response:** Held liability stays distinct from income and available cash; no automatic blanket hold.

**S32 · Transfers** — `/ops/accounting/transfers` · planned / unavailable

- **Operator / decision:** Accounting reviewer: which transfer is authorized and reconciled?
- **Information:** From/to owner/account; effective scope; amount; authority; impact; source command support; reconciliation.
- **Primary:** Review transfer request. **Quick actions:** Inspect authority; Compare impact; Add note; Reconcile outcome.
- **Composition / visual:** Transfer review worksheet and command outcome timeline.
- **State response:** No transfer executes from navigation; hidden owner-transfer utility stays separately gated.

**S33 · Subsidized Housing** — `/ops/accounting/subsidized-housing` · planned / unavailable

- **Operator / decision:** Housing specialist: which subsidy requirement needs servicing?
- **Information:** Household eligibility scope; agency; contract; tenant/agency portions; inspections; recertification dates; proof.
- **Primary:** Resume selected certification. **Quick actions:** Contact agency; Request document; Schedule review; Add note.
- **Composition / visual:** Agency/household case table and certification timeline.
- **State response:** Tenant and agency obligations remain separate; eligibility and dates require accepted evidence.

**S34 · Assistance Programs** — `/ops/accounting/assistance-programs` · planned / unavailable

- **Operator / decision:** Assistance coordinator: what application or award needs follow-up?
- **Information:** Program; applicant permission; submitted items; award; restrictions; dates; payment evidence.
- **Primary:** Resume selected application. **Quick actions:** Request document; Contact program; Record outcome; Add note.
- **Composition / visual:** Application stages and award/payment reconciliation.
- **State response:** Submitted/awarded/received are distinct; award is not a posted receipt.


#### AI Analytics

**S35 · Vacancy review** — `/ops/ai/vacancy-analytics` · existing navigation entry

- **Operator / decision:** Leasing manager: what prevents this unit from being offered?
- **Information:** Physical status; readiness; construction; asking-rent evidence; media; channels; responsible person.
- **Primary:** Open next readiness blocker. **Quick actions:** Create work; Review pricing; Review media; Add note.
- **Composition / visual:** Vacancy days/readiness matrix + linked geographic view.
- **State response:** Vacant/turn/ready/listed stages replace irrelevant controls; no publishing while readiness unresolved.

**S36 · Renewal planning** — `/ops/ai/renewal-forecasting` · existing navigation entry

- **Operator / decision:** Leasing manager: which upcoming term needs reviewed terms?
- **Information:** Agreement type; end/review dates; market basis; household; signed amendments; authority; communication.
- **Primary:** Start selected renewal review. **Quick actions:** Message parties; Compare terms; Request approval; Add note.
- **Composition / visual:** Term-horizon table and proposal comparison.
- **State response:** Review/offer/accepted/executed differ; expiry does not automatically amend the agreement.

**S37 · Risk Summary** — `/ops/ai/risk-summary` · planned / unavailable

- **Operator / decision:** Risk reviewer: which evidence-backed concern requires review?
- **Information:** Reason; assets/agreements; source facts and age; confidence; responsible owner; exclusions.
- **Primary:** Inspect selected concern. **Quick actions:** Open evidence; Assign review; Add note; Record disposition.
- **Composition / visual:** Explainable concern table, concentration chart and source gaps.
- **State response:** No automatic legal, financial or adverse action from a score; sensitive criteria need separate review.

**S38 · ML Leasing Logs** — `/ops/ai/ml-leasing-logs` · planned / unavailable

- **Operator / decision:** Analytics reviewer: what produced this leasing recommendation?
- **Information:** Input snapshot; model/rule version; output; explanation; reviewer; accepted/rejected outcome.
- **Primary:** Inspect selected run. **Quick actions:** Compare version; Open evidence; Record review; Export trace.
- **Composition / visual:** Versioned run log with input/output diff.
- **State response:** Revised inputs create a new run; prior outcome retained; no claim of deployed ML without verification.


#### Communication

**S39 · Templates** — `/ops/comms/templates` · existing navigation entry

- **Operator / decision:** Communications administrator: which approved template fits this purpose?
- **Information:** Channel; purpose; variables; audience eligibility; approved wording/version; attachments.
- **Primary:** Preview selected template. **Quick actions:** Create draft version; Compare versions; Request review; Retire.
- **Composition / visual:** Template table and recipient-safe variable preview.
- **State response:** Ordinary correspondence differs from formal notice content; changing template does not rewrite sent messages.

**S40 · Queue** — `/ops/comms/queue` · planned / unavailable

- **Operator / decision:** Service operator: which incoming message needs a response or linked work?
- **Information:** Sender; purpose; household roles; channel/consent; conversation; asset; unread age; linked work.
- **Primary:** Reply to selected thread. **Quick actions:** Create linked work; Add note; Attach file; Assign conversation.
- **Composition / visual:** Three-pane inbox with thread and one adaptable dock.
- **State response:** Reply preview resolves purpose/recipient permissions; ambiguous delivery moves to reconciliation.

**S41 · Logs** — `/ops/comms/logs` · planned / unavailable

- **Operator / decision:** Service supervisor: what is the actual delivery outcome?
- **Information:** Message/version; recipients; provider attempt; timestamps; accepted/delivered/failed/unknown; work link.
- **Primary:** Inspect selected attempt. **Quick actions:** Open thread; Inspect receipt; Reconcile outcome; Export authorized log.
- **Composition / visual:** Delivery table and immutable attempt timeline.
- **State response:** Provider acceptance is not delivery; timeout is not rejection; retry requires verified contract.


#### Data Hub

**S42 · Overview** — `/data` · existing navigation entry

- **Operator / decision:** Data steward: why do working counts differ from imported counts?
- **Information:** Raw identities; management dates; archived/deleted state; canonical links; accepted classifications; conflicts.
- **Primary:** Review next reconciliation. **Quick actions:** Inspect raw record; Open sync audit; Assign owner; Save view.
- **Composition / visual:** Imported/Working/Reconciliation bridge and quality exception table.
- **State response:** No raw property count labeled active managed properties; unresolved identities stay quarantined.

**S43 · Sync Audit** — `/data/sync-audit` · planned / unavailable

- **Operator / decision:** Data steward: can this run support promotion?
- **Information:** Run; endpoint/page coverage; raw checksums; errors; transformations; accepted/rejected counts.
- **Primary:** Inspect selected run. **Quick actions:** Open payload; Compare prior run; Inspect reconciliation; Export manifest.
- **Composition / visual:** Run reconciliation waterfall + entity/page matrix.
- **State response:** Partial capture cannot masquerade as full population; accepted promotion retains provenance.

**S44 · Sync Management** — `/data/sync-management` · planned / unavailable

- **Operator / decision:** Sync operator: what bounded recovery is needed?
- **Information:** Jobs; run scope; cursor; failure; rate-limit state; transform version; dependencies.
- **Primary:** Review recovery plan. **Quick actions:** Preview run scope; Inspect failure; Schedule reviewed run; Open logs.
- **Composition / visual:** Job/cursor control table and bounded replay preview.
- **State response:** Ingestion/replay availability follows verified contracts; no blind provider write retries.

**S45 · Raw Data** — `/data/raw` · planned / unavailable

- **Operator / decision:** Authorized data steward: what exact source payload was received?
- **Information:** Endpoint; entity/page; run/time; source IDs; immutable original; checksum; access restrictions.
- **Primary:** Open selected payload. **Quick actions:** Compare versions; Copy authorized reference; Inspect transform; Link conflict.
- **Composition / visual:** Payload browser beside source-to-working field lineage.
- **State response:** Sensitive fields permission-scoped/redacted; originals retained unchanged; no raw secrets in UI.

**S46 · Sync Logs** — `/data/sync-logs` · planned / unavailable

- **Operator / decision:** Sync operator: which failure caused the incomplete run?
- **Information:** Run correlation; event time; endpoint; sanitized failure; affected entity/page; retry outcome.
- **Primary:** Inspect selected failure. **Quick actions:** Open run; Filter correlation; Inspect recovery; Export sanitized log.
- **Composition / visual:** Searchable chronological event table.
- **State response:** Logs never expose credentials or unredacted private payloads; duplicate jobs visible separately.

**S47 · System Settings** — `/data/system-settings` · planned / unavailable

- **Operator / decision:** Data administrator: what controlled ingestion setting should change?
- **Information:** Current value; owner; environment; approved scope; validation; previous version.
- **Primary:** Review configuration change. **Quick actions:** Compare versions; Validate; Inspect history; Revert approved change.
- **Composition / visual:** Configuration diff with impact preview.
- **State response:** Environment and authority explicit; server secrets are not editable client values.


#### Systems

**S48 · Integrations** — `/systems/integrations` · existing navigation entry

- **Operator / decision:** Integration operator: what capability actually works?
- **Information:** Provider; bound environment; capability-level state; last evidence; error; command/read boundary.
- **Primary:** Inspect selected capability. **Quick actions:** Run read check; Open logs; Inspect configuration; Review recovery.
- **Composition / visual:** Capability matrix and evidence timeline.
- **State response:** Connected account is not proof of email/SMS/dispatch; no credentials displayed.

**S49 · Workspace preferences** — `/system/settings` · existing navigation entry

- **Operator / decision:** Individual operator: which workspace preference improves my work?
- **Information:** Density; accessible display options; user scope; saved choice; current setting.
- **Primary:** Save preferences. **Quick actions:** Reset preference; Preview density; Cancel.
- **Composition / visual:** Live setting preview inside existing shell.
- **State response:** Personal presentation only; navigation/brand/security rules are not editable preferences.

**S50 · Automation** — `/system/automation` · planned / unavailable

- **Operator / decision:** Automation administrator: what exact authorized rule may run?
- **Information:** Trigger; scope; conditions; proposed effect; authority; last execution; failure recovery; kill switch.
- **Primary:** Review selected rule. **Quick actions:** Simulate; Inspect runs; Create draft; Disable rule.
- **Composition / visual:** Trigger-condition-action editor and replay evidence.
- **State response:** Simulation differs from activation; no automatic legal/source mutations without accepted authority and contract.

**S51 · Dropbox Files** — `/integrations/dropbox` · planned / unavailable

- **Operator / decision:** Document operator: which canonical file/version belongs here?
- **Information:** Document ID; version; record links; permission; Dropbox custody; staging/delivery receipt; lifecycle.
- **Primary:** Open selected document. **Quick actions:** Attach file; Request missing document; Inspect versions; Link existing.
- **Composition / visual:** Registry-backed file table, preview and verified custody rail.
- **State response:** Folder path never grants access; staged upload is not verified Dropbox delivery.

**S52 · CoreLogic / MLS Grid** — `/integrations/corelogic` · planned / unavailable

- **Operator / decision:** Asset data analyst: what licensed property evidence is available?
- **Information:** Address/entity match; dataset; rights; source date; cost; field lineage; confidence.
- **Primary:** Inspect matched property. **Quick actions:** Review match; Preview permitted fetch; Compare fields; Open source.
- **Composition / visual:** Property source comparison with address map.
- **State response:** No paid call or data overwrite implied by inspection; unmatched addresses require review.

**S53 · Field App Link** — `/integrations/field-app` · planned / unavailable

- **Operator / decision:** Field coordinator: what linked field evidence has returned?
- **Information:** ECC work ID; Field App record; requested purpose; acknowledgment; captured evidence; acceptance.
- **Primary:** Open linked field record. **Quick actions:** Prepare handoff; Inspect evidence; Reconcile outcome; Add note.
- **Composition / visual:** Handoff state timeline beside evidence gallery.
- **State response:** Capture/proof capability is distinct from dispatch; no assumed dispatch contract.

**S54 · Deal Room Link** — `/integrations/deal-room` · planned / unavailable

- **Operator / decision:** Deal coordinator: what deal-room record belongs to this asset?
- **Information:** Canonical property/deal IDs; approved purpose; shared document/version references; acknowledgment.
- **Primary:** Review linked deal. **Quick actions:** Prepare handoff; Inspect permissions; Reconcile outcome; Add note.
- **Composition / visual:** Asset/deal relationship preview and handoff history.
- **State response:** No guessed Deal Room API or shared financial ownership; unbound contract remains explicit.


#### Growth

**S55 · Marketing** — `/growth/marketing` · planned / unavailable

- **Operator / decision:** Leasing/marketing team: what can be marketed and what needs follow-up?
- **Information:** Readiness; approved asking terms; photos/rights; description; channels; inquiries; showings; application stages.
- **Primary:** Review selected listing. **Quick actions:** Review media; Edit draft; Message prospect; Schedule showing.
- **Composition / visual:** Unit marketing pipeline + photo carousel/list + cohort funnel.
- **State response:** Draft/approved/published/withdrawn and provider outcomes distinct; media permission separate from condition evidence.


#### Investor Portal

**S56 · Dashboard** — `/investor/dashboard` · planned / unavailable

- **Operator / decision:** Authorized investor: what is happening within my allowed portfolio?
- **Information:** Investment scope; accepted asset data; reporting period; performance; pending authorized decisions; documents.
- **Primary:** Open portfolio review. **Quick actions:** Open asset; Ask question; View statement; Download authorized report.
- **Composition / visual:** Investor-scoped map and performance/decision summary.
- **State response:** Separate investor identity and access; no tenant private communications in investor surface.

**S57 · Portfolio Analytics** — `/investor/portfolio-analytics` · planned / unavailable

- **Operator / decision:** Authorized investor: what explains performance in my holdings?
- **Information:** Accepted ownership exposure; income/expense basis; debt/value dates; occupancy; comparison scope.
- **Primary:** Inspect selected variance. **Quick actions:** Change period; Compare assets; Inspect sources; Save view.
- **Composition / visual:** Scoped trends, concentration and capital exposure with accessible tables.
- **State response:** No unsupported valuation/available cash; scope is enforced server-side.

**S58 · Financial Reports** — `/investor/financial-reports` · planned / unavailable

- **Operator / decision:** Authorized investor: which exact statement/version is available?
- **Information:** Statement type; investment scope; period; basis; approved version; delivery status.
- **Primary:** Open selected statement. **Quick actions:** Download; Inspect basis; Ask question; View prior version.
- **Composition / visual:** Statement library with readable document preview.
- **State response:** Only authorized reviewed versions exposed; generated and delivered outcomes remain distinct.


### 13.6 All record workspaces and 33 retained tabs

Tab identity/order is frozen. The active tab changes data and commands; record identity and the command region persist. Details below supplement section 6, not remove it. A tab that has no accepted data has a useful missing-data state with its next action.

| Record / tab | Information and composition | Primary / quick command |
|---|---|---|
| Property · Overview | Required address map, ownership/management context, unit inventory, distinct occupancy/readiness/construction states, priority property work, operating performance | State-specific property decision; Message / Create work order / Add note / Attach file |
| Property · Financials | Period/basis, receipts/expenses/NOI, source entries, receivables, commitments, liabilities and debt/value when sourced | Inspect variance; Open source / Prepare report / Request approval |
| Property · Legal | Property matters, contract/authority evidence, notice associations, verified dates and responsible person | Resume selected matter; Attach evidence / Add note / Prepare packet |
| Property · Files | Property photos, plans, insurance, ownership/management records, condition evidence, registry versions and custody | Open selected version; Attach file / Link existing / Request document |
| Unit · Overview | Property-map context/entrance, occupancy/readiness/construction dimensions, physical features, next blocker, condition media | Resolve readiness blocker; Create work order / Message access contact / Schedule visit |
| Unit · Related | Parent property/building, actual agreements/households, vendors/work/projects and effective dates | Open selected related record; Review association / Add note |
| Unit · Financials | Unit-associated obligations, signed versus asking terms, turn costs, accepted commitments and posted transactions | Inspect selected amount; Open account / Review pricing / Request approval |
| Unit · Legal | Linked unit/agreement matters, notice versions and access concerns with evidence | Open selected matter; Add concern / Attach evidence / Add note |
| Unit · Files | Photos, floor plan, inspections, work evidence, marketing-approved media kept distinct by purpose | Review selected media/version; Attach file / Request evidence / Review marketing |
| Lease · Overview | Typed agreement, signed term/version, involved spaces/parties, obligation snapshot and lifecycle work | Resume agreement decision; Message parties / Prepare plan / Start renewal review |
| Lease · Related | Many-to-many space/party associations where actually needed, effective dates, amendments and linked accounts/work | Inspect selected association; Review household / Open property / Add note |
| Lease · Financials | Typed obligation balances/entries, actual allocation, deposit liability, disputes, plan subset and schedule | Resume account review; Inspect entries / Prepare plan / Open provider account |
| Lease · Legal | Concerns, exact notice versions/facts, issue/service attempts, matters and reviewed next step | Review selected notice/matter; Attach evidence / Record response / Add note |
| Lease · Files | Executed agreement, signed amendments, option/CFD evidence, plan acceptance, notices and statements | Open signed version; Request document / Attach amendment / Compare versions |
| Tenant · Overview | Identity, primary contact distinct from obligor, consent/preferences, active household and service concern | Reply to current concern; Message / Create linked work / Add note |
| Tenant · Related | Actual current/historical party capacities, household, agreements, properties and representatives | Open selected agreement; Review capacity / Open household / Add note |
| Tenant · Financials | Authorized account associations, shared obligation once, individual capacity and no duplicate debtor total | Open selected authorized account; Inspect source / Prepare plan / Add note |
| Tenant · Legal | Person's authorized matter/notice associations, capacity, versions and verified delivery context | Open selected matter; Attach evidence / Review audience / Add note |
| Tenant · Files | Role-scoped identity/contract/communication documents, authorized request history and versions | Open selected version; Request document / Attach file / Inspect access |
| Owner · Overview | Identity, authorized assets/map, authority, pending decisions, property performance and reporting | Review next owner decision; Message / Request approval / Prepare report |
| Owner · Related | Effective ownership interests, management agreements, authorized contacts and asset/deal associations | Open selected property; Inspect authority / Review association / Add note |
| Owner · Financials | Posted performance, liabilities, commitments, reserves/payables, contributions/distributions and dated valuation/debt | Inspect financial decision; Prepare statement / Review contribution / Open source |
| Owner · Legal | Authority/ownership concerns, relevant matters and restricted legal documents | Resume selected matter; Attach evidence / Request counsel packet / Add note |
| Owner · Files | Ownership/management agreements, statements, approval evidence and versioned reports | Open selected version; Attach file / Request document / Prepare packet |
| Legal · Overview | Matter context, current stage, source-fact changes, missing evidence and next reviewed decision | Resume stage-specific review; Assign reviewer / Add note / Attach evidence |
| Legal · Timeline | Occurred/recorded events, actors, source links and corrections; distinct from Court | Open selected event; Add servicing note / Link evidence |
| Legal · Documents | Exact document/notice versions, source snapshots, permissions and custody | Open selected version; Attach original / Compare versions / Request evidence |
| Legal · Judgment | Actual judgment, creditors/debtors, award components, allocations, satisfaction and accepted projection | Inspect judgment projection; Attach order / Inspect allocation / Add note |
| Legal · Tasks | Responsible person, target type, dependency, status and stage relevance | Resume selected task; Assign / Request evidence / Record completion |
| Legal · Correspondence | Matter-specific ordinary conversations and authorized parties, distinct from formal issue/service | Reply to selected thread; Review recipients / Attach permitted file / Add note |
| Legal · Court | Sourced docket/case identity, verified dates, filings and counsel; no invented schedule | Inspect selected court record; Attach filing / Record verified event / Prepare referral |
| Legal · Packet | Exact version manifest, scope, audience, missing items, preview and delivery acknowledgment | Preview packet; Request missing item / Generate version / Review delivery |
| Legal · Audit | Immutable attempts, approvals, source changes, access-sensitive events and reconciliation | Inspect selected audit event; Reconcile outcome / Export authorized trace |

Relationship links preserve the invoking record, tab, selected row, filters, scroll and focus. Opening a linked card updates the dock scope visibly. A draft belonging to one person/account must never silently follow the operator into a different record. Backend authentication/permission changes clear inaccessible cached content; no PIN bypass.

Hidden routes remain specified under the original registered-route checklist: root and property aliases retain behavior; admin sync/geocode require administrator capability; transfer utilities remain unavailable until verified authorization/contract. Their information/action patterns are Sync Management, location review and transfer review above; none is re-exposed by this design revision.

### 13.7 Reactive information and chart contracts

| Input / event | Canonical source and state owner | Recomputed information / visual | Persistence and consumers | Required proof |
|---|---|---|---|---|
| Portfolio scope / period | Authorized accepted Working views; UI filter state | Map/list population, occupancy denominator, chart period, selected exceptions; incompatible selections clear visibly | Scoped saved view; reports carry exact scope/basis | Filter once, compare map/list/totals; reload same view; denied rows excluded server-side |
| Management/classification resolution | Reconciliation decision + accepted management/asset identity records | Managed property and rentable-unit counts, city totals, map/list and owner exposure | Resolution history; promoted Working version | Raw imported count differs legitimately; no duplicate canonical identity; historical records retained |
| Accepted coordinate / entrance | Accepted location record; map selection owner | Selected location, map/list linkage, directions destination; financial totals unaffected | Source/match proof; authorized property/unit/work consumers | Rejected geocode has no guessed pin; accessible list works when tiles fail |
| Posted receipt / allocation | Imported authoritative ledger accepted into Working | Posted balance, aging, plan actuals and affected notice-fact freshness; no assumed oldest-charge allocation | Immutable source version and projection provenance | Reconcile charges/credits/allocations; new receipt invalidates affected draft approval but not historical issue attempts |
| Plan terms / cancellation | Altus servicing plan version; account remains source-ledger owned | Proposed schedule/covered subset/next installment; not posted balance or deposit | Offered/accepted/active/cancelled events and signatures | Totals and schedule reconcile; cancel preserves actual posted history; no double counted receivable |
| Occupancy / readiness / handover | Accepted occupancy relationship, condition/readiness and project evidence | Physical occupancy, turn/ready rows, listing prerequisites and current primary command | Separate state owners; work/project references | Empty space can remain unready; returned completion proof does not auto-accept or publish |
| Recipient purpose / party role | Effective party capacities, preferences/consent and permission service | Eligible audience, channel, attachment preview and commit availability | Server-side draft and immutable message/attempt | Non-obligor adult can receive authorized maintenance message; account detail restricted; minor not default audience |
| Work stage / acknowledgment | Verified canonical work/task owner and handoff outcome | Next command, dependencies, aging/velocity and map work overlay | One work ID and event history across views | Assigned ≠ acknowledged ≠ completed ≠ accepted; timeout remains unknown until reconciled |
| Valuation / debt snapshot | Accepted dated valuation/debt records | Capital series and exposure; no available-cash assumption | Snapshot/version references in reports | Same-date/basis or explicit mismatch; null history is a gap; commitments/payables/reserves not omitted from cash analysis |

Every chart contract includes its decision, accepted source, filters, stage, series, units, period/cohort, total reconciliation, zero/null/negative handling, legend, accessible table, selected-interval action and mobile form. Portfolio funnel uses one named cohort; plan-covered amount is a subset of AR; values/debt use dated observations; sums of city counts reconcile to the filtered population. Last partial week is labeled. Non-additive measures are labeled; no random trends. Complete runtime reactivity/persistence proof remains required after implementation—these renderings do not establish it.

### 13.8 Review scenes, quality gate and build sequence

Updated rendering set 05 demonstrates 17 selected scenes: the 15 previous core surfaces refined with the unified action language and current workspace palette, plus property directory Map/Split and a purpose-specific property message composer. Property and SFR scenes include a location map. This is selective visual coverage; the full 58/33 inventory is specified, not visually approved. Fictional figures, schematic maps and inert review controls are labeled. No stock photo is presented as a real asset and no decorative placeholder building substitutes for useful record information.

Required production acceptance: 1440/1920/1024/390 widths; readable text; contrast; keyboard/focus; table/map linked selection; document previews; purposeful chart actions; server draft retention; record/tab returns; declined and stale states; unknown external outcomes; concurrent changes; save/reload; cross-app correlation and canonical records. On each screen prove the operator can identify the record, explain the issue, select the next command, predict its consequence, cancel/correct a mistake and resume. Screenshots only prove appearance. Do not call any surface accepted, live or integrated from this package.

Apply the design as coherent batches within existing UI packages: (1) finish tokens/typography/action components and property-map component; (2) dashboard and Properties directory/property/SFR exemplars; (3) unit/lease/tenant/owner and all tabs; (4) inbox/work/notice/plan/completion review; (5) remaining families against section 13.5; (6) responsive, accessibility and live-data proof across the full inventory. Source/contract/data cleanup can be specified and rehearsed in isolation; production changes follow the agreed approval boundary. No coding agent has been contacted or activated by this revision.

**Review status:** design specification updated; visual revision prepared for review; production UI, integrations and database unchanged. Navigation, logo files, route identities and availability flags are preserved. This revision adds property maps and commands; it removes none of the recovered D01–D20 information requirements.

## 14. Revision 1.2 — consolidated advisor corrections

**Status:** Proposed design specification; no implementation approval or production change. This section takes precedence over conflicting composition, action-label or state recommendations in section 13. Preserve the fixed navigation, logo, theme and all recovered dashboard capabilities. Decision IDs UX01–UX18 are design decisions, distinct from the historical dashboard recovery IDs D01–D20.

The complete disposition of 43 numbered advisor findings and rejected/qualified proposals is in [advisor decision register](ECC_APM_Advisor_Consolidation_and_Design_Decisions.md). No advisor's unverified runtime claim becomes a confirmed implementation defect. A new advisor round is not required for the routine choices consolidated here.

### UX01 — Compact record context without dropping facts

Merge the scope/freshness row and useful identity facts into a compact record header. Use the actual address/person/agreement as the dominant title, followed by type, current relationship, responsible person and a concise source state where relevant. Remove large unused identity space and duplicated titles. Lower-frequency building/ownership details remain discoverable in Overview or contextual disclosure.

Do not impose Gemini's fixed 48 px header on every record: a multiline address, typed agreement, current state and usable 44 px controls need a responsive fit. At 1440 px, target useful property map and current work visible in the first content viewport; record the actual screenshot and measurements. At 1024 px, use a contextual drawer where necessary. At 390 px, retain readable title, scope and action labels without a new navigation system.

### UX02 — Map and priority work remain peers

Retain the dashboard map with adjacent priority feed and all recovered analytical content. Start with the recovered approximately two-thirds/one-third composition; test a 60/40 split if priority rows truncate. Choose the fit from representative labels and task evidence, not a blanket ratio. An individual may deliberately collapse a section as a saved preference; default design does not conceal the map.

Property and SFR Overview keep a substantial location/access map. Properties List/Map/Split retain selection and filters. Map controls remain Directions, Schedule visit, nearby assets and provider-supported layers, with accessible location fallback. Do not expose gate codes, household information or a universal minor count on the map/header.

### UX03 — Commands depend on scope and permission

Record pages keep stable, discoverable quick-action positions for Message…, New service request, Add servicing note and Attach file where authorized. State changes refine labels and eligibility without constantly moving controls. Legitimate future actions must not disappear just because no current work item uses them. Explain unavailable actions inline or on focus, not hover only.

At portfolio scope, Message/Create/Note require an explicit record or scope selection first. Tenant Ledgers commands apply only after selecting an authorized account, with the selected account shown. No action silently targets an old row. Directions and Schedule visit remain beside the map. Creation can fail or be denied; no workflow is called failure-free because it starts locally.

### UX04 — Primary command follows the selected human decision

The active selection controls the primary action, subject to permission and prerequisite checks. When there is no selection, offer a transparent relevant-work summary or neutral page action. Rank candidate work by the accepted business priority, responsibility, target and blocker facts; do not invent a score. Ties offer Open relevant work (N) with reasons. No automatic navigation or command replacement while typing or reviewing: display a new-event indicator and let the operator change context deliberately.

Partial data disables only commands whose prerequisites are affected. It does not disable useful viewing, notes, preparation or unrelated work across the whole page. An empty queue has a useful neutral action rather than a disabled pseudo-urgent button. Header and active workbench share one dominant action, without duplicate gold commands for the same task.

### UX05 — One dock, explicit modes and stable resumption

Conversation / Work / History remain within the existing record content. Show permission-scoped unread, draft and unknown-outcome indicators. One mode expanded at a time; no second permanent history panel. A neutral dock may be closed to reclaim space, with a labeled launcher and counts; an active dock never auto-collapses. Respect the operator's explicit setting. No mandatory 48 px icon-only rail, automatic dimming overlay or gesture-only mobile sheet.

Server drafts are scoped to user, record, purpose and thread/version, with retention/expiry. Show Saving, Saved time, Save failed and concurrent-change states. Preserve authorized draft, mode and return position through record/tab changes. Re-derive audience before sending. Revoked access masks content immediately, clears inaccessible client content and does not promise a visible saved-draft entry if even its existence is unauthorized. Another operator never inherits private draft content. Closing a composer is not deleting a draft; explicit Discard is separate and handles dirty content.

### UX06 — Purpose and audience belong in the message preview

New Message… opens purpose selection and eligible recipients; an existing reply may retain its purpose and audience if still valid. Avoid an extra blocking dialog on every routine reply. The composer and final preview show full names, relevant capacities, inclusion reason, channel and attachment scope. Changing purpose recomputes eligibility and flags content/attachments needing review.

Use labels such as **Authorized access contact** and **Co-obligor on L-1042**. Do not use a global Full Obligor or Access Only permission badge: capacity and access depend on agreement, purpose, effective dates and actual authority. Non-obligor account access is evaluated from verified representation/authorization, not a universal ban. Minors remain out of default account/notice audiences; any special audience follows reviewed rules and authority. Do not display minor counts everywhere as decoration. This is a product access design, not a new legal rule.

### UX07 — Work identity and source ownership are separate

Use one canonical ECC work/request reference across queue, property, unit and history. Show a distinct linked execution/provider reference only when it exists, with a clear relationship. Two references can legitimately describe intake and execution; never conflate separate real jobs to achieve one visible prefix. Match possible duplicates, allow reviewed linking or a justified distinct request, and handle concurrent creation conflicts.

Use **New service request** for ECC intake; use **Create work order** only where the accepted execution contract supports it. Imported DoorLoop work orders remain visible by their actual IDs. Operator text says **Execution not assigned** or **Handoff not configured** where appropriate. Engineering ownership analysis belongs in integration/admin detail, not a daily work-order table. Exact execution ownership remains unresolved; this specification does not assign it by guess.

### UX08 — External attempt, provider outcome and service are distinct

Provide a shared presentation with record/command/version, immutable attempt ID, actor/time, provider correlation where available and one clear next action. Distinguish local preparation/submission, provider acceptance, delivery, field acknowledgment, completion evidence and formal service as appropriate to the command. Do not collapse these into one generic Confirmed badge.

When outcome is unknown, block a duplicate execution of that logical command and offer reconciliation using verified status lookup or evidence. A provider failure is not automatically safe to retry; accepted retry/idempotency rules still apply. Do not let an operator simply label an uncertain provider attempt failed with no proof. An affected executed version/attempt is immutable. Independent internal notes, evidence gathering and preparation can continue; a new internal draft is not a resend and need not be universally prohibited. A timeout does not become an unsent draft.

### UX09 — Proposed terms never become posted balances

Replace **Plan-covered amount $1,000** with **Plan proposal $1,000 · not accepted** or a proposal count. Keep proposed terms outside receivable totals. Accepted servicing amounts and remaining installments require accepted schedule and allocation evidence; do not infer a $500 reduction from an unallocated $500 receipt.

The $1,200 posted account, $200 disputed item and $1,000 proposal are linked facts, not three additive financial buckets. Proposed, offered, accepted, active, completed, cancelled and superseded states need versioned transitions and an Account effect statement. Cancelling servicing does not restore a fictional prior ledger balance. A source payment during review refreshes the account and marks affected terms for revalidation.

Do not adopt a universal rule that a plan must be no greater than the undisputed balance, that disputes are never included in negotiated terms, or that multiple proposals are always forbidden. Those are business/contract policies requiring accepted definitions. In this fictional scenario the $1,000 proposal excludes the disputed $200; the example is not universal policy.

### UX10 — Aging overlays preserve the accounting meaning

Disputes, proposed terms and accepted plans can overlap. Use labeled flags, patterns or a selected-account detail bridge to explain those subsets without stacking them as mutually exclusive amounts or subtracting them from posted AR. Do not call an undisputed amount “actionable AR” as though disputed balances cease to exist. Pattern segments require actual per-entry/aging-bucket associations; no guessed placement of a $200 dispute into a specific bucket.

Income, expense and NOI chart series retain their defined basis/sign. Improve contrast using neutral/white series, gold focus, labels and distinct marks. Reject the claim that financial accessibility requires all expense bars below zero. A separately labeled cash-movement/diverging view may be useful where its transformation is explicit; it does not rewrite source signs.

### UX11 — Notice changes explain the interruption

Show affected old/current fact, amount/date/source/version and the exact blocked command. Use Changed labels, a delta column and appropriate semantic emphasis; a payment reducing a balance is not inherently an error, so red is not mandatory on every changed number. Keep Review notice available; restrict affected approval/issue until necessary facts, audience and authority are reviewed.

A refreshed source snapshot is not evidence of legal validity, service or provider atomicity. Preserve earlier drafts and attempt histories. Do not invent process-server, issue-provider or webhook capabilities. If an issue outcome is unknown, apply UX08 to that logical command; unrelated preparation remains possible.

### UX12 — Readiness is a dependency checklist, not a false sequence

Display separate occupancy, construction, readiness, pricing, public-use media and publication states. Show owner, evidence, next action and blocker for each prerequisite. Pricing and media can progress in parallel; do not prescribe Construction → Media → Pricing → Publish as a universal mandatory sequence.

Scope/evidence comparison may lead to Accept handover or Return for correction. Required conditions must be satisfied or explicitly deferred under accepted authority; not every minor punch-list item necessarily prevents acceptance. Manual evidence can be valid if its asset/work association, author, date, version and approval are established. Lack of a Construction Manager push is not a universal ban on acceptance. The actual required conditions remain contract-specific. Acceptance does not publish a listing.

### UX13 — Owner decisions disclose prerequisites without blanket holds

Show scope/cost basis, decision-maker authority, documents and relevant funding/commitment/reserve/payable conditions. Contribution is one condition. A request can be prepared and a conditional approval recorded while release conditions remain open, if authorized; do not block all approvals solely because cash is unreconciled. Label **Approved · release conditions outstanding** where applicable. Available cash remains unverified until its accepted sources and definition are complete; NOI is not cash.

### UX14 — Media and marketing show the specific asset/channel

Replace oversized placeholder house art with compact, classified photo/file previews, captions, counts and manual carousel/list controls. Actual property media must come from authorized records; a generic image is never presented as an asset photograph. Preserve evidence photos separately from public-use selection.

Marketing rows identify unit/listing version and channel. Separate publication/connection status from inquiries, showings and application cohorts. A channel rejection shows the exact rejected field/version, supported correction and permitted retry. No unsupported publish/retry capability is implied by a button.

### UX15 — Safe efficiency tools preserve context

Inbox/work tables show accountable owner, response/work age, current state, linked record and next commitment. Preserve filters, selection, scroll and focus on Return to queue. Central Communication Queue remains the existing planned destination, with activation only after readiness; do not add a competing route.

Bulk controls appear on selection without replacing record identity. Preview per-record eligibility, audience/effect and counts; report per-item outcomes and reconcile partial/unknown results. No indiscriminate bulk assignment, dispatch, account mutation or notice send. Shortcuts are discoverable, optional/disableable, respect focus and never fire while typing in inputs/editors. Critical action cannot depend on a hover, color or gesture alone.

### UX16 — Operational timestamps and exports mean what they say

Show capability-level last verified evidence, last successful read/sync and last failure separately when those facts exist. Never invent “last seen 10 minutes ago” for an unbound provider. Report rows can download an authorized exact version directly, with a label/accessible name; download does not mark delivered. Investor/document/file permissions remain server-enforced.

### UX17 — Agreements change the work, not the navigation

Keep Leases navigation and all retained card tabs. Agreement type, signed terms and obligations choose relevant fields/playbooks: conventional renewal, option milestone, amendment or installment evidence as applicable. Do not universally ban renewal or permit remedies from a type label alone. Preserve effective roles and associations appropriate to each domain. Timeline remains attributed servicing events and Court remains sourced court records; their historic shared-panel issue requires current source verification before an implementation claim.

### UX18 — Integration assumptions stay outside workflow promises

ECC owns its canonical conversation identity and maps channel-specific provider/thread/message references to it. Do not try to thread inbound SMS into Microsoft Graph email conversation IDs as a prerequisite. Provider identity, actual send/read/status capabilities, permissions and retry rules need separate verification. Field evidence capture is not repair dispatch; owner approval is not universal project release. No advisor recommendation activates a connector, source write, webhook, portal approval or app handoff.


### 14.1 Complete destination and tab application

The register below applies the consolidated design to every existing destination. It is a specification disposition, not a claim that all screens have been rendered or accepted. IDs follow the frozen plan, correcting Grok's shifted ranges. Planned destinations retain their availability flags.

| ID | Existing destination | Revision 1.2 design application |
|---|---|---|
| S01 | Command center | UX02–UX04, UX15: map/feed peers, scoped commands, transparent next work, retained analytics. |
| S02 | Properties | UX01–UX03, UX07: synchronized map/list, early location/work, stable selection. |
| S03 | Units | UX01, UX07, UX12: separate occupancy/readiness, meaningful blocker/owner, parent map. |
| S04 | Leases | UX06, UX09, UX17: typed terms, obligations and relevant lifecycle work. |
| S05 | Tenants | UX05/UX06: contextual capacities, privacy, drafts and correct audience. |
| S06 | Owners | UX06/UX13: authority, conditions, unverified cash detail and owner conversation. |
| S07 | Reports · Overview | UX03/UX16: scope/audience-aware catalog and actual output evidence. |
| S08 | Reports · Create | UX05/UX16: dirty/saved form, source/basis preview, explicit generate/deliver separation. |
| S09 | Reports · Saved | UX16: exact-version download, manifest and independent delivery state. |
| S10 | Reports · Templates | UX03/UX16: version/diff/review; retirement does not rewrite outputs. |
| S11 | Operations | UX04/UX07/UX15: accountable queue, dependencies, stable resume. |
| S12 | Case Manager | UX08/UX11/UX17: affected facts, immutable attempts and distinct matter context. |
| S13 | Advanced Legal Ops | UX08/UX11: reconciled attempts and review ownership. |
| S14 | Legal Docs | UX08/UX11/UX16: exact originals/versions, issue versus service and authorized preview. |
| S15 | Attorney Reports | UX08/UX16: packet/version/audience, actual delivery/acknowledgment. |
| S16 | Work Orders | UX07/UX08/UX12/UX15: intake/execution identity, reviewed scope/access, evidence and eligible bulk work. |
| S17 | Vendors | UX03/UX12: qualification/capacity evidence and assignment eligibility. |
| S18 | Materials & Inventory | UX07/UX15/UX18: actual stock owner, source movements and bounded selection actions. |
| S19 | Smart Routing | UX02/UX08/UX18: route suggestion, access constraints and separate dispatch/acknowledgment. |
| S20 | AI Intelligence | UX04/UX18: findings explain evidence and next human decision, no automatic completion. |
| S21 | Build/Repair Projects | UX07/UX12/UX18: linked scope/work/provenance and handover. |
| S22 | Capital Projects | UX12/UX13: decision conditions, funding/authority and operations release. |
| S23 | Tenant Ledgers | UX03/UX09/UX10: selected-account commands and posted/proposed separation. |
| S24 | Accounting · Overview | UX10/UX13: period/basis, non-additive facts and actual reconciliation. |
| S25 | Rent Collection | UX06/UX08/UX09: authorized contact, actual payments/allocations, provider handoff. |
| S26 | Expenses | UX10/UX13: invoice/posted/commitment distinction and meaningful sign. |
| S27 | Financial Reports | UX10/UX16: basis/period/source reconciliation and exact version. |
| S28 | Collections Dashboard | UX09/UX10/UX15: aging with overlapping flags and accountable servicing queue. |
| S29 | Collections Log | UX05/UX08: one attributed history and preserved attempts. |
| S30 | Payment Plans | UX09: proposals, offers, accepted terms, actual allocations and cancellation history. |
| S31 | Deposits | UX10/UX13: liability and evidence-backed disposition, distinct from cash/income. |
| S32 | Transfers | UX03/UX08/UX13: authority/impact, explicit command and reconciliation. |
| S33 | Subsidized Housing | UX06/UX17: role/agency purpose, distinct obligation types and verified dates. |
| S34 | Assistance Programs | UX06/UX09: application/award/receipt distinct and purpose-scoped communication. |
| S35 | Vacancy review | UX02/UX12/UX14: location, readiness blockers and approved marketing. |
| S36 | Renewal planning | UX06/UX17: type/terms-specific review and communication. |
| S37 | Risk Summary | UX04/UX18: explained facts/uncertainty and human review. |
| S38 | ML Leasing Logs | UX16/UX18: actual input/output/version evidence, no invented deployed capability. |
| S39 | Communication · Templates | UX06/UX16: purpose, variables, exact reviewed version. |
| S40 | Communication · Queue | UX05–UX08/UX15: central inbox, sender/owner/age, scoped draft and linked work. |
| S41 | Communication · Logs | UX08/UX16: acceptance/delivery/unknown separate with real timestamps. |
| S42 | Data Hub · Overview | UX03/UX16: identity/classification conflicts and accepted count bridge. |
| S43 | Sync Audit | UX16: run/entity/page evidence and actual timestamps. |
| S44 | Sync Management | UX08/UX16/UX18: bounded recovery; no blind command replay. |
| S45 | Raw Data | UX06/UX16: permission-scoped immutable payload/lineage without secrets. |
| S46 | Sync Logs | UX08/UX16: sanitized correlation and actual outcome history. |
| S47 | Data · System Settings | UX03/UX16/UX18: authorized versioned diff and change scope. |
| S48 | Integrations | UX08/UX16/UX18: capability-level binding, evidence and recovery. |
| S49 | Workspace preferences | UX02/UX05/UX15: explicit density/dock preferences, no navigation/brand mutation. |
| S50 | Automation | UX03/UX08/UX18: simulated bounded effect, explicit authorized activation and recovery. |
| S51 | Dropbox Files | UX06/UX16: exact-version registry, permissions and actual custody receipt. |
| S52 | CoreLogic / MLS Grid | UX02/UX16/UX18: address match, licensed sources and explicit fetch cost/authority. |
| S53 | Field App Link | UX08/UX12/UX18: capture/proof, acknowledgment and acceptance separately. |
| S54 | Deal Room Link | UX07/UX16/UX18: verified IDs/purpose/permissions and actual handoff state. |
| S55 | Marketing | UX08/UX12/UX14: unit/listing/channel scope and meaningful media/funnel. |
| S56 | Investor · Dashboard | UX02/UX06/UX13: authorized holdings map, sourced performance and decisions. |
| S57 | Investor · Portfolio Analytics | UX10/UX13/UX16: scoped basis, valuation/debt dates and no guessed cash. |
| S58 | Investor · Financial Reports | UX06/UX16: reviewed authorized exact versions and delivery evidence. |

## 6. Retained tab application

All 33 tab identities and sequences remain. Apply UX01/UX03–UX06 to record identity, commands, draft/audience and selected scope across tabs. Property Overview keeps the required map; the unit retains parent-map context; owner maps are authorized holdings only.

| Family | Retained tabs | Specific corrections |
|---|---|---|
| Property | Overview / Financials / Legal / Files | Earlier map/work; UX10/UX13 financial basis/conditions; UX08/UX11 matters; UX14/UX16 evidence/media/custody. |
| Unit | Overview / Related / Financials / Legal / Files | UX12 independent readiness; effective links; typed cost/obligation; UX11 matter evidence; UX14 classified photos/marketing. |
| Lease | Overview / Related / Financials / Legal / Files | UX17 agreement-specific work; effective capacities; UX09 proposals/allocations; UX08/UX11 notice attempts; signed originals/amendments. |
| Tenant | Overview / Related / Financials / Legal / Files | UX06 purpose/capacity; historical relationships; shared obligations once; authorized matters and permission-scoped documents. |
| Owner | Overview / Related / Financials / Legal / Files | UX13 authority/conditions/cash basis; effective interests; related matter access; versioned ownership/management evidence. |
| Legal | Overview / Timeline / Documents / Judgment / Tasks / Correspondence / Court / Packet / Audit | UX11 changed facts; attributed history distinct from docket; exact versions; sourced judgment/projection; accountable tasks; UX06 audience; packet manifest/delivery; UX08 immutable attempts. |

## 7. Next visual review: concrete scenes and acceptance

Prepare one consolidated revision rather than soliciting new renderings from advisors. Start with these linked scenes and carry the same components through all page families:

1. **Dashboard at 1440 and 1920:** map and priority work both visible; selection changes the scoped primary; all recovered intelligence remains discoverable.
2. **Fourplex property and SFR at 1440/1024/390:** compact identity, earlier map, unit/household context, meaningful quick actions and a dock that opens by intent.
3. **Account and plan:** $1,200 posted / $200 disputed / $1,000 proposed, followed by a $500 source receipt and revalidation, with no invented allocation.
4. **Notice interruption and unknown issue outcome:** exact changed fields, reviewed version, immutable attempt and scoped reconciliation, while harmless preparation remains available.
5. **Property message:** purpose/audience inline; non-obligor access contact; draft saved/failure/concurrent/permission states; no redundant confirmation dialog.
6. **B2 handover and listing:** source/provenance, parallel pricing/media checks, reviewed acceptance and per-channel actual outcome.

For a first-screen claim, record viewport width **and height**, shell state, scroll position and text sizes. For a speed claim, compare observed task completion and errors using the same task/data/permissions; static click estimates are hypotheses. A preview is not persistence or provider proof. Runtime acceptance still requires the source/interaction/database/reload evidence in the full plan.


## Appendix A. Frozen baseline file identities

These digests identify the inspected source baseline for regression comparisons. They are not a request to change the files.

| File | SHA-256 at inspection |
|---|---|
| `src/config/navigation.ts` | `8144bbaf11fdd0b6c660f2ee7fb2de0be28a90e93472fda18ba89fc34664096e` |
| `src/components/Sidebar.tsx` | `d4d9225151415ac64331dde0da1b6ee4bc777903f6b576f1d7225f6b669b23aa` |
| `src/components/layout/WorkspaceBar.tsx` | `570b673febb2ad6b9053d08b6df3abade5cc3ee0d6139857be3f370c9593f407` |
| `src/styles/theme.css` | `c02af180a3e1f6ebef702bd6ce7d51fb4dac11d9fcfbe7c602d65b87460e0164` |
| `src/styles/tokens.css` | `c51767d408ed58fcf04d02b248feaeee08beb57148d5c9742e4079457e682c5a` |
| `public/brand/altus-logo.png` | `68133d71ab654e5e0b9036570cdd32662b28cd6d39ae871bac271ab1aa84d035` |
| `public/brand/altus-mark.png` | `6d0cc5a1c879306d49bb43acb7e6e295c2f7c194f5aec2058a9cb726a55c9ee4` |

## Appendix B. Registered route preservation checklist

All source-declared paths below remain accounted for. Root/aliases, card/detail routes and protected utilities are included so a navigation-only inventory does not miss them. Registration is not a readiness claim.

- `/`
- `/ops/reports`
- `/system/settings`
- `/dashboard`
- `/data`
- `/ops/operations`
- `/ops/ai/vacancy-analytics`
- `/ops/ai/renewal-forecasting`
- `/ops/legal/case-manager`
- `/ops/legal/matters/:id`
- `/ops/maintenance/work-orders`
- `/ops/accounting/tenant-ledgers`
- `/portfolio/properties`
- `/portfolio/properties/:id`
- `/portfolio/units`
- `/portfolio/leases`
- `/portfolio/tenants`
- `/portfolio/owners`
- `/card/property/:id`
- `/card/unit/:id`
- `/card/lease/:id`
- `/card/tenant/:id`
- `/card/owner/:id`
- `/reports/create`
- `/reports/saved`
- `/reports/templates`
- `/ops/comms/templates`
- `/admin/sync`
- `/admin/geocode`
- `/admin/transfers`
- `/systems/integrations`
- `/owners/transfer`
- `/owners/transfer/detail`

## Appendix C. Scope and authority

Primary implementation repositories: `Altus-Realty-Group/ECC-APM` for the ECC frontend and `Altus-Realty-Group/doorloop-sync-backend` for DoorLoop synchronization; Field App, Construction Manager, Deal Room, Dropbox integration and Control Plane retain their own domains/contracts. Supabase is the intended operating database platform. GitHub remains source-control authority.

Existing instructions and accepted contracts outrank guessed historical behavior. Dion's current instruction freezes navigation, logo and theme principles. No proposed convenience in earlier advisories overrides that freeze. Historical mock values, secrets and old runtime jobs are not recovery targets.
