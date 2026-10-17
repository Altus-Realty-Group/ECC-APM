# Protected ECC connection candidate — 2026-10-17

Status: source implemented, not activated, not production accepted. This slice changes no database, grants, schema, deployment, secret or live registration. No mock operating records are included.

## Runtime path

Browser → same-origin ECC boundary → central Control Plane current-session check → explicit backend origin. Sign-in follows the source contract `docs/contracts/control_session_federation_v1.contract.md` at Altus-Realty-Group/altus-control-plane main `e1b0fe44d9575cf64cad2c2245cc25c72bc47b7a`. PKCE S256 and a short-lived sealed, HttpOnly, Secure login cookie bind the callback. Exchange alone does not grant access. Current-session checks pin the reviewed person, account and application; uncertainty denies access. No local identity, role inference or database credential is added.

Only five portfolio collection reads, dashboard summary, and five card reads are permitted. Collection/dashboard queries are rejected; cards accept exactly one positive safe integer ID. Business mutations and arbitrary RPC dispatch are unavailable. Only the Accept header reaches the backend. This does not establish upstream record authorization: an independently protected, scoped backend remains required before activation.

Developer review mode is restricted to development/test/preview, exact `ui.review.read` capability, non-billing developer mode and the visible `DEV BYPASS · READ ONLY` banner. Application-only logout calls the central contract, clears login/session cookies and immediately suspends business reads and clears browser caches across tabs through token-free notices. Failed central revocation is reported as unconfirmed.

## Configuration and activation prerequisites

All names below are server-only; no values belong in source, browser bundles, PRs or logs:

| Names | Required evidence |
| --- | --- |
| ECC_BACKEND_ORIGIN | HTTPS origin, deployment owner/SHA and authenticated record scope |
| ECC_CONTROL_PLANE_ORIGIN | Verified central service and environment |
| ECC_PUBLIC_ORIGIN | Exact HTTPS ECC origin and registered callback |
| ECC_APPLICATION_ID, ECC_CONTROL_CLIENT_ID | Existing ECC registration, exact redirect and permissions |
| ECC_CONTROL_CLIENT_ASSERTION | Attestation provisioned through approved secret handling |
| ECC_OWNER_PERSON_ID, ECC_OWNER_ACCOUNT_ID | Verified existing owner identity; no inferred membership |
| ECC_ENVIRONMENT | Explicit development/test/preview/staging/production |
| ECC_SESSION_SEAL_KEY | Independently provisioned 32-byte hex key |

Missing or invalid configuration remains 503. No legacy host or credential fallback exists. Middleware is mounted in Vite development and preview; a production host must prove it runs the same boundary before deployment acceptance. Do not serve the frontend statically with a separate unprotected API route.

## Database architecture and remaining blockers

No direct browser Supabase connection is introduced. Read-only catalog evidence identifies historical ECC store AltusCommandCenter `ssexobxvtuxwnblwplzh`; it does not establish current freshness or actor membership. Existing source projections are separately corrected in PR146/148. Old anonymous generic collection handlers are not an activation target. Broad grants/RLS and ingestion freshness require separate authorized remediation.

Automatic approval review blocked read-only metadata verification in the separate Control Plane database `srzwamukysmhiaaviwiv` because its relationship and ownership were not established by user-authored instructions. No alternate query or bypass was attempted. Explicit approval is needed to inspect ECC registration and the existing owner's access metadata there. No credentials or database writes are needed for that verification.

## Verification

Bridge branch: typecheck, build and 167 unit tests pass. Tests cover missing configuration, strict session envelope/identity/mode/expiry, revocation and outage, sealed callback tamper/expiry, permitted paths, query/mutation refusal, unsafe upstream responses, same-origin application logout, both cookie deletions and token-free cross-tab invalidation. Browser and combined integration receipts are recorded in the PR after verification. Isolated browser fixtures are test inputs only; they do not prove real-data operating journeys.

Activation remains blocked on verified Control Plane registration, upstream deployment identity/protection, fresh real-data journeys and explicit release approval. No main merge or deployment is performed by this slice.
