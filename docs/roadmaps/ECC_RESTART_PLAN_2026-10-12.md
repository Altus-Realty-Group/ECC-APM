# ECC Restart: Source Findings, Cleanup Plan, and Development Sequence

Date: 2026-10-12
Owner: Dion DePaoli
Repository: Altus-Realty-Group/Replit_Front_End_ECC
Source baseline: main at 50ea0bd10a26566ce007e68fc56e8ae977a5924a
Status: PROPOSED EXECUTION ADDENDUM. Source review completed; runtime, deployed database, and vendor state unverified.

## Executive decision

Resume ECC as the daily property and asset operating command center defined by the existing master plan. Preserve useful implementation, repair the foundation in bounded slices, and defer any rewrite decision until the inventory establishes what can be retained.

ECC should turn company growth into controlled operating capacity: every material exception has an asset, verified facts, an accountable person, a due date, an authorized action, and evidence of resolution.

The billion-dollar ambition is a business outcome. A page count or integration count is not progress toward it. Define whether the target means owned asset value, assets under management, enterprise value, or another measure before assigning numerical growth targets. Meanwhile prioritize cash collection, occupancy, service delivery, operating margin, and reliable acquisition-to-operations handoffs.

The existing canonical master plan, docs/roadmaps/ECC_SUPERIORITY_IMPLEMENTATION_MASTER_PLAN_V1.md, remains the strategic direction. This document supplies the current recovery evidence and a practical implementation sequence. It does not certify production readiness or authorize financial cutover.

## 1. What was actually inspected

Read the three supplied shared-source files; current repository metadata, main branch, root directories, open PR collection, open issue collection, recent Actions runs and the failed proof job steps; AGENTS.md; current and historical roadmaps; component adoption plan; organization document; selected contracts; package.json; Vite configuration; App, active Sidebar, navigation configuration, dashboard, Properties page, Property Card entry; server/index.ts, server/db.ts, and supabaseGuard.ts.

Applied skills: canonical state reconciliation, repository safety, UI direction, Supabase architecture, and test-gap review.

This was a targeted source audit, not an exhaustive repository or security audit. The recursive full-tree request failed; directory reads supplied the reviewed inventory. No environment-file values were read. No package installation, local build, live API request, live schema audit, browser audit, vendor call, migration, deployment, or credential change was performed.

GitHub reports:
- repository active, not archived, public;
- main last commit dated 2026-09-28, concerning deferred proof/CodeQL runs;
- latest repository push dated 2026-10-02;
- 26 open PRs and no standalone open issues in the returned complete 26-item issue collection;
- latest inspected proof-pack run failed; Verify and CodeQL passed for the same PR head, 85d72f40c6c200657b28e065c8acbb525bdcb15b. Those are PR-source results, not main or runtime acceptance.

## 2. Findings and their operational consequence

