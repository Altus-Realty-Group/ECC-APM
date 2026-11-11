# ADR-0002: Protected-read placement, ownership and resource authorization

Status: Proposed (source only; nothing activated). Assignment ECC-A1-CLAUDE-v1, issue #211.
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
7. **Fresh authority every request**: the session and grants are resolved per request; no allow is cached or reused across
   requests. Responses carry a binding fingerprint so a late response from an earlier session/grant set is rejected.
8. **Database seam**: authorization context reaches PostgreSQL only through transaction-local `set_config(..., true)` inside an
   explicit transaction, after a check that the connection role is neither superuser nor `BYPASSRLS`. Session-level settings are
   forbidden (they survive on pooled connections). Custom settings filter a trusted context; they do not authenticate grants.
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
