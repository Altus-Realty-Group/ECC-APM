# ECC backend connection evidence - 2026-10-17

Read-only dependency investigation for ECC-APM. No other repository was changed.
Current ECC baseline: bfe9540b7c0058e7368838117679b17ccc04e54a.

## Route and authority decisions

| Candidate | Current source evidence | ECC connection decision |
| --- | --- | --- |
| ECC Vite API boundary | vite.config.js installs scripts/frontend-api-boundary.mjs in development and preview; every /api and /bff request is 503 | This is the immediate availability blocker. Do not remove it before selecting and protecting the real handler. |
| ECC Node server | server/index.ts mounts generic entity/RPC and portfolio handlers but is absent from start-replit.mjs | Not activated. PR146 covers generic entity reads only; portfolio/RPC scope remains unresolved. |
| ECC Python functions | .github/workflows/deploy.yml targets empirecommandcenter-altus-staging when ecc-functions changes | A source-declared deployment target, not evidence of current live deployment, identity or schema. Do not trigger this deployment while repairing frontend code. |
| Control Plane session federation | docs/contracts/control_session_federation_v1.contract.md, fetched from current main; blob ab3fdab29c40a6e62a0fe97e100e88cddd25f206 | Identity contract exists. Exchange/current-session are server-attested; application cookie and per-request checks are required. App access alone supplies no ECC property/owner scope. |
| Control Plane ECC portfolio summary | ECC_PORTFOLIO_SUMMARY_BACKING_TRUTH_PLAN_V1.md, blob e07b4d339a766272b12358aeebc247a4d16a4895 | Explicitly deterministic stub; no activated Supabase backing or proven membership authority. Reject as operating-record backend. Historical database observations are not fresh database proof. |
| Control Plane ECC portfolio assets | ECC_PORTFOLIO_ASSETS_CONTRACT_V1.md, blob 6baba0f0c598634ee0dfd8e82871bd0572576236 | Deterministic rows and financial/occupancy values; reject as operating-record backend. |
| DoorLoop backend dashboard | doorloop-sync-backend main ba2df60bf054d02edfb2f5d3ea359c9f11241089; api/dashboard-kpi-summary-direct/index.js and function.json | Candidate source only. Reads v_dashboard_kpi_summary via shared handleList; HTTP trigger is anonymous. Exact deployed handler and actor scope are unverified. |

## Concrete dashboard mismatch

The DoorLoop backend contract returns data as an array (one row), with metadata.
ECC normalizeDashboardKpis requires a raw object or data object with its own
field names and units. The two cannot be connected without a verified mapping.

The candidate dashboard handler also rewrites context.res to status 200 after
handleList, turns non-array body.data into [], and fixes totalCount to 1.
Therefore an upstream failed response can be hidden by a successful empty
response. This is source evidence, not a reproduced live incident. A proxy must
not bless that response as a verified zero portfolio. Its repair belongs to the
owning backend and needs a separate scoped assignment.

## Smallest remaining connection sequence

1. Reconcile the already-published ECC runtime with exact source/process/workspace identity; do not request another import based on stale issue119 instructions.
2. Establish the operational backend's deployed route/handler/SHA and database/environment identity from read-only evidence.
3. Verify the existing Control Plane registration and session endpoints. Never infer their current deployment or registration from historical checkpoints.
4. Prove the actor-to-record scope source. Neither the central account identity nor PR146's injected test resolver proves permitted owner/property IDs.
5. Align a single real portfolio read contract (fields, units, nulls, pagination, denial and freshness), then prepare the narrow protected transport change.
6. Verify real authorized list-to-card behavior and denied access before expanding to dashboard or historical operations.

No API target/base URL, authentication, credentials, environment, schema, grant,
operating data, workflow, provider call or runtime was changed by this discovery.

## Owner-supplied official DoorLoop reference

Owner supplied https://api.doorloop.com/reference/introduction on2026-10-17.
Direct page/markdown retrieval was unavailable, but official reference pages
were retrieved through indexed search. Relevant provider documentation:

- https://api.doorloop.com/reference/get-leases: lease/tenant relationships are
  available through GET /leases/tenants. Provider page_number is1-based;
  page_size defaults50 and allows up to1000; list responses report a total.
- That page distinguishes filter_status from filter_calculatedStatus. Its
  calculatedStatus ACTIVE excludes collection states that can still represent
  occupied/paying leases; the documented current-occupant route/filter is
  /leases/tenants?filter_status=CURRENT. Do not assume ECC's internal status field
  maps to either provider concept without lineage proof.
- https://api.doorloop.com/reference/rate-limiting: provider documents credential
  and IP limits, response rate headers and Retry-After handling. No request
  cadence, credentials, background runner or vendor call is enabled here.

These provider contracts do not prove ECC stored columns, money units, local
portfolio membership or actor permissions. Rent-unit and tenant-key conflicts
remain unresolved until the ingestion lineage and current schema are verified.
