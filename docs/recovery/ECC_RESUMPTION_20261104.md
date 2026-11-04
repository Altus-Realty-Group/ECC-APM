# ECC APM v1.0 recovery checkpoint - 2026-11-04

Source reviewed: main `8ccab7082b9dbf81f08209c95675f9f9c728a47d`.
Scope: M01 issue #198 audit reconciliation and next correction targets.
This checkpoint is not full campaign acceptance, runtime verification or activation.

## Recovered state

- GitHub has no open ECC frontend PRs at this observation. #190 and #195 are merged.
- CompanyWorkspace remains unmounted; merging its component did not accept a membership producer.
- `scripts/frontend-api-boundary.mjs:5` intercepts API/BFF requests with no-store 503 BACKEND_NOT_CONNECTED. Code synchronization cannot supply missing operating data.
- #199 retains protected-host A02 and connection A06 requirements; #201 retains U01 producer binding. Do not resurrect the conflicting #155/#156 stack wholesale.
- Ingestion commit `20cad7bd6139c930c6af85b671f1680787e2c816` records complete-or-fail list collection source acceptance. Its commit explicitly excludes live activation and identifies runner swallowed-failure receipts as follow-on. It is not fresh imported data proof.

## Correct the previous M01 report before using its targets

The issue198 CSV has 18 rows labelled implemented, nine placeholder and five hidden; its summary says 16/11/5. Neither classification is a reliable implementation census. Visibility, producer availability and implemented behavior are separate axes.

| Source | Verified behavior | Required disposition |
| --- | --- | --- |
| `src/pages/reports/Home.tsx:8` | Register selection and SelectedPortfolioReport | Existing functionality; external collection reads remain disconnected |
| `src/pages/reports/Create/index.tsx:8` | Query-selected layout, record preview and CSV export component | Existing functionality; verify template query variants separately |
| `src/pages/reports/Templates/index.tsx:6` | Real layouts link to create with template query | Local functionality; no membership/financial producer implied |
| `src/pages/reports/Saved/index.tsx:6` | Explicit unavailable persistent inventory and links to exports | Missing persistence, not a broken register or fabricated saved list |
| `src/features/communications/EmailTemplatesPage.tsx:61` | Tab-scoped drafts, JSON import and download; session clearing | Local functionality; no server save or delivery claim |
| `src/lib/recovery/operationsRegistry.ts:27` | All three domains unverified; loader refuses requests | Contract-gated legal/work/ledger views, not accepted operating records |
| `src/features/recovery/operations/OperationsRecoveryPage.tsx:45` | State renderer, per-domain reads and loaded-record filters | Preserve existing code; accept each actual producer before binding |
| `src/features/ownerTransfer/OwnerTransferPage.tsx:1` | Re-exports OwnerTransferUnavailable | Unavailable recovery route; do not describe old transfer form as reachable here |
| `src/features/owners/pages/OwnerTransferDetailPage.tsx:1` | Re-exports same unavailable component | Same containment applies to detail route |
| `src/features/admin/pages/AdminTransferManagementPage.tsx:1` | Re-exports same unavailable component | Same containment applies to admin transfer route |
| `src/features/admin/pages/AdminSyncPage.tsx:254` | Write buttons disabled; health read still present | Hidden is not authorization; source does not establish a live bypass |
| `src/features/admin/pages/AdminGeocodeManagementPage.tsx:53` | Geocode changes unavailable; audit read remains | Read/display evidence and server authorization need separate review |
| `src/pages/PropertyDetailPage.tsx:22` | Displays ID and 'Asset card will be rebuilt'; no record reader | Actual placeholder, misclassified as implemented in previous CSV |

`src/App.tsx` has 32 explicit routes plus a catch-all. The property detail route is not an alias of `/card/property/:id` today. The root is a redirect. Query variants do not add registered routes. CompanyWorkspace is not registered. Planned navigation entries are not implemented pages. This checkpoint corrects specific source claims; it does not certify every route/state or replace the complete requested inventory.

## Bounded next work, preserving existing workstream IDs

| Priority | Existing stream / issue | Concrete next outcome | Acceptance |
| --- | --- | --- | --- |
| P2 | M01 / #198 | Replace legacy property-detail stub with navigation to the existing property card, preserving ID and history semantics | Actual routed journey, invalid ID handling, Back control; no new data contract |
| P2 | M01 / #198 | Complete corrected route census with separate visibility/behavior/producer columns and source references | All 32 routes plus catch-all, aliases/query variants, precise current and historical proof |
| Release blocker | A02 / #199 | Reconcile retained protected-session bridge against current source and accepted identity contract | Current-session validation, scope, revocation, denial, no cached cross-context rows; source preparation before activation |
| Release blocker | A06 / #202 | Admit one accepted operational producer after A02 | Real resource IDs, receipts, scoped failures; links alone are not integration |
| Dependency | U01 / #201 | Bind company discovery/switch only after accepted membership producer | Separate person/customer/company grants; no denied-company disclosure |
| Dependency | U02 / #191; U03 / #192; U08 / #197 | Source-backed work, vendor and document/legal workflows | Accepted respective producers; no invented U09 or remapping U07 to work orders |

The full 97-capability campaign remains open. These targets do not replace it. No confirmed exploit severity is assigned from missing authorization evidence alone.

## Fresh local verification

Node 24.22.1; clean locked `npm ci --no-audit --no-fund` succeeded.

- `npm test`: 55 files, 380 tests passed, zero failed/skipped.
- `npm run test:dependencies`: 16 passed.
- `npm run typecheck`: passed.
- `npm run build`: guardrail and production build passed; existing large-chunk advisory and dependency annotation warnings remain.
- Existing workspace and command-center browser drivers attempted with `/usr/bin/chromium`; both failed before opening a page because Chromium process-singleton socket creation was forbidden by this execution environment. No fresh layout, interaction or screenshot acceptance follows.

Prior #195 fixture evidence at 390/1440 remains historical synthetic-browser evidence for its tested source. It is not absent geometry proof and is not shared-shell/live acceptance. Earlier broader route receipts also exist; the prior report's assertion that no other route was ever tested is incorrect.

## Change boundary and rollback

Documentation only. No product, dependency, workflow, backend target, session contract, schema, grants, provider, credentials, runtime process or deployment changes. Rollback: revert this documentation commit. Product corrections above remain proposed, not implemented by this checkpoint.
