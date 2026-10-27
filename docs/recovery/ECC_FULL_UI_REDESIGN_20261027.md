# ECC workspace and command-center redesign - 2026-10-27

Repository: Altus-Realty-Group/ECC-APM (1058195656).
Branch: codex/ecc-full-ui-redesign-20261027.
Base: 573778d61990b6771cdd41241031f478689d0da2.
The commit containing this receipt identifies its source. Source-only UI delivery;
not a completed data restoration, deployed release or full product implementation.

## Operator and scope

Dion uses ECC daily to assess portfolio health and open the property, tenancy,
financial or operating records behind a decision. Failure costs include missed
vacancies, false financial confidence, missed deadlines and loss of record context.
The redesign extends existing routes/components, with one shared black/white/gold
workspace system. No orange or generated operational data.

The mounted app receives a narrower sidebar, contextual workspace bar and page
switcher, consistent readable controls/tables/notices, keyboard focus and skip link.
Home now opens the command center. The switcher derives available destinations
from the canonical navigation registry, excluding all hidden/unbuilt destinations.
No new admin authority or unavailable route is exposed.

Command center restores visible decision areas: four reported summary KPIs,
occupancy position and a legible historical chart with percentage/date axes and
accessible observations, operating health, financial performance, leasing,
portfolio geography and priority work. A failed read no longer removes the whole
information architecture. Unavailable or denied values remain unknown; old cached
figures and plots are suppressed after denial. Historical randomized cash flow,
collection sparklines and fixed funnel counts are not restored.

Portfolio lists receive consistent headings, controls and tables, retaining search
and loaded-result semantics. Five card types receive responsive KPI rows, bordered
field groups, scrollable section controls, responsive detail/rail layout, explicit
unavailable titles and existing return links. Unit/lease/tenant overview money uses
the existing cents formatter instead of rounding component inputs to whole dollars; reported zero
counts stay visible in owner overview. Related-property counts are labeled loaded
links, not full-portfolio totals. Data Hub receives separate explorer and owner
search workspaces. Saved Reports replaces its misleading blank stub with truthful
storage availability and links to existing layout/preview/export workflows.
Operations, legal, work orders, ledgers, vacancy/renewal review, email templates,
report creation/layouts and systems inherit the workspace design while preserving
their existing controls/contracts. Hidden recovery/admin routes remain hidden.

## Source trace and dependency matrix

/dashboard -> DashboardView -> unchanged useDashboardKpis ->
GET /api/dashboard/kpi/summary -> unchanged normalizeDashboardKpis and
DashboardStatus -> KpiCard, OccupancyPosition, OccupancyHistory/Sparkline.

| Event | Canonical source / state | Summary and visual effect | Persistence / downstream |
| --- | --- | --- | --- |
| Load/refresh | Existing summary API / session-scoped query | Counts/cents/fractions retained; occupancy chart uses the same supplied series as observation table | Existing query cache only; no writes |
| Unknown value | Missing/null validated source field | Unreported tile, no zero or invented plot | No inferred records |
| Zero | Valid reported zero | Zero counts, 0.0% or $0.00 | No changes to source |
| Summary failure | Existing failure classification | Decision panels remain; source figures unavailable | Existing Retry; no new fallback source |
| Refresh failure | Existing same-session retained result | Last-loaded figures explicitly labeled | Existing cache rules |
| 401/403 | Existing denial/purge protections | Retained numbers and chart observations suppressed | No auth change |
| Operational/financial detail absent | No current verified reader | Cash flow, collections, readiness, pipeline, locations and priorities unavailable | No invented API or inferred business values |
| Page switch | Canonical implemented navigation registry | Correct existing page / section context | Existing router; no data mutation |
| Search/filter/card section | Existing page state | Existing rows, loaded totals and selected record sections retained | Existing session behavior; no new persistence |
| Record money | Existing cents fields | Existing formatCurrencyFromCents preserves cents, zero and unknown | Display formatting only; no calculations or ledger changes |

The current validated LeaseCard payload supports rent_cents. UnitCard and
TenantCard do not promise rent/balance fields, and OwnerCard does not promise
portfolio totals. They remain unreported on the mounted routes; the component
formatting tests do not prove that those fields exist in the API. No schema was
extended to accept unsupported figures.

Occupancy position is a fraction, not a count of vacant or rent-ready units.
The historical chart is bounded 0-100%, with dates, percent ticks, distinct gold
series and an exact observation table. The current headline and historical points
are independent supplied observations; no forecast or artificial equality is
asserted. Cash-flow income/expense/NOI and leasing conversions are not plotted
without their source records.

## Validation

- 333 unit tests passed across 46 files, including denial suppression, unknown vs
  zero, exact money, stable loaded summaries and navigation exclusions.
- Full typecheck passed.
- Guardrail and production build passed. Existing large-bundle advisory remains.
- git diff --check passed.
- Manual actual-page browser proof: all 30 registered route patterns at1440x900
  and390x900, including unavailable/recovery paths, each with one page heading,
  no document/content/main overflow, no page exceptions and no non-GET API calls.
- Loaded journeys at both widths: command-center values/history/disclosure,
  visible chart geometry, denial after success, page switching, all five loaded
  card types and keyboard section switching, three list searches/clear and stable
  loaded lease summaries. Local desktop/mobile screenshots inspected.
- Earlier expanded portfolio regression driver passed180 checkpoints at1280/390,
  including card returns/invalid paths, all record sections, list filtering and
  cached-denial behavior. Subsequent presentation corrections are covered by the
  committed workspace browser driver.

The browser proof uses isolated test responses on loopback, blocks external
traffic and all API writes, and is not live data/auth/provider/DB proof. No fixture
is installed in an operating service. Screenshots are local QA evidence, not
financial records. Run node scripts/verify-workspace-browser.mjs with a compatible
ECC_BROWSER_EXECUTABLE. It starts its own127.0.0.1 host unless ECC_BROWSER_BASE is
provided; ECC_BROWSER_SCREENSHOTS selects local QA output. Default runs the full
route sweep; ECC_BROWSER_ROUTE_SWEEP=0 repeats loaded workflow checks only.
No workflow/job, browser download, dependency or lockfile was added.

## What is still incomplete

The supplied private Replit preview redirected this browser to Replit sign-in.
No live preview acceptance is claimed. Source API/BFF boundary still returns503
because its backend is not connected. It has not been bypassed. The current
summary endpoint has no local server handler; real backend contract/auth/mapping
and ingestion freshness remain campaign171 requirements. No operational cash-flow,
collections, readiness, funnel, location or priority source is established here.

The full route inventory and design/delivery directions for40 unbuilt destinations
are in docs/work-orders/ECC_FULL_UI_REDESIGN_20261027.md. Those destinations are
not implemented or activated by this UI change. Existing target work-order PRs
173/174/175 are not proof of running workers or completed capabilities.

## Scope and rollback

Frontend presentation, formatting, tests, manual browser proof and documentation.
No API transport/target, session/auth, backend, schema, Supabase configuration,
secrets, operating data, provider activation or deployment/workflow changes.
Revert the UI commit to restore previous presentation; no data rollback required.
