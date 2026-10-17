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

Missing or invalid configuration remains 503. No legacy host or credential fallback exists. Middleware is mounted in Vite development/preview and the standalone production web host (`npm run build` then `npm run start:production`). The production host serves API requests before SPA fallback, rejects static path/symlink escapes and never starts the legacy API or vendor jobs. Build identity is emitted from the checkout at build time; `/health/live` reports that identity, dirty/unknown status and configuration presence, not operating readiness. Deployed process/source alignment still requires runtime proof. Do not serve the frontend statically with a separate unprotected API route.

Optional server-only `ECC_FIELD_APP_ORIGIN`, `ECC_CONSTRUCTION_MANAGER_ORIGIN` and `ECC_DEAL_ROOM_ORIGIN` supply fixed application-list navigation through the freshly authorized `GET /api/workspace/connections`. Invalid/missing targets stay unavailable. The browser supplies no target. Property Intelligence remains unavailable because the producer has no executable ECC consumer profile. Navigation does not establish record identity, data integration or receipt delivery.

## Database architecture and remaining blockers

No direct browser Supabase connection is introduced. Read-only catalog evidence identifies historical ECC store AltusCommandCenter `ssexobxvtuxwnblwplzh`; it does not establish current freshness or actor membership. Existing source projections are separately corrected in PR146/148. Old anonymous generic collection handlers are not an activation target. Broad grants/RLS and ingestion freshness require separate authorized remediation.

Automatic approval review blocked read-only metadata verification in the separate Control Plane database `srzwamukysmhiaaviwiv` because its relationship and ownership were not established by user-authored instructions. No alternate query or bypass was attempted. Explicit approval is needed to inspect ECC registration and the existing owner's access metadata there. No credentials or database writes are needed for that verification.

Superseding evidence after Dion's explicit2026-10-17 approval: read-only metadata verification succeeded. ECC registry entry is active (`application_key=ecc`, billing mode none), and the protected owner account/Person is active and matches Dion. There are zero registered ECC clients, owner ECC entitlements and owner ECC developer grants. No registration, grant or identity was created or changed. These observations do not independently decide the central protected-owner access policy. Current staging `/health/live` reports `Altus-Realty-Group/altus-control-plane` at `d2b9126f896c447a56bfe6cbe3e5923fcf3a9afa`; `/api/control/v1/session/current` returns503 `SESSION_FEDERATION_UNAVAILABLE`. `/health/ready` returns503 with admin_mutations/invitations/developer_mode/deployed_acceptance remaining. Thus the earlier approval blocker is resolved; central federation readiness and client registration remain actual service dependencies.

## Verification

Bridge branch: typecheck, build and 167 unit tests pass. Tests cover missing configuration, strict session envelope/identity/mode/expiry, revocation and outage, sealed callback tamper/expiry, permitted paths, query/mutation refusal, unsafe upstream responses, same-origin application logout, both cookie deletions and token-free cross-tab invalidation. Combined local integration with PR146–154 passes 257 unit tests, 16 dependency tests, typecheck and build. No tests failed or skipped. Integration revision before this documentation receipt: b3749d02.

Independent browser verification against source 9faae5bd7d95a8194a7dc664edff966fafecb66e passed four two-tab journeys: BroadcastChannel and storage-only fallback, each at 1280×844 and 390×844. Both tabs loaded isolated records, showed the exact review banner and selected a record. Logout in one cleared rows/selection/banner in both; retries and explicit refetch attempts produced zero additional business requests. Two initial business GETs stayed two; exactly one application sign-out POST occurred. Both tabs ended with unknown mode and suspended reads. No page errors; token-free cross-tab notice contained only a UUID. Source hashes remained identical before/after. This branch's old Properties denial count is corrected separately by PR151 and was included in combined integration. Isolated browser fixtures are test inputs only; they do not prove real-data operating journeys.

## Goal reconciliation and delivery receipt

| Requested outcome | Delivered source and evidence | Remaining acceptance |
| --- | --- | --- |
| Zero mock operating data | PR149/152 remove mounted owner fixtures, invented dashboard series/funnel, fixed badges and simulated-success file/requeue paths. Source scan finds no business Math.random/mock fixture path; random toast IDs are UI identities only. | Deployed-source audit after authorized release; no claim all legacy inert archives are deleted. |
| Backend attached | PR146/148 align safe projections to actual catalog; draft PR155 prepares protected transport/session lifecycle. | Control Plane verification, protected backend deployment identity/scope, data freshness and live journeys. Not connected yet. |
| Missing pages/navigation | PR147 restores historical destination inventory and individual legal, maintenance and accounting read pages; PR154 restores source-backed report templates/preview/CSV export. | Roughly 43 destinations still unavailable; unverified operations contracts remain gated. Inventory is not workflow completion. |
| Excellent dashboard/page workflow | PR153 redesigns dashboard context, KPI strip, actions and responsive states. PR151 fixes misleading Properties counts; PR147/154 improve operational/reporting workflows. Desktop/mobile isolated browser journeys passed. | Full remaining-page design and real-data runtime acceptance remain open. |

Verify, CodeQL and proof-pack workflows succeeded at the exact published heads for PR146–154. PR155 stays draft. No main merge or deployment has occurred. No paid external Claude/Grok jobs were launched; no direct execution channel was available. Internal review/browser workers completed their bounded assignments. Subscription/compute marginal cost was not metered here; no claim of zero execution cost is made.

Activation remains blocked on verified Control Plane registration, upstream deployment identity/protection, fresh real-data journeys and explicit release approval. No main merge or deployment is performed by this slice.

## Production host follow-up

The standalone host/configured-navigation follow-up passes typecheck, build and170 unit tests on its isolated branch. Actual HTTP tests cover SPA reload, immutable hashed assets, missing files, HEAD, mutation refusal, API-before-SPA behavior, encoded paths, dotfiles and symlink escape. Build identity cannot claim a known clean revision when Git evidence is absent or dirty. Configured workspace navigation requires current central attestation and makes no backend business request. Independent targeted source review passed15 checks with no identified credential leak or authentication bypass. No runtime configuration or deployment occurred.
