# R1 UI recovery: Codex takeover and first implemented slice

Dion reassigned Grok's lane to Codex on 2026-10-13. Codex now owns PR130;
Claude retains operations on PR129. No external Grok execution is required.

## Delivered source behavior
- Property Financials now renders the current card contract's average monthly rent.
  Unknown remains unknown, real zero remains zero, and cents are preserved.
  No receipts, NOI, delinquency totals or transactions are inferred from rent.
- Property hero uses the same cents formatter and an explicit PropertyCardData type,
  replacing a rounded-dollar display and an any-typed input.
- Dashboard adds a keyboard-accessible table of reported occupancy observations next
  to its existing chart. Exact reported dates are preserved without time-zone shifts.
- Chart no longer claims a 30-day period when the source series can cover other dates.
- No new endpoints, contracts, credentials, dependencies or generated business values.

## Recovery provenance and decisions
| Evidence | Decision | Current implementation |
|---|---|---|
| AltusCommand3 src/pages/card/property/FinancialsTab.tsx and richer PropertyCard variants | Rebuild useful rental-summary presentation against current fields; reject unsupported cash-flow/receipt assumptions | src/pages/card/property/Financials.tsx; HeroBlock.tsx |
| Empire historical client/src/components/dashboard/modules/OccupancyHeatmap.tsx and dashboard chart modules | Recover accessible observation presentation; retain current validated series and chart | src/components/recovery/OccupancyHistory.tsx; current DashboardPage/Sparkline |

Original references are in the private ECC_Recovery_Source_Pack_R1.zip and retained
Dropbox exports. Raw source was not posted to public GitHub. Those source files are
design evidence, not proof of current endpoint or database behavior.

## Scope and remaining work
This is one bounded UI slice, not restoration of the full historical ECC. Remaining:
semantic comparison for other entity cards, verified linked-entity contract coverage,
full navigation restoration as working routes arrive, authoritative financial/operations
contracts, current-preview alignment and live-data proof. No unavailable backend is
represented as a usable feature. Existing access-denial/session safeguards remain.

## Validation
Local results: typecheck passed, 100 unit tests passed, 16 dependency tests passed, guardrail/build passed. Chromium and headless-shell installation both returned invalid ZIP responses; browser execution remains pending and is not claimed to pass. Tests exercise exact
cents, unknown vs zero, chart/table percentage agreement, missing history, keyboard
observation expansion and desktop/390px overflow. Browser responses are intercepted
fixtures: source/browser behavior proof only, not live-data acceptance.

## Rollback
Revert this UI slice. No database, runtime configuration or published release changes.
