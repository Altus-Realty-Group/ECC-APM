# Historical ECC recovery matrix - 2026-10-16

Scope: the owner-supplied Software Dropbox folder, current ECC-APM main bfe9540b and the published desktop audit in PUBLISHED_AUDIT_20261016.md. Historical files are evidence and reuse candidates, not current instructions, credentials, data authority or deployed-functionality proof. No archive scripts, dependency installers or destructive restore commands were executed.

## Discovered source sets

| Set | Location below /Altus Corporation/Software | Discovery / inspection |
| --- | --- | --- |
| EmpireCommandCenter1 | ECC Reload/EmpireCommandCenter1/EmpireCommandCenter | Expanded source and248,039,351-byte outer ZIP found. Inspected frontend, backend and documentation subarchives; no need to execute the original app. |
| EstateCommand2 | ECC Reload/EstateCommand2/EstateCommand | Expanded source and832,641,388-byte ZIP found; inventoried371 src entries; inspected122-member compact backup. |
| AltusCommand3 | ECC Reload/AltusCommand3/AltusCommand | Expanded source and43,456,488-byte ZIP found; inventoried194 src entries and13 client/src entries; inspected17-member navigation recovery ZIP. |
| ReplitFrontEndECC | Command Center/Clean Up/Replit Repo For Chat GPT/Replit_Audit_Folder/ReplitFrontEndECC | Expanded source and1,457,359,136-byte ZIP found. Exhausted two pages of src inventory:607 entries. client/src listing failed; no completeness claim for that subtree. |
| Earlier UI milestones | Command Center/Clean Up/ECC v2/Replit File Milestones | EstateCommand nav-pane-v2 ZIP860,200,553 bytes; EstateCommand22 ZIP1,075,929,514 bytes; ReplitFrontEndECC nav-pane-v3 ZIP577,412,284 bytes. Located, not fully downloaded/inspected. |
| V5 handoffs | Command Center/V5/V5 Zip File Clean Up | Inspected Core Handoff, Frontend Hardening Kit, DoorLoop API/Schema Pack. |
| V7 specifications | Command Center/V7 Improved | Roadmap, component guide, backend playbook and federated-contract files located; not promoted to current authority. |
| Other requirements | Source Files; Chat Source File Dump; Command Center root | ECC roadmap/command-surface/card specs, recovered charter ZIP, nav_tree_v3.csv and Triage Center Map.xlsx located. |

Directory listings above exhausted their cursors where marked inventoried. Keyword searches were supplemental and are not claimed as exhaustive proof of every nested backup. The whole multi-gigabyte archive collection has NOT been fully inspected; scope/coverage are explicit.

## Download evidence

Eight selected archives downloaded read-only. Sizes and Dropbox block hashes were verified; no raw archives or secret-bearing members are copied into GitHub.

| Archive | Bytes | SHA256 |
| --- | ---: | --- |
| ECC_Frontend_V3_20250815_1756.tar.gz | 538378 | 2e3b9e6152f7210a19ed3fc2fff2bb01d38835d3f42bc02e52e087d11842a629 |
| ECC_Backend_API_20250815_1756.tar.gz | 183645 | 31f90efcfd1daee5a4752ea841dc3d4953ebba24fff8677cd66a4a413008021a |
| ECC_Documentation_20250815_1757.tar.gz | 614182 | db992387088f933ad26d5fcd832740fd695a22048aa17816d714fe3e99535c03 |
| estate_backup_20250829_073941.tgz | 358403 | 43fe6f3bce0cda94bdc537575029184a9d9181bccaa3eef76d6bbcc0804b3c87 |
| ECC_Core_Handoff_2025-10-31.zip | 68289 | 19bdacc2a0d6f096703306761f881b68b1d6053d9133e9d64a0f5794fe80e8fd |
| Replit_Frontend_Hardening_Kit_2025-10-31.zip | 6200807 | f21301061fc054c0c5a8b5f0da53eb08d74fb0d7d63c4b67ad55c07286fdbcc0 |
| DoorLoop_API_and_Schema_Pack_2025-10-31.zip | 413295 | f867cedede594a7589143638b17423352b3a6d14e25ef6f7b5bbb6a9990e924f |
| ECC_Nav_Hubs_v2_FullRestore.zip | 8522 | 6199a28c478e01b3ea542ba1e833e18c01bd6034d2e8d155e8183a1d27b0aced |

Frontend archive:359 total members,319 inspected source/document members in the scoped review. Archive/member counts do not imply backend correctness or live function.

## Restoration decisions

Paths below are client/src/pages members in the frontend archive unless specified otherwise. Rebuild means preserve the user journey and selectively reuse presentation while establishing current contracts and safeguards.

