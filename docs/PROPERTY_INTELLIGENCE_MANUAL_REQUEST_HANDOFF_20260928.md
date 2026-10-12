# ECC property-scoped Property Intelligence request handoff

Status: frontend integration work order. No new endpoint, credential or live vendor call is enabled by this document.
Owner: ECC project manager, coordinating with the owner of ECC's server adapter and Property Intelligence.

## ECC source surfaces reviewed 2026-10-12

- `src/pages/card/property/index.tsx` loads `usePropertyCard(Number(params.id))`: the ECC property route uses a numeric local ID.
- `src/pages/integrations/corelogic.tsx` is a stub. `server/routes/config.ts` reports only a CoreLogic configuration flag; this flag does not establish a PI consumer or authenticated request route.
- Historical PI observations dated 2026-09-28 described UUID `sourceRecordId`, Altus property UUID, an active `normalized.property_identity_map` row for ECC, and consumer/endpoint policy prerequisites. Current PI schema, identity-map coverage, confidence rules and exact policies were not revalidated in this ECC source review. The PI owner must confirm its current approved contract before implementation; neither missing maps nor draft policy are asserted as current facts.
- ECC's frontend ownership contract forbids inventing backend business logic or API proxy targets here. Agree the backend owner and its exact contract before implementing the action.

## Project manager work

1. Resolve the canonical ECC property UUID or an approved stable UUID mapping for each numeric ECC property ID. Verify identity with a PI property using persisted evidence; do not send the numeric ID as `sourceRecordId` or infer identity from address similarity.
2. Agree with the PI owner on an ECC consumer profile, exact permitted snapshot field keys, supported detail endpoints, server authentication and per-request receipt shape. The PI worker and production policies must be ready before enabling provider execution.
3. Add a backend-owned, authenticated server route that binds ECC user, local property, verified PI identity and endpoint on the server. Historical proposed calls were PI `request_consumer_refresh` and `get_refresh_request_status`; confirm current owner contracts before using these names; never store PI or CoreLogic credentials in the browser.
4. Through that approved route, add a property-card manual action: explicit endpoint family and reason, known source date and expiry, confirmation of one allowance unit, pending/completed/blocked receipt, and a new read after completion. Missing source may be a deliberate first acquisition. Merely opening a card must never request a paid call.
5. Disable the action on missing/ambiguous identity, missing permission, unavailable PI, budget denial and unapproved endpoint. Show an operator-friendly reason without internal errors or vendor payloads.

## Acceptance

- Contract proof from the backend owner and PI owner before frontend adapter implementation.
- Tests for numeric-to-UUID identity, two matching PI properties, absent link, unauthorized user, duplicate clicks, pending status polling, denied/failed vendor request, and fresh read after completed publication. No mock claims of live CoreLogic data.
- Credentialed runtime proof must show a single explicitly requested PI receipt, budget reservation, archive/ledger, published field lineage and ECC display. Until then the action remains disabled and this is a handoff only.

No deployment, Supabase mutation, API proxy target change or workflow trigger is in scope for this documentation PR.

## Consolidated read requirements from PR #107

Before enabling reads, determine the active ECC backend/API authority and inventory callers and direct vendor paths from source and runtime evidence. Do not revive frozen legacy runtimes or invent a direct PI-to-browser contract. The approved ECC backend must enforce viewer authorization, resolve verified PI identity and return a minimal approved projection with provenance, freshness and explicit unlinked/denied/unavailable states. ECC retains ownership of portfolio and operational facts. Reading an asset never requests a paid provider call. Verify identity, isolation, stale/missing handling and receiver contracts in a separate implementation PR before activation.

This document supersedes the complementary 2026-09-25 work order in #107; that PR's branch and discussion retain its historical evidence. Cross-repository issue references are historical routing hints until revalidated by the owner. Main source review baseline: `aa66336be3aa865b42b862a945cda3b4d2207d2d`. Rollback: revert this docs-only consolidation. No central access, schema, provider, transport or deployment is activated.
