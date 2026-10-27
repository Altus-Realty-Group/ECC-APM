# ECC workflow recovery: accounting and investor reporting

Campaign: #171. Assigned implementation owner: Grok, explicitly selected by Dion. Status: WORK ORDER ONLY; implementation not started/accepted. Start UI foundation first; other drafts are queued.

## Outcome and inventory
Accounting Overview; Tenant Ledgers; Rent Collection; Expenses; Financial Reports; Collections Dashboard/Log; Payment Plans; Deposits; Transfers; Subsidized Housing; Assistance Programs; Investor Dashboard/Portfolio Analytics/Financial Reports.

## Owned surfaces
Dedicated accounting/investor frontend modules; existing tenant-ledger presentation; finance-specific tests

## First delivery
Establish endpoint/field/money-unit/actor-scope evidence before implementation. Investor scope is a separate gate. Never infer balances from rent or build a financial ledger from incomplete collections. Start only a source-backed read workflow.

## Coordination
Codex owns App.tsx, src/config/navigation.ts, shared resolvers/contracts/session/http/query infrastructure, PR170 vacancy, PR166 Scheduler review and PR155/156/backend connection. Submit exact route/navigation patch requests; do not edit these concurrently. Source inspection is allowed. Claude owns DoorLoop repository implementation. No cross-repository code changes by Grok.

## Boundary
This PR begins as a work order. Before adding product code, choose one coherent primary behavior and record exact files, budget, dependencies and acceptance. Remaining destinations stay tracked here and roll into named child PRs; do not implement this entire inventory in one diff. Soft budget20 files/500net lines; review rollover before40files/1000lines or a third outcome. Preserve all existing work and reuse current implementations.

## Proof and authority
GitHub canonical; database truth then API fallback then calculation. Black/white/gold; no orange, fake records/metrics, guessed units or fabricated backend routes. Contracts and access proof required; fixtures are isolated tests only. Desktop/mobile human journeys, reload, denial, session replacement and failure recovery required where relevant. No new services/dependencies/workflows unless reviewed. No merge, deployment, live write, schema/access/secret change, provider calls or sending communications. Existing backend dependencies do not become ready through frontend completion.

Return exact head SHA, changed files, relevant commands/results, browser text evidence, source-vs-runtime limits, dependencies, rollback and next slice. Lane integrity PASS/FAIL and deviations required.
