# ECC-APM audit reconciliation - 2026-10-17

Evidence: owner-supplied Claude ECC-AUDIT-C V1 and Grok ECC-AUDIT-G V1
returns, current main bfe9540b7c0058e7368838117679b17ccc04e54a,
PR146 head 6f30c3bc93829179d44ecbd30a742c0a3ab0ed91, PR147 head
7d55e996d0135dacda60c710a38ffcb44aeb73ec. Both PRs remain drafts.
The owner states the proposed V2 prompts were not delivered. Their execution
must not be inferred from the V1 audit returns. No agents were dispatched here.

## Accepted findings and current disposition

| Finding | Evidence | Disposition |
| --- | --- | --- |
| All runtime API requests deliberately unavailable | README, scripts/start-replit.mjs, frontend-api-boundary.mjs | Connection remains unfinished; do not boot legacy privileged handlers to remove 503 |
| Fabricated mounted owner records | src/pages/portfolio/Owners.tsx | Open, remove fixtures with honest authorized read states |
| Relative lease requests and false successful-empty / zero revenue | src/pages/portfolio/Leases.tsx, features/data/useCollection.ts | Open, mounted lease repair required; a hidden alternative does not fix it |
| Integration route crash and unknown status presented as facts | IntegrationsHealthPage.tsx uses Node process.env; health/config had no queryFn | This PR fixes browser env access and pending/error rendering; success-path legacy token/sync interface remains unaccepted |
| Data Hub live claim, failed-empty rendering and transfer controls | src/pages/DataHub.tsx | This PR repairs read states and removes active transfer controls; transfers still incomplete |
| Data Hub ignores identity boundary in transport | ecc-collection-hooks.ts, sessionScope.ts | This PR adopts existing epoch/cache protections, status-bearing HTTP failures and strict collection parsing; does not authenticate anyone |
| Entity boundary caller incompatibility | PR146 policy rejects order=id.desc and historical lease fields | Open; fix existing PR146, not a duplicate boundary |
| Malformed success and truncated entity count | PR146 entities router treats non-array as empty and returned length as totalCount | Open; reject malformed success and prove truthful count/paging |
| Privileged generic RPC, unscoped portfolio handlers, anonymous Azure functions | server/routes/rpc.ts, server/index.ts, ecc-functions | Activation blockers; source presence is not proof these are deployed |
| Reports, legal/accounting, work orders, vendors, comms, housing and historical navigation scope | PR147 recovery matrix and 58-destination ledger | Remain in recovery scope; no disabled label, hidden route or unavailable notice counts as completion |
| Mobile, real populated data and authenticated operator journeys | Both returns explicitly limit proof | Still open; desktop observations cannot establish these |

## Integration constraints

Current main manifest still has no active Replit binding. Owner supplied the
published URL in conversation, but its commit/process alignment is unverified.
Issue119 has stale import-next instructions; do not ask for another import
without first reconciling the already published runtime.

Control Plane remains the identity owner. Do not create a separate login,
infer property/owner grants from identity alone, treat an admin token as
federation, or wire a backend based on historical filenames. Generic entity
containment alone does not protect the other privileged surfaces.

This patch preserves request URLs, entity field selections and existing
backend boundary. No deployment, main merge, schema/data/grant/environment
change, vendor sends or archived-script execution. Historical functionality
remains a restoration requirement rather than being reclassified as complete.

## Validation for this repair slice

Final full unit run: 156 passed, no failures/skips. All 4 targeted
audit regressions also passed. Full
application typecheck, guardrail/build and 16 dependency tests passed. Tests
use isolated payloads and rendered components, not operating records.

Desktop/390px browser acceptance was attempted but not completed: Playwright's
Chromium download repeatedly returned an invalid/truncated ZIP. No browser,
mobile, touch-target, published-runtime or real-data acceptance is claimed.
The source patch has not been merged or published.
