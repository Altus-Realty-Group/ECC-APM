# Protected reads and resource authorization (A1, issue #211)

Assignment ECC-A1-CLAUDE-v1. Source only: nothing is activated, registered, deployed or granted. Placement/ownership decision:
[ADR-0002](adr/ADR-0002-protected-read-placement-and-resource-authorization.md). Code: `shared/authz/`.

## 1. Evidence traced (source references, not live proof)

| Reference | Establishes | Does not establish |
| --- | --- | --- |
| Control Plane `docs/contracts/control_session_federation_v1.contract.md` @ `3d9aaf27f4bcad694697bfa30022789b367f8fbe` | Registered-client PKCE sign-in; `GET /session/current` re-checks the session on every call and returns `applicationSessionId, personId, accountId, applicationId, expiresAt, allowed, reasonCode, decisionMode, billingMode, banner, capabilities`; developer review mode returns only `ui.review.read`; "No app may infer access from successful authentication, cache an allow beyond session/access expiry, or fall back to local roles". | Any company, property or matter grant. Live readiness (contract header: "Live SSO and logout await exact-SHA deployment and real provider/browser proof"). |
| Control Plane `docs/contracts/ALTUS_TEAM_MEMBER_ROUTES_V1.md` | Company/lane memberships are *proposed* workforce data: "CONTRACT PROPOSED / RUNTIME AND DATABASE IMPLEMENTATION BLOCKED"; "`client_company_members` ... must not be relabeled as an Altus workforce membership". | An accepted resource-authority producer for ECC. |
| Control Plane `docs/contracts/control_access_evaluate_v1.contract.md` | Application-level allow/deny snapshot (planned, non-deployed). | Resource scope. |
| Retained PR #155 @ `54e42095df2c8b0d8d8fff670b2307b73059d539` (`docs/recovery/ECC_PROTECTED_CONNECTION_20261017.md`, `scripts/protected-backend-bridge.mjs`) | Per-request central check; strict envelope/identity/mode/expiry validation; read-only allow-list; fail-closed on uncertainty. It states itself: "This does not establish upstream record authorization". | Anything activated. It is evidence only. |
| ECC `server/lib/readBoundary.ts` (main) | Existing consumer seam `ReadActorResolver`; default denies all. | A bound resolver. |
| PR #223 (L1, source-reviewed, **not applied**) | Rows filtered by transaction-local `ecc.scope_refs` / `ecc.actor`. | That those settings authenticate anything. |

## 2. Two separate questions

* **Admission** (`shared/authz/session.ts`): person + account + application. Mirrors the retained bridge's validation and the
  central contract: boolean `allowed === true`, UUID person/account, exact application, presented session id equals the one in
  the response, unexpired, strict canonical or developer-review mode, strict envelope (`contractVersion 1.0.0`, `source control-plane`,
  `error` null). Anything else denies. Developer review mode is accepted only in `development|test|preview`, with exactly
  `["ui.review.read"]`, and is **never** resource authority.
* **Resource authorization** (`resourceGrant.ts`, `scopeBinding.ts`, `protectedRead.ts`): may this admitted person/account read
  this company's legal scope? Requires a resource grant for that exact person, account and application inside its effective
  window and not revoked, **and** a verified `scope_ref` binding naming that grant's company. Either missing => deny.

Never used as authority: `accountId` alone, company or matter display names, workbook folders, route/query/body parameters
(a requested scope can only *narrow* to an already-authorized scope; it never adds one), review-mode capability, cookies.

## 3. Explicit legal `scope_ref` mapping boundary

A `scope_ref` is an opaque ECC label (`[A-Za-z0-9._:-]{1,128}`; a comma is invalid because it is the database list separator).
It means something only through a registry entry `{scopeRef, companyId, status, reviewRef}`:

* `companyId` is the central company UUID and must be a UUID; one `scope_ref` binds to at most one company (a conflict removes
  the `scope_ref` entirely); malformed entries are rejected and never authorize.
