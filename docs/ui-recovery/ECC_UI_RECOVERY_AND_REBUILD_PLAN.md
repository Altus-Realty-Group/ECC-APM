# ECC whole-app UI recovery and rebuild plan

**Product owner:** Dion DePaoli. **Design and integration owner:** Codex.
**Status:** proposed execution blueprint; current UI rejected; no page or tab is visually approved by this document.
**Inventory baseline:** ECC-APM `bae057406b728cb0840a1c3afcd55f5bb6767876`, 2026-11-15.

This is the UI execution supplement to the [existing product master plan](../roadmaps/ECC_SUPERIORITY_IMPLEMENTATION_MASTER_PLAN_V1.md), not a replacement product architecture. It records Dion's direction to recover the original experience, improve it, and specify the whole application before rebuilding further. Control Plane implementation is excluded from this campaign; existing access boundaries remain in force.

## 1. What failed, what survives, and what this plan covers

The Command Center lost major visual areas. Engineering availability explanations displaced operating information. Passing tests, a loaded page, and a clean runtime were incorrectly treated as UI acceptance. They are not design approval.

The code audit found recoverable visual source and separate data-delivery defects. It does **not** establish deletion of database records. A missing view, a parser discarding fields, an unbound API, and deleted source data are different problems and must be reconciled separately.

| Evidence | Finding | Required disposition |
|---|---|---|
| `c940fa7b`, `8ed250bc` | Rich dashboard: KPI ticker, map + action feed, financial charts + leasing funnel, city occupancy | Restore the visual inventory and improve its behavior |
| `17b647f6` | Rich dashboard replaced by four summary cards and Sparkline | Recover missing objects; do not treat a narrower feed as permission to delete product requirements |
| `3364bf04` | Persistent decision areas restored | Keep page structure independent of connection state |
| `cbe8b996` | Full panels replaced by record-review workflow | Keep useful review tools alongside the original visual areas |
| `add75b1b` | Disconnected occupancy/history deliberately hidden | Retain chart frames with a concise unavailable state |
| `b7b46b38` | Unsupported property contacts/dates/overview fields removed | Recover the information architecture and establish field delivery |
| Current card contracts | Narrow schemas strip fields requested by views; lease/unit wire names disagree | Repair the accepted reader mappings and contracts before claiming restored content |
| `/portfolio/properties/:id` | Registered placeholder distinct from the real property card | Audit inbound links, then redirect to the canonical card |
| Historical dashboard data hook | Random cash flow/collection traces, fixed leasing counts, inferred occupancy/readiness | Recover design, never those data generators |

The source inventory contains **33 explicit routes plus fallback, 20 available navigation destinations, 38 declared unavailable destinations, five asset-card families, one legal-matter card family, 256 TSX modules, 588 source UI object declarations and 98 API-path references**. The latter counts include dormant source, not 588 working mounted features.

All **38 retained ZIP snapshots** were inventoried without execution: **2,728 visual-source members, 165 distinct byte contents**. Same-path hashes distinguish retained, changed and relocated candidates. This establishes source inventory, not a visual comparison of all archived builds. Older `src/pages/dashboard/index.tsx` must be reconciled with the newer feature path. Separately sourced Dropbox archive completeness remains unverified; original folders must never be moved or deleted.

## 2. Fixed product rules

1. A daily operator sees portfolio health, work requiring attention, the responsible record, and a clear next action. No debugging essays in ordinary page content.
2. Black, white and gold, with neutral supporting tones. No orange. One token system and one active shell/card pattern.
3. Recover first, then improve. Before removing an object, record its stable design ID, replacement, inbound links and Dion's disposition. Never silently reduce a page to satisfy a narrow API.
4. Keep the intended map, chart, table and card regions during loading, missing data or failure. Suppress unauthorized/stale values; do not erase the experience. A short local status belongs inside the affected region.
5. Definitions and provenance belong in an information control, chart tooltip, expandable details or administrator view. Operators still need visible date/period/currency and a concise freshness label.
6. Every enabled control has a real result, destination or download. No toast-only success, dead Edit/PDF buttons, fake assignments or fake communications.
7. Database first, accepted API fallback second, calculation last. Unknown is not zero. A chart cannot manufacture history, coordinates, obligations, payments, readiness or approvals.
8. Native record identity drives links. UUID legal/property references and numeric document/portfolio keys require verified joins. Names, addresses and Dropbox folders are not identity or authorization.
9. Preserve all current useful behavior: search, sorting, CSV safeguards, keyboard focus, related-record links, session clearing and denied-cache suppression.
10. A populated and an unavailable-state visual review are both required. A page is not approved because the failure message is accurate.

## 3. Information architecture and operator journeys

### Global shell

| ID | Object / placement | Why it exists | Behavior / destination |
|---|---|---|---|
| G01 | Left navigation; compact icon rail on narrow screens | Stable domain orientation | One expanded group; accessible names; active page indicated; no dead links |
| G02 | Workspace bar above content | Current record/domain context | Breadcrumb links, page switcher, clear current context; no duplicate giant brand header |
| G03 | Search/command deck | Reach records quickly | Search only authorized record types; result → canonical card; no access expansion |
| G04 | Page title + primary action | Explain the operator's current job | One dominant title; primary action changes by page and permission |
| G05 | Page-local filters and period | Define what the operator is seeing | Visible selected scope; reset; URL/back/return restoration |
| G06 | Source/freshness indicator | Explain currency of figures without prose clutter | Timestamp/period and compact stale/partial label; definitions on demand |
| G07 | Notices | Explain actionable failure | Short message; Retry or useful next destination; raw errors never rendered |
| G08 | Record drawer/card links | Open the evidence behind a signal | Preserve parent query, filters, page, selection and scroll on return |
| G09 | Document viewer/download | Retrieve the exact authorized version | Registry ID/version, classification and verified delivery; no raw provider path |
| G10 | Activity/audit view | Reconstruct business changes | Actor, timestamp, action, linked record/evidence; source journal, not invented events |
| G11 | Preferences | Readability | Comfortable/compact spacing persisted locally; distinguish preference from business state |
| G12 | Not-found/access state | Recover without losing orientation | Back and valid navigation; no internal stack traces or raw developer diagnostics |

Primary journey: **Command Center → filtered register → asset card → relevant tab → source document/transaction/action → return to the same filtered register.**

Cross-record journey: **Owner → property → unit → lease → tenant**, with reverse links and all parties shown where many-to-many relationships exist. A single primary tenant must not hide other tenants. Legal matters link through verified associations, not matching text.

Business facts must survive ordinary refresh and navigation through their canonical reader. Drafts and temporary selections must be clearly local until a governed save exists. Tab selection and parent return context should be URL/history state; private record content should not be placed in URLs or browser storage.

## 4. Command Center: restore the visual operating desk

