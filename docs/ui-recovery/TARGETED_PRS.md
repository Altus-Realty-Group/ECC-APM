# ECC targeted recovery PRs — revision 2

Execution scope for the whole-app recovery plan. These are bounded future PRs unless an existing number is given. Owners are assignment proposals, not claims that external agents have started. Prompts are supplied to Dion separately in chat; do not create assignment-only PRs, comments, monitoring or scheduled jobs.

## Mandatory boundaries for every slice

- Navigation unchanged: sidebar groups/labels/icons/order, visible/unavailable state, routes/redirects, page switcher and existing card/matter tab arrays. Read-only inspection of `src/App.tsx`, `src/config/navigation.ts`, `Sidebar`, `WorkspaceBar` is allowed; mutations require separate Dion approval.
- Codex owns final visual direction and integration. Claude/Grok deliver bounded source, structures, evidence or advice. Codex reviews appearance, information density and interactions before showing a slice to Dion. Dion retains final approval.
- No developer essays, raw diagnostics or collections of explanatory text boxes. Use short business labels and accessible “i” help; essential error/action/period/units stay visible.
- Altus shell black/white/gold; charts use semantic and distinguishable categorical colors. Green profit/positive cash flow, red loss/adverse variance, accessible blue/teal/purple series; never an enforced grey/gold palette. No orange. Signs/labels/patterns also communicate meaning.
- Isolated synthetic fixtures are for design review only and carry a permanent review label. No fixture route or record enters production adapters/builds. No real vendor call, live SQL/grant/schema, credential, deployment, publish or external communication.
- Reuse accepted contracts. Unsupported prototype feeds are explicitly proposed presentation fixtures; they are not accepted server contracts or evidence of operating data.
- One coherent push after focused checks. No repeated CI runs or unrelated dependencies. Required checks remain intact.

## First wave: start in parallel

| Slice / owner | Concrete PR | Permitted source scope | Deliverable / exit |
|---|---|---|---|
| R00 / Codex | Update existing #248: full plan revision 2 | `docs/ui-recovery/**`, linked roadmap index; inventory/review scripts and their tests only | Incorporate all three reviews and current Dion decisions; source plan stored, no UI approval implied |
| R01 / Codex | Clickable Command Center visual prototype | Isolated `design/command-center-review/**` or existing test-only browser harness; no production route or adapter | Full original visual composition, exact existing navigation, synthetic review label, desktop + 390px, meaningful colors, useful filters/drilldown. Show pixels before expanding specs. First Dion visual gate |
| R02 / Claude | Repair unit/lease card field delivery contract | `src/shared/card-contracts.ts`, narrowly scoped unit/lease reader mapping seam in `src/lib/ecc-resolvers.ts` if justified; focused contract tests and binding sheet. Producer/server source read-only initially | Reproduce unit `label`/`unit_label`, lease `rentCents`/`rent_cents` and date stripping against actual source; define exact accepted compatibility mapping, null/currency/date behavior. No CSS, page layouts, routes, broad passthrough or server activation |
| R03 / Grok | Typed review fixtures and metric consistency | New `tests/fixtures/ui-recovery/**`, focused fixture/metric tests, compact fixture contract reference; read existing L1/L5/L6/D1/dashboard contracts | Deterministic populated/zero/unknown/disconnected/denied/long-content sets; current summary shape exact; unsupported visual feeds explicitly proposed; consistent counts, money, dates and identities. No JSX/CSS/UI edits, provider calls or production fixture binding |

The current #247 source recovery remains held. Do not merge it simply to obtain empty chart frames. Reconcile its useful changes against the R01 visual decision; retain or supersede source deliberately without deleting its history.

**Immediate daily journey:** Command Center signal → existing Properties/Units or Leases/Tenants destination → card → relevant existing tab/source → return. Ownership/agreements is the third first-release journey. Actual usage-frequency analytics have not been observed.

## Next bounded slices, released by evidence

