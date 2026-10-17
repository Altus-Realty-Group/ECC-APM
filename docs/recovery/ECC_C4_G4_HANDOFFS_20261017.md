# ECC targeted follow-ups - 2026-10-17

Prepared for owner delivery; no dispatch or worker execution is claimed.

## Claude: next independent source containment slice

```text
FROM: Dion / Altus Project Manager
TO: Claude Code
PROJECT: ECC-APM v1.0
PROJECT LANE: Generic RPC and diagnostic containment
REPOSITORY: Altus-Realty-Group/ECC-APM, ID1058195656
BRANCH / BASE SHA: Create claude/ecc-rpc-containment-20261017 from main bfe9540b7c0058e7368838117679b17ccc04e54a
ENVIRONMENT: Source and isolated local HTTP tests only
SUBJECT: ECC-C4 - remove unused privileged dispatch and diagnostics
PURPOSE: Close arbitrary service-role RPC forwarding and diagnostic data exposure before backend activation.
PROMPT TYPE: Targeted implementation
AUTHORITY: One draft source-containment PR; no merge, deployment, live DB/vendor access, schema/grant/environment changes or separate login.

OBJECTIVE: Remove the generic POST dispatch and three diagnostic handlers without changing card contracts.
CONTEXT: PR146 C3 head5f8bff205b975ec7389a8752456dbc0ccc77b4d2 passed hosted Verify and Codex combined source review. It remains unactivated; do not extend or duplicate it.
SOURCE OF TRUTH: Current AGENTS.md/database records, server/routes/rpc.ts and your PR146 proof section4. Read PR148 RETURN_REVIEW_20261017.md. Historical sources are not deployed authority.
SCOPE: server/routes/rpc.ts, dedicated isolated tests and proof document. No shared architecture-document edit.
TASK: Remove POST /api/rpc/:functionName and GET diag/ids, debug_leases, simple_lease_test. Keep unknown paths/methods as generic non-success without configuration details. Prove arbitrary names/bodies and those diagnostics cannot create a DB client or invoke DB/RPC methods. Preserve existing five GET card handlers and signatures. Report their remaining scope/PII/vendor-ID/error-leak blockers explicitly; do not claim this makes them safe to activate.
OUT OF SCOPE: Entity boundary, card authorization/projections, portfolio handlers/UI, DataHub, navigation, auth wiring, runtime/deploy files and other repositories.
LANE CONFIRMATION REQUIRED: Verify recipient, repo ID, branch/base and exclusions before implementation and again at test/PR transitions.
GUARDRAILS: No new dependencies, fabricated data, credentials, archive execution or broad refactor. No tests may contact operating systems or data.
STOP CONDITIONS: Stop affected work on lane mismatch, conflicting edits, unsupported route ownership or need for privileged/live action. Continue independent in-scope work.
VALIDATION: Isolated HTTP route tests proving removed paths never touch a privileged client, with configured/unconfigured test-only env. Check card registration remains intact without live reads. Full typecheck, unit/dependency tests, guardrail/build and diff checks.
REPORT BACK: Draft PR/head, files, exact tests/results, residual blockers and next action. LANE INTEGRITY: PASS/FAIL; DEVIATIONS: NONE or details; OUT-OF-LANE OBSERVATIONS.
ROUTED ACTION: Deliver one independent RPC/diagnostic containment PR.
RETAINED: Codex owns acceptance, shared documentation, backend/Control Plane connection, integration and release decisions.
```

## Grok: correct existing PR149

```text
FROM: Dion / Altus Project Manager
TO: Grok
PROJECT: ECC-APM v1.0
PROJECT LANE: Mounted portfolio correction
REPOSITORY: Altus-Realty-Group/ECC-APM, ID1058195656
BRANCH / BASE SHA: grok/ecc-mounted-portfolio-truth-20261017 at1311093386b03370bd1df8bbbb6570e556fe0c02; base main bfe9540b7c0058e7368838117679b17ccc04e54a
ENVIRONMENT: Source and isolated browser/tests only
SUBJECT: ECC-G4 - repair returned-field mapping in existing PR149
PURPOSE: Preserve real source-provided names/dates and prevent incomplete rent results from being represented as complete portfolio totals.
PROMPT TYPE: Targeted correction
AUTHORITY: Edit/test/push existing PR149 only. No replacement PR, merge, deploy, live writes, schema/grant/environment changes or new login.

OBJECTIVE: Correct the actual mounted pages and prove source-shaped responses render.
CONTEXT: Codex submitted your existing branch as draft PR149. Hosted Verify passed, but browser acceptance failed at1280 and390. Read PR148 RETURN_REVIEW_20261017.md. Shared malformed-row crash is being fixed by Codex; do not change shared resolvers.
SOURCE OF TRUTH: Current AGENTS.md/database records, server/mappings.ts LeaseOut/TenantOut and actual server/index.ts responses. These establish source shapes, not deployed contracts. Consult owner-supplied official DoorLoop reference only for provider semantics; never infer stored schema or units from it.
SCOPE: Existing PR149 files and focused mounted-page/browser regressions. Ask before shared-component changes.
TASK:
1. LeaseOut emits propertyName, tenants[], start/end; your page drops these by reading other names. Render the documented source fields. TenantOut emits propertyName/unitLabel; preserve those too. Do not invent aliases or conversions.
2. Label counts/rent as loaded-result statistics unless full cardinality is proven. Unknown statuses cannot silently establish a complete active cohort. Preserve zero, flag missing rent and reject invalid negative/non-finite rent.
3. Invalid IDs must remain readable without broken card links. Reset page-local search on the existing session/access-loss signal.
4. Add mounted regressions for actual LeaseOut/TenantOut fields, loading/denied/failed/empty, missing status/rent, valid zero and invalid IDs. Keep existing useful filters/links.
OUT OF SCOPE: Shared collection adapter (Codex), DataHub/Integrations/navigation, server/PR146, backend contracts, auth transport and other repos.
LANE CONFIRMATION REQUIRED: Verify recipient, repo ID, branch/head and exclusions before work and at test/PR transitions.
GUARDRAILS: No fabricated operating values, field/units guesses, new dependencies, broad refactor or archive execution. Black/white/gold; no orange.
STOP CONDITIONS: Stop affected work on lane mismatch, conflicting edits or unverifiable fields/units; continue independent corrections.
VALIDATION: Isolated source-shaped browser responses at1280x844 and390x844; names/dates visible, no global crash/overflow, keyboard and44px targets. Run full typecheck, unit/dependency checks, build and diff checks. Report tooling limits honestly.
REPORT BACK: Existing PR149 exact head/files, tests/results, unresolved contracts and next action. LANE INTEGRITY: PASS/FAIL; DEVIATIONS: NONE or details; OUT-OF-LANE OBSERVATIONS.
ROUTED ACTION: Correct and return PR149; no second portfolio PR.
RETAINED: Codex owns acceptance, shared adapter/docs, backend connection, navigation, integration and release decisions.
```