| Feature / source | What actually exists | Decision and next implementation |
| --- | --- | --- |
| OwnerStatements.tsx | Month/owner selection, detail, real PDF blob download, email/generate POSTs | Rebuild statements read/detail/verifiedPDF first; remove fixed2025 month options; separately authorize email/generation. |
| RevenueSummary.tsx; CashFlowForecastPage.tsx | Revenue city/bedroom charts, actual/expected reads, forecasts/variance, financial-PDF response download | Recover charts/export; distinguish actual recorded income from forecasts; reject malformed/missing values rather than zero. |
| LedgerPage.tsx; LedgerControlPage.tsx | Per-lease read/summary plus charge/payment reads and adjustment dialogs | Rebuild recorded per-lease ledger; reject fabricated pending adjustments/audit totals and log-only financial writes. |
| ExpensesReviewPage.tsx; DepositsPage.tsx | Expense/deposit reads and review UI | Recover reads; approval/reconcile commands are TODO/console and must be implemented separately. |
| CollectionsLogPage.tsx; CollectionsPage.tsx; PaymentPlansPage.tsx | Action log and collection reads; some event POSTs | Restore scoped logs/read views; payment events do not prove an enforceable payment schedule. Notice/eviction actions are not functional. |
| LegalCasesPage.tsx; EnhancedLegalCasesPage.tsx; LegalCaseDetail.tsx | Lists, filters, calendar, detail/edit, staged import, PDFs, field-task sync | Rebuild list/detail first, then import/documents/audited commands. No name-based authority joins or verbose data logs. |
| LegalAdvancedOpsPage.tsx; DocumentTemplatesPage.tsx | Compliance reads, document generation, escalation, templates/upload/preview | Recover template library and case documents; legal writes and AI suggestions require verified authority/provider contracts. |
| CommunicationTemplatesPage.tsx | Merge fields, edit/save/delete, preview and test-send | Recover email templates/preview/logs; check HTTP errors, storage/versioning and send authority. Do not restore SMS. |
| WorkOrdersPage.tsx; MaintenancePage.tsx | Work lists/stats/status/priority/search, create/detail/update | Rebuild read/detail vertical slice; restore correct zero-cost semantics and explicit completion confirmation. |
| VendorsPage.tsx; CapitalProjectsPage.tsx | Trade/project filters, statistics, property/vendor links, real form POSTs | Recover verified reads then writes; preserve existing product ownership and contact-data scope. |
| FieldRoutingPage.tsx; SmartFieldRoutingPage.tsx | Technician/day plans, unassigned work, optimize/apply requests | Recover planning/assignment view; dispatch is a separately governed write. |
| field/MaintenanceIntelligence.tsx; MaintenanceIntelligencePage.tsx | Rule forms/inventory, thresholds, duplicate/predictive dashboards | Recover persisted rule inventory; do not equate an AI-labeled screen with verified inference/scheduler behavior. |
| InventoryPage.tsx | Category/stock/usage, QR scan/use/create/label requests | Recover inventory workflow against established Field App ownership and idempotent quantity writes. |
| SubsidizedHousingPage.tsx; RentalAssistanceProgramsPage.tsx | Program/tenant/inspection lists, filters and create/update forms | Substantial missing workflows; recover shared program model and inspection records before activation. |
| Historical navigation/card hubs |48 URLs, card/tab hierarchy and three-column layout intent | Recover information architecture. The nav ZIP contains no operations implementations; its card overviews are placeholders/example KPIs. |

## Explicitly reject as working implementations

ExpensesPage and BudgetManagementPage generate random data. BalanceAgingPage randomizes overdue days. ReserveThresholdPage invents reserve/cash values. ForecastingPage assumes expenses at30% and mock seasonality. RuleEngineePage, AutomationPolicyPage and AuditVisibilityPage contain mock rules/permissions and log-only changes. AutoReconciliationPage has local/log-only commands. OwnerPortfolioOverview invents owner/properties/charts. InvestorReports hardcodes acquisition/rehab/appreciation/date and has a console-only export; InvestorPortal uses a demo identity. Estate Reports Generate/Export displays toasts without generation or download. Recover their requirements, not their fabricated behavior.

## Backend and schema caveats

The API/Schema Pack manifest is dated2025-08-12 and declares69 tables and16 views. It includes lease_payments/lease_charges/lease_credits with amount_cents and lease_id_dl. Historical tasks use provider relationships (*_id_dl), unlike assumptions of internalproperty_id/cost fields. get_full_work_orders_view and normalized_work_orders are literal TODO SELECT views, not real read implementations. Historical leases contain primary_tenant_id/rent_cents/deposit_cents and disagree with portions of current source schema. These are historical definitions, not evidence of today's deployed database or grants. Current database verification precedes adaptation; no new schema is invented from page expectations.

## Proposed restoration order and ownership

1. Codex: published/source alignment; remove hardcoded mounted owner records; fix actual mounted lease fetch/error handling; Integrations crash; DataHub read/write separation; approved protected backend connection.
2. Claude: PR146 caller/malformed/truncation corrections; contain arbitrary privileged RPC dispatch; actual actor-to-record scope; authoritative work orders/vendors read contract.
3. Grok: portfolio truthfulness and card completeness; dashboard action recovery; full desktop/mobile UX audit.
4. Codex report slice: owner statements read/detail/PDF and saved-report workflow, using real recorded inputs.
5. Claude accounting slice: recorded per-lease ledger/collections; legal case list/detail/document contract as a separate slice.
6. Grok subsequent UI slices: work orders/vendor consumers, email template/log/preview and housing/assistance views after contracts exist.

External assignments require manual handoff and acknowledgement; this document does not claim those agents are running. Source and disposable tests are not operational acceptance. Keep all unfinished features in the completion ledger until their full journey is proven, rather than treating a hidden route or disabled label as done.