The original map/action-feed/financial/leasing/city structure is the recovery baseline. Retain the newer useful lease-horizon, unit-status and record-review tools. Final placement is defined here rather than improvised in implementation.

| ID / position | Component | What it shows / decision | Data and calculation | Click destination |
|---|---|---|---|---|
| CC01 / top full-width | Portfolio KPI cards | Properties, units, occupancy, reported revenue for the labelled period | Current summary totals; counts; occupancy fraction; integer cents + currency/period | Properties, Units, occupancy-filtered Units, financial report |
| CC02 / secondary KPI row | Operating health | Rent-ready vacancies, collections, critical work orders | Separate condition, posted-payment and work-order sources; not rent/status inference | Vacancy worklist, collections, critical work orders |
| CC03 / main left, approx. two-thirds | Property map + list alternative | Geographic concentration and assets needing review | Authorized properties, verified coordinates, factual statuses | Pin/list row → property card; filter affects both map/list |
| CC04 / main right | Priority action feed | Renewal review, collection exceptions, urgent maintenance/legal evidence gaps | Accepted exception/task records with owner/date/source; no priority invented from labels | Relevant record/task; explicit action only where supported |
| CC05 / financial row left | Income / expenses / NOI chart | Financial direction across selected periods | Posted finance observations; common period/currency/basis; NOI formula separately documented and reconciled | Selected period → underlying report/transactions |
| CC06 / financial row right | Leasing funnel | Leads → tours → applications → approved → signed | Actual event/application records and cohort/period definitions | Stage → corresponding filtered register; new destination requires a complete page |
| CC07 / occupancy row left | Occupancy ring | Current occupied share and missing coverage | Accepted occupancy definition; no active-lease-count substitution | Units with the exact relevant status scope |
| CC08 / occupancy row right | Occupancy history | Change over reported observation dates | Supplied series; percentage axis; gaps stay gaps, never fabricated interpolation | Observation details and source records |
| CC09 / market row | City occupancy table/bars | Compare locations and concentration | Verified property-to-city/unit/status join; reconcile denominators and excluded rows | City → filtered property/unit register |
| CC10 / review row left | Lease expiration horizon | Active leases by past end/0–30/31–60/61–90 window | Actual end dates, Central-time planning date, unique identities | Bucket → filtered lease queue/card |
| CC11 / review row right | Unit status breakdown | Reported inventory statuses and missing labels | Explicit unit statuses, with unknown separate; not readiness | Segment → unit queue/cards |
| CC12 / lower full-width | Review queue | Records behind the selected chart/signal | Same authorized loaded collection as the triggering chart | Search/sort/page; open card; preserve return context |
| CC13 / quiet lower edge | About these figures | Metric definitions, coverage and calculation basis | Internal provenance summarized in operator terms | Expand on demand, not mandatory reading |

On mobile: KPI cards two across where legible; map above action feed; financial/leasing/occupancy panels stack; tables use contained scroll or row cards; controls remain at least 44px. Charts retain titles, legends, periods and an accessible value table. No empty gold data traces or fake pin distribution may decorate an unavailable state.

**Reuse candidates:** `KpiTicker`, `PortfolioGoogleMap`, `PriorityActionFeed`, `FinancialsAndLeasing`, `OccupancyByCity`, `ChartContainer`, `OccupancyPosition`, `OccupancyHistory`, `CommandWorkSurface`. Consolidate `OccupancyBreakdown` into the city component, `ActionCenter` into the action feed, and `LeaseExpiryPanel` into the horizon instead of rendering duplicate competing versions.

Draft #247 is a partial source recovery only. It has not restored the real feeds or completed this target design and must not be described as approved.

## 5. Every current routed page

The exact path/entry map is [routes.csv](routes.csv). The table below specifies the page's operating role and rebuild direction; asset-card interiors are specified in section 6.