| Priority | Source evidence | Finding | Required correction |
| --- | --- | --- | --- |
| P0 | server/index.ts, maintenance and accounting handlers | Maintenance returns constructed work orders. Accounting generates transactions using dates and Math.random(). | Remove synthetic business records from executable operational paths. Missing contracts must produce honest unavailable states, not fabricated records or false empty portfolios. Verify whether these handlers are reachable in the deployed system. |
| P0 | server/index.ts owner-transfer authorize handler; server/lib/supabaseGuard.ts | Authorization handler assumes a request is authorized if it reaches the handler. Its guard checks environment presence, not identity or permission. Actor IDs arrive in request bodies. | Trace all earlier mounts and middleware, establish the actual server owner, and prove server-side authorization for approve/authorize/execute. Block privileged actions until proven. This is a source defect, not a claim of a verified live exploit. |
| P0 | server/index.ts debug SQL handler | Request-supplied SQL reaches an exec_sql RPC after a starts-with-SELECT check; no identity gate is evident at this registration. | Determine reachability and inherited middleware. Retire or explicitly restrict diagnostics on the authorized backend. Test negative access without issuing sensitive live queries. |
| P0 | root listing; PR #104 | Tracked environment files, package cache and uploaded/generated artifacts remain on main. | Refresh the existing hygiene branch and verify removals against current references. Inspect historical exposure through a redacted scan. Current file contents and usable-secret status were not independently assessed here. |
| P1 | AGENTS.md versus server/, ecc-functions/, Vite proxy | Frontend ownership is declared, but server and Azure Function code coexist. Vite targets a staging Azure host rather than the locally launched API. | Produce route-to-backend ownership and environment maps; locate the active canonical backend using consumers and deployment evidence. Do not infer ownership from folder or repository names. |
| P1 | portfolio contract versus server/index.ts | Contract requires raw arrays; reviewed server handlers emit data/meta envelopes. Missing configuration handling also differs. | Trace the actual frontend resolver and reachable handler, agree one versioned contract, then fix the owning implementation and consumers with compatibility tests. |
| P1 | .github/workflows/ci-proof-pack.yml | Python dictionary uses undefined null. Scan rejects normal terms such as adapter, endpoint and supabase, including documentation. Typecheck/build return codes are recorded but not used as final failure conditions. | Correct proof generation and checks without weakening protected surfaces; test syntax, failure propagation, PR-head identity, and artifact availability on failures. Confirm run logs before attributing the observed failure to a single cause. |
| P1 | package.json and verify.yml | No typecheck, lint or test script is declared; optional tests can be skipped. Guardrail/build do not prove server correctness. | Establish explicit relevant checks with a recorded existing-debt baseline. Do not report absent checks as passed. Preserve release proof and meter CI spending. |
| P1 | src/App.tsx, src/components/Sidebar.tsx, src/config/navigation.ts | Active Sidebar has its own NAV and does not consume the claimed navigation source. Multiple active-sidebar links have no matching App route, including accounting, legal and work orders. | Unify route/navigation ownership, test every visible link, and remove misleading actions until their workflows exist. |
| P1 | active Sidebar | useRef is called inside NAV.map; expandable rows use clickable divs and flyouts depend on mouse hover. | Extract stable row components and support keyboard/touch operation with accessible state and focus behavior. Prove behavior on desktop and mobile. |
| P1 | dashboard and property-card entry | Missing revenue and card counts default to zero. | Preserve null/unavailable versus confirmed zero; display freshness, completeness and source. Reconcile headline metrics with scoped source records. |
| P1 | Properties page | Developer language such as Type A zoning and resolver descriptions is exposed in product copy. | Use task-oriented operator language, compact readable layouts, explicit next actions and honest error states. |
| P2 | README and organization document | README mainly describes archive extraction. Organization document declares tools/layout not established by reviewed package and active imports. | Replace unsupported claims with current setup, scope, commands and evidence; classify historical material instead of indiscriminate deletion. |
| P2 | property-card entry; PRs #106/#107/#110 | Numeric property routes and dormant/contract-dependent integration work require canonical identity mapping. | Plan staged UUID identity with explicit legacy/external mappings; never cast or fabricate a UUID. Resume existing integration lanes after contract verification. |

Other source observations: BFF mounting and auto-sync are disabled by testing-era constants/comments in server/index.ts; duplicate installPropertyRoutes imports require an explicit server check. Tenant enrichment performs per-tenant reads; request amplification is a performance hypothesis to measure, not a proven production bottleneck.

## 3. Existing work disposition

No existing PR is accepted merely because it is old or green. Recheck diff, current main, contract, CI and business effect.

| PRs | Recommended disposition |
| --- | --- |
| #104 security/artifact hygiene | First cleanup candidate. Preserve branch, refresh against current main, verify references and redacted scans, distinguish snapshot removal from history cleanup. Archive retention requires explicit disposition. |
| #111 database architecture | Retain standard and explicitly unverified inventory. Fix proof workflow before claiming ready. This PR is policy installation, not database audit. |
| #106 Control Plane | Resume this retained lane; dormant consumer is not a connection. Read current CP contracts and prove backend/session/navigation ownership before binding. |
| #107 and #110 PI handoffs | Compare and consolidate complementary requirements into one accountable identity/consumer lane after reviewing full diffs. Preserve unresolved dependencies. |
| #81, #83, #84, #88, #98 product work | Compare each against current source and desired workflows. Retain useful deltas; watch #84 for loss of data/error behavior. Reimplement only what remains necessary. |
| #77, #82, #97 governance/tooling | Check for already-superseded policy and workflow overlap before adoption. |
| #78 task/prospect scaffolding | Defer unless it delivers persistent real tasks; disabled commands are not operational completion. |
| #70 Replit sync monitoring | Do not adopt its stale Replit-authoring/direct-main push model. Current direction is GitHub source, controlled runtime synchronization. |
| #64, #67, #71, #72, #76, #89-#94 dependency updates | Reconcile duplicate Playwright proposals. Refresh compatible groups; isolate major router/build changes. Evaluate current official compatibility and security information during execution. |

