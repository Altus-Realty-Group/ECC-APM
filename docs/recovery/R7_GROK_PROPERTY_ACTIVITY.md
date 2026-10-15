# R7-G canonical property activity

Status: ASSIGNED; implementation not yet delivered. Manual handoff required. Source only.

```text
FROM: Project Manager
TO: Grok
PROJECT: ECC APM V1.0 recovery
PROJECT LANE: R7-G V1 - canonical property activity consumers
REPOSITORY: Altus-Realty-Group/ECC-APM
BRANCH / BASE SHA: codex/ecc-r7-grok-property-activity-20261015 / 63c47a5ed295c818f8b85c33e0c2e7d9290b9cbb
ENVIRONMENT: Source and offline frontend tests only
SUBJECT: Correct property activity mapping without truthy coercion
PURPOSE: Make ECC show canonical property activity consistently after backend catch-up.
PROMPT TYPE: Implementation and validation
AUTHORITY: Five owned files and draft PR; no operational access or activation.

OBJECTIVE:
Resolve active/is_active consumption for property records with a tested canonical-first mapper and actual route integration.

CONTEXT:
PR143 address mapping is accepted and complete. This is new work. Current server/index.ts property responses use Boolean(row.active), which misreads nonempty string "false" as true. Read AGENTS.md, shared/app database architecture and existing property wire types before changing code. Canonical backend recovery field is active; do not redefine other entity status fields.

SCOPE:
server/lib/mapping.ts
server/index.ts (property activity consumers only)
tests/unit/propertyActivityMapping.test.ts (new)
docs/database/DATABASE_ARCHITECTURE.md (activity decision only)
docs/recovery/R7_GROK_PROPERTY_ACTIVITY.md (assignment/final receipt)

OUT OF SCOPE:
Address behavior already accepted, lease/unit/tenant status semantics, backend repo, target/proxy/auth wiring, schema/data changes, workflows, dependencies, UI redesign and deployment.

TASK:
1. Trace existing property active/is_active reads and actual response contracts within scope. Record exact consumers; report out-of-scope consumers without editing them.
2. Add a canonical-first property activity mapper: a present active key wins, including false. Accept exact booleans only. Null, empty, strings including "false", numbers and objects are unavailable, never truthy-coerced. Legacy is_active is eligible only if canonical active is absent and legacy is an exact boolean.
3. Wire the property routes to the tested mapper. Preserve existing response keys/types/status codes. If the existing boolean wire contract requires false for unavailable values, keep that fallback explicit and document that false is not evidence of a known inactive source. Do not add invented activity/freshness fields. If an actual documented contract conflicts, report the exact blocker instead of guessing.
4. Preserve address mapping and all unrelated consumers. Update architecture with the source decision and remaining live verification limits.
5. Push implementation and meaningful tests to the assigned PR, not just a document.

VALIDATION:
Test canonical false against legacy true, canonical true against legacy false, legacy-only, absent/null/malformed canonical with conflicting alias, immutability and actual property response integration. Demonstrate the string-false regression fails before the fix. Run focused tests, existing unit suite, typecheck/build and repo-required checks. No live calls. Distinguish source behavior from operational data proof.

ROUTED ACTION: Grok owns this property activity consumer correction.
RETAINED: Codex owns backend integration, operational acceptance and ECC recovery campaign.

SOURCE OF TRUTH:
GitHub is canonical code. Database is operational truth, API fallback second, calculation last. Invented test fixtures only; never insert synthetic product data.

LANE CONFIRMATION REQUIRED:
Acknowledge the exact lane, repository, branch, base ancestry, remote head and clean worktree before substantive work. Recheck identity and owned files at investigation/implementation/test/push transitions. Preserve unexpected work.

GUARDRAILS:
Use existing dependencies and CI discovery. No secrets, environment discovery, workflow/cadence changes, deployment or main merges. No live database/vendor calls, operational SQL, grants, policies, accounts or credentials. Continue all in-scope implementation and validation without routine confirmation. Source completion is not live-readiness.

STOP CONDITIONS:
STOP with LANE MISMATCH if identity differs. STOP on missing source contract, scope expansion, secret requirement, destructive action or unverifiable disposable target. Report peer defects without editing peer files. Do not re-run finished R6 assignments.

REPORT BACK:
Lane/version/status; repo/branch/base/start/new heads/PR; exact files; behavior changed; commands and results; CI at exact head; limitations and next action. LANE INTEGRITY: PASS/FAIL; DEVIATIONS: NONE or exact; OUT-OF-LANE OBSERVATION: NONE or minimal evidence.
```