| Route / ID | Required contents and data | Purpose / next action | Recovery and improvement |
|---|---|---|---|
| `/` / P00 | Redirect to Command Center | Start daily review | Keep single landing destination |
| `/dashboard` / P01 | CC01–CC13 | Assess portfolio, drill to records | Restore original visual inventory and accepted data paths |
| `/portfolio/properties` / P02 | KPI summary, map/table switch, search, owner/city/type/status filters; name/address/owner/units/occupancy/market | Find/manage an asset; row → property card | Keep table visible in non-ready states; maintain declared missing fields until mapping accepted |
| `/portfolio/units` / P03 | Status/readiness summary, status chart, searchable table/tile view; property/unit/dimensions/rent/lease/condition | Review inventory; row → unit, property, lease | Separate reported status from inspection-backed readiness; temporary review board is not task persistence |
| `/portfolio/leases` / P04 | Status/expiration KPIs, horizon chart, register with parties/property/unit/rent/start/end/status | Review commitments; row → lease | Preserve search and loaded MRR; disclose loaded scope; MRR is not collected revenue |
| `/portfolio/tenants` / P05 | Tenant/contact register, linked tenancy, balance/communication status when sourced | Find person and current/historical tenancy; → tenant/lease | Preserve search/contact fields; no inferred risk or payment behavior |
| `/portfolio/owners` / P06 | Ownership/company grouping, contact directory, property/unit counts and portfolio links | Review ownership and agreements; → owner/company context | Add ownership organization without inventing company identity; contact/portfolio data must map explicitly |
| `/portfolio/properties/:id` / P07 | Canonical redirect to `/card/property/:id` after inbound-link audit | One property experience | Remove routed placeholder; preserve valid identities and parent return context |
| `/ops/operations` / P08 | Cross-domain work queues, owner/status/date filters, exception KPIs; linked legal/work order/ledger records | Choose and complete the next action | Replace notice walls with visual work areas; reconcile the old unverified `legalCases` registry with native L1/L6, never activate a parallel legacy case source |
| `/ops/maintenance/work-orders` / P09 | Priority/status/age KPIs, work-order queue, schedule/assignee/vendor, estimates/actuals, evidence | Triage and follow work; → work-order detail/property/unit | Build real detail destination and governed actions before enabling create/assign/close |
| `/ops/accounting/tenant-ledgers` / P10 | Tenant/lease search; posted charges/payments/credits/adjustments, running balance, statement period | Explain balance; → lease/tenant/source transaction/DoorLoop where accepted | Bind actual posted entries; no recurring charges synthesized from lease terms; payment execution remains DoorLoop |
| `/ops/ai/vacancy-analytics` / P11 | Status/readiness/days vacant/lost-rent panels where supported; property/status filters, unit queue | Decide make-ready/lease follow-up | Current source is status review only; duration/loss require actual events/rent basis; no fake AI output |
| `/ops/ai/renewal-forecasting` / P12 | Lease horizon, planned review list, decision/offer/notice states when supported | Review renewals before reported lease end | Current date review retained; distinguish dates, predictions and actual legal notice requirements |
| `/ops/legal/case-manager` / P13 | Matter register, workflow queues, upcoming sourced court events, evidence gaps, award/verification counts | Open matter and responsible next action | Native L1/L6, awards separate from matters; retain register layout while producer unbound |
| `/ops/legal/matters/:id` / P14 | Legal card L01–L09 | Review matter/evidence/ledger/packet | Section 7; protected readers precede download/export |
| `/ops/reports` / P15 | Report library, category/period/property/owner filters, recent saved output, visual previews | Find a useful operating/financial report | Keep working register CSV layouts; restore reporting IA and real chart/report previews |
| `/reports/create` / P16 | Source/layout selector, field/period/filter controls, preview, output options | Build a report tied to its source scope | Current three fixed CSV layouts are retained; designer/PDF/save are new governed capabilities |
| `/reports/templates` / P17 | Categorized layout gallery, preview, supported fields/output | Choose report structure | Three existing layouts remain; editable templates require versioned storage |
| `/reports/saved` / P18 | Saved report register, source/as-of, creator, classification, immutable output/version, download | Retrieve prior issued output | Currently unavailable; connect registry and retention before presenting saved success |
| `/ops/comms/templates` / P19 | Template library/editor, merge fields, recipients/context, rendered preview and draft status | Prepare accurate correspondence | Preserve JSON/EML download; no Send unless actual provider approval/delivery contract exists; local draft is not saved account state |
| `/data` / P20 | Curated data-quality/freshness dashboard, record exceptions, source/reconciliation history | Understand coverage and resolve records | Move raw JSON/query explorer to a restricted technical subview; no JSON field dumps in operator workspace |
| `/systems/integrations` / P21 | Connection status, last successful ingestion, coverage, outstanding errors, safe administrative drilldown | Know whether data is current and recover ingestion | Separate operator status from admin controls; explicitly retire or separately accept localStorage admin-token entry, 15-second polling, Run/Quick run/Reset lock, Live Logs and DLQ mutation controls; no old Azure/scheduler activation |
| `/system/settings` / P22 | Display/accessibility preferences; future account choices only when persisted | Tailor readability | Current density preference stays local; do not label it global system configuration |
| `/card/property/:id` / P23 | Property card specification | Asset context | Section 6 |
| `/card/unit/:id` / P24 | Unit card specification | Unit context | Section 6 |
| `/card/lease/:id` / P25 | Lease card specification | Agreement context | Section 6 |
| `/card/tenant/:id` / P26 | Tenant card specification | Person/tenancy context | Section 6 |
| `/card/owner/:id` / P27 | Owner card specification | Ownership context | Section 6 |
| `/admin/sync` / A01 | Bounded capture/run evidence and guarded operator-approved actions | Administrator-only recovery | Hidden; legacy Run/Quick run/Reset lock must not be activated as the Supabase collector |
| `/admin/geocode` / A02 | Address normalization/geocode review, source/confidence, map comparison, cost-aware batch preview | Resolve verified locations | Hidden; source currently shows latest audit only; no background paid dispatch |
| `/admin/transfers` / A03 | Administrative transfer status | Audit workflow | Currently unavailable; preserve hidden state until full transaction workflow |
| `/owners/transfer` / A04 | Old/new owner, assets, effective date, accounting/authority/evidence review | Govern ownership change | Unavailable; require explicit approvals, preview, idempotency, audit and reconciliation |
| `/owners/transfer/detail` / A05 | Transfer receipt, status, approvals, asset/financial effects, audit | Reconstruct a transfer | Unavailable; no fake detail or inferred success |
| unmatched / G12 | Navigation recovery | Recover from invalid URL | Keep useful Back/suggestions; no planned stub routed just to fill navigation |

## 6. Asset cards: common architecture and every target tab

### Shared card layout

Top: linked breadcrumbs and Back to the same register state; record title/address/status; compact scope/freshness; up to four relevant KPIs. Below: stable tab bar and wide working pane. Right rail: related records, key dates, location/contact, pinned verified documents and next actions relevant to the selected tab. Collapse the rail below content on mobile. A title/status must not impersonate a permission or legal conclusion.

Use one `CardShell` implementation, not parallel `AssetCardShell`, per-entity dormant `Tabs` and ad hoc rails. Recover good visual elements from `Hero.tsx`, `HeroBlock.tsx`, `RightRail.tsx`, `Details.tsx`, `Linked.tsx`, `Activity.tsx`; migrate deliberately, then retire duplicates after link/import verification.

Actions: Review source / Download / Edit / Create work / Draft correspondence only when their real reader or writer exists. Edits need field validation, revision/conflict handling, save/reload proof and audit. PDF requires a real rendered output. Missing workflows keep a compact disabled affordance only where helpful, not a pretend success.

Every tab below is a **target requirement**, not a claim that the current implementation already works. Current mounted property tabs are Overview/Financials/Legal/Files. Other four currently add Related. Their old seven-tab modules survive but do not own current tab state. The target consolidates Details into Overview and Linked into Related; restores Activity explicitly; adds maintenance/communications where the job requires them. Tab IDs are stable deep links; labels and locations are uniform.

