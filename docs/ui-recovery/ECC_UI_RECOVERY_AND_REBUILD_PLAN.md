# ECC whole-app UI recovery and rebuild plan

> Current detailed addendum: [Full Recovery and Build Plan revision 1.2](ECC_APM_Full_Recovery_and_Build_Plan.md), [43-finding consolidation](ECC_APM_Advisor_Consolidation_and_Design_Decisions.md), and [UI review/change safety](UI_REVIEW_AND_CHANGE_SAFETY.md). Read these for the next visual revision. This source-inventory execution program and its existing boundaries remain; no design is approved by this link.

**Product owner:** Dion DePaoli. **Design and integration owner:** Codex.
**Revision:** 2 — incorporates Gemini, Grok and Claude reviews and Dion's navigation, color, information-help and approval directives.
**Status:** stored execution blueprint; current UI rejected; neither this plan nor source checks approve a page visually.
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
| `/portfolio/properties/:id` | Registered placeholder distinct from the real property card | Record duplicate-route defect; preserve its path and behavior during the navigation freeze. A redirect requires separate Dion authorization |
| Historical dashboard data hook | Random cash flow/collection traces, fixed leasing counts, inferred occupancy/readiness | Recover design, never those data generators |

The source inventory contains **33 explicit routes plus fallback, 20 available navigation destinations, 38 declared unavailable destinations, five asset-card families, one legal-matter card family, 256 TSX modules, 588 source UI object declarations and 98 API-path references**. The latter counts include dormant source, not 588 working mounted features.

All **38 retained ZIP snapshots** were inventoried without execution: **2,728 visual-source members, 165 distinct byte contents**. Same-path hashes distinguish retained, changed and relocated candidates. This establishes source inventory, not a visual comparison of all archived builds. Older `src/pages/dashboard/index.tsx` must be reconciled with the newer feature path. Separately sourced Dropbox archive completeness remains unverified; original folders must never be moved or deleted.

## 2. Fixed product rules

1. A daily operator sees portfolio health, work requiring attention, the responsible record, and a clear next action. No debugging essays in ordinary page content.
2. Black, white and gold frame the Altus interface. Charts use meaningful semantic and categorical colors: green profit/positive cash flow, red loss/adverse variance, and distinguishable accessible blue/teal/purple series. No orange. Brand styling must never force a grey-and-gold chart set.
3. Recover first, then improve. Before removing an object, record its stable design ID, replacement, inbound links and Dion's disposition. Never silently reduce a page to satisfy a narrow API.
4. Preserve each agreed component in the visual design. For the operating release choose real data, a designed concise pending state, or explicit deferral per panel. Do not ship a wall of empty frames. Suppress unauthorized/stale values; never fill missing feeds with synthetic data in production.
5. Use compact accessible “i” information controls for optional definitions/provenance. No unnecessary developer text, instructional paragraphs or collections of text boxes. Keep only necessary labels, period/currency, concise status and an actionable error visible. Engineering diagnostics stay in restricted technical views.
6. Every enabled control has a real result, destination or download. No toast-only success, dead Edit/PDF buttons, fake assignments or fake communications.
7. Database first, accepted API fallback second, calculation last. Unknown is not zero. A chart cannot manufacture history, coordinates, obligations, payments, readiness or approvals.
8. Native record identity drives links. UUID legal/property references and numeric document/portfolio keys require verified joins. Names, addresses and Dropbox folders are not identity or authorization.
9. Preserve all current useful behavior: search, sorting, CSV safeguards, keyboard focus, related-record links, session clearing and denied-cache suppression.
10. Codex performs the final internal visual/interaction review before Dion sees a review slice. Dion retains final approval. Shared-pattern state testing is comprehensive; Dion reviews complete vertical slices rather than thousands of individual matrix cells.
11. Navigation is frozen: no changes to sidebar groups, labels, icons, order, visibility, available/disabled status, page destinations, route paths, redirects, page switcher or existing tab navigation. No new links/routes/tabs or removal/hiding/reordering of existing tabs without a separate Dion decision. Improve content inside the existing destinations.
12. Build visual review fixtures and data integration in parallel. Synthetic data is isolated, typed, deterministic, visibly labelled and absent from operating bundles/readers. Visual approval is separate from live data acceptance.

## 3. Information architecture and operator journeys

