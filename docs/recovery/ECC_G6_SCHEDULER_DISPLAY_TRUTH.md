# ECC-G6 / G7 Scheduler Display Truth

**Repository:** Altus-Realty-Group/ECC-APM (ID 1058195656)  
**Base:** main `c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e`  
**Branch:** `grok/ecc-scheduler-display-truth-20261017`  
**Scope:** Mounted Scheduler panel on `/systems/integrations` only.

## Producers read (no contract changes)
- `server/routes/syncHealth.ts` emits `enabled` (boolean), `intervalMinutes` (number), `nightlyFullHourUtc` (string|null), `status.next_run_at` (stored observation).
- `server/routes/admin/sync.ts` emits `scheduler.enabled`, `scheduler.intervalMinutes`, `scheduler.fullSyncHourUTC`, `scheduler.nextRun` (calculated as now + interval — an estimate, not a stored schedule).

## G7 corrections
- Cached admin scheduler values are suppressed whenever the admin read is pending, fetching, errored, or denied.
- Health display is suppressed while the health read is unsettled (existing early return plus adapter).
- Admin status query is scoped by a revision and session epoch. The credential is never part of the query key. Token changes cancel and remove the previous key so late responses cannot land in the new scope.
- Next Run is displayed only from the stored health `status.next_run_at`. The admin estimate is never relabeled as an observed schedule.
- Preferred explicit null/malformed values are preserved and do not fall through to fallback.
- Timestamps must be timezone-qualified (Z or ±hh:mm).

## Prior rules preserved
- Missing/malformed → “Not reported.”
- Explicit `false` → Disabled.
- Midnight `0` / `"0"` → `00:00 UTC`.
- Interval must be positive finite; no invented `10`.
- Hours outside 0–23 rejected.

## Evidence
Unit tests cover the query/adapter/display boundary: cached failure/denial/pending/refresh, stored-versus-estimated next run, false/null/zero, malformed preferred no-fall-through, and timezone-qualified timestamps. Source/test fixtures are not application defaults.

## Out of scope
Server producers, shared portfolio resolvers, authentication, Control Plane, backend targets, schema/data, workflows, dependencies, unrelated pages. No live scheduler activation claimed.

## Rollback
Revert this branch.
