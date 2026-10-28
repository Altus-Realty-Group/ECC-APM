# Operator command center — 2026-10-28

## Operator job and implementation

Identify a reported leasing signal, inspect the records behind it, and open the source card before deciding what work to assign. No task assignment, notices, SLA, readiness or recovery completion is manufactured.

The landing page now combines a four-metric summary strip, occupancy ring and reported history, clickable lease-date windows, a reported-unit-status distribution, operational worklist links, and a searchable, paginated record-review queue. Graph selections focus the queue and filter its source records. Mobile rows stack with their action visible. Unsupported operating feeds are explained once in collapsed coverage details rather than rendered as empty chart panels.

## Source and calculation dependencies

| Surface | Source | Rule | Action |
| --- | --- | --- | --- |
| Properties, units, occupancy, revenue | `/api/dashboard/kpi/summary` | Existing summary adapter; cents and fractional occupancy unchanged; unknown is not zero | Portfolio review links |
| Occupancy ring/history | Validated summary occupancy and series | No implied occupied-unit count, dates or interpolation as source facts | Unit review; reported-observation disclosure |
| Lease horizon | `/api/portfolio/leases` | Unique valid card ID, explicit active status, valid reported end date; Central-time planning date; disjoint past / 0–30 / 31–90 / later cohorts | Select cohort, focus queue, review lease card |
| Unit distribution | `/api/portfolio/units` | Count loaded rows by exact reported label; missing remains distinct; no inferred vacancy or readiness | Select status, focus queue, review unit card |
| Queue | Same loaded collections | Search and pagination only change visible records; chart counts and summary totals stay unchanged | Card navigation, full review, retry |

Collection completeness and source freshness are not supplied by collection contracts. Collection counts are always labeled loaded rows. End dates are not notice deadlines or renewal predictions. Duplicate lease references do not contribute actionable horizon counts. Literal unit status `all` is distinct from the all-statuses selector.

Record-derived charts and rows disappear during refresh, failure, malformed collections and access denial. Explicit session changes reset queue filters and cancel/reject prior-session reads through the existing session scope. Summary transient-refresh retention keeps its existing explicit last-loaded warning; access denial hides cached values.

## Connection defect: source-confirmed, not repaired by this UI change

At base `042d588f94a856880b11fd6134189cbfb4ca3bae`, `scripts/frontend-api-boundary.mjs` is installed by `vite.config.js` and deliberately returns HTTP 503 `BACKEND_NOT_CONNECTED` for all `/api` and `/bff` traffic. Therefore copying main into Replit cannot supply operating data. The redesigned dashboard shows one actionable connection alert when this specific response is observed. Browser refresh cannot configure the connection.

An admitted, protected server connection must implement the summary and collection contracts and their card reads under the verified application/session identity. PR155 remains the separate protected-bridge proposal; this UI change does not admit that bridge, turn on an anonymous legacy API, expose database credentials, invent a proxy origin, deploy backend changes, activate imports or certify current DoorLoop data. A successful protected summary read, successful collection/card reads, access-denial checks and source freshness/lineage evidence remain required before calling the dashboard operational.

## Validation

- 351 unit tests passed, including exact 30/90-day boundaries, duplicate IDs, missing/literal status groups, cached-row suppression, scoped queue links and consolidated connection messaging.
- TypeScript check and production build passed.
- `ECC_BROWSER_EXECUTABLE=/path/to/chromium node scripts/verify-command-center-browser.mjs` passed at 1440px and 390px with isolated contract fixtures. Checks cover actual occupancy/chart geometry, chart-to-queue selection/focus, search/reset, status selection, 25-row pagination, card navigation, paused refresh, denied cached data, malformed/empty collections, session reset, one unconnected alert, no document overflow, no uncaught errors and no API writes. All external network requests are blocked by that driver.
- Loaded/unconnected desktop/mobile screenshots were inspected. Fixtures are test inputs only and are never installed in the application as operating data.
- The provided live preview redirected this review browser to Replit's private-app sign-in wall. No live data or live UI acceptance is claimed. No runtime restart or publication performed.

The all-route browser driver now checks the new queue heading and delegates the superseded dashboard-expiry journeys to the focused command-center driver. Other route functionality is not changed by this PR.

## Rollback

Revert this PR's frontend commit. No data migration or operating-record rollback is involved.