| Card / tab ID | What it shows and why | Data required | Links / actions |
|---|---|---|---|
| Property / PR-OV | Asset photo, address/type/status, physical facts, ownership, contacts, APN/parcel, key dates | Property, verified ownership, parcel/inspection/contact records | Owner card, external assessor/maps only with verified destination |
| Property / PR-REL | Owners with ownership dates/share if recorded; units and leases | `property_owners`, units, leases, actual association periods | Owner/unit/lease cards; no guessed primary owner |
| Property / PR-FIN | Rent roll, income/expense/NOI trend, occupancy/rent, tax/insurance/fees, balances | Posted ledger and statement periods, lease/unit joins | Drill to transactions, leases, financial reports |
| Property / PR-WORK | Work orders, inspection/condition, make-ready and capital projects | Work/inspection records; CM/Field App accepted links | Work detail, unit, Field App/CM handoff |
| Property / PR-LEG | Linked matters, orders and compliance/parcel evidence | Native legal associations + source evidence | Matter card and exact document version |
| Property / PR-DOC | Five AUM folders plus linked ownership agreements | D1 property target + exact owner/property links | Search/view/verified download; section 9 |
| Property / PR-ACT | Changes, inspections, tenancy/financial/document milestones | Protected event history, business event times | Actor/source/evidence links; no invented log |
| Unit / UN-OV | Number, property, status, beds/baths/sqft, market and contract rent, current occupancy/condition | Unit contract with dimensions/units and verified tenancy | Property, active lease, tenant cards |
| Unit / UN-REL | Current and historical leases/tenants and property | Verified temporal joins | Related cards with relationship labels |
| Unit / UN-FIN | Rent history, posted ledger, attributable costs and concessions | Unit-attributed finance + currency/period | Lease ledger and transaction/report |
| Unit / UN-WORK | Inspection issues, make-ready status, assigned work/evidence | Inspection/work tasks; condition not inferred from rent | Work detail and field evidence |
| Unit / UN-LEG | Unit-linked matters and recorded compliance | Verified native links | Matter and evidence |
| Unit / UN-DOC | Unit-relevant lease, inspection, media and legal documents within property folders | Explicit unit-document association, not folder guessing | Exact version viewer/download |
| Unit / UN-ACT | Status/lease/inspection/work history | Actual event reader | Linked record/source |
| Lease / LE-OV | All parties, property/unit, status, start/end, rent/deposit, terms, renewal dates | Full lease contract, parties and amendments | Property/unit/all tenants; terms/source document |
| Lease / LE-REL | Property, unit, all tenants/guarantors, related matters | Explicit capacities and associations | Related cards and legal matters |
| Lease / LE-FIN | Charges, receipts, credits, adjustments, deposit liability, balance | Posted DoorLoop accounting observations, reconciliation | Transaction/source; payment actions stay DoorLoop |
| Lease / LE-RENEW | End-date timeline, review decision, offered/accepted terms, sourced notice events | Lease dates plus actual renewal/notice workflow | Draft correspondence, approval, amendment; no invented deadlines |
| Lease / LE-LEG | Notices, proceedings, orders, verified judgment linkage | Native legal links and evidence | Matter/evidence; no rent balance treated as judgment |
| Lease / LE-DOC | Executed lease, amendments, notices and related evidence | Explicit lease-document version associations | Exact version search/view/download |
| Lease / LE-ACT | Lease/amendment/payment/notice history | Actual authorized events | Source event/transaction/document |
| Tenant / TE-OV | Name, contacts, contact preference, current tenancy and move-in/out | Person/contact + tenancy contract | All current/historical lease/unit/property cards |
| Tenant / TE-REL | Current and previous leases, co-parties where permitted | Verified tenancy/party relationships | Related cards with periods; no duplicate counts |
| Tenant / TE-FIN | Posted balance/payment history and statements | Authorized tenant/lease ledger; definition of payment rate | Transaction/lease statement; unknown metrics not zero |
| Tenant / TE-WORK | Tenant-associated open/resolved work | Actual work records and property/unit context | Work detail, relevant asset |
| Tenant / TE-COM | Correspondence, notices, drafts/delivery states | M365/provider records and approved templates | Draft/preview/send only when supported; delivery evidence |
| Tenant / TE-LEG | Relevant matters/obligations and evidence | Explicit legal-party/matter links | Matter card and permitted evidence |
| Tenant / TE-DOC | Tenant/lease documents, restricted personal records | Explicit target links and classification | Versioned viewer/download; no cross-tenant disclosure |
| Tenant / TE-ACT | Contact/tenancy/work/document events | Protected event reader | Source record and actor |
| Owner / OW-OV | Legal entity/name, company identity, contacts, address, management relationship | Owner/company/contact contract and verified identity | Ownership/company context; management agreement |
| Owner / OW-REL | Owned properties, effective ownership/shares, units and leases | `property_owners`, properties/units/leases | Property/unit/lease cards; no `owner_id` guess |
| Owner / OW-FIN | Owner statements, contributions/distributions, fees, portfolio cash flow | Reconciled owner accounting, period and allocation rules | Immutable statements and attributable transactions |
| Owner / OW-AGR | Agreement coverage by property, effective dates, fee terms and missing signatures | One registered owner agreement + exact property links | Contract version, covered property, approval workflow |
| Owner / OW-COM | Owner correspondence and report delivery | Approved communication records | Draft/report preview, actual delivery logs |
| Owner / OW-LEG | Ownership-relevant matters and compliance | Verified matter/owner associations | Matter/evidence; no access inferred from ownership |
| Owner / OW-DOC | Ownership Documents, including management contracts and tax/restricted records | D1 owner target + classification policy | Search/view/download; linked agreements appear in property Files |
| Owner / OW-ACT | Ownership, agreement, report and communication events | Actual authorized journal | Source/actor/evidence |

### Exact hero, KPI and right-rail inventory

These retain the useful original card summaries. A currently unsupported metric remains pending until its binding is accepted. KPI selection navigates to the named tab/section and applies the same scope; it is not a decorative button. Non-actionable facts use links to their detailed section rather than pretending to filter records.

| Card / object ID | What it shows / required data | Purpose and exact destination | State rule |
|---|---|---|---|
| Property / PR-HERO | Photo, name/address, reported asset status, identity, source age | Identify the asset; Back → P02; photo → authorized property media | Photo/status absent from current parser; no stock photo implying the asset |
| Property / PR-KPI1 | Units | Inventory → PR-REL unit list | Known count or unknown |
| Property / PR-KPI2 | Active leases | Commitments → PR-REL active lease subset | Explicit active status, not occupancy proxy |
| Property / PR-KPI3 | Occupancy | Occupied-unit share → PR-REL unit status detail | Reconciled unit denominator; old lease coverage not relabelled occupancy |
| Property / PR-KPI4 | Average monthly rent | Rent → PR-FIN rent-roll detail | Source definition, currency and scope |
| Property / PR-RAIL | Verified location/map, ownership contacts, key dates, pinned versioned documents | Map → verified external map; owner → owner card; date → source tab; file → PR-DOC exact version | Each region independent; missing source never fake content |
| Unit / UN-HERO | Unit label, property address/link, explicit status, permitted media | Identity; Back → P03; property → PR-OV | Label field mapping repaired first |
| Unit / UN-KPI1 | Unit status | Reported condition/context → UN-OV operating facts | No inferred readiness |
| Unit / UN-KPI2 | Rent | Rental basis → UN-FIN rent detail | Contract/market basis labelled; cents/currency accepted |
| Unit / UN-KPI3 | Beds / baths | Physical capacity → UN-OV physical facts | Unknown dimensions not zero |
| Unit / UN-KPI4 | Floor area | Physical size → UN-OV physical facts | Area unit displayed |
| Unit / UN-RAIL | Property, current lease/tenant links, recorded inspection/make-ready, next work, pinned files | Related cards; UN-WORK task/evidence; UN-DOC version | Temporal tenancy verified; source dates only |
| Lease / LE-HERO | Lease identity, all party names, property/unit and status | Identify agreement; Back → P04; asset/party → own card | Do not hide co-tenants/guarantors |
| Lease / LE-KPI1 | Lease status | Agreement state → LE-OV terms | Explicit source label |
| Lease / LE-KPI2 | Monthly rent | Rent obligation → LE-FIN lease terms/charges | Contract rent is not payment or collection |
| Lease / LE-KPI3 | Lease term | Start/end → LE-RENEW timeline | Source dates; no invented extension/deadline |
| Lease / LE-KPI4 | Balance | Posted balance → LE-FIN ledger | Reconciled posted entries; no lease-term-generated charges |
| Lease / LE-RAIL | Property/unit/all parties, executed/amended versions, key source dates and next review | Related cards; LE-DOC executed version; LE-RENEW | No unsupported contact fields silently omitted from plan |
| Tenant / TE-HERO | Name, reported tenancy status, linked current property/unit | Person context; Back → P05; active tenancy → LE-OV | Source identity and permission required |
| Tenant / TE-KPI1 | Active leases | Current relationships → TE-REL active subset | Deduplicated explicit active records |
| Tenant / TE-KPI2 | Current balance | Posted financial position → TE-FIN ledger | Include scope/currency; no default zero |
| Tenant / TE-KPI3 | On-time payment rate | Payment history → TE-FIN payment detail | Definition/due basis/period must be accepted; not a risk score |
| Tenant / TE-KPI4 | Open work orders | Current needs → TE-WORK open subset | Real linked work only |
| Tenant / TE-RAIL | Authorized contacts/preference, active/historical tenancy links, key move dates, next work and documents | Draft → TE-COM; cards → TE-REL; work → TE-WORK; version → TE-DOC | No send implied by drafting; personal evidence restricted |
| Owner / OW-HERO | Owner/entity/company name and management relationship | Ownership context; Back → P06; agreement → OW-AGR | Verified company mapping; no name-based authority |
| Owner / OW-KPI1 | Portfolio units | Scale → OW-REL units for actual property links | Effective ownership and denominator explicit |
| Owner / OW-KPI2 | Active leases | Commitments → OW-REL active lease subset | Actual linked properties/leases |
| Owner / OW-KPI3 | Occupancy | Portfolio occupied share → OW-REL unit breakdown | Same accepted occupancy definition as property/portfolio |
| Owner / OW-KPI4 | Average rent | Rent level → OW-FIN rent-roll section | Currency/period/weighting stated; no statement distribution inference |
| Owner / OW-RAIL | Entity/contact, covered properties, effective management contract, latest issued statement, pinned ownership records | Property cards; OW-AGR exact agreement; OW-FIN issued statement; OW-DOC version | Owner scope and document classification both required |

