# Card record availability — 2026-10-17

Base: main `5d9e0a95`. Bounded presentation cleanup; no data access, contract, backend, currency conversion or routing changes.

## Reachability

`src/App.tsx` imports the five `src/pages/card/{property,unit,lease,tenant,owner}/index.tsx` pages for `/card/{kind}/:id`. Each page mounts Overview and lazily imports Financials, Legal and Files. Property supplies no right rail; the other four define their rails inline using `RightRailPanel`. None imports the sibling `RightRail.tsx`. Those legacy components are dormant; the named insurance/mortgage documents were not mounted in the current application.

The five legacy rails nevertheless contained invented document filenames. They now state that a listing is unavailable, and their remaining placeholder promises use explicit unavailable copy. They remain dormant, without adding routes or fetching documents.

The mounted lease/tenant/owner Files and Legal tabs previously claimed `No files`/`No legal items` despite having no document/legal read. They now describe unavailable information. Unit Files, Legal and Financials plus the other Financials tabs similarly replace placeholders with the precise unavailable domain. Existing property tabs already used truthful availability copy and are unchanged.

Mounted unit Overview now shows the reported `unit_label`, and a linked property's ID when its name is not reported. Numeric beds/baths/sqft preserve finite nonnegative zero instead of using falsy defaults. Null, missing, negative, nonnumeric and nonfinite values stay unspecified. The current UnitCard parser admits only id/unit_label/status; measurements are not exposed by that contract today. The direct component regression verifies its fallback behavior without expanding the contract or claiming those values are presently supplied in production.

## Validation

- Three new render regressions: unavailable mounted tabs, no fabricated legacy documents, known zero versus missing/malformed unit measurements.
- Full unit suite: 280/280 passed.
- Typecheck: passed.
- Dependency checks: 16/16 passed.
- Guardrail and production build: passed; existing large bundle advisory remains.
- No new browser or published-runtime acceptance claimed. This copy/value handling change is verified through the actual component renders and build.

## Remaining boundaries

This is not an exhaustive card contract audit. Dormant Activity components still contain static empty-activity copy; none is mounted by the current card pages. No document/legal/ledger connection was enabled. Revert this commit to roll back presentation changes.
