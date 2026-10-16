FROM: Project Manager
TO: Claude Code
PROJECT: ECC APM V1.0 recovery
PROJECT LANE: R8-C V1 - complete operations source integration
REPOSITORY: Altus-Realty-Group/ECC-APM
BRANCH / BASE SHA: claude/zealous-newton-yvhlqv / 89cc1a2c49325ff8e0ee51a2f342cd8c03c3c52f
ENVIRONMENT: Local source, fixture browser tests and existing GitHub CI
SUBJECT: Finish existing PR131 with accepted session protection
PURPOSE: Deliver one integrated operations PR with truthful gated states and no stale-session row exposure.
PROMPT TYPE: Targeted implementation and validation
AUTHORITY: Continue PR131 on its existing branch; integrate accepted PR133 source and current main, fix scoped defects, test and push. No main merge, runtime activation or live access.

OBJECTIVE:
Finish the existing operations work, not another foundation. Preserve legal/work-order/ledger gates while proving populated fixture lifecycle and per-lease financial behavior.

CONTEXT:
PR129 foundation bfb9be722bae2db21aefc4a8ecdf7590ecf46d38; PR131 implementation89cc1a2c49325ff8e0ee51a2f342cd8c03c3c52f; PR133 accepted session correction aebe38cab65196870f9bcdedccb95bb4617a55fa. Main3464fc0efde6ffd6254ac4fab5947529ed10210b includes canonical address/activity and owner-card correction. A new R8 assignment-only commit is appended to your branch; inspect it and record its exact starting head. Product source is otherwise unchanged.

SCOPE:
The union of existing PR129/131/133 operations files, their tests/e2e, docs/recovery/operations/**. App.tsx only to preserve the already accepted /ops/operations registration while integrating main. Shared session/queryClient implementations remain read-only.

TASK:
1. Read current AGENTS.md, the operations contract ledger and PR133 SESSION_REVIEW before changes.
2. Merge current main and exact PR133 source into this branch normally, preserving history and peer tests. No reset/force-push. Do not remotely merge or close PR129/133.
3. Use the actual existing query provider, access guard and epoch keys. Preserve production domains unverified with zero requests.
4. Add or strengthen mounted-browser fixture proof: populated data disappears on session boundary; a late prior-session response cannot restore rows;403 in an operations domain purges protected cross-domain/portfolio data; Retry recovers only in the current session.
5. Preserve per-lease ledger separation, safe integer checks, null/zero distinction, plain copy and all existing denial/abort/error/empty states.
6. Complete desktop and390px journeys with keyboard access,44px controls, no page overflow or unhandled errors. Fix defects in owned files.
7. Update this PR body and lane doc around final combined scope and exact validation. Mark ready only after the scoped proof passes. PM will retarget/consolidate the parent stack after your return.

VALIDATION:
Full typecheck, guardrail, build, all unit/dependency tests and focused operations Playwright. No skipped new regressions, widened contracts, disabled assertions or new CI suite. Preserve former tests. Existing bounded CI only. Inventory any remaining real backend contract gaps explicitly; do not invent or activate them.

OUT OF SCOPE:
Other card/dashboard PRs, backend repositories, live data, schemas, authorization changes and production enabling.

ROUTED ACTION: Complete the operations implementation and lifecycle proof on PR131.
RETAINED: Codex retains campaign, shared integration, backend admission, source acceptance and merge/release decisions.

SOURCE OF TRUTH:
GitHub is canonical code. Database is operational truth, API fallback second, calculation last. Fixtures are for tests only and never operational acceptance.

LANE CONFIRMATION REQUIRED:
Print recipient, project, lane, repository ID1058195656, branch/base/current local and remote HEAD, clean worktree, objective and exclusions before work. Recheck before implementation, validation and push. Stop with LANE MISMATCH on identity or unexpected overlapping changes. A normal checkout to the named branch is allowed; preserve unrelated work.

GUARDRAILS:
No backend/proxy/target/auth transport, secrets, database, live vendor, deployment, workflow/dependency or shared session/queryClient implementation changes. No fabricated operating data. Black/white/gold, no orange. Existing denied/session safeguards remain. No new paid resource or recursive worker dispatch.

STOP CONDITIONS:
Stop only the affected action for unverifiable identity, unavailable contract authority, out-of-scope edits or unexplained failures. Continue independent authorized source work. Report unrelated discoveries as OUT-OF-LANE OBSERVATION without repairing them. Do not assume missing data means zero. No main merge, publish or domain activation.

REPORT BACK:
Return ACKNOWLEDGED/STARTED, PR URL, exact starting/final SHA and base, changed files, before/after behavior, commands/results, desktop and390px proof, actual CI conclusions including skips, blockers and next action. Include LANE INTEGRITY: PASS/FAIL; DEVIATIONS: NONE or exact details; OUT-OF-LANE OBSERVATIONS. Fixture, source and live proof must be separate. Do not wait for a new proceed after a passing dependency within this lane.