### Required card contract repairs

| Gap | Current evidence | Required correction and proof |
|---|---|---|
| Unit label | Server source emits `label`; parser accepts `unit_label` | Accepted wire mapping, labelled unit preserved through parse and UI |
| Unit physical/rent facts | Parser retains only id/label/status | Add sourced fields to accepted contract; map dimensions and money units explicitly |
| Lease rent/dates | Server emits `rentCents`, `start`, `end`; parser expects `rent_cents`, strips dates | Version/mapping agreement; exact rent and dates survive server → parser → card → reload |
| Owner details | Parser keeps id/name and property ids/names only | Contact/company/ownership/portfolio data explicitly typed and authorized |
| Tenant details | Parser keeps id/name and lease ids/status only | Contact/tenancy/financial fields supported by accepted readers, not `any` passthrough |
| Property associations | Current contract lacks status/photo/owners/units collection/location/activity | Explicit verified relationships, no text matching or invented empty result |
| Occupancy | Property source uses active-leases/units percentage, dashboard uses constrained fraction | One defined occupied-unit denominator; separately label old lease coverage until reconciled |

Do not solve stripping by accepting arbitrary provider objects into the UI. Each required field needs a source, definition, units, scope and permission.

## 7. Legal card and register

| ID / location | Distinct responsibility | Source / action |
|---|---|---|
| LR01 / register top | Matter/lifecycle/queue counts, sourced upcoming court events and evidence gaps | L1 matter + L6 validated projections; click narrows the same register |
| LR02 / register body | Searchable matters, property/party/court/docket, owner/next action if recorded | Matter ID → `/ops/legal/matters/:id`; multiple awards remain separate |
| L01 / Overview | Matter facts, parties/capacities, related properties and next required work | L1 + verified associations; property/unit/lease/tenant links |
| L02 / Timeline | Material matter events in order | Protected journal, not the Court tab repeated |
| L03 / Documents | Bound exhibits, source/confidence/version/classification and requirements supported | L4 + D1 intersection; attach/withdraw only through reviewed commands |
| L04 / Judgment | Every award, verification, creditor/obligors, reconciled ledger and collection eligibility | L1/L5; unknown versus zero; joint award counted once; readiness is not approval |
| L05 / Tasks | Open/assigned/unassigned/satisfied/waived requirements with actor and source date | L6 queues; assignment/status writes require actual workflow |
| L06 / Correspondence | Matter-related messages/notices and delivery evidence | Approved provider source; no automatic send |
| L07 / Court | Court/docket, sourced hearings/events/orders, responsibility | Source dates only; no calculated legal deadline |
| L08 / Packet | Sections, gaps, selected immutable exhibit versions, ledger as-of and manifest | Native packet snapshot + D1; inaccessible required evidence blocks completeness without metadata leak |
| L09 / Audit | Authorized changes with actor, revision, timestamp and content-free restricted handling | Protected legal journal intersected with document/classification access |

Matter permission and document permission must both succeed. The `storage_ref` string is not a registered version identity. Initial current-only delivery must return stale/unavailable when a pinned version is no longer current; never replace it with the newest version silently. COPY ONLY reconciliation is not a delivery receipt or judgment verification.

## 8. All 38 planned destinations: specify, do not leave invisible scope

These are product backlog requirements, not working routes. Existing stub files do not satisfy them. Add navigation only with an implemented, reviewed journey. Consolidate duplicate views into tabs where stated instead of creating page count for its own sake.