### Global shell

| ID | Object / placement | Why it exists | Behavior / destination |
|---|---|---|---|
| G01 | Existing left navigation, including its current narrow-screen behavior | Stable domain orientation | FROZEN: retain exact structure, labels, icons, order, visibility and destinations |
| G02 | Existing workspace bar above content | Current record/domain context | FROZEN: retain existing switcher, labels and destinations; only in-page content may be redesigned |
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

Business facts must survive ordinary refresh and navigation through their canonical reader. Drafts and temporary selections must be clearly local until a governed save exists. Preserve existing navigation/tab behavior and return context during this campaign. Future deep-link or history changes are proposals requiring separate authorization; private record content must not be placed in URLs or browser storage.

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
| `/portfolio/properties/:id` / P07 | Preserve the existing destination during the navigation freeze | Track known duplicate placeholder | No redirect, route replacement or navigation change in this campaign; record remediation proposal separately |
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

Use one visual card pattern inside the existing card destinations and existing tab arrays. Do not change tabs, labels, order or navigation while consolidating internals. Recover good visual elements from `Hero.tsx`, `HeroBlock.tsx`, `RightRail.tsx`, `Details.tsx`, `Linked.tsx`, `Activity.tsx`; migrate deliberately, then retire duplicates after link/import verification.

Actions: Review source / Download / Edit / Create work / Draft correspondence only when their real reader or writer exists. Edits need field validation, revision/conflict handling, save/reload proof and audit. PDF requires a real rendered output. Missing workflows keep a compact disabled affordance only where helpful, not a pretend success.

Every tab below is a **target requirement**, not a claim that the current implementation already works. Current mounted property tabs are Overview/Financials/Legal/Files. Other four currently add Related. Their old seven-tab modules survive but do not own current tab state. The target capability IDs below are a content inventory, not authorization to add, remove, rename, hide or reorder tabs. In the first release improve the content of the existing Overview, Related (where already mounted), Financials, Legal and Files tabs. Future Activity, maintenance, renewal, communications and agreement capabilities stay deferred or are designed as in-page sections for review. Existing local tab behavior remains unchanged; new deep links need separate authorization.

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

These are product backlog requirements, not working routes or commitments for the next release. Existing stub files do not satisfy them. Navigation is frozen: preserve all existing available and unavailable entries exactly; do not activate, hide, regroup or relabel them. Proposed consolidation or new destinations require a separate Dion decision. Priority tiers below govern the backlog, not navigation changes.

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
| Sidebar, WorkspaceBar, navigation registry | G01–G05; preserve unchanged | Frozen navigation; use existing shell in every visual prototype and review |
| CardShell, HeroBlock, Panel, FieldRow, RelatedRecord | Shared asset-card presentation; reuse/extend internals | Existing tab arrays and destinations unchanged; real field bindings and readable detail |
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

## 12. Priorities, parallel execution and bounded PRs

### Advice incorporated

| Adviser | Adopted change | Boundary |
|---|---|---|
| Gemini | Parallel visual and data tracks; typed isolated fixtures; mobile density from the first prototype; complete-slice reviews | No synthetic records in production or invented accepted API contracts; no recurring review automation created |
| Grok | Command Center is the first visual gate; occupancy/MRR/award definitions fixed early; living field/review artifacts; existing legal/document boundaries retained | Later presentation slices do not establish a competing design baseline before CC acceptance or explicit deferral |
| Claude | Clickable pixels before more specification; explicit live/pending/defer decision per panel; proportional QA; time-boxed archaeology; core journeys first | No automatic tab hiding or navigation changes: Dion's later navigation freeze overrides that suggestion |
| Dion | Existing navigation unchanged; semantic graph colors; no developer-text clutter; “i” help; Codex reviews UI before Dion | All worker handoffs are reviewed source/fixtures, not final UI approval |

### Three first-release daily journeys

1. **Portfolio triage:** Command Center → existing Properties/Units register → property/unit card → relevant source records → return to the same review context.
2. **Lease/tenant review:** expiration or balance signal → existing Leases/Tenants destination → lease/tenant card → actual ledger, agreement or approved correspondence context.
3. **Ownership/evidence review:** existing Owners destination → owner/property card → management agreement and classified Files/Legal context. Protected reads must work before real documents are delivered.

