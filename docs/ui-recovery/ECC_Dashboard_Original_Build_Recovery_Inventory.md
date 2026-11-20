# ECC dashboard: original-build recovery inventory

**Date:** November 16, 2026, America/Chicago  
**Status:** Historical source inspection and information plan. No new rendering or production change is approved. Review 03 is rejected and is not the recovery baseline.

## Corrected source of design evidence

Dion identified the original Replit exports in the Dropbox folder **ECC Reload**:

[Private shared-folder access reference retained in the PM handoff; not published in repository documentation.]

The folder is accessible through the connected Dropbox account. It contains extracted source trees and matching ZIPs for:

- `AltusCommand3/AltusCommand`
- `EmpireCommandCenter1/EmpireCommandCenter`
- `EstateCommand2/EstateCommand`

Inspection used the extracted frontend files. No ZIP scripts, old application servers, credentials or historical integration jobs were executed. The originals were not moved, changed or deleted.

The current GitHub repository remains canonical for implementation, current contracts, access safeguards and source control. It is **not a complete record of the desired historical dashboard design**. The historical builds supply the missing design and information evidence. Recover the useful presentation and information model, then bind it to verified current data; do not recover fabricated metrics or obsolete execution wiring.

## What the three builds actually contain

### EstateCommand2: the clearest full dashboard composition

Read `src/features/dashboard/pages/DashboardPage.tsx` and its available component implementations. Its explicit composition is:

1. Full-width KPI ticker.
2. A large property map occupying roughly two-thirds of the main grid.
3. A priority action feed alongside the map, occupying roughly one-third.
4. Financials and leasing components below that grid.
5. Full-width occupancy-by-city table.

The page imports `KpiTicker`, `PortfolioGoogleMap`, `PriorityActionFeed`, `FinancialsAndLeasing` and `OccupancyByCity`. Its App source imports this dashboard for `/dashboard`. Additional available components contain income-versus-expenses, portfolio value-versus-debt, an action center, occupancy breakdown and a second leasing funnel variant. Their existence does not mean every variant was mounted at the same time.

The styling in `src/styles/Dashboard.css` confirms the four-card KPI grid, 2:1 map/feed grid, paired chart region and responsive stacking. This is stronger evidence of the historical composition than the incomplete GitHub dashboard or the rejected mockups.

### EmpireCommandCenter1: richer operational and portfolio modules

Read `client/src/pages/CommandCenter/DashboardPage.tsx` and selected modules. The page contains:

- Enhanced KPI header and a portfolio summary strip.
- Overview / Financials / Units / Leasing / Maintenance view controls.
- Portfolio health and delinquency side by side.
- Underperforming properties and vacancy hotspots.
- Leasing momentum grouping new leases, expiring leases and churn.
- Quick actions, recent activity and alerts.

Its dashboard component source is richer than the inspected `client/src/App.tsx` wrapper, which contains a generic Dashboard route. Therefore the component composition is verified historical source evidence, not proof that this exact page was the active served screen at export time.

Several module concepts are present beyond the main page: unit distribution, 12-month trend, lease-expiration buckets, new-lease time series, cash flow, maintenance velocity and conversion funnel. Some are substantive implementations; others are placeholders. Preserve the requirements while distinguishing their implementation maturity.

### AltusCommand3: portfolio/card context and linked counts

The active dashboard file referenced by `src/pages/dashboard/Dashboard.tsx` is `src/pages/dashboard/index.tsx`; both were read. The index contains linked counts for Properties, Units, Tenants, Leases and Owners, entity-card entry points and system status. The alternate Dashboard.tsx explicitly says it is unused.

This build reinforces the portfolio/entity context. It should not replace Estate's richer analytical dashboard or Empire's operating intelligence. Hardcoded demo record links and raw API counts labeled active are historical defects, not requirements to preserve.

## Information inventory before layout

The next dashboard must account for every retained area below. A missing data feed changes a module's data state; it does not authorize removing the module from the planned information architecture.