| Path | Intended page/components/data | Why / drilldown |
|---|---|---|
| `/ops/accounting/overview` | Income/expense/NOI/receivable/deposit summaries, period/currency, exception queues | Financial position → source reports/ledgers |
| `/ops/accounting/rent-collection` | Due/received/outstanding by period, posted receipts, tenant/lease queue | Review collections → lease ledger/DoorLoop execution |
| `/ops/accounting/expenses` | Expense register, category/property/vendor filters, budget-vs-actual if sourced | Explain costs → bill/invoice/evidence |
| `/ops/accounting/financial-reports` | Income statement/cash flow/owner report library and period controls | Review reconciled reports → transactions/issued versions |
| `/ops/accounting/collections-dashboard` | Reuse collections summary and queue; avoid a second conflicting calculation | Exceptions → rent-collection/ledger |
| `/ops/accounting/collections-log` | Actual collection actions, responsible actor, outcomes | Follow-up history → tenant/lease/evidence |
| `/ops/accounting/payment-plans` | Explicit installments, approvals, posted allocations and performance | Track agreed plan → plan/lease/receipts; no invented schedule |
| `/ops/accounting/deposits` | Deposit liability, trust source, adjustments/refunds and reconciliation | Explain custody → lease/transaction |
| `/ops/accounting/transfers` | Ownership/ledger transfer workbench integrated with A04/A05 | Govern transfer → reviewed receipt; no parallel engine |
| `/ops/accounting/subsidized-housing` | Program/agency/tenant/unit, contract periods, reported portions and payments | Review program commitments → lease/source documents |
| `/ops/accounting/assistance-programs` | Assistance cases, eligibility evidence/status, amounts actually approved/paid | Track source decisions → case/lease/evidence; no automated eligibility decision |
| `/ops/ai/risk-summary` | Explainable factual exception categories, source and confidence | Prioritize review → underlying records; no unexplained tenant score |
| `/ops/ai/ml-leasing-logs` | Model/version/input/output/actual outcome registry only if a model exists | Audit suggestions → source and review; never fake predictions |
| `/ops/legal/advanced` | Consolidate advanced matter work into legal register/card and explicit tools | Avoid a parallel litigation engine |
| `/ops/legal/docs` | Legal template/exhibit search with matter and classification scope | Exact template/version → matter/packet |
| `/ops/legal/attorney-reports` | Matter/award/work summary with as-of and packet references | Attorney review/export only on accepted sources |
| `/ops/comms/queue` | Draft/approved/queued/sent/failed correspondence with record links | Human review/send policy → message/detail |
| `/ops/comms/logs` | Actual provider delivery/receipt/failure observations | Trace message → record/provider receipt |
| `/ops/maintenance/vendors` | Vendor directory, trades, coverage, approved documents and actual work history | Assign qualified vendor → vendor/work record |
| `/ops/maintenance/materials-inventory` | Stock/location/issue/receipt register where ECC owns facts | Review supply → material movement/work; CM remains project-cost owner |
| `/ops/maintenance/smart-routing` | Actual work addresses/windows/skills; proposed route and source constraints | Review schedule before dispatch; no assumed travel/availability |
| `/ops/maintenance/ai-intelligence` | Evidence-backed maintenance trends and repeat issues | Explain suggested action → work/inspection/source |
| `/ops/maintenance/build-repair-projects` | Linked Construction Manager projects and milestones | Escalate/track rehab without duplicating CM |
| `/ops/maintenance/capital-projects` | Capital need, approved scope/budget/timing and CM links | Asset capital planning → project/evidence/approval |
| `/growth/marketing` | Availability/listing assets, campaigns and actual leads | Market vacant inventory → unit/listing/approved marketing workflow |
| `/system/automation` | Versioned rules, triggers, permissions, preview/run receipts, pause/retry | Govern real automation; no silent provider jobs |
| `/data/sync-audit` | Reconcile imported observations to working records; quarantine counts/details | Explain discrepancy → authorized source/record |
| `/data/sync-management` | Bounded admitted resources, capture preview, budget and durable run receipt | Administrator-controlled sync; no global enable gamble |
| `/data/raw` | Restricted read-only source explorer with redaction/limits | Administrator diagnostics; outside daily operator navigation |
| `/data/sync-logs` | Actual request/page/run progress, failures and retry evidence | Diagnose ingestion → run/page; never expose credentials/raw personal payloads |
| `/data/system-settings` | Internal data policy/freshness/retention config, version and authorization | Consolidate true admin settings; separate display preferences |
| `/investor/dashboard` | Investor-entitled assets, performance, statements and capital/work exceptions | Investor view → permitted assets/documents only |
| `/investor/portfolio-analytics` | Entitled asset/period comparison and denominator definitions | Explain portfolio performance → asset/report |
| `/investor/financial-reports` | Issued investor-authorized report versions | Download exact statement/report; no owner-wide leakage |
| `/integrations/dropbox` | Document gateway status, registry/delivery/copy reconciliation | Diagnose files; retrieval remains on record cards |
| `/integrations/corelogic` | Verified provider status and property facts with attribution | Source enrichment → property/evidence; no unapproved paid calls |
| `/integrations/field-app` | Accepted inspections/work handoffs and delivery status | Field facts → asset/work/evidence; do not copy Field App product |
| `/integrations/deal-room` | Accepted acquisition/closing/ownership handoffs | Deal context → asset/owner/source; no duplicate Deal Room |

## 9. Document organization and retrieval

Retain the simple ownership/property AUM layout. ECC is the gateway; Dropbox stores document bytes and D1 stores governed metadata/identity/version/delivery. Original legal folders are **copy-only** sources and must remain untouched. The accepted [folder layout](../legal/ECC_APP_FOLDER_LAYOUT_AND_ROLLOUT_20261111.md) supplies exact names and rollout rules.

- Ownership folder: **Ownership Documents** beside property-address folders. Sections: Property Management Contracts; Entity & Ownership Records; Financial & Tax Documents; Owner Statements & Reports; Correspondence.
- Property folder: Tenant Documents; Property Pics & Video; Improvements & Construction; Legal; Insurance.
- An ownership agreement is stored once and linked to its actual covered properties. Property Files includes a clearly labelled linked-ownership section.
- Unit, lease and tenant document views are scoped associations within that hierarchy, not a new folder tree per screen and not an excuse to duplicate files.
- Files tab: folder navigation, search, type/date/classification filters, name/version/date/related record/delivery, preview/download. Breadcrumbs reflect the business record and section, not raw Dropbox paths.
- Missing, denied, stale, conflict, unavailable and verified empty are different states. Restricted metadata is filtered before search, counts and cache.
- Financial/tax and restricted classifications require their actual policy intersection. An ownership relationship does not grant document delivery automatically.

## 10. Data and component contract ledger

Logical ownership below describes required sources, not installed schemas or new table approval. No UI table is a reason to add a database table.

