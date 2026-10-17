# Dashboard workflow presentation - 2026-10-17

STATUS: SOURCE VERIFIED; BROWSER AND LIVE ACCEPTANCE PENDING.
Repository: Altus-Realty-Group/ECC-APM (1058195656).
Branch: codex/ecc-dashboard-workflow-20261017.
Base: bfe9540b7c0058e7368838117679b17ccc04e54a.
This document is committed with the implementation; its containing commit is the
exact source revision for this receipt.

## Operator and design decision

Product/brand: ECC - APM / Altus black, white and gold.
Primary operator: Dion and authorized property-management operators.
Job: assess the available portfolio summary and open the records required for
further review. The current source cannot establish an exception queue, assigned
tasks or action counts, so none is invented.
Decision: which recorded portfolio area should be reviewed next, with what
confidence in the source figures?
Required information: reported properties, units, occupancy, 30-day revenue,
reported occupancy history and update/availability state.
Next action: Review properties; secondary links open leases, owners or Operations.
Failure cost/frequency: daily use; missing/stale values must not imply a healthy
portfolio, and source failure must not strand the operator without navigation.

Pattern: EXTEND the existing dashboard state model and KPI/history presentation;
INTRODUCE only a page-scoped context/workflow layout. Existing app shell and
registered routes stay authoritative. No source/API/adapter boundary changes.

## Implementation trace

App.tsx /dashboard -> DashboardPage -> unchanged useDashboardKpis ->
GET /api/dashboard/kpi/summary -> unchanged normalizeDashboardKpis ->
deriveDashboardStatus -> DashboardView -> KpiCard / OccupancyHistory -> Sparkline.
Query/cache, same-session refresh semantics and session protections are unchanged.

The dashboard used to return only a notice on initial load/failure. It now keeps
one Dashboard title, source status, primary Review properties link and purposeful
lease/owner/Operations links in every state. Read failures show no KPI/history.
Successful reads use a compact four-metric strip and a history/workflow layout,
without decorative metrics, mock task counts, empty side rails or extra routes.
Failed refreshes retain earlier figures with an explicit warning; denials hide
cached values and observations. Operations link copy describes availability and
does not claim its three source-gated domains have been activated.

Existing KPI, timestamp and state test IDs are retained. Source freshness is
present during initial loading/failure as unconfirmed, rather than being absent.
Ready state adds an ordinary Refresh figures button, disabled while fetching.
Failures preserve existing Retry controls. Both call the same existing refetch.

## Dependency matrix

| Event/input | Canonical source | State owner | Calculation/presentation | Summary/chart | Persistence/downstream |
| --- | --- | --- | --- | --- | --- |
| Initial load / refresh | Existing summary API; underlying database/live route not verified | Existing dashboard query | Existing adapter validates counts/cents/fractions; null stays unknown | Same source properties/units/occupancy/revenue | No new writes; existing query cache |
| Occupancy observations | Existing validated series array | Existing dashboard query | Existing fraction x100 formatting | Existing single gold occupancy series and accessible dated observations | No forecast or inferred observations |
| Timestamp | Existing lastUpdated / lastUpdatedProblem | Existing status helper | Existing freshness classification | Visible fresh/stale/unknown/invalid/future copy | No new clock or stored value |
| 401/403 | Existing read failure | Existing status helper | Suppress retained source values | No KPI/history; context and links remain | No auth or session modification |
| Refresh failure | Earlier same-session query result | Existing status helper | Explicit last-loaded warning | Earlier source figures are labeled retained | No new persistence |
| Workflow link | Registered App.tsx destinations | Existing router | Navigation only | Properties/leases/owners/Operations | No new routes or operational writes |

Chart purpose: review changes in reported occupancy before inspecting properties.
Source: summary series; one gold line; null/absent series gives an explicit no-data
message. Existing observation table provides exact dates/percentages without
color dependence. No attempt to reconcile occupancy against absent unit cohorts
or infer missing observations. Headline occupancy and history remain independent
source observations; no invented equality or aggregate is asserted.

## State and validation proof

11 new static render tests passed, covering loading, 503, contract failure,
401/403 with retained cached data, unresolved read, confirmed zero, missing
values/history, full values/history, stale/invalid/future times, failed refresh
and replacement of source metrics plus series. All tests keep exactly one main
page title, source context and the four registered workflow destinations.
Exact cents/fractions and source observation dates are asserted. Existing full
render tests also pass, including prior dashboard coverage and denial tests.

- Full unit suite: 163 passed, zero failures/skips.
- Full typecheck: passed.
- Guardrail and production build: passed; existing large-bundle advisory remains.
- git diff --check: passed.

Responsive source rules: four metrics desktop/two below 580px; history/workflow
columns collapse below 900px; primary action fills narrow width; source text wraps;
all page links/buttons have a 44px minimum target and visible gold focus rings.
Existing history disclosure has a 44px target. Body/metadata text uses readable
white/neutral tones; gold is limited to primary action, focus and chart emphasis.
No orange, no new dependencies and no shared CSS selectors were introduced.

LIMITS: Render tests are fixture/source evidence, not browser interaction or real
operating data. Chromium download availability was unresolved in this environment;
no new desktop/mobile screenshot, measured layout/touch targets, keyboard journey,
console/network run or live endpoint acceptance is claimed. Refresh/persistence
uses the existing query behavior; real refresh/session/reload acceptance remains
pending. Parent must review at 1363px and 390px and validate the actual source
binding before release. No deployment/publication is part of this lane.

## Scope and rollback

Changed only DashboardPage.tsx, dashboard-workflow.css, focused render tests and
this proof. No App/sidebar/navigation registry, backend/auth/schema/environment,
API transport, dependency, lockfile or workflow change. Revert this commit to
restore the earlier dashboard presentation; no data rollback is needed.