These are the working priorities based on the established ECC operating requirements; they do not imply observed user-frequency analytics. Maintenance and accounting are the next operational priorities. The 38 planned destinations remain visible in the backlog, ranked by value, without activating navigation.

### Value tiers

| Tier | Included scope | Release treatment |
|---|---|---|
| NOW | Command Center visual baseline; current registers and existing card-tab contents; core field mappings; bounded data preparation | First reviewable increment; visuals and data proceed in parallel |
| NEXT | Operational work orders, posted tenant ledger/collections, vacancy/renewal worklists, owner agreement/statement delivery, legal evidence retrieval | Build after shared visual baseline and required producer/reader acceptance |
| LATER | Rich reporting/PDF persistence, actual communications delivery, vendors, projects, deposits/payment plans, assisted-program records and source-backed analytics | Separate complete domain slices; no placeholder feature-count claims |
| PARKED | Investor portal, model logs, automated routing/intelligence, marketing/automation and cross-app expansion without accepted producer/owner | Inventory retained; not part of recovery release and no new navigation |

The detailed [targeted PR worklist](TARGETED_PRS.md) assigns each bounded slice and permitted paths. Claude handles contract/data and protected-reader foundations; Grok handles typed fixtures, metric/control structure and adversarial verification; Codex owns presentation, consolidation and integration. External Claude/Grok prompts are separate copy/paste blocks delivered in chat, never assignment/status-only GitHub comments. Do not claim either agent started until Dion sends the prompt and the agent returns evidence.

### Parallel tracks and gates

- **Visual track:** first create a clickable Command Center prototype with the exact existing navigation, realistic isolated typed fixtures, semantic chart colors, desktop and 390px layouts, and working in-prototype filters/drilldowns. Use `c940fa7b`/`8ed250bc` as the initial visual baseline. Time-box additional archive comparison to two focused sessions of at most 90 minutes each; record unresolved candidates instead of blocking the prototype on all 165 variants.
- **Data track:** review actual DoorLoop capture/account/resource gates and field delivery independently. Existing collector work is reused. Correct reader names/units/joins; no live SQL, provider activation or global scheduler enablement follows from a visual request.
- **Structure/test track:** build deterministic typed fixture factories and metric definitions, navigation invariance checks, and a reusable information-control/state harness. Accepted contracts are reused exactly. Unsupported visual data uses a clearly named proposed presentation fixture, never a claimed backend contract.
- **First visual gate:** Codex rejects incomplete/unattractive/cluttered results internally, then Dion reviews the whole Command Center. Later UI designs may be prepared structurally but do not set a competing production baseline before this gate passes or Dion explicitly defers it.
- **Card delivery gate:** show representative populated cards synthetically for design; bind real values only after DATA field acceptance. Preserve existing tab navigation. Deferred producers do not justify blank text-heavy releases or removing planned information needs.
- **Protected files gate:** existing #245 is an unmounted public-only reader foundation, not complete Files delivery. Slot the accepted authority producers, matter/document/property identity joins, document store/provider binder, legal evidence binder and browser transport binder before real PR-DOC/OW-DOC/L03/L08 activation. Reconfirm current PR/head/status before reuse.
- **Review batches:** complete vertical slices (Command Center, Property+Unit, Lease+Tenant, Ownership, Legal) at the end of each ready increment. Offer Tuesday/Friday reviews only if useful to Dion; no fixed cadence or automation is assumed and no daily work waits for a calendar slot.
- **Separation of change types:** recovery PRs preserve objects and routes; improvements are separately labelled. Consolidation names every old component, data mapping and control that moves, supplies equivalence evidence, and retires duplicates only after the replacement is accepted.

### Panel release decisions

The clickable prototype displays all CC01–CC13 with a permanent synthetic-review label. The operating release cannot use those fixtures. For each panel, Codex proposes LIVE / DESIGNED PENDING / DEFERRED using the table below; Dion approves that decision with the visual slice. No new navigation is created for deferred drilldowns.

