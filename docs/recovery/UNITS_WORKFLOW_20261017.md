# Units record review workflow - 2026-10-17

Repository: Altus-Realty-Group/ECC-APM (1058195656). Branch: codex/ecc-unit-workflow-20261017. Base: 1278ab2cff5a789b171155c594ec7f13252022f5.

## Operator and concrete defect

Altus property-management operators need to locate a unit, inspect its reported property/status/physical details and rent, open its unit card, and organize a temporary review. The mounted Units page read label/property_name/market_rent_cents while server/mappings.ts UnitOut declares unitLabel/propertyName/marketRent. The old page therefore dropped source fields and used the wrong monetary projection. Its shared command shell also displayed successful-looking counts during failures, accepted unsafe card IDs, and retained selections after failed cached refreshes.

This slice replaces only the Units presentation and its local helpers/styles. Existing useAllUnits, session epoch, StateNotice and routes are reused. Search/property/status filters use actual reported values. Missing fields remain explicitly unreported, finite nonnegative numeric values retain zero and fractional baths, and only positive safe-integer IDs open cards. No rent-unit conversion, inferred occupancy, aggregate rent estimate or fabricated property/status alias is added.

The responsive record grid exposes beds, baths, square feet and reported market rent. Local review has explicit select, Review/Follow up, remove and clear controls usable by keyboard or touch. It describes its visit-only scope; it does not save assignments or dispatch work. Filter changes, refresh, failure, denial, replaced source and session boundary clear selection/review. Full reload resets local review. Unknown/malformed/failed/refreshing reads show no counts or retained rows. Confirmed successful empty responses show a distinct zero/empty state.

## Dependency and state matrix

| Input/event                    | Canonical input                                | State owner                                         | Visible effect                                               | Persistence/downstream                    |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Completed unit collection      | Existing UnitOut API projection                | Existing useAllUnits; local projection              | Sourced unit/property/status/details/rent; loaded count only | Read-only existing collection/card routes |
| Search + property + status     | Operator filter; options from reported strings | Units ready view                                    | Intersection of filters; no-match/clear; review cleared      | None                                      |
| Select/stage/remove/clear      | Operator review                                | Source-bound Units state                            | Review list and explicit stage controls                      | Visit only; no work order/write           |
| Refresh/error/denial           | Existing query state                           | Presentation gate                                   | Records/counts/review removed until successful read          | No cached success reused                  |
| Replaced source/session/reload | Data identity; existing session epoch          | Source-bound selection; epoch key; ready-view mount | Old review cannot attach to reused unit IDs                  | No persistence                            |

No chart is added: source completeness and occupancy semantics are unverified. Backend/server mapping still has historical truthiness defaults (including marketRent fallback to zero) and unscoped reads; displaying a reported API zero does not validate its underlying database provenance. This patch does not activate or change that backend.

## Validation

- Seven new focused render/mapping tests passed: UnitOut projection, zero/fractional values, failure/denial/refresh/unresolved state, malformed success, confirmed empty, missing/malformed fields, safe IDs and reported-value filter intersections.
- Existing render regression fixture changed only its unit fields to the source-declared UnitOut shape; denial and populated-read assertions remain.
- Full typecheck passed; full unit suite 249/249, dependencies 16/16, guardrail/build passed. Build retains the existing large-chunk warning.
- Actual routed source in Chromium 153 at 1280x844 and 390x844 passed source fields, links/invalid IDs, intersecting filters/no-match/clear, select/stage/remove, source replacement with reused ID, refresh loading/clear, session reset, failed/denied/malformed/empty reads, keyboard focus, 44px targets and no horizontal overflow/page errors. API requests were only GET /api/portfolio/units with isolated response fixtures. No operating-data claim. Proof and inspected screenshots: /tmp/ecc-unit-workflow-proof.

No shared helper/shell, App/navigation, backend, authentication, Control Plane, Azure, environment, schema, vendor, dependency or workflow changes. No deployment or live writes. Rollback: revert this frontend/test/documentation commit; no database rollback.
