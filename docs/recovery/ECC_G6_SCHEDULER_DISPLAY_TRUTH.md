# ECC-G6 / G7 Scheduler Display Truth

**Repository:** Altus-Realty-Group/ECC-APM (ID 1058195656)  
**Base:** main `c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e`  
**Branch:** `grok/ecc-scheduler-display-truth-20261017`  
**Scope:** Mounted Scheduler panel on `/systems/integrations` only.

## Producers read (no contract changes)
- `server/routes/syncHealth.ts` emits `enabled` (boolean), `intervalMinutes` (number), `nightlyFullHourUtc` (string|null), `status.next_run_at` (stored observation).
- `server/routes/admin/sync.ts` emits `scheduler.enabled`, `scheduler.intervalMinutes`, `scheduler.fullSyncHourUTC`, `scheduler.nextRun` (calculated as now + interval — an estimate, not a stored schedule).

## G7 corrections
- Cached admin scheduler values are suppressed whenever the admin read is pending, errored, or denied. Background refetch retains a successful current-scope observation without source flapping.
- Failed/pending health reads suppress the display; background refresh does not blank it.
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
315 unit tests, 16 dependency checks, typecheck and build passed on the corrected source. Timestamp regressions include impossible month/day, nonleap century, hour24, invalid minutes/seconds/offsets and valid leap-day offset rollover. Explicit canonical null blocks a populated legacy hour alias.

`scripts/verify-scheduler-browser.mjs` tests the actual mounted page in isolated Chromium153 at1280x844 and390x844: background admin/health reads retain settings, edited credentials cannot receive a delayed old response, failed/denied reads suppress cache, health failure hides the panel, and session replacement clears the token/cache. It found a genuine boundary race: the global refetch sent the old credential before React rerendered. Both credential-bearing query functions now reject a stale render epoch before any fetch. The browser regression failed before that fix and passed afterward. No page errors, mutation requests or horizontal overflow occurred. Source/test fixtures are never operational records. This does not certify the deployed application or live scheduler.

The health key is now session-scoped. Admin revisions are unique across mounts/edits. The obsolete formatNextRun helper was removed; no schedule calculation is shown as an observation. Existing legacy token entry is not an accepted replacement for protected sign-in.

## Out of scope
Server producers, shared portfolio resolvers, authentication, Control Plane, backend targets, schema/data, workflows, dependencies, unrelated pages. No live scheduler activation claimed.

## Rollback
Revert this branch.
