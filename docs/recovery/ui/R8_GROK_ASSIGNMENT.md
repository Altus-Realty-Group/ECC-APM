FROM: Project Manager
TO: Grok
PROJECT: ECC APM V1.0 recovery
PROJECT LANE: R8-G V1 - complete related-record card journeys
REPOSITORY: Altus-Realty-Group/ECC-APM
BRANCH / BASE SHA: codex/ecc-recovery-linked-cards-20261013 / 5e03ec41e4e7c4dd7759a14b2bc52b67525176fb
ENVIRONMENT: Local source, fixture browser tests and existing GitHub CI
SUBJECT: Finish and refresh existing PR132
PURPOSE: Make owner, tenant, lease and unit Related journeys usable and truthful on current main.
PROMPT TYPE: Targeted implementation and validation
AUTHORITY: Continue PR132 on its existing branch, merge current main, fix scoped card defects, test and push. No main merge, backend edits, live access or deployment.

OBJECTIVE:
Return one fully validated related-card PR using reported IDs and actual declared card relationships.

CONTEXT:
Existing implementation5e03ec41e4e7c4dd7759a14b2bc52b67525176fb; current main3464fc0efde6ffd6254ac4fab5947529ed10210b. A new R8 assignment-only commit is appended to your branch; record exact starting remote head. Existing source is preserved. PR130 property financials/dashboard and Claude operations131 are separate writers.

SCOPE:
Exactly the existing PR132 thirteen files plus docs/recovery/ui/R8_GROK_ASSIGNMENT.md. These are owner/tenant/lease/unit Linked.tsx and index.tsx; scoped CardLoadNotice/RelatedRecord; linked-card unit/e2e tests and R2_LINKED_CARDS.md. Shared contracts/hooks/backend/queryClient/session are read-only.

TASK:
1. Read AGENTS.md, typed card contracts and existing linked-card source/test/provenance.
2. Normally merge current main, preserving all canonical mapping and owner-card query corrections. No reset/force-push.
3. Verify all reported related records are shown, including beyond the fifth owner property; current lease deduplicates; invalid/missing IDs never create links. Do not infer missing relations.
4. Verify real route traversal unit->lease->tenant, owner->property and back; keyboard access and44px targets.
5. Prove loading, unavailable/empty, error/Retry,403 and failed refresh behavior. A denial/session boundary must remove details and links; late prior-session responses must not restore them. Preserve shared protection, do not replace it.
6. Run desktop and390px browser journeys with fixture network boundaries, no overflow/page errors and no fabricated production values.
7. Correct owned defects and update PR132/documentation for final source, limits, exact checks and remaining upstream gaps. Mark ready after proof passes. Do not create a duplicate PR.

VALIDATION:
Full typecheck, guardrail, build, all unit/dependency tests, focused linked-card Playwright. Retain existing regressions; no skipped new tests or lowered assertions. No new package/job/browser-download workflow. Fixture journeys establish source behavior only.

OUT OF SCOPE:
Property financials/dashboard, operations stack, navigation shell, backend contracts/targets/auth, data/schema and runtime publishing.

ROUTED ACTION: Complete PR132 linked-card source and human-journey proof.
RETAINED: Codex retains campaign, shared integration, contracts/backend admission, acceptance and release decisions.

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