| ID | Retained area and historical evidence | Information needed | Visualization / controls to preserve or improve | Action enabled by the information |
|---|---|---|---|---|
| D01 | Portfolio overview — Altus dashboard index; Empire SummaryStrip | Managed property count, rentable units, occupied/vacant units, relevant agreement count, owners and people classifications | Linked compact portfolio summary; explicit scope and definitions | Open the matching property/unit/agreement/owner population |
| D02 | Occupancy KPI — Estate KpiTicker; Empire EnhancedKPIHeader | Occupied units and eligible denominator, date, completeness, known unknowns | Occupancy indicator/donut; actual history sparkline where available | Inspect occupancy and exceptions |
| D03 | Rent-ready vacancies — Estate KpiTicker | Vacant units, independently verified ready count, turn/construction state and blockers | Ready versus vacant indicator; click to readiness list | Clear turn/readiness blockers and market eligible units |
| D04 | Collections MTD — Estate KpiTicker | Accepted due/receipt/allocation definitions, period and currency | Collection measure and actual comparable history | Review unpaid obligations, disputes and plan work |
| D05 | Critical work orders — Estate KpiTicker | Open work, priority/urgency classification, assignment and acknowledgment | Count plus severity/age signal | Open the urgent work list and escalate unresolved items |
| D06 | Collected cash, delinquency AR and NOI — Empire EnhancedKPIHeader | Separate authoritative receipts, open receivables and operating income/expense records | Distinct financial indicators; valid comparison period; no invented sparklines | Review the financial source and accountable follow-up |
| D07 | Large portfolio map — Estate PortfolioGoogleMap | Verified asset IDs, coordinates, address and independently represented statuses | Preserve map prominence, selectable markers, selected-asset detail and list alternative | Open the actual asset or filter affected locations |
| D08 | Priority action feed — Estate PriorityActionFeed / ActionCenter | Delinquency/account concerns, expiring agreements and maintenance hotlist | Preserve categorized actionable items, priority, record context and specific action labels | Review ledger, contact an authorized party, prepare renewal, inspect/assign work |
| D09 | 90-day cash-flow view — Estate FinancialsAndLeasing; Empire CashFlowChart | Actual income receipts, operating expenses and accepted NOI basis by period | Income/expense bars and NOI line; 30/60/90-day controls; accessible source table | Inspect a period/category and review the cause |
| D10 | Income versus expenses — Estate FinancialSnapshot | Comparable period totals and recognized basis | Retain analytical capability; avoid duplicating the same chart permanently if D09 already presents the same data | Compare performance over 3/6/12 months and inspect source entries |
| D11 | Portfolio value versus debt — Estate FinancialSnapshot | Valuation source/date/method and accepted debt balances | Value/debt comparison with period selector and coverage | Inspect asset/capital exposure; no valuation inferred from rent |
| D12 | Leasing funnel — Estate FinancialsAndLeasing / LeasingFunnel | Leads, tours, applications, screening/approval, signed outcomes and cohort/period | Preserve funnel and stage counts; reconcile stage definitions across variants | Open stalled opportunities, arrange follow-up and inspect conversions |
| D13 | Occupancy by city — Estate OccupancyByCity / OccupancyBreakdown | City, managed properties, total/occupied/vacant units and coverage | Sortable/searchable table, progress bars, totals, show-more and city drill-down | Identify geographic concentrations and open matching assets |
| D14 | Portfolio health — Empire PortfolioHealthCard / PortfolioHealthCharts | Valid current unit distribution and actual time-series observations | Distribution plus 12-month trend, with clear source and time basis | See deterioration and drill into affected units/properties |
| D15 | Underperforming properties — Empire UnderperformingPropertiesCard | Explicit ranking rule, source occupancy/performance, exclusions and ties | Ranked property list/table with meaningful explanation | Review the named property and its improvement work |
| D16 | Vacancy hotspots / vacant inventory — Empire VacancyHotspotsCard / VacantUnits | Verified vacancy/availability, age, condition, ready date and source conflicts | Hotspot list plus unit-level readiness/status detail | Launch the correct leasing, inspection or turn task |
| D17 | Leasing momentum — Empire LeasingMomentumSection | New leases, expiring terms, renewals and churn, each with accepted definitions | Retain grouped new-lease trend, expiration buckets and churn signals | Review terms, prepare renewal work and inspect move-outs |
| D18 | Maintenance velocity — Empire MaintenanceVelocity | Intake, assignment, response, completion and reopen timestamps; priority and team | Preserve the planned performance area; replace its placeholder with sourced aging/throughput when supported | Find stalled work and capacity problems |
| D19 | Recent activity / alerts — Empire dashboard | Actual servicing, payment, agreement and work events; responsible team and source links | Attributed event stream and actionable exceptions | Resume work and reconstruct what changed |
| D20 | Filters, ranges, navigation and quick actions — all builds | Shared portfolio scope, city/owner/property filters, selected period and actual permitted routes | Preserve useful context/range controls; align related panels without silently changing their basis | Move from insight to the correctly scoped record without losing context |