| Data family | Canonical facts / identity / units | Consumers | Current gap / acceptance requirement |
|---|---|---|---|
| Properties | Native numeric ID and UUID relationship; address/type/status/coordinates/parcel | P01/P02, property card, map/city/legal/documents | Same-row UUID/numeric join; coordinates and contacts unbound; no fixed historical counts |
| Ownership | Owner numeric ID; company binding; property_owners effective relationship/share | P06, owner/property cards, agreements/statements | Replace legacy owner_id guesses; verify company/scope mapping |
| Units | Native ID; parent property, label, dimensions/units, status, condition | P03/P11, unit card, occupancy/readiness | Parser and wire label gaps; readiness needs inspection/work evidence |
| Leases | Native ID; property/unit; all parties; explicit dates/status/terms/rent/currency | P04/P12, cards, horizon | Field naming/date stripping; avoid one-lease-equals-one-occupied-unit assumption |
| Tenants/parties | Person/party ID, capacities, contacts, dated tenancy links | P05, tenant/lease/legal cards | Narrow card parser; private contacts need scoped reader |
| Portfolio summary/history | Totals, occupancy fraction, revenue integer cents, observation timestamps | CC01/CC07/CC08 | Current feed has only these values; define denominator/scope/timezone |
| Posted accounting | Charges, payments, credits, adjustments, expenses, deposit liability, currency/time basis | Finance, ledgers, owner/tenant/lease cards, CC05 | Bind actual DoorLoop observations; reconcile to Working; no generated obligations; money execution stays DoorLoop |
| Collection metrics | Due denominator, posted receipts and period/cohort | CC02, rent collection | Distinguish revenue, cash and collection rate; approved reviewed formula |
| Leasing activity | Lead/tour/application/approval/execution events and cohort | CC06, Growth | No accepted producer; fixed sample values prohibited |
| Maintenance/condition | Work ID, property/unit, issue, owner/vendor, priority, schedule, cost, actual status/evidence | P08/P09, cards, CC02/CC04 | Current operations gate unverified; need genuine workflow/detail reader |
| Legal | Matter UUID, parties, awards, obligors, verification, readiness, requirements, court events | Legal register/card/packets | Native contracts exist; live producer and scope mapping unbound |
| Legal ledger | Immutable entry identity/sequence/reversal, principal/fees/cost/interest/payment, currency, reconciliation/approval | L04/L08 | L5 pure projection exists; authoritative persisted inputs/writer absent |
| Documents/evidence | D1 opaque document/version ID, hash/size, target links, classification, verified delivery; L4 binding | All Files/evidence/packet views | No accepted real store/provider binding; exact authorization and pinned-version rules |
| Communications | Template/message identity, context, approved content, provider delivery observations | P19, communications and card tabs | Editor/JSON/EML exist; no actual send or persisted message reader |
| Tasks/workflows | Persistent task ID, responsible actor, due/source date, status, revision, record link | Operations/priority/requirements/cards | Temporary selection is not a task; actor not inferred from request wording |
| Reports | Layout/version, captured scope/as-of, creator, classified immutable output | P15–P18, owner/financial/investor tabs | Existing CSV only; saved/PDF/issued registry requires accepted persistence |
| Audit/activity | Event ID, actor, business/event time, revision, subject, evidence and redaction | Every Activity/Audit tab | No fake “No recent activity”; unavailable reader is distinct from empty |
| Ingestion/reconciliation | Admitted account/resource/run/page/revision/custody/verification, freshness and errors | Data Hub/integration status | Supabase collector installed but disabled; identity probe is not portfolio sync; bounded capture + Working promotion still required |

Every displayed field must be entered in its implementation PR's binding sheet: **field ID → canonical column/contract path → join/cardinality → units/null semantics → permission → transform → displayed component → click target → validation**. `source-api-references.csv` lists source references, not proof that endpoints are mounted, authorized or live.

The [field binding recovery sheet](FIELD_BINDING_RECOVERY.md) records exact current parser paths and 28 required display-field groups.

### Known transformations requiring explicit proof

- cents → formatted currency exactly; currency mandatory with amount; max-safe/bigint boundary preserved;
- occupancy fraction versus percentage; occupied **units** versus active leases; unknown/excluded denominators;
- loaded MRR = explicitly active loaded lease rents, labelled partial where necessary; never collections/NOI;
- NOI = reviewed income less operating expenses under the same accounting basis/period, not 30-day revenue;
- collection rate denominator/numerator and period must match; credits/overpayments not silently clamped;
- reported lease date buckets change the same record queue and total; no notice deadline inferred;
- city totals reconcile to included portfolio records and identify exclusions; map pins reconcile to verified locations;
- joint award counted once by award ID, multiple awards per matter; readiness never substitutes for approved eligibility;
- search/filter/count/export operate on the same authorized source; later-page denial discards previous metadata.

## 11. Every component/control: inventory and disposition

[Source components](source-components.csv) lists every TSX module with exports, import reachability, local dependencies and UI object count. [Source controls](source-controls.csv) lists every statically identified control/heading/chart/map/table/card/panel declaration with file, source line, tag, label/expression, link/target, handler and disabled/hidden expression. [API references](source-api-references.csv), [routes](routes.csv), [navigation](navigation-destinations.csv) and [snapshot members](historical-snapshot-members.csv) and [archive index](snapshot-archives.csv) provide the remaining crosswalk.

Static import reachability is **not proof of mounting**. Repeated rows create more rendered instances than source declarations. Conditional/dynamic labels and composed controls need runtime inspection. Dormant files remain in the inventory until assigned to a recovery, reuse, consolidation or retirement decision. No “not imported” row may be deleted merely because it is dormant.

| Component family | Plan destination / disposition | Why and acceptance |
|---|---|---|
| Sidebar, WorkspaceBar, navigation registry | G01–G05; extend | Stable domain/record orientation and return context |
| CardShell, HeroBlock, Panel, FieldRow, RelatedRecord | Shared asset-card system; reuse/extend | One visual pattern; actual field bindings; links survive state changes |
| Dormant per-entity Hero/RightRail/Details/Linked/Activity/Tabs | Compare to PR/UN/LE/TE/OW target tab IDs; migrate best elements | Recover lost information architecture; remove duplicates only after coverage proof |
| KPI cards/ticker, ring, sparkline, chart container | CC01/02/07/08; consolidate | Consistent periods/units, real charts and accessible values |
| Portfolio map, city tables, financial/leasing/action components | CC03–09; recover and improve | Original visual inventory with corrected data and real drilldowns |
| Lease horizon/unit status/work queue | CC10–12; retain useful interactions | Chart → filter → matching records → card → return |
| Portfolio DataTable/CanonicalDenseTableShell | P02–P06; normalize | Search/filter/sort/pagination/keyboard/CSV and persistent structure |
| TriageBoardShell/local unit review | P02/P03; explicitly local until saved workflow | Never imply persistence, assignment or dispatch |
| RecordDocuments / transport adapters | PR-DOC/OW-DOC; extend carefully to others | Same document identity/version/classification and exact links |
| Native legal components/projections | LR/L01–09; extend | Keep L1/L5/L6 dimensions and protected evidence boundary |
| Report layouts/preview/CSV | P15–18; retain, add governed library/output | Useful existing behavior remains while richer reporting returns |
| Email template editor/draft state | P19/TE-COM/OW-COM/L06; retain | Draft/preview/download remain distinct from send/save |
| Operations DomainPanel / recovery views | P08–10; replace notice walls with working visual regions | State safety retained; not presented as complete workflows |
| Raw DataHub/admin token/run/reset/source tooling | Restricted A/P20/P21 technical views; redesign before activation | Do not leak developer tools into daily operating screens |
| Old stub pages in accounting/AI/work/growth/investor/integration trees | Section 8 target pages; forensic reuse only | A filename/placeholder is not a complete product; verify each control/data path |
| Toast/error/dev banner utilities | Feedback and developer-only diagnostics | Raw debug content must never dominate production operator UI |