| Slice / owner | Targeted PR | Scope and value | Dependency / exit proof |
|---|---|---|---|
| R04 / Claude | Source-only bounded core-capture readiness/proposal in the existing ingestion repository | Inspect existing `doorloop-sync-backend` #102 and installed capture evidence; reuse, do not duplicate. Identify exact account/resource admission and durable bounded invocation/Working reconciliation gaps | Confirm current repo/base/head/AGENTS first. No collector enablement, live calls, SQL or resource admission. Report concrete missing contract; implement only a separately bounded source proposal if authorized. #102 identity probe is not a completed core sync |
| R05 / Codex | Accepted Command Center implementation | `src/features/dashboard/**`, existing chart primitives and scoped tests | After R01 Dion acceptance/explicit deferral. Restore agreed CC01–13; per-panel LIVE/DESIGNED PENDING/DEFERRED decisions; same loaded source behind chart and queue; no all-empty-frame release |
| R06 / Codex | Five portfolio register recovery | Existing `src/pages/portfolio/{Properties,Units,Leases,Tenants,Owners}.tsx` plus shared table styles/primitives and tests | R01 baseline and R02/reader contracts as needed. Preserve all current navigation. Loaded/disconnected views, filters/search/sort/rows/card return; no fake local tasks |
| R07 / Codex; Claude supplies field mapping | Property and Unit card interiors | Existing property/unit hero/rail/body modules and tab contents; shared CardShell presentation only where tab behavior unchanged | Preserve exact mounted tab arrays. Data bindings signed off; no new tabs or redirects. Existing Files/Legal areas designed synthetically, real activation waits for R11 |
| R08 / Codex; Claude supplies field mapping | Lease and Tenant card interiors | Existing lease/tenant card modules; actual terms/parties/ledger sections inside existing tabs | R02 exact rent/date/identity proof; no finance/history invented; all parties visible; downstream source links remain correct |
| R09 / Codex; Claude supplies ownership associations | Ownership register/card and agreement/documents content | Existing Owner destination/card/tab content and property Files content | Verified ownership/company association and exact D1 property links. Store management agreement once. Current folder hierarchy and navigation preserved |
| R10 / Grok review; Codex integration | Reusable InfoHint, semantic chart and responsive state checks | New pure shared help/chart contracts or test harness; reusable tests; Codex owns final JSX/CSS/placement | Hover+focus+tap and Escape; visible essential data/errors; color contrast/labels/patterns; desktop and 390px. Full shared-pattern matrix once, no duplicated thousand-row approval burden |
| R11 / Claude | Legal/document protected read binding source | Existing #245 / L4/D1/A1 sources and accepted per-binder seams; no UI, authority invention or mounting | Reconfirm existing heads; public-only unmounted reader is insufficient. Accepted authority producer + verified identity joins + real store/provider/document/legal/browser transport binders. Final authorization, pinned exact version and restricted metadata boundaries proven before live delivery |
| R12 / Codex | Native Legal register/matter content recovery | Existing legal register/card components and their current nine tabs | Preserve L1/L5/L6/D1/L4 semantics; distinct timeline/court/audit responsibilities; R11 before real files/packet delivery; no false approval/balance/deadline |
| R13 / Codex; Claude supplies domain contracts | Operations, posted ledger and work-order review | Existing Operations/work-order/tenant-ledger destinations; no new detail routes without separate navigation approval | Real sources, canonical links, useful visual queues. Native legal replaces no separate parallel legacy producer. No payment processing or automatic assignment |
| R14 / Codex | Renewal/vacancy/reporting/communications interiors | Existing destinations only; split into independent PRs by workflow when ready | Current date/status review and CSV/draft behavior retained. New prediction, save/PDF/send requires real accepted source/writer; no navigation activation |
| R15 / Codex; Grok audits | Whole-app regression and release review | Evidence/review records and scoped fixes; not a blanket redesign | Codex internal visual pass → Dion complete-slice approval → independent real-data acceptance. No publish merely because CI is green |

R06–R09 may prepare pure data/fixture structures in parallel while the visual gate is pending. They do not establish competing page styles or replace operating pages before that shared design is accepted. Recovery/consolidation and later feature expansion stay separate PRs.

## Metric decisions to lock before real binding

| Metric | Contract decision | Required challenge |
|---|---|---|
| Occupancy | Occupied eligible units / eligible unit denominator; explicitly unknown/excluded units. Dashboard fraction and card percent map explicitly | Active lease count cannot silently become occupied-unit count. Current historical card definition must be reconciled before binding |
| MRR | Known nonnegative monthly contract rent from explicitly active leases in the stated scope, with currency and partial coverage | Not collected cash, NOI or whole-portfolio revenue merely because some rows loaded |
| Award count | Distinct award identity; verification and known monetary amount are separate conditions; joint obligors do not multiply an award | Unknown amount vs recorded zero; multiple awards per matter; wrong-matter/duplicate conflicts |
| Profit/loss | Reviewed same-period, same-currency, same-accounting-basis income and expense observations | Green positive net; red negative net; labels/signs retained; expense alone is not automatically a loss |

## Review package for each complete slice

1. Codex rejects bad hierarchy, clutter, dead actions, confusing colors and developer prose before Dion review.
2. Present complete desktop/390px flows with realistic, clearly labelled synthetic data and working interactions, plus a short live/pending/deferred panel list.
3. Show design proof separately from actual-data reconciliation; no unsupported “working” claim.
4. Full state/security/money matrix belongs to shared patterns or independent high-risk boundaries. Reused page patterns receive representative checks plus unique behavior tests.
5. Retain every source object/disposition in the inventory. Time-box archive review; do not let forensic completeness prevent the first useful visual gate.

No dates or recurring reminders are created by this worklist. No external worker is started by a row in this file.
