# ECC full UI redesign: route scope and remaining product work

Owner: Codex. Date: 2026-10-27. Repository: Altus-Realty-Group/ECC-APM.
Dion expanded the assignment from dashboard recovery to redesigning all pages.

This inventory separates redesigned mounted surfaces from unbuilt product workflows. It does not turn disabled navigation into pretend working pages.

## Mounted surface scope

30 route patterns, 18 navigation destinations and 5 hidden routes. Every mounted route receives the shared workspace system. Record cards receive responsive tabs/body/rail, and error/invalid paths retain return controls and titles. Lists retain their existing filters and loaded-result semantics. Operations, reports, communications and systems retain their working contracts and controls.

| Route | Scope |
| --- | --- |
| / | Command-center landing redirect |
| /dashboard | Shared workspace, readable controls and responsive presentation |
| /data | Shared workspace, readable controls and responsive presentation |
| /ops/operations | Shared workspace, readable controls and responsive presentation |
| /ops/ai/vacancy-analytics | Shared workspace, readable controls and responsive presentation |
| /ops/ai/renewal-forecasting | Shared workspace, readable controls and responsive presentation |
| /ops/legal/case-manager | Shared workspace, readable controls and responsive presentation |
| /ops/maintenance/work-orders | Shared workspace, readable controls and responsive presentation |
| /ops/accounting/tenant-ledgers | Shared workspace, readable controls and responsive presentation |
| /portfolio/properties | Shared workspace, readable controls and responsive presentation |
| /portfolio/properties/:id | Shared workspace, readable controls and responsive presentation |
| /portfolio/units | Shared workspace, readable controls and responsive presentation |
| /portfolio/leases | Shared workspace, readable controls and responsive presentation |
| /portfolio/tenants | Shared workspace, readable controls and responsive presentation |
| /portfolio/owners | Shared workspace, readable controls and responsive presentation |
| /card/property/:id | Record layout, tabs and unavailable states |
| /card/unit/:id | Record layout, tabs and unavailable states |
| /card/lease/:id | Record layout, tabs and unavailable states |
| /card/tenant/:id | Record layout, tabs and unavailable states |
| /card/owner/:id | Record layout, tabs and unavailable states |
| /reports/create | Shared workspace, readable controls and responsive presentation |
| /reports/saved | Shared workspace, readable controls and responsive presentation |
| /reports/templates | Shared workspace, readable controls and responsive presentation |
| /ops/comms/templates | Shared workspace, readable controls and responsive presentation |
| /admin/sync | Shared presentation only; remains hidden; no new authority |
| /admin/geocode | Shared presentation only; remains hidden; no new authority |
| /admin/transfers | Shared presentation only; remains hidden; no new authority |
| /systems/integrations | Shared workspace, readable controls and responsive presentation |
| /owners/transfer | Shared presentation only; remains hidden; no new authority |
| /owners/transfer/detail | Shared presentation only; remains hidden; no new authority |

## Unbuilt page design and delivery inventory

40 destinations remain unbuilt/source-gated. Existing campaign work-order PRs below are targets, not claims that workers are running or implementation has landed. Proposed layouts are UI specifications, not invented API contracts. Each page needs its actual data and action contracts before it can replace its unavailable navigation entry.

