# ECC targeted handoffs - 2026-10-17

Prepared for owner delivery. Execution is unconfirmed until each recipient acknowledges.

## Claude

```text
FROM: Dion / Altus Project Manager
TO: Claude Code
PROJECT: ECC-APM v1.0
PROJECT LANE: Generic entity read-boundary corrections
REPOSITORY: Altus-Realty-Group/ECC-APM, ID 1058195656
BRANCH / BASE SHA: codex/ecc-r9-read-boundary-20261016 at 6f30c3bc93829179d44ecbd30a742c0a3ab0ed91; base main bfe9540b7c0058e7368838117679b17ccc04e54a
ENVIRONMENT: Source and isolated tests; published runtime read-only
SUBJECT: ECC-C3 - correct existing PR146
PURPOSE: Make protected entity reads compatible, strict and truthful before activation.
PROMPT TYPE: Targeted implementation
AUTHORITY: Edit/test/push existing PR146 only. No merge, deploy, live writes, schema/grant/environment changes or new login.

OBJECTIVE: Complete existing PR146; no replacement PR.
CONTEXT / SOURCE OF TRUTH: Read current AGENTS.md/database standards, PR147 audit/recovery artifacts and PR148 reconciliation. Current source controls; historical archives are evidence only.
SCOPE: server/lib/readBoundary.ts, server/routes/entities.ts, focused tests and a dedicated proof document. Report shared architecture-document changes rather than editing that file concurrently.
TASK:
1. Reconcile actual DataHub order=id.desc and historical lease selections. Support only verified fields/order syntax; never widen access to hide schema mismatches.
2. Reject null/object/malformed DB successes instead of empty200.
3. Make capped/paged completeness truthful. Returned length is not total cardinality. Document and test the response contract.
4. Preserve actor-before-database, scope intersection, field restrictions and generic denials.
5. Inspect privileged RPC forwarding read-only; return a separate containment proposal, without modifying that surface.
OUT OF SCOPE: Portfolio handlers/UI, DataHub hooks/page, navigation, Integrations, runtime binding, new identity contracts and other repositories.
LANE CONFIRMATION REQUIRED: Acknowledge recipient, repo ID, branch/head, objective and exclusions; recheck at implementation/test/PR transitions.
GUARDRAILS: Control Plane identity alone does not grant record access. No secrets, invented production data, archived-script execution or security weakening.
STOP CONDITIONS: Stop affected work on lane mismatch, conflicting edits, missing authority or unverifiable fields; continue independent corrections.
VALIDATION: Real caller shapes, invalid ordering/selections, malformed success, capped results and cross-scope denial with isolated fixtures. Run typecheck, unit/dependency checks, guardrail/build and diff checks.
REPORT BACK: Exact head/files, tests/results, remaining contract blockers and next action. Include LANE INTEGRITY: PASS/FAIL; DEVIATIONS: NONE or details; OUT-OF-LANE OBSERVATIONS.
ROUTED ACTION: Correct and return existing PR146.
RETAINED: Codex owns acceptance, backend connection, shared documentation, integration and release decisions.
```

## Grok

```text
FROM: Dion / Altus Project Manager
TO: Grok
PROJECT: ECC-APM v1.0
PROJECT LANE: Mounted portfolio truthfulness
REPOSITORY: Altus-Realty-Group/ECC-APM, ID 1058195656
BRANCH / BASE SHA: Create grok/ecc-mounted-portfolio-truth-20261017 from main bfe9540b7c0058e7368838117679b17ccc04e54a
ENVIRONMENT: Source and isolated tests; published runtime read-only
SUBJECT: ECC-G3 - repair mounted Owners, Leases and Tenants
PURPOSE: Remove fabricated operating records and false successful-empty/zero claims.
PROMPT TYPE: Targeted implementation
AUTHORITY: One narrow draft frontend PR. No merge, deploy, live writes, schema/grant/environment changes or separate login.

OBJECTIVE: Repair the components actually mounted by App.tsx, not dormant alternatives.
CONTEXT / SOURCE OF TRUTH: Read current AGENTS.md/database standards, your V1 audit, PR147 recovery artifacts and PR148 reconciliation. Verify source before using audit claims.
SCOPE: Mounted portfolio Owners.tsx, Leases.tsx, Tenants.tsx; portfolio-only adapters/tests and a dedicated proof document. Coordinate before shared-component/resolver edits.
TASK:
1. Replace mounted Owners fixtures with the existing governed owner reader and honest loading/denied/error/empty states.
2. Replace Leases relative collection requests with existing portfolio reader contracts. Failed reads must never claim successful empty or $0 revenue.
3. Preserve real zero rent. Unknown/partial rents cannot produce complete revenue totals. Label bounded-result metrics honestly.
4. Remove Tenants' invented Current status and contradictory empty chrome on failure.
5. Preserve links/filters/usability. Do not invent field aliases or money-unit conversions.
6. Verify desktop/390px, keyboard access and 44px targets where tools permit.
OUT OF SCOPE: Server handlers, entity boundary, shared DataHub hooks/page, Integrations, navigation, auth transport, runtime wiring and other repositories. Codex owns PR148; Claude owns PR146.
LANE CONFIRMATION REQUIRED: Acknowledge recipient, repo ID, branch/base, objective and exclusions; recheck at implementation/test/PR transitions.
GUARDRAILS: No invented records, fake success, new dependencies, broad refactors or archived-script execution. Database first, governed API second, calculation last. Black/white/gold; no orange.
STOP CONDITIONS: Stop affected work on lane mismatch, conflicting edits or unresolved fields/units; continue independent repairs.
VALIDATION: Loading, denied, failed, verified-empty, malformed, reported-zero and missing-rent/status cases. Run relevant tests, full typecheck, unit/dependency checks and build. Separate fixture proof from live acceptance.
REPORT BACK: Draft PR/head/files, tests/results, browser limits and blockers. Include LANE INTEGRITY: PASS/FAIL; DEVIATIONS: NONE or details; OUT-OF-LANE OBSERVATIONS.
ROUTED ACTION: Deliver one mounted-portfolio repair PR.
RETAINED: Codex owns acceptance, backend connection, shared documentation, navigation, integration and release decisions.
```