* Only `status: verified` authorizes; `proposed` and `retired` never do. `reviewRef` names the review that verified it.
* The default registry is **empty**, so every legal scope is denied. The registry's governed source (who may add entries) is an
  integration decision for Codex under #211/#221; this PR defines only the shape and the rules.

## 4. Exact missing producer contract (why binding stays blocked)

No accepted Control Plane route returns resource grants. Until one exists, `resolveReadAuthority` is given no producer and
denies (`noGrantProducer` => `AUTHORITY_UNAVAILABLE`). **Proposed** consumer-side shape (a proposal for the Control Plane owner;
nothing here edits or assumes the Control Plane):

```
GET /api/control/v1/session/resource-grants?resourceType=company
Auth: same server-attested client headers + X-Control-Application-Session as GET /session/current
200 {"data":{"grants":[{"grantId":"uuid","personId":"uuid","accountId":"uuid","applicationId":"string",
      "resourceType":"company","companyId":"uuid","effectiveAt":"RFC3339","expiresAt":"RFC3339|null",
      "revokedAt":"RFC3339|null","revision":1}]},"error":null,"meta":{"contractVersion":"1.0.0","source":"control-plane"}}
```
Required semantics: evaluated per call against the current session (revocation/expiry/suspension take effect immediately);
grants are for that session's person/account/application only; `companyId` is a canonical company identifier distinct from
`accountId`; unavailable => typed error, never an empty-success. `shared/authz/conformance.ts` is the acceptance suite any binding
of such a producer must pass.

## 5. Decision order (all deny unless every step passes)
1. requested scope syntax valid -> 2. session presented and well-formed -> 3. central check succeeds (outage denies) -> 4. admission
   valid -> 5. not developer-review mode -> 6. grant producer succeeds (outage denies) -> 7. at least one grant applies to this
   exact person/account/application/time -> 8. at least one verified binding for a granted company -> 9. requested scope, if any, is
   among those. Authority is resolved afresh per request; `ReadContext.binding` (person|account|grant@revision|scopes; no session
   credential) lets a caller reject a response produced under a binding that is no longer current (`acceptResponse`).

## 6. Database seam (`dbContext.ts`)
`withTransactionContext` opens a transaction, verifies the connection role is not superuser/`BYPASSRLS` and is the expected runtime
role, then sets `ecc.scope_refs`/`ecc.actor` with `set_config(..., true)` (transaction-local). It never uses a session-level
setting, validates scope/actor syntax before any statement, and rolls back on failure. **Custom settings filter a trusted context;
they do not authenticate grants** (a test shows the runtime role can set its own value; authorization is the upstream decision).

## 7. Validation matrix
| Requirement | Evidence |
| --- | --- |
| Allowed; wrong company/resource; wrong application; revoked/expired session; missing/foreign/expired/revoked grants; unverified binding; empty registry; outages; review mode; injection | `tests/unit/authz/protected-read.test.ts` (27 reusable cases in `shared/authz/conformance.ts`; 9 mutants each caught) |
| Stale response / revoked between requests / different person on same server | same file |
| Transaction reset and pool isolation (simulation, CI) | `tests/unit/authz/db-context.test.ts` |
| Transaction reset, reused pooled connection, concurrent interleaving, bypass-role refusal, session-level hazard | `tests/authz-db` (`npm run test:authz-db`, real PostgreSQL 16 + `pg`, private cluster; not run in hosted CI, which has no PostgreSQL service) |
| No service-role/transport/env/cookie dependency in the authorization source | static test in `db-context.test.ts` |

## 8. Activation gates (not part of this PR)
Accepted resource-grant producer and the governed `scope_ref` registry source; Control Plane client registration and live readiness;
a bound server transport (PR #155 transport is not reintroduced here); dedicated non-bypass runtime role and its credentials; applying
the L1 schema (PR #223) and wiring `ecc_legal_runtime`; final UI/integration acceptance (Codex); live allowed/denied/revoked journeys.

## 9. Rollback
Revert this PR. It adds source, tests and documents only; no schema, role, grant, configuration or deployment exists to undo.
