# ECC review corrections - manual agent prompts
Verified November 11, 2026. These are copy-ready assignments, not dispatched
messages. Claude/Grok resumption has not been observed. Codex owns final UI,
shared integration, review and release. No merge or live activation is included.

## Claude - paste this block
```text
FROM: Codex / Dion
TO: Claude
PROJECT: ECC - APM
PROJECT LANE: A1 protected-read corrections
REPOSITORY: Altus-Realty-Group/ECC-APM
BRANCH / BASE SHA: claude/ecc-protected-read-contract-20261111; current reviewed head 7499714fc0150c2da3cb6479310253f8318ae4a6; original base 33f06a4b88625d66f61181b21c04bf23f3680508
ENVIRONMENT: Source and isolated synthetic tests only
SUBJECT: ECC-A1-CLAUDE-v2 - close PR229 source review
PURPOSE: Make the authorization boundary fail closed before any document/legal binding
PROMPT TYPE: Bounded correction on existing PR
AUTHORITY: Dion authorized continued ECC work; Codex retains integration and release

OBJECTIVE
Correct the four reviewed source issues on PR229. Do not open a replacement PR.

CONTEXT / SOURCE OF TRUTH
Read current AGENTS.md, PR229 review and exact current branch/head first.
The document UI is draft PR232; its production adapter remains unbound.
The database/grant producer is not accepted. Do not infer account admission
or a card ID as company, property, owner or document authority.

TASK / SCOPE
1. Validate resource grant contract version and required envelope fields;
   malformed/missing expiry or revocation fields must not become nonexpiring grants.
2. Make duplicate scope bindings order-independent. Verified/retired or
   conflicting status records must invalidate the entire scope, not select first.
3. Recheck a fresh clock after asynchronous issuer/grant/binding reads and
   immediately before allow; session or grant expiry during the reads denies.
4. Require an exclusively leased clean DB connection. Pin/reset restricted
   evidence context to default-deny; detect inherited session context. Prove
   transaction-local context, cleanup and discard on rollback/reset failure,
   and no concurrency or pool-lease contamination.

OUT OF SCOPE / GUARDRAILS
Only shared/authz, its tests, and corresponding docs/ADR/architecture records.
No UI, SQL application, provider binding, live grants, credentials, Control
Plane edits, service-role activation, document copy, deployment or merge.
Keep the accepted grant producer and governed registry listed as unbound.

LANE CONFIRMATION / STOP CONDITIONS
Report repo, head, base and environment before edits. If head changed, read
the changes before continuing. Stop only for a material dependency or lane
conflict; finish all independent source corrections and proof.

VALIDATION
Add adversarial clock-advance, malformed-envelope, order-reversal, contaminated
lease, parallel lease and cleanup-failure tests. Run focused suites, relevant
real isolated PostgreSQL seam proof, typecheck, guardrail, build and full unit
suite once coherent. Distinguish local from exact-head hosted results.
No repeated expensive CI runs without new evidence.

REPORT BACK
PR/head, changed paths, each correction and negative proof, local/hosted
results, unresolved producer/binding gates and lane integrity. Nothing merged
or activated. Return to Codex for review.
```

## Grok - paste this block
```text
FROM: Codex / Dion
TO: Grok
PROJECT: ECC - APM
PROJECT LANE: L6 workflow projection corrections
REPOSITORY: Altus-Realty-Group/ECC-APM
BRANCH / BASE SHA: grok/ecc-legal-workflow-structure-20261111; reviewed head 7888edef75bac3c14dc7333cc7edf7fe59fa7007; parent 5fb91423fc8cb41c972de96b5291a044c3a3ed04
ENVIRONMENT: Source and synthetic tests only
SUBJECT: ECC-L6-GROK-STRUCTURE-v2 - correct PR230 projections
PURPOSE: Supply trustworthy matter-scoped workflow projections for Codex UI integration
PROMPT TYPE: Bounded correction on existing PR
AUTHORITY: Dion authorized continued ECC work; Codex owns final UI and integration

OBJECTIVE
Correct PR230 on the existing branch and keep the producer unbound.

CONTEXT / SOURCE OF TRUTH
Read AGENTS.md, current PR230 and accepted L1 contracts before edits.
Prior source reproductions: repeated unknown award returned count2;
assigned open missing requirement was omitted; absent restricted flag exposed
evidence; an unsupported not-a-date court date was preserved.

TASK / SCOPE
Only shared/legal/workflow/projections.ts, its existing unit test and
docs/legal/LEGAL_WORKFLOW_STRUCTURE_20261111.md.
1. Validate whole projection against its matter. Reject wrong-matter children,
   conflicting duplicate IDs and malformed dimensions using accepted L1 enums.
2. Evidence is default-deny unless classification explicitly permits exposure;
   filter restricted evidence before search/count/metadata, not merely URLs.
3. Keep all open missing requirements, including assigned ones, and expose
   the unassigned subset separately. Request-recipient wording is not an actor.
4. Deduplicate unknown award counts by identity; reject conflicting repeated
   awards consistently with L1. Unknown amount remains unknown, not zero.
5. Validate court dates/source/responsible actor. Unknown dates stay unknown;
   do not invent dates, deadlines, actor assignments or verification.
6. Explicitly model unavailable, missing, denied, stale and conflict outcomes
   for consuming projections; document any producer-dependent limit.

OUT OF SCOPE / GUARDRAILS
No src/UI/CSS/navigation/session/resolver edits, importer changes, server
handlers, contract takeover, SQL application, provider activation, credentials,
live writes, merge or deployment. Ownership-document folder layout is already
owned by Codex under PR231/232.

LANE CONFIRMATION / STOP CONDITIONS
Confirm exact repo/head/base and existing PR before editing. If head differs,
read and reconcile source first. Do not stop for routine test/typing fixes.

VALIDATION
Negative cases must catch wrong-matter input, conflicting duplicates, unknown
classification, assigned-open requirement, repeated unknown award, malformed
date and every nonready outcome. Run focused/full unit and typecheck plus
required local checks. Synthetic proof is not live producer acceptance.

REPORT BACK
PR/head, changed files, corrections, negative proof, local/hosted checks and
unbound dependencies. Include lane integrity and deviations. Return to Codex.
```
