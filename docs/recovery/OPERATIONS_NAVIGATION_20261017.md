# Individual operations read workflows - 2026-10-17

Branch: codex/ecc-operations-navigation-20261017.
Base: existing PR147 head 7d55e996d0135dacda60c710a38ffcb44aeb73ec.

## Operator and implementation

Altus Property Management operators need to find the case, repair or lease requiring follow-up, review its recorded context and avoid confusing missing records with an empty workload or zero balance. Failure costs include missed court follow-up, unresolved repairs and incorrect financial conclusions. These are frequent read workflows; actions and persistence remain outside this source slice.

The single navigation source now links Case Manager, Work Orders and Tenant Ledgers to their individual route entries. Only those three destinations leave the planned inventory. Their components reuse OperationsRecoveryView, the existing strict parsers, session-scoped query options, domain notices and OperationsViews tables. The original /ops/operations page retains all three domains.

Each individual page mounts only its own domain. Unverified contracts remain unverified and make no request. Availability notices do not mean the workflows are operationally complete. No endpoint, authorization, business payload or calculation contract changed.

Legal/work-order pages offer loaded-record search and recorded-status selection once validated data exists. Filtered-empty copy differs from verified source-empty copy. Unknown statuses remain selectable as Unknown. Ledger search selects matching lease groups, preserving ALL loaded entries of each matching lease so searching a memo never produces a misleading partial balance. The view explicitly states that balances cover loaded entries only. No lease-derived payment assumptions or writes are added.

## Input dependencies

| Input/event | Source/state | Visible effect | Money/persistence |
|---|---|---|---|
| Route/domain | Registered route, page prop | Only own query and table mount | No mutation or new source |
| Search | Local user input | Loaded case/work rows; whole matching ledger lease groups | Existing ledger amounts unchanged |
| Status | Loaded recorded values, local selection | Legal/work rows intersect search | No inferred active/open classification |
| Clear filters | Local user action | Restores all loaded records | No request/write |
| Denial/session boundary | Existing shared query/session layer | Existing denial/cleared/loading states replace records and controls | No retained prior-account data |

## Validation and limits

- Full typecheck passed.
- Unit suite: 159 passed, 0 failed/skipped (20 files). New route/domain tests cover exact registered routes and navigation ownership, removal from planned inventory, own-domain-only query mounting, unavailable versus confirmed-empty states, search/status behavior and full-lease ledger filtering. Existing observer tests cover denial, shared purge, session epoch and late responses.
- Build/guardrail passed. Existing large-chunk advisory remains.
- Local Chromium 153 at 1280x844 and 390x844: all three direct routes rendered their own gate and title, one domain section, no table, no API requests, no page errors or horizontal overflow.
- Separate isolated browser component harness mounted the real OperationRecords and parsers with test-only fixtures after loading the actual Vite module. Both widths passed search, intersecting status, filtered-empty, clear recovery, keyboard input-to-select focus, >=44px input/select dimensions and no page overflow. Fixtures were not written into application source or activated in contracts.
- Browser harness initially failed because the optimized CommonJS module requires its default export, then an exact label lookup exposed a status-control name issue. The select now has an explicit accessible Status name; deterministic ID-based rerun passed. These earlier failed attempts are not counted as passing proof.
- Shared installed dependencies/browser were reused locally; no lockfile, dependency, CI or runtime configuration changed. Local test proof is separate from exact-head hosted CI.

No published runtime, protected operating backend, live data journey, write, financial completeness or production acceptance is claimed. Current backend/schema discovery belongs to the parent integration lane. Rollback: revert this source slice; no database rollback.
