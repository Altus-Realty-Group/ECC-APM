# ECC U06 operator cockpit — operator language and KPI proof

**PR:** #195  
**Branch:** codex/ecc-u06-operator-cockpit-20261101  
**Head:** after this commit  

## Change
Provenance note now uses operator language: Revenue (30d) is reported revenue, not net operating income or collected cash. Missing occupancy history is unavailable, not a trend. Work orders, invoices and reconciliation are not available until their sources are connected. Implementation vocabulary (“cents”, “producers”) removed from the operator-facing note.

## Proof
- KpiCard renders reported revenue and keeps missing unknown (not $0.00).
- Occupancy fraction renders as percent, not a count.
- Dashboard source contains verified drilldowns (Review properties, Review leases).
- Typecheck pass.

## Limitations
- The earlier CSS-loader blocker is resolved: the existing test runner already imports tests/unit/register-css.mjs. Codex added six actual DashboardView mounted tests in dashboard-view-mounted.test.tsx, using the existing renderer, an isolated router and a labelled ResizeObserver/zero-size host-box double.
- Mounted proof covers reported values/history-table observations, missing versus zero, partial/loading/empty/error states, cached-data suppression on denial, stale/failed refresh and refresh callbacks/disabled state. It does not prove SVG geometry or real browser layout: the zero-size box deliberately supplies no chart measurement.
- Direct command: node --import tsx --import ./tests/unit/register-css.mjs --test tests/unit/dashboard-view-mounted.test.tsx. The normal npm run test:unit entry already supplies this CSS hook.
- 390px viewport resize remains unsupported. Source CSS is not measured acceptance.
- No live data.
- The requested visual/workflow redesign remains unfinished; these tests resolve a proof gap rather than certify U06 complete.

## Rollback
Revert this commit on the branch.