Closing, merging or deleting any existing work is a separate execution action. This addendum only recommends disposition.

## 4. Cleanup plan and bounded delivery units

| Order / work unit | Deliverable | Acceptance gate |
| --- | --- | --- |
| C0 Evidence baseline | Complete route/capability registry; imported versus unused files; caller/handler/database map; backend identity; runtime branch/SHA; migration and vendor ownership inventory | Every primary screen classified by observed maturity. Unknowns have named discovery steps. Runtime and database claims remain separate from source claims. |
| C1 Repository hygiene | Refresh #104, preserve originals/required business evidence, exclude caches/generated files; classify archives and obsolete scripts | Current main references and build checked; redacted scan; no accidental loss; rollback documented. No history rewrite bundled. |
| C2 Trust and authorization | Synthetic-data removal and privileged-route containment on their verified owning surfaces | No fabricated business data; denied anonymous/ordinary-user access; approved owner/dev behavior; idempotency, replay and audit proofs for sensitive commands. |
| C3 Build and CI reliability | One supported package-manager path, explicit checks, functioning proof artifacts, bounded workflows | Install/guardrail/build/typecheck and selected tests truly execute; failed checks fail the job; exact source head identified; no duplicate expensive fan-out. |
| C4 Frontend integrity | Canonical navigation, reachable routes, stable sidebar hooks, operator copy, null/zero/source states, coherent response adapters | All visible links resolve; loading/empty/stale/partial/denied/error/retry states; mobile and keyboard journeys; no charts scroll or clip. |
| C5 Current operating record | README, capability register, architecture record, ADRs, integration inventory and current backlog | Unsupported historical claims classified; current evidence linked; retired Genesis/Altus Core terminology not treated as active architecture. |
| C6 Controlled preview baseline | Aligned authorized preview with real supported read paths and recorded business journeys | Exact SHA/process proof; list -> property -> unit -> lease -> tenant/owner works; counts and amounts reconcile to approved sources. |

Prepare C0 and safe C1/C3 documentation independently while backend/runtime discovery proceeds. Backend repairs belong to the verified backend owner; discovery must not silently turn this frontend repository into a new backend authority. Use one root PR per bounded lane, current dependencies and exact-head review. Do not build a large stacked ladder.

## 5. Development plan after foundation

| Release | Operator outcome | Scope | Completion evidence |
| --- | --- | --- | --- |
| D1 Daily operational pilot | Dion and operators can find an asset, see priority exceptions, assign responsibility and track resolution | Verified portfolio/entity relationships; persistent task/exception queue; owner/due date/status; delinquency, vacancy, lease deadlines and evidence gaps where approved sources exist | Real pilot records; persistence after reload/account change; source reconciliation; no false zero/empty state; assignment and resolution audit |
| D2 Complete one high-value workflow | One daily process runs from intake to documented completion | Select maintenance resolution or delinquency follow-up using frequency, failure cost and available contracts; approvals, retries, escalation, communications receipts | Human journey including duplicate submission, interruption, denial, conflict and failure recovery; measurable cycle time and completion |
| D3 Unified asset operations | Relevant evidence and operational history stay with the asset | Property/unit/lease/tenant/owner context; governed documents; legal deadlines/evidence; construction and field references | Required records reachable from asset context; immutable IDs/versions; authorized delivery; relationship and scope proof |
| D4 Acquisition-to-operations continuity | Closed assets enter management with approved economics and evidence | Deal Room closing intake; Price Engine baseline/snapshot; onboarding tasks; accepted construction/field handoffs | Versioned sender/receiver contracts, canonical IDs, receipts, reconciliation and safe replay; no sibling copy becomes truth |
| D5 Financial oversight and shadow reconciliation | Executives and accounting can trace cash, charges, reserves and statements | First surface approved existing financial truth; then separately designed ledger/subledger, bank reconciliation and close in shadow mode | Money units/provenance; reversals and period controls; three approved consecutive reconciled closes before authority changes under existing master-plan gate |
| D6 Controlled scale and independence | Portals, automation and vendor replacement extend proven workflows | Tenant/owner/vendor portals; permission-scoped commands; approved automated actions; capability-by-capability vendor cutover | Isolation tests, service/recovery targets, audit reconstruction, pilot acceptance and tested rollback |

