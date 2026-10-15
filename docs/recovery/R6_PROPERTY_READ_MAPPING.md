# ECC R6-G: canonical property address read mapping

Assignment record only. Delivery AWAITING_MANUAL_HANDOFF; work NOT_CONFIRMED.
No implementation or acceptance is claimed by this seed commit. Preserve scope
and replace this status with factual return evidence when work is completed.

```text
FROM: Project Manager
TO: Grok
PROJECT: ECC APM V1.0 recovery
PROJECT LANE: R6-G V1 - canonical property address read mapping
REPOSITORY: Altus-Realty-Group/ECC-APM
BRANCH / BASE SHA: codex/ecc-r6-grok-property-address-20261015 / 1c8fd1022f46cd26ad0df748ffc053c0ed2c9542
ENVIRONMENT: Source and offline tests only; no operational network
SUBJECT: Prevent legacy aliases from masking canonical property addresses
PURPOSE: Keep property list/card address values consistent after canonical fields are refreshed.
PROMPT TYPE: Implementation and validation
AUTHORITY: Five exclusive files and a draft PR. Read mapping repair only; no backend business-rule invention, database writes, target wiring, auth change, runtime activation, merge or deployment.

OBJECTIVE:
Use one tested canonical-first property address mapper for the existing card helper while preserving existing response envelopes.

CONTEXT:
This is a NEW lane in ECC-APM, repository ID1058195656, not the prior Python backend lane.
server/index.ts portfolio list reads address_city/address_state/address_zip.
server/routes/rpc.ts addrFrom instead prefers address1/address_line1, city and zip over canonical address_street1/address_city/address_zip.
server/lib/mapping.ts has a separate alias-first mapAddress.
No deployed route or live data acceptance is inferred from these sources.

SOURCE OF TRUTH:
GitHub for code; database first, API fallback second, calculation last.
Use the verified existing canonical DB columns. Never invent address values, vendor state mapping or operational records.

SCOPE:
server/lib/mapping.ts
server/routes/rpc.ts
tests/unit/propertyAddressMapping.test.ts
docs/database/DATABASE_ARCHITECTURE.md
docs/recovery/R6_PROPERTY_READ_MAPPING.md

TASK:
1. Read AGENTS.md and both docs/database/ALTUS_SUPABASE_ARCHITECTURE.md and DATABASE_ARCHITECTURE.md before editing. Inspect all addrFrom callers and mapAddress usage.
2. Centralize canonical-first address mapping: address_street1/address_city/address_state/address_zip take precedence over older aliases. Define/test absent, null, empty and malformed value behavior explicitly; do not silently replace a present canonical value with a conflicting alias.
3. Integrate the tested helper into existing property card/related property address callers without changing keys, IDs, status codes, other domain calculations or auth. Preserve legitimate legacy-only fallback as documented, with no coercion of arrays/objects.
4. Add independent tests proving conflicting aliases cannot mask canonical values, legacy-only behavior, canonical absence/null/empty/malformed handling, input immutability and existing wire-shape compatibility. Exercise the helper actually used by routes, not a parallel test-only implementation. No production client/network dependency in tests.
5. Update the source-only architecture decision and lane doc. Do not publish private backend schema/access/security findings. Active/is_active behavior stays out of scope; flag unresolved activity semantics.
6. Continue routine in-scope corrections without another prompt.

LANE CONFIRMATION REQUIRED:
Acknowledge R6-G V1; verify new repo ID, branch/base/current remote, clean tree and file allowlist before actions/phase transitions. Preserve unexpected work.

OUT OF SCOPE:
Python backend repo, database/SQL/credentials, frontend UI redesign, live RPC/vendor requests, freshness/auth/session logic, target/proxy/environment wiring, dependencies/workflows, merges and deployment.

GUARDRAILS / STOP CONDITIONS:
STOP on lane mismatch, missing source/contract, required secret access or scope expansion. Keep runtime gates and existing interfaces. Invented fixtures are offline tests only, never product fallback data.

VALIDATION:
Run focused Node/tsx tests through existing test discovery, npm run test:unit, npm run test:dependencies, npm run typecheck and npm run build. Report exact-head existing CI separately; no new jobs.

REPORT BACK:
Version/state; repo/branch/base/new head/PR; files; exact commands/counts; before/after conflict examples; unchanged interfaces; limits and next action.
LANE INTEGRITY: PASS/FAIL; DEVIATIONS: NONE or exact; OUT-OF-LANE OBSERVATION: NONE or minimal evidence.
Return through Dion for Codex independent review. No merge or live-readiness claim.
```
