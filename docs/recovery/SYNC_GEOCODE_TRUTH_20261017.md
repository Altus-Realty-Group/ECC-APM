# Manual sync and geocode truth containment - 2026-10-17

Repository Altus-Realty-Group/ECC-APM (1058195656). Branch codex/ecc-sync-geocode-truth-20261017. Base bad71b1dc7416a43430da3119aeb88479d8d89db.

## Concrete findings and repair

GEOCODE_AUTO is a per-address provider lookup observation, not proof of an aggregate run. The UI therefore says Latest reported geocode activity and Reported activity time. The mounted hidden /admin/geocode route simulated batch-size changes/manual runs using timers, displayed green status messages for those no-ops, filled missing run counters with zero/batch size 10 and inferred a success rate. The actions are now disabled with a visible availability reason. The read-only audit statistics surface distinguishes missing from actual zero, rejects malformed collection envelopes, removes the unsupported success-rate/provider/cadence claims and clears prior statistics on refresh/error/session changes. GeocodeManagementView and parseGeocodeStats are exported for exact-source render tests; the routed hook continues the same audit GET with existing session protection. No write API or new role/login is added.

The mounted historical /api/admin/sync/run path read provider pages but had no persistence implementation. It could nevertheless set successful lastRun, write SYNC_COMPLETE and announce a completed sync. Non-dryRun requests now return fixed 503 before any state/provider/audit/notification operation, including absent/false/truthy string/numeric flags. Existing token authorization remains first and unchanged.

Explicit boolean dryRun:true retains the actual provider-observation preview. Start/completion audit event types and messages are now preview-specific; completion records dryRun:true and operatingRecordsWritten:0. Status lastRun records dryRun:true. Provider logs and completion alerts state that no operating records were written. Unknown remaining pages/ETA are null rather than guessed. This is not a completed persisted sync. History includes only explicit SYNC_COMPLETE/SYNC_ERROR and preview COMPLETE/ERROR events. Start/stop and ambiguous AUTO_SYNC/MANUAL_SYNC events are excluded. Stored IDs, valid observation counters/duration/mode/time are required; DB or malformed results fail instead of manufacturing successful empty lists, random IDs or zero counters. Table and detail label previews explicitly, and warn that audit-reported outcomes do not verify persisted operating records. Historical records are not rewritten.

## Proof

Focused tests transpile the actual sync router with injected in-memory dependencies, invoke its real handlers and record provider/state/audit/notification effects. Absent/false/truthy dryRun values return503 with zero such effects; unauthenticated returns401. The explicit preview path observes two isolated records, emits preview-only start/completion audit and correctly labeled notifications with zero operating writes. No actual external request or database client is used.

Exact-source geocode tests validate unknown/zero/malformed counters, disabled controls, missing capability text, no simulated handlers/timers, and stale-stat suppression during loading/error. Session-boundary scoping is in the actual routed hook. No browser execution is claimed in this packet; the testable view is available for the coordinator's combined browser pass.

No Control Plane, Azure, deployment, schema, data/grant, authentication, provider configuration, dependency or workflow change. The historical backend remains unactivated. RunPanel requires explicit opt-in for a read-only provider preview; its default Run button and unavailable Stop control are disabled. The direct AdminSync page disables live/quick-run/lock controls with an availability notice. DLQ empty-is-healthy copy remains a separate source gap; it does not become a verified workflow.

Rollback: revert this frontend/backend/test/documentation source slice; no database rollback. Restoring the old false-success path is not activation approval.

Final local checks passed: 8 focused actual-handler/render/history/control regressions; full unit suite 279/279; full typecheck; dependency checks 16/16; guardrail/build; clean diff. Build retains the existing large-chunk warning. The coordinator will perform the combined desktop/mobile geocode browser receipt; this commit claims source and isolated test proof only.

## Current-access history boundary follow-up

The mounted Integrations page no longer substitutes an empty array for a disabled, pending, failed or refreshing completion-history query. A dedicated boundary requires the current access-scoped successful nonfetching read and a validated completion array; missing/malformed rows, unknown/failed reads and cached successes after errors show explicit notices/retry. Confirmed empty results say only that no completion history was returned, not that no sync has ever run.

History uses the existing sessionFetchJSON with query AbortSignal and admin header. Its non-secret cache scope is allocated from a module-monotonic counter for every mount and credential edit, plus the established session epoch; token values/hashes never enter query keys. Editing the existing password input cancels/removes the previous scope and clears selected history/detail state. The input remains editable; no new authentication, role, login or credential system is created. Detail panes require the exact currently successful query source; old rows cannot reappear through a failed read or token change. Other integrations queries are deliberately untouched.

Three focused tests cover retained-cache suppression for disabled/pending/refresh/failed/denied/unresolved reads, malformed/duplicate-row validation, real zero/confirmed empty, distinct mount/edit/epoch cache keys and the mounted query/selection integration. Typecheck passed. No new browser receipt is claimed in this follow-up.


## Combined coordinator acceptance

Integrated onto main ae9f46ba, preserving restored email/renewal navigation and card/units corrections. Final combined source passed typecheck, all 291 unit tests, 16 dependency checks and guardrail/build. Geocode activity received a scoped responsive layout with separated controls and readable reported values. Actual source browser journeys at 1280px and 390px passed unknown-versus-zero, disabled mutations, failed cached refresh, malformed response and session-reset/empty states. Three controls met 44px targets; there were no page errors, horizontal overflow or non-GET requests. Responses were isolated fixtures; no operating data or live backend proof is claimed. Receipts/screenshots: /tmp/ecc-geocode-proof/. No Control Plane or Azure activity.