Bring legal evidence and financial read-only visibility forward when they are part of the selected daily workflow. Do not wait for a complete ledger replacement to make ECC useful. Public portals, payment authority and vendor cutover follow the corresponding evidence and approval gates.

Calendar estimates follow C0 and the reproducible build baseline. Assign effort and dependencies to individual work units; do not promise a complete property-management replacement by an arbitrary deadline.

## 6. Apply current Altus standards by surface

- Data: database first, approved API fallback second, calculation last; distinguish observations, overrides, calculations and historical snapshots. Do not hide permission/schema failures behind fallback.
- Architecture: reuse approved entities/relationships before new tables; internal UUIDs and explicit external mappings; maintain architecture record in every model/query/cache-changing PR. Verify actual project/schema/RLS/migration state before DDL.
- Access: Dion is the sole Admin under current direction; no public invitations or backup administrator inferred. Control Plane owns central access. Ordinary ECC access and central-admin access are distinct.
- Development: retain a bounded, explicit developer bypass during development as Dion directs. Do not make it a publication handcuff or impose fresh MFA per app by default. A local bypass never grants central admin authority, financial authority or paid-provider permission. Verify the current CP session policy before implementation.
- UI: black, white and gold with readable neutrals; no orange or gold body copy; success/profit green, error/loss red, targets gold. Dense operator tables, progressive disclosure, 44px touch controls and keyboard operation. Tables may scroll; charts must fit their containers.
- Files: app-owned hierarchy under Altus App Folder; database owns document identity, permissions, versions and delivery status; immutable originals and versions, verified Dropbox delivery and authorized references. Obtain the current repository-owned storage specification; do not migrate historic folders as part of policy adoption.
- Integrations: consume current owner contracts; no assumed shared database, event bus, credential bridge or copied admin console. Paid Property Intelligence requests stay manual and budget governed until expressly enabled.
- Communications: email only under standing direction; M365 actions use approved server integrations and explicit authority. Existing roadmap SMS references do not enable SMS.
- Financial/legal: exact money handling, source-to-output reconciliation, immutable posted history, reviewed legal templates, appropriate disclaimers, forward-looking statements and all-rights-reserved notices in external outputs.
- Proof: source, CI, database, deployment and browser acceptance recorded separately. Regression tests target actual failure risk. Test fixtures may simulate cases; fabricated business records must not enter operational displays or production paths.
- Cost: bounded jobs, cancelled superseded PR runs, preserved main/deploy proof, no unnecessary matrices, no uncontrolled provider polling.
- Handoffs: a GitHub comment is not delivery to Claude or Grok. Future assignments require an explicit handoff channel/prompt and receipt; do not claim an agent started without evidence.

## 7. Scale scorecard

Define metrics from approved records, with owner, denominator, exclusions, time basis, source, refresh policy and reconciliation checks.

First operating scorecard:
- collection rate and aged receivables;
- vacant-unit days and days to lease;
- overdue/unassigned exceptions and approval age;
- maintenance resolution time, reopened work and evidence completeness;
- net operating cash and operating margin by approved scope;
- onboarding completeness and time from closing to ready-for-operations;
- legal deadlines with complete service/evidence;
- statement/reconciliation exceptions and close duration.

Business outcome measures: managed/owned assets under the selected definition, recurring management revenue, contribution margin, operating capacity per team member, acquisition conversion and return of approved investment baselines. Targets come from measured baseline and Dion's growth strategy; no invented current portfolio counts or billion-dollar projections.

## 8. Immediate next execution

1. Complete C0 inventory and verify current backend/runtime ownership.
2. Refresh retained hygiene work and produce the smallest CI correction independently.
3. Repair source-backed false data and permission gaps in their actual owning lanes.
4. Prove portfolio navigation and source truth in the aligned preview.
5. Choose the first operational pilot and publish a bounded D1/D2 backlog.

Planning owner: ChatGPT in the ECC lane; product decisions: Dion. Implementation assignments are unissued at this stage. No Claude/Grok worker is assumed to be monitoring this PR.

This planning change is documentation only. Reverting this addendum removes the proposal without altering runtime, database, authentication, providers or deployed behavior.
