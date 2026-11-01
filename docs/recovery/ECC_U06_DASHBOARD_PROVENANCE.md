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

## Codex integration: source-backed review actions
Added two explicit review controls in CommandWorkSurface: active loaded leases from past end through90 days, and loaded units missing reported status. Each selects the existing tab/filter, clears search, resets paging and requests focus on the record queue. Counts derive only from accepted loaded-row helpers; unavailable/refreshing sources disable the controls without substituting zero. Existing record links, figures, date semantics and source contracts are unchanged.

Added responsive feature-local action layout and explicit gold focus-visible styling. Mounted tests activate both controls, check matching record links/filter values, search reset, focus/scroll requests through a labelled host double, epoch reset and suppression during refresh. This is behavior proof, not measured browser geometry.

Local Playwright was available, but Chromium was absent. Installing its headless shell failed because the downloaded archives were empty/truncated (invalid ZIP); no browser measurements or screenshots are claimed. No dependency/lockfile change was made. Desktop/390px browser acceptance remains open for a working browser environment.

## Hosted browser acceptance wiring (Codex)
The existing Verify job gains a PR-only, path-scoped browser step for dashboard/shared rendering dependencies and its proof files. It builds a test-only entry importing the actual DashboardView and canonical styles, with explicitly labelled synthetic records and no auth/API/provider calls. It checks390px/1440px chart geometry, page overflow,44px controls,90/91-day record boundaries, unit-status filtering, keyboard/focus, refresh suppression, denied-cache and missing-value states. Receipts record tested/source SHAs and screenshots; they do not certify live data, the shared app shell or backend authorization.

Spending: existing pull_request and main-push triggers and one Verify job remain; no new jobs, schedules, matrices, required-check name or vendor calls. Browser work runs only on relevant PR diffs, never on the matching main push. Estimated incremental1-2 runner minutes per relevant PR (planning estimate, not measured usage),30 such PR updates about30-60 minutes/month; existing job cap10 minutes and browser step cap3 minutes bound execution. Images/receipt retain7 days. No production credentials, deployment or sync changes. Before acceptance require the current-head hosted browser result; missing tools or failed downloads must fail, not skip a needed proof.
