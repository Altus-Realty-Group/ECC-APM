# Command Center visual review — R01

Isolated synthetic prototype. No operating records, accepted finance/location/leasing producer, authentication claim, production route, network API, mutation or vendor integration. The operating application does not import this entry.

The exact current Sidebar, WorkspaceBar and navigation registry are imported unchanged. A test-only in-memory router retains existing destinations without accessing operating APIs. The Command Center and a selected synthetic property Overview are implemented for review. Other destinations retain a return affordance; Financials/Legal have explicit missing-fixture states and are not claimed rebuilt.

All property names, counts, positions, financial periods and leasing examples are synthetic. The map is illustrative geography, not geocoding evidence. Dashboard summary reuses the accepted DashboardKpis type. Other data is explicitly a proposed presentation model. R03 fixtures are not adopted while their consistency corrections are pending.

Build separately: `ECC_COMMAND_REVIEW_OUT=/tmp/ecc-command-review-build npx vite build --config scripts/command-center-review-vite.config.mjs`. No production build/route configuration is changed. Review with the isolated config; never promote synthetic fixtures into production adapters. Source checks do not establish visual approval.

Codex internal review then Dion approval are required. Semantic colors: green positive income/profit, red negative net/adverse state, blue expense series and categorical market/stage colors with labels. Gold is a brand/selection accent; no orange.

## Property review extension - 2026-11-16

Map pin -> Open property card now opens a reusable `PropertyReview` component in the isolated memory router. It includes a schematic map/address view, unit selection, the unchanged four property-tab labels, and context-scoped Conversation/Work/History controls. Property action buttons open real local review forms. Purpose changes select the appropriate synthetic audience; a draft survives dock mode changes and record return while the harness remains mounted. Denied/pending modes remove record access and clear review drafts.

Drafts are memory-only review state, not implemented server persistence. Requests/notes are previewed, not stored in operating records. File selection displays names only: no bytes uploaded. Directions remains disabled without a verified address. Occupancy does not imply readiness. Existing production source, routes, adapters and navigation are unchanged.

Focused checks: six model/component tests pass, isolated TypeScript check and Vite build pass. Browser viewport/interaction review remains pending; no visual or live-data acceptance is claimed.