| Panel IDs | First-release proposal | Minimum real-data requirement |
|---|---|---|
| CC01 | LIVE when summary/card totals reconcile; otherwise one designed pending KPI state | Accepted scoped property/unit/occupancy/revenue observations |
| CC02 | Individually LIVE only with proper sources; otherwise DEFER operational metric tiles as a group | Inspection-backed readiness, posted collections, actual critical work records |
| CC03 | LIVE with verified locations; otherwise designed location panel + existing property-register link, or defer by Dion's visual decision | Verified coordinates and property identities; no guessed pins |
| CC04 | LIVE for actual review records; unsupported exception categories DEFER | Real actor/status/date/source; no fabricated priority |
| CC05 | LIVE only with reconciled posted financial series; otherwise DEFER from operating release | Income/expense/NOI same currency/period/basis |
| CC06 | DEFER until actual leasing activity exists | Deduplicated lead/tour/application/approval/signature cohort |
| CC07 | LIVE only with accepted occupied-unit denominator; otherwise designed pending gauge | Occupied/eligible/unknown units; no active-lease substitute |
| CC08 | LIVE only with real observations; otherwise DEFER historical plot | Source history at labelled dates; never derived from current occupancy |
| CC09 | LIVE with reconciled city/unit joins; otherwise DEFER | Same population and definition as portfolio totals, exclusions explained |
| CC10–CC12 | LIVE from valid accepted loaded leases/units; otherwise one designed pending review workspace | Actual dates/status/identity and same filtered records behind each chart |
| CC13 | Small “i” controls placed by relevant metrics; no permanent essay panel | Short business definition, scope and source/as-of, no engineering setup text |

Deferral changes content within the current page, never the sidebar, route or tab navigation. The deferred object remains in the recovery register so it cannot be forgotten. A screen of empty chart frames is not an accepted release.

## 13. Design review and proportionate proof

The [experience register](experience-review-register.csv) retains all 174 design items and their dispositions. It is traceability, not a requirement for 174 separate approval conversations. Every review item starts NOT APPROVED. Codex performs the final internal design gate; Dion gives final user approval for each complete vertical slice.

| Proof layer | Required coverage | Reviewer |
|---|---|---|
| Shared patterns | Full loading/empty/partial/unknown/zero/failure/denied/session/stale/conflict matrix once per genuinely shared pattern; desktop and 390px; targeted tablet | Automated tests + Codex |
| Unique page/card behavior | Representative populated and disconnected state, primary interactions, long content and relevant high-risk boundaries | Codex with measured browser evidence |
| Financial/authorization/document behavior | Full relevant money, rounding, null/zero, wrong-identity, denial/revocation, later-page failure and exact-version cases on each independent boundary | Technical review; never waived by visual similarity |
| Dion review | Complete desktop/mobile vertical slice with realistic labelled fixtures, clear before/after and a short unresolved-decision list | Dion, after Codex internal acceptance |
| Live acceptance | Source → authorized reader → parser → page/chart → drilldown → refresh with actual reconciled records | Codex/data owner; separately from synthetic design approval |

Charts need measured geometry, axes/legend/period, readable semantic colors, reactive filters, null/zero distinction and accessible values. Color conveys meaning, not decoration: profit/positive cash flow green, loss/adverse variance red. Do not classify every expense as loss. Use blue/teal/purple categorical series with explicit legends, signs, labels and line/pattern differences so color is not the only cue. Gold remains a brand/selection accent rather than the mandatory data color. No orange. Final tokens must pass contrast and color-vision checks in light/dark states actually used.

Optional explanations use a small “i” icon beside the relevant label: hover **and keyboard focus** reveal help; tap/click works on touch; Escape dismisses; the target is accessible and large enough without an oversized visible box. Use a shared accessible tooltip/popover, not browser-title-only help. Essential labels, amounts, units, active scope and actionable errors remain visible. No developer terms, token/configuration instructions, raw JSON or data-architecture lectures on operating pages. No walls of framed explanatory text.

Forms prove validation, save/cancel, conflict/retry and durable reload where writes exist. A control with no real workflow is not enabled. Existing tabs/navigation remain unchanged; unavailable tab contents get a designed compact local state, not a new tab-hiding scheme.

Release blocks: unapproved navigation changes; unattractive or text-heavy UI; unexplained removed objects; dead actions; synthetic operating data; lost field mappings; misleading empty states; wrong-party links; restricted leaks; unreconciled financial definitions; critical unavailable workflows; missing Codex internal gate or Dion slice approval. Passing CI is necessary engineering evidence, never visual approval.

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