| Page / route | Target PR | Full-page design direction / prerequisite |
| --- | --- | --- |
| Accounting: Overview (/ops/accounting/overview) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Rent Collection (/ops/accounting/rent-collection) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Expenses (/ops/accounting/expenses) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Financial Reports (/ops/accounting/financial-reports) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Collections Dashboard (/ops/accounting/collections-dashboard) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Collections Log (/ops/accounting/collections-log) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Payment Plans (/ops/accounting/payment-plans) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Deposits (/ops/accounting/deposits) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Transfers (/ops/accounting/transfers) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Subsidized Housing (/ops/accounting/subsidized-housing) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| Accounting: Assistance Programs (/ops/accounting/assistance-programs) | #174 | Account and period selector; reconciled totals above a transaction or balance table; source and closing status beside amounts; review/export actions. Money units and ledger reconciliation must come from the accounting owner. |
| AI Analytics: Risk Summary (/ops/ai/risk-summary) | #173 | Portfolio and period scope; observed metrics above explainable trends; linked supporting records; no prediction or score without a versioned source and coverage. |
| AI Analytics: ML Leasing Logs (/ops/ai/ml-leasing-logs) | #173 | Portfolio and period scope; observed metrics above explainable trends; linked supporting records; no prediction or score without a versioned source and coverage. |
| Legal Tracker: Advanced Legal Ops (/ops/legal/advanced) | #173 | Case status and deadline filters; case register with tenant, property, court and next date; evidence/document pane; review actions separated from filing or sending. |
| Legal Tracker: Legal Docs (/ops/legal/docs) | #173 | Case status and deadline filters; case register with tenant, property, court and next date; evidence/document pane; review actions separated from filing or sending. |
| Legal Tracker: Attorney Reports (/ops/legal/attorney-reports) | #173 | Case status and deadline filters; case register with tenant, property, court and next date; evidence/document pane; review actions separated from filing or sending. |
| Communication: Queue (/ops/comms/queue) | #173 | Channel/status filters; queue or delivery register; message preview and recipient details; explicit review before sending. Email only. |
| Communication: Logs (/ops/comms/logs) | #173 | Channel/status filters; queue or delivery register; message preview and recipient details; explicit review before sending. Email only. |
| Construction & Repair: Vendors (/ops/maintenance/vendors) | #173 | Property/status filters; work or asset register; responsible person, condition, dates and cost where reported; detail and evidence pane. No inferred completion or payment. |
| Construction & Repair: Materials & Inventory (/ops/maintenance/materials-inventory) | #173 | Property/status filters; work or asset register; responsible person, condition, dates and cost where reported; detail and evidence pane. No inferred completion or payment. |
| Construction & Repair: Smart Routing (/ops/maintenance/smart-routing) | #173 | Property/status filters; work or asset register; responsible person, condition, dates and cost where reported; detail and evidence pane. No inferred completion or payment. |
| Construction & Repair: AI Intelligence (/ops/maintenance/ai-intelligence) | #173 | Property/status filters; work or asset register; responsible person, condition, dates and cost where reported; detail and evidence pane. No inferred completion or payment. |
| Construction & Repair: Build/Repair Projects (/ops/maintenance/build-repair-projects) | #173 | Property/status filters; work or asset register; responsible person, condition, dates and cost where reported; detail and evidence pane. No inferred completion or payment. |
| Construction & Repair: Capital Projects (/ops/maintenance/capital-projects) | #173 | Property/status filters; work or asset register; responsible person, condition, dates and cost where reported; detail and evidence pane. No inferred completion or payment. |
| Reports: Reports Home (/ops/reports) | #175 | Layout/source/period controls; preview and source coverage; download actions; saved status only from a verified report store. |
| Growth: Marketing (/growth/marketing) | #173 | Campaign and period selectors; sourced activity and outcomes; campaign register; no invented conversion rate. |
| System: Automation (/system/automation) | #175 | Sectioned configuration with current state and documented effect; dirty/save/error states only after authorized persistence exists. Automation shows recorded schedules and runs. |
| System: Settings (/system/settings) | #175 | Sectioned configuration with current state and documented effect; dirty/save/error states only after authorized persistence exists. Automation shows recorded schedules and runs. |
| Data Management: Sync Audit (/data/sync-audit) | #175 | Entity/source/run filters; freshness and ingestion outcome; raw/staged/canonical lineage; run or record details. No successful-sync status inferred from an old receipt. |
| Data Management: Sync Management (/data/sync-management) | #175 | Entity/source/run filters; freshness and ingestion outcome; raw/staged/canonical lineage; run or record details. No successful-sync status inferred from an old receipt. |
| Data Management: Raw Data (/data/raw) | #175 | Entity/source/run filters; freshness and ingestion outcome; raw/staged/canonical lineage; run or record details. No successful-sync status inferred from an old receipt. |
| Data Management: Sync Logs (/data/sync-logs) | #175 | Entity/source/run filters; freshness and ingestion outcome; raw/staged/canonical lineage; run or record details. No successful-sync status inferred from an old receipt. |
| Data Management: System Settings (/data/system-settings) | #175 | Entity/source/run filters; freshness and ingestion outcome; raw/staged/canonical lineage; run or record details. No successful-sync status inferred from an old receipt. |
| Investor Portal: Dashboard (/investor/dashboard) | #174 | Investor-scoped portfolio and period; financial summary and traceable reports; asset detail; confirmed access scope required before any read. |
| Investor Portal: Portfolio Analytics (/investor/portfolio-analytics) | #174 | Investor-scoped portfolio and period; financial summary and traceable reports; asset detail; confirmed access scope required before any read. |
| Investor Portal: Financial Reports (/investor/financial-reports) | #174 | Investor-scoped portfolio and period; financial summary and traceable reports; asset detail; confirmed access scope required before any read. |
| Integrations: Dropbox Files (/integrations/dropbox) | #175 | Connection status and source freshness; supported read actions and linked records; provider-specific limits; no credential entry in public browser state. |
| Integrations: CoreLogic / MLS Grid (/integrations/corelogic) | #175 | Connection status and source freshness; supported read actions and linked records; provider-specific limits; no credential entry in public browser state. |
| Integrations: Field App Link (/integrations/field-app) | #175 | Connection status and source freshness; supported read actions and linked records; provider-specific limits; no credential entry in public browser state. |
| Integrations: Deal Room Link (/integrations/deal-room) | #175 | Connection status and source freshness; supported read actions and linked records; provider-specific limits; no credential entry in public browser state. |

## Command-center information architecture

Portfolio snapshot, current occupancy visual and dated history, operating health, financial performance, leasing pipeline, portfolio geography and priority work are visible decision areas. The existing summary can supply only properties, units, occupancy, 30-day revenue and occupancy observations. Current source supplies no verified cash-flow, collections, rent-ready, work-order priority, leasing funnel or location data. Those areas show unavailable values rather than synthetic charts.

Historical provenance: before 17b647f6, useDashboardData generated randomized cashflow90 and collection sparklines and fixed funnel values. The old richer page mounted map/action/financial/city components at 8ed250bc. These are layout references, not current operating truth. No historical sample value is restored.

Source blockers: scripts/frontend-api-boundary.mjs returns 503 for every API/BFF request in development and preview. The documented dashboard summary has no local server handler. Protected backend wiring, source mapping and ingestion repair remain separate campaign #171 requirements. This UI branch does not change that boundary, credentials, schema, operating data, deployment or provider activation.
