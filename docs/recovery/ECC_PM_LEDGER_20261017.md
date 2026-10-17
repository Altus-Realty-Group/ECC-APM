# ECC delivery ledger

Execution owner: Codex, restored by Dion on 2026-10-17. Claude is no longer interim PM. No worker/watch is claimed active without a current receipt.

Verified main: c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e, through PR165. Source readiness and deployed acceptance are separate. Existing holds remain: no main merge, deployment, live write or cloud/access change without specific authorization.

| Work | Current evidence | Remaining gate / next action |
| --- | --- | --- |
| Scheduler PR166 | Corrected head42273dfcb2fceadbed440101a9abc3424258a2d9.315 unit tests,16 dependency checks,typecheck/build pass. Actual-page Chromium153 at1280/390 passes background refresh, stored next-run display, late old credential, cached503/403, health failure and session replacement. No page errors/writes/overflow. Tested tree0767e0aa149839be9d58bca24420b27babc21f49 equals published tree. | Ready for review; exact-head hosted checks and existing merge approval remain. No deployment acceptance. |
| Claude's local Scheduler corrections | Reported4647a9e5b70eeb849e8a7f1406028f20c0f54a8e is not available from GitHub. Its323-test claim is historical reported evidence, not evidence for current head. | Reimplemented and independently tested on existingPR166; no permission to push or further Claude handoff is needed. |
| Backend C7 access | Existing backend source is readable through this session's GitHub connector. Its identity/base match the prior record. Claude's connector limitation is not a repository transfer or missing-source blocker. | No Claude installation change is needed for this execution path. |
| Backend C7 protection | A default-off bounded owner Properties reader is prepared in the existing owning backend's draftPR. Ten offline tests use actual signatures and the actual handler; all uncontrolled network calls prohibited. Other historical handlers remain outside the slice. | Held: actor-to-record activation, existing-app token issuance, full runtime protection/identity and frontend consumer contract still unverified. Existing main push workflow deploys staging, so backend merge requires explicit deployment-aware review. No cloud/config/data changes. |
| Protected real-data vertical workflow | Frontend still has no accepted owner sign-in transport/backend binding. Existing A5 evidence establishes an application, not a usable deployed session. | Prepare/verify the existing-app frontend/API client contract and target-specific rollout under explicit authority. Preserve network containment. Then prove list/detail/refresh/denial/session replacement against current real records. |
| Feature recovery / former G9 | Source inventory currently has17 linked destinations and41 planned/unavailable destinations. Navigation unit tests verify route wiring and prevent routing known stubs; they do not verify completed business workflows. | OPEN. Do not cancel feature recovery or accept the41 unavailable destinations as completed. Reconcile the historical workflow ledger against current source/runtime; current-data access is the primary dependency. |
| PR155/156 | Parked Control Plane-dependent bridge/Connections stack. | Do not merge/activate as the assumed release path. |

## Findings closed in the Scheduler source slice

- Calendar parser rejected impossible days, nonleap dates, hour24 and malformed offsets.
- Background polling retains current successful observations without source flapping; errors/denials never retain stale Scheduler assertions.
- Explicit canonical null blocks the legacy hour alias.
- Real-browser proof found an extra session race: active-query refetch ran before React rerendered and could send the old credential once. Both credential-bearing reads now reject old render epochs before network I/O. The regression failed before the fix and passed after.
- Unique nonsecret revisions isolate remount/credential cache scopes. Health keys include the epoch. Old session credentials are disabled immediately and removed from storage.
- Scoped Scheduler styling fixes touching labels/wrapped values; phone screenshot inspected.

## Acceptance and cost

No source fixture or unavailable notice establishes current operating-data completeness, sign-in, scheduler activation or deployed acceptance. Old dataset observations remain a freshness concern until independently reconciled. No new paid services, API jobs, cloud resources, upgrades or provider calls were activated. Existing tool/CI marginal spend is unmetered, not assumed zero. No automatic continuation runner is claimed.

Required owner action, when exact-head checks are green: approval to merge frontendPR166 under the standing hold. Backend rollout is separately held; do not bundle it into that frontend approval.

Independent reviewer receipt: Claude's ledger commit c633f87b3a4c2ed83c1f055d3fd6a0ec89e9aa83 reports rerunning315 unit tests,16 dependency checks,typecheck/build on PR166 head42273dfc; it did not rerun browser proof. Current hosted Verify, proof-pack and CodeQL are green. Earlier draft-only skipped jobs are not counted as passes. The source gate is satisfied; the standing merge hold remains.