## 12. Rebuild sequence: targeted PRs, no parallel redesign from memory

Each slice starts from accepted dependencies, references the IDs above and lists exact objects preserved/changed. Claude and Grok may advise/structure/audit; Codex owns final UI and integration per Dion. External assignments must be separate copy/paste prompts in chat; no assignment/status-only GitHub comments or monitoring churn.

| Slice | Deliverable / principal files | Dependency / exit proof |
|---|---|---|
| UI-00 | This blueprint, full source/archive inventories, visual review set | Source coverage counted; all gaps explicit; no UI approval implied |
| UI-01 | Historical visual reconciliation: 165 unique archived visual contents + Git baselines, selected renderable comparisons | Map each original major object to retained/recovered/improved/retired; inspect no secret-bearing configuration; no wholesale archive execution |
| UI-02 | Shared shell/card/table/chart tokens, readable states and parent/tab URL context | G01–G12 approved with representative actual cards and tables; one active pattern |
| UI-03 | Command Center CC01–13; refine draft #247 against blueprint | Original areas visible; loaded + disconnected + denied + mobile review; no invented operating series |
| DATA-01 | Bounded DoorLoop core capture and Imported → Working reconciliation in ingestion owner | Account/resource admission, durable bounded run, real completeness/unknown/duplicate proof; no global scheduler gamble |
| DATA-02 | Portfolio/card reader contract and mapping corrections | Every visible field reconciled to actual source; label/rent/date/ownership joins proven; no broad raw passthrough |
| UI-04 | Five portfolio registers, search/filter/map/table/tile and meaningful summaries | P02–06, loaded/partial/empty/error/denied; row → correct card → exact return context |
| UI-05 | Property + unit cards and rails/tabs | PR/UN IDs, exact field bindings, related parties, documents/work associations; all tab states reviewed |
| UI-06 | Lease + tenant cards, renewal/ledger/comms sections | LE/TE IDs; all parties, dates/rent, posted finance; actual drafts/delivery semantics |
| UI-07 | Ownership/company organization, owner card and agreement coverage | OW IDs; verified property_owners and D1 exact links; ownership folder plan preserved |
| LEGAL-01 | Native register/matter presentation and protected evidence reader integration | LR/L IDs, multi-award/unknown/permission/restricted/pinned-version proof; no automatic send or legal conclusion |
| UI-08 | Operations/work-order and ledger workspaces | P08–10, real owner/status/record actions, posted balances; unavailable producer does not count as finished |
| UI-09 | Vacancy/renewal visual worklists | P11/P12; current date/status tools retained; future analytics only with accepted evidence |
| UI-10 | Reporting library/designer/issued output and correspondence | P15–19; working CSV retained; new save/PDF/send only with backend authority and reload/delivery proof |
| UI-11 | Data Hub/integration status/admin separation | P20–22/A01–05; current Supabase collector reflected truthfully; legacy admin token/source controls reviewed |
| UI-12 | Remaining section 8 product modules in bounded domain slices | Each new destination has full page/card/data/action plan and user visual review before navigation activation |
| UI-13 | Whole-app acceptance and release candidate | Every page/tab/component disposition accounted for; visual + functional + real-data evidence, approval then exact runtime alignment |

No rebuilding unrelated source in Claude/Grok lanes. No merge/publish of UI-03 merely because its unit tests pass. Source design, contract changes, live data admission, schema installation and release remain separate reviewable changes.

## 13. Visual and functional acceptance: the approval register

For **every routed page and every target card tab**, record stable design ID, source SHA, viewport, data state, screenshot, interaction, expected versus observed result, data reconciliation and Dion's approval/disposition. The [experience review register](experience-review-register.csv) contains the individual review rows. Initial status for every row is **NOT APPROVED**. The register must cover the 38 planned destinations as they become designed; they cannot silently disappear from scope.

Required states: populated representative data; confirmed empty; partial/unknown; zero; loading; failed/refresh failed; denied/revoked/session change; stale/conflict; narrow desktop/tablet/390px phone; long names and realistic row volume. Test actual sort/search/filter/chart selection/row navigation/back/tab URL/download, and all writes through save/reload/conflict/retry where implemented.

Charts need legible measured geometry, axes/legend/period, selectable filters, null/zero distinction, accessible observation tables and reconciled totals. A screenshot of an empty axis frame does not establish a working financial chart. A synthetic chart screenshot is labelled synthetic and never substituted for reconciled operating data.

Forms need field meaning/units, pre-commit preview where consequential, clear save/cancel/undo behavior and durable result. Hidden/disabled capability must state its business status concisely, without SDK names, schema discussion, connection implementation or deployment directions.

Release blocks: unexplained removed object; dead action; raw developer prose; unresolved data-field stripping; fake charts/pins/counts; misleading verified-empty state; wrong-party link; restricted-data leak; unreconciled financial definitions; unavailable critical workflow; missing page/tab visual review. Passing CI is necessary engineering evidence, not Dion's design approval.

## 14. Review set and remaining evidence

Runtime review on `bae05740` inspected Command Center, legal register, Properties, Owners, Operations, Reports and Integration Health. These are **unapproved current-state observations**, not the rebuilt design. Dashboard/legal at 1363px and 375px had no horizontal overflow; this did not make their content acceptable. Other populated card/tab states cannot be judged from a disconnected register.

Screenshots captured outside the repository contain no invented operating records. The review set must expand to every tab using clearly labelled synthetic cases for design and separately authorized real records for data acceptance. Do not ask Dion to discover missing pages; the inventory drives the review queue.

Open evidence tasks: visually reconcile the 165 unique snapshot contents; reconcile separately supplied Dropbox archives; trace and approve the complete field-binding sheet; establish accepted finance/leasing/location/task/communication producers; repair card contracts; bind protected document/legal readers; validate real import/working completeness. These are scheduled rebuild dependencies, not reasons to delete the components from the plan.

## 15. Maintenance and regeneration

- One current UI execution index: this file, linked from the roadmap authority index.
- `node --import tsx scripts/inventory-ui.mjs` regenerates source/route/navigation CSVs; `python scripts/inventory-ui-snapshots.py` regenerates retained snapshot member hashes. `python scripts/inventory-ui-review-register.py` regenerates review rows from the blueprint tables; it preserves unchanged approval evidence, invalidates changed specifications while retaining prior decisions, and retains removed IDs for review. Run at a clean source baseline, inspect differences and reconcile them to the plan.
- Inventory output includes dormant modules and source expressions. Do not confuse it with live behavior, target data authority or authorization.
- A PR adding/removing a route, tab, chart, metric or action must update its design IDs and affected inventory/approval rows. No undocumented whole-page replacement.
- Historical plans remain provenance. The product master plan remains strategic authority; current Dion decisions and verified contracts take precedence.
