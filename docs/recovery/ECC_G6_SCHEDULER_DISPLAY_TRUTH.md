# ECC-G6 Scheduler Display Truth

**Repository:** Altus-Realty-Group/ECC-APM (ID 1058195656)  
**Base:** main `c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e`  
**Branch:** `grok/ecc-scheduler-display-truth-20261017`  
**Scope:** Mounted Scheduler panel on `/systems/integrations` only.

## Producers read (no contract changes)
- `server/routes/syncHealth.ts` emits `enabled` (boolean), `intervalMinutes` (number), `nightlyFullHourUtc` (string|null), `status.next_run_at`.
- `server/routes/admin/sync.ts` emits `scheduler.enabled`, `scheduler.intervalMinutes`, `scheduler.fullSyncHourUTC`, `scheduler.nextRun`.

## Display rules
- Missing or malformed values show “Not reported.”
- Explicit `false` remains Disabled.
- Midnight `0` and `"0"` display as `00:00 UTC`.
- Interval must be a positive finite number; no invented `10`.
- Hours outside 0–23 rejected.
- A present but malformed preferred field does not fall through to an older source.
- Explicit null is Not reported, not Disabled or an invented date.
- Failed/denied health reads never reach the panel (existing early return); helper treats null sources as Not reported.
- Next-run date is never invented; only a valid timestamp is shown.

## Evidence
Unit tests cover missing, malformed, explicit false/null, midnight, invalid hours/intervals/dates, preferred-field no-fall-through, and producer-compatible values. Source/test fixtures are not application defaults.

## Out of scope
Server, auth, tokens, Control Plane, dependencies, navigation, cloud actions, synchronization writes. PR149 not reused.

## Rollback
Revert this branch.
