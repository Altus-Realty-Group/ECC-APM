# ADR-0002: Protected-read placement, ownership and resource authorization

Status: Proposed (source only; nothing activated). Assignment ECC-A1-CLAUDE-v1, issue #211; corrected by ECC-A1-CLAUDE-v2 and v3 after Codex source review of `7499714` and `2089b68`.
Date: 2026-11-11. Base: `33f06a4b88625d66f61181b21c04bf23f3680508`.

## Context

* Legal UI (#227) is merged with an unbound adapter. Native legal schema (PR #223, source-reviewed, not applied) filters rows by a
  trusted, server-supplied transaction context (`ecc.scope_refs`, `ecc.actor`); those settings do not authenticate anything.
* Retained PR #155 (`54e42095df2c8b0d8d8fff670b2307b73059d539`) holds an earlier same-origin bridge: PKCE sign-in, sealed login
  cookie, central current-session check on every read, fixed read allow-list. It is evidence, not an activation target.
* The central issuer contract (`altus-control-plane` `docs/contracts/control_session_federation_v1.contract.md`, read at
  `3d9aaf27f4bcad694697bfa30022789b367f8fbe`) admits a **person + account + application** only. `GET /session/current` returns
  `applicationSessionId, personId, accountId, applicationId, expiresAt, allowed, reasonCode, decisionMode, billingMode, banner,
  capabilities`. It carries **no company, property or matter grant**.
* Company/lane memberships exist only in the Control Plane *proposed* workforce contract
  (`ALTUS_TEAM_MEMBER_ROUTES_V1.md`: "CONTRACT PROPOSED / RUNTIME AND DATABASE IMPLEMENTATION BLOCKED"), which also states that
  `client_company_members` must not be relabeled. Neither is an accepted resource-authority producer.
* `server/db.ts` uses the service-role key (bypasses RLS). `server/lib/readBoundary.ts` already defines the consumer seam
  `ReadActorResolver` whose default denies everything.

## Decision

1. **Ownership**: ECC owns *consumer-side enforcement* (the protected-read boundary, the explicit `scope_ref` binding registry
   shape, the conformance suite). The Control Plane owns *issuance* (sessions, and any future resource grants). This PR edits
   nothing in the Control Plane and invents no producer.
2. **Placement**: pure, dependency-free TypeScript in `shared/authz/` (no `express`, `fetch`, env, cookies or database driver), so
   the future server binding and tests import the same rules. Transport (PKCE, cookies, HTTP) from PR #155 is **not** reintroduced
   here; it returns only in a separate Codex-owned activation PR that must pass this conformance suite.
3. **Two separate questions, never merged**:
   * *Admission*: is this person/account allowed into this application right now (central `session/current`)?
   * *Resource authorization*: may this admitted person/account read this company/property/matter scope (a resource grant)?
   Admission never implies a resource grant. `accountId` is a person's account, not a company.
4. **Deny by default**: missing, malformed, stale, expired, revoked, mismatched or unverifiable authority denies. The default
   grant producer and default binding registry are empty, so every legal scope is denied until an accepted producer is bound.
5. **No inference**: company access is never derived from `accountId`, display names, workbook folders, route parameters,
   query strings or request bodies.
6. **Explicit `scope_ref` mapping**: an ECC-governed registry entry maps one `scope_ref` to exactly one central company
   identifier with a reviewed status. A `scope_ref` with no verified entry is denied even if a grant exists for some company.
7. **Fresh authority every request**: the session, grants and bindings are resolved per request; no allow is cached or reused across
   requests. The clock is read again after the issuer read, after the grant read, after the binding read and immediately before the
   allow, and every validity test uses the latest reading, so a session or grant that expires during the reads denies (expiry is
   exclusive). A clock that is not finite or moves backwards denies. A returned context carries `validUntilMs` (the earliest of the
   session expiry and every contributing grant's expiry). Responses carry a binding fingerprint so a late response from an earlier
   session/grant set is rejected.
7a. **Grant contract strictness**: a grant envelope is accepted only with `error: null`, `meta.contractVersion "1.0.0"` and
   `meta.source "control-plane"`; otherwise it yields zero grants. `expiresAt` and `revokedAt` must be present: an explicit `null`
   is the producer's declared "none"; a missing key, empty string, date-only or non-RFC3339 value rejects the grant (it never
   becomes non-expiring). Any revocation record, even a future-dated one, denies. A repeated `grantId` drops every copy: ambiguity is judged on the readable id of EVERY entry, including malformed ones, after trimming and lower-casing, so a valid grant plus a malformed duplicate (in either order) yields no grant.
7b. **Scope bindings are order-independent**: a `scope_ref` is usable only with exactly ONE record and that record valid and
   `verified`. Several records (verified+retired, two companies, an identical duplicate) or a malformed record naming the scope
   invalidate the whole scope; no entry is ever picked "first".
8. **Database seam**: authorization context reaches PostgreSQL only through `withLeasedContext`, which requires an
   exclusively leased connection (never a shared pool handle) and: validates the COMPLETE context before leasing (person-UUID actor,
   bounded non-empty array of valid scope_refs, and a finite positive `validUntilMs`; a missing, non-numeric, NaN, infinite, zero or
   negative expiry takes no connection); refuses a lease that arrives with inherited `ecc.*` session settings, a changed session role
   or an open transaction (and discards that connection); refuses a superuser/`BYPASSRLS`/wrong role; sets scope and actor with
   transaction-local `set_config(..., true)` and pins `ecc.restricted_evidence` to `off` (default-deny; A1 models no entitlement);
   hands the work a runner that stops working when the transaction ends; then runs `DISCARD ALL` and verifies the connection clean.
   Any rollback, commit, reset or verification failure DISCARDS the connection instead of returning it to the pool. A pool that
   hands one connection to two holders is refused. Session-level settings are forbidden. Custom settings filter a trusted context;
   they do not authenticate grants.
8a. **Expiry semantics (exclusive, `validUntilMs`)**: authority is re-checked at the start, after `set_config`, after the work, and
   once more after COMMIT, reset and verification, immediately before the result is delivered. Expiry before COMMIT rolls back and
   returns nothing (`committed: false`). Expiry **during or after COMMIT** cannot undo a committed write: the writes are durable,
   cleanup still completes and the verified-clean connection is returned, and the RESULT IS WITHHELD with `CONTEXT_EXPIRED` whose
   `committed` is `true` (a bad clock reading after COMMIT is reported the same way). A caller must never read a `committed`
   error as "nothing happened". The seam withholds delivery; it does not and cannot make a late commit not have happened.
9. **Service-role exclusion**: no authorization decision uses the service-role client; the seam refuses a bypass-capable role.

## Consequences

* Legal runtime binding stays blocked on one exact missing producer contract: a Control Plane (or other accepted) route
  returning resource grants for the current application session (shape proposed in the A1 doc). Independent conformance work
  proceeds without it.
* The reference evaluator, binding rules and seam are source-proven only (unit tests plus a local PostgreSQL seam test).
  Nothing is installed, registered or deployed; no role or grant is created.
* Rollback: revert the PR. There is no schema, config, role or deployment to undo.

## Evidence classes
Source-only: this PR. Read-only source reference: Control Plane contract at `3d9aaf2`; retained PR #155 at `54e4209`.
Unverified: live Control Plane readiness/registration, any resource-grant producer, production role configuration.
