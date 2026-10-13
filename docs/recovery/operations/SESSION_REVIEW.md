# PM review: operations session/cache integration

Goal ECC-RECOVERY-20261013. Codex owns this bounded correction branch; Claude's
PR131 remains unchanged. Stacked base: 89cc1a2c49325ff8e0ee51a2f342cd8c03c3c52f.

## Defect and correction

PR131 keeps rows in component-local state. Its session epoch effect replaces
rows after rendering; operations denials do not participate in the app's shared
QueryCache purge. That is not sufficient authority to activate verified domains.
Current production contracts remain unverified; no real rows were exposed.

Replace local loading state/effects with useQuery, using the existing provider,
createQueryClient denial purge and accessGuard. Scope each domain query to its
session epoch and selected contract status/endpoint. No placeholder carry-over.
Let loadDomain errors propagate through the shared query cache; keep plain
loading/error/denied/unavailable/ready rendering and Retry. Nothing is activated,
and an unverified query resolves locally without a network call.

The source-only resolveDomain helper remains for existing callers/tests; the
mounted page now uses the query-cache path. No shared session/queryClient code,
new endpoint, auth transport, backend, package or workflow change.

## Regression evidence

Two new lifecycle regressions use the real operations query options, shared
client and QueryObserver: a 403 clears the reporting domain, another observed
operations domain and portfolio cache; a session change removes observed prior
rows without placeholder carry-over, and a late response using the production
session-scoped fetcher cannot repopulate the cleared cache. Fixture contracts
exist only in tests and do not mark production contracts verified.

Local checks: typecheck, 113 unit tests, 16 dependency tests, guardrail/build and
diff check pass. Six existing desktop/390px gate browser journeys pass with the
built product and Chromium 153 temporary executable/loopback override. These are
local fixture/query lifecycle checks, not proof of deployed authorization or
populated operations browser journeys. Exact-head GitHub verify is required.

Current backend identity and real records remain issue119's dependency. Once
verified, test the populated mounted page across session changes and denials
against that actual identity/authorization implementation before activation.
Rollback: revert this correction; no database or deployment rollback.