D09/D10 and D13's two historical variants may share a reusable component or switchable view. That is consolidation of duplicate presentation, not deletion of the analytical capability. Each retained capability must remain discoverable, labeled and reachable.

## Improvements are additions to this inventory

The following add operational control to the recovered dashboard. They must not displace the map, financials, occupancy intelligence or leasing performance:

| Improvement | Information added | Placement and interaction principle |
|---|---|---|
| Two-way communications | Unanswered inbound items, assignment, authorized party/capacity, channel and promised follow-up | Extend the action center with a communication work group; contextual thread opens on demand |
| Default/breach servicing | Review concern, applicable agreement, missing evidence, draft/version state and relevant verified dates | Add specific review items; retain financial/legal distinctions; do not make the entire dashboard a notice workbench |
| Payment plans | Proposed/accepted terms, next installment, allocation evidence and exceptions | Add plan follow-up to collections work, not a second account balance |
| Workflow ownership | Responsible person/team, next step, blockers, internal targets versus other dates | Add to existing operational feeds and relevant drill-downs |
| Construction / turn readiness | Milestones, handover review, owner approvals, condition, pricing and media gates | Extend vacancy/rent-ready and maintenance areas; specialist execution remains in its owning app |
| Continuous servicing notes | Linked, attributed history and current commitments | An accessible context panel/drawer; do not replace the dashboard's analytical surface with a permanent notes rail |
| Unit marketing / media | Pricing basis, approved photos/files, readiness and per-channel status | Connected from vacant inventory and leasing funnel |
| Typed contracts / household capacities | Conventional lease, lease-option, CFD and effective-dated roles | Explicit at record/workflow drill-down and filters; the dashboard does not infer that every person is an obligor |

## Data and implementation findings that must be repaired without shrinking the design

- Empire's EnhancedKPIHeader explicitly creates random trend samples and uses assumed collection, delinquency and NOI ratios. Preserve those KPI **slots and decision purposes**, but replace the invented values with accepted data readers and actual history.
- Empire's VacancyHotspotsCard treats missing tenant/lease fields as evidence of vacancy. Replace that inference with verified occupancy/availability classification and a review state for unknowns.
- Several historical components coerce missing values into zero or present empty arrays as an all-clear. Preserve the visual structure and correct the semantics.
- Historical links include hardcoded demo IDs, obsolete paths and new-tab navigation. Preserve intended actions, repair their actual record identity and route behavior.
- Legacy Azure status labels do not authorize reintroducing Azure dependencies. Current Supabase-centered direction remains in force.
- Estate's `useDashboardData.ts` content was not returned as usable text by the file reader in this inspection. The page/component design is readable; its historical hook/runtime behavior remains unverified.
- A source file's claim of “live data” or “complete” is not proof that it was wired, populated, correct or running at export time.

These are reasons to repair the data/behavior underneath the original interface—not reasons to remove its charts, map or operational sections.

## Recovery sequence

1. Complete the information contract for D01-D20: decision, required fields, scope, period, source authority, unknown/partial state and linked action. This inventory is the starting record.
2. Compare the historical layouts directly. Use Estate's map/feed + financial/leasing + city composition as the strongest explicit page baseline; preserve Empire's additional operating modules and Altus's linked entity context. Treat that selection as a proposed recovery composition, not a claim that one build was universally the approved final version.
3. Produce the recovered dashboard review with a before/retained/improved checklist against this inventory. No section disappears because its data is not yet connected. Consolidation of a duplicate view must name where the capability remains accessible.
4. Add communication, notices, plan work and servicing controls inside that recovered structure. Keep the existing navigation unless an explicit change is approved.
5. After design approval, implement through narrow reviewed changes and connect each module to verified Supabase/API contracts. Prove data filtering, chart/table reconciliation, record actions, failure states and desktop/narrow behavior. No historical script or legacy provider wiring is automatically restored.

**Definition of success:** The dashboard is recognizably the richer original ECC work, with its information depth and visuals retained, and with better control over real operational workflows. A mostly empty queue page with three replacement statistics does not satisfy the requirement.
