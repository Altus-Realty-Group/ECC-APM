# Database Architecture Record

Repository: Altus-Realty-Group/ECC-APM
Standard: [Altus Supabase Architecture Standard](ALTUS_SUPABASE_ARCHITECTURE.md), version 1.0.0
Record status: Documentation bootstrap; domain inventory and live database binding are UNVERIFIED.
Last evidence review: 2026-10-12 (repository identity and source path review only; live state unverified)

This record does not assert that the application uses Supabase or that its schema is inefficient. Read existing schema, migrations, contracts and architecture documentation before completing the affected domain. Preserve established contracts and link existing records instead of duplicating them. Populate the affected slice in the next database-related PR; an unfilled section is not authority to invent entities or block unrelated work.

## Authority and deployment

| Item | Evidence / status |
| --- | --- |
| Owning application / domain | Not inventoried |
| Supabase project and environment, if applicable | Unverified; confirm from current non-secret configuration and live evidence |
| Other data stores / owning backend | Not inventoried; preserve current ownership until verified |
| Migration and generated-type locations | Not inventoried |
| Repo versus live schema drift | Not checked |
| Existing architecture / ADR / contract links | Add verified links before changing the affected domain |

Source inventory pointers at `8d8daf7e4d381d17bee5dd60af03125659fe3bb0`: `server/lib/supabase.ts`, `server/db.ts`, `shared/schema.ts`, `sql/`, `ecc-functions/` and `docs/contracts/`. Their presence establishes candidate source paths, not deployed schema, credentials, migration application, backend authority, RLS or runtime reachability. The restart plan identifies ownership conflicts and requires route-to-owner reconciliation before backend edits.

## Entity and relationship inventory

For each affected table/view/RPC, record: actual name and evidence ref; business purpose and row grain; canonical owner; PK/FKs and cardinality; uniqueness/checks and units; lifecycle/retention; RLS/grants; actual writers/readers; cache/snapshot status; related migrations. Distinguish source-declared, local migrated and live-verified facts. Add a Mermaid relationship diagram only from verified keys and cardinality.

## Read and write paths

| Business operation | UI/API caller | Query/RPC and canonical owner | Cache/invalidation and revision | Evidence |
| --- | --- | --- | --- | --- |
| Dashboard portfolio summary | `DashboardPage` via `useDashboardKpis` (`src/features/dashboard`) | `GET /api/dashboard/kpi/summary`. **No handler exists in this repository's server source**; owner unknown (#119). | TanStack key `["dashboard-kpis"]`, staleTime 30s, gcTime 5m. Purged on any 401/403 and on `ecc:session-boundary`; responses started under an earlier session epoch are rejected. | Source-declared only (frontend type and `kpiAdapter.ts`). Not live-verified. |
| Property card | `PropertyCardPage` via `usePropertyCard` | `GET /api/rpc/get_property_card?id=`: `server/routes/rpc.ts` reads `properties`, `units`, `leases` (source-declared, canonical owner not established, #119). Returns `property{id,name,type,address}` and `kpis{units,activeLeases,occupancyPct,avgRentCents}` only. | Key `["card","property",id]`, defaults staleTime 60s / gcTime 5m. Same purge and stale-session rules. No cross-entity placeholder data. | `server/routes/rpc.ts`, `src/shared/card-contracts.ts`. Not live-verified. |
| Portfolio collections (properties, units, leases, tenants, owners) | `Properties.tsx`, `Units.tsx` and the other portfolio pages via `useAll*` | `GET /api/portfolio/<collection>`: handlers in `server/index.ts` (source-declared). Approved contract is a raw array; the server source emits `{data, meta}` and different row field names than the pages read. Drift is open under #119. | Keys `["portfolio", <collection>]`, staleTime 60s. Same purge and stale-session rules; selections and triage lanes are cleared on denial and boundary. | `docs/contracts/ECC_PORTFOLIO_LIST_CONTRACT_V1.md`, `server/index.ts`. Not live-verified. |

## Values, assumptions and update behavior

| Field/domain | Source and units | Override scope / precedence | Clear/reset/reapply | Default propagation / snapshot version | Evidence |
| --- | --- | --- | --- | --- | --- |
| Dashboard `propertiesTotal`, `unitsTotal`, `revenue30dCents` | Counts and integer cents (frontend declared type) | Read-only display | Not applicable | None | Absent or `null` is unknown ("Not reported"); a reported `0` is a confirmed zero; negative, fractional or non-numeric values are a contract error and are never shown. Source-declared, unverified. |
| Dashboard `occupancyRate` / property card `occupancyPct` | Fraction 0..1 on the dashboard; integer percent on the card (server computes active leases / units, uncapped) | Read-only display | Not applicable | None | Different units on the two surfaces. Values outside 0..1 on the dashboard are a contract error. Server source emits `0` for no units, which the frontend cannot distinguish from a measured 0 (#119). |

Record applicability for existing and future scenarios, zero/null semantics, who may edit, conflict policy and reload/recalculation behavior. Do not bake scenario-number exceptions into the common resolver without a justified domain requirement.

## Efficiency baseline

| Operation and caller role | Workload/environment | Requests / rows / bytes | SQL and end-to-end latency | Evidence / limits |
| --- | --- | --- | --- | --- |
| Not measured | Unknown | Unknown | Unknown | No performance claim |

## Decisions, cleanup and compatibility

| Decision / affected objects | Reuse alternatives / rationale | Added / changed / retired | Consumer sequence / compatibility owner and removal trigger | PR / evidence |
| --- | --- | --- | --- | --- |
| Standard adoption | Establish a maintained design record before extending persistence | Documentation only | Inventory affected domain during next DB task | Initial adoption PR |
| Frontend read-cache identity scoping (`src/lib/sessionScope.ts`, `queryClient.ts`, `main.tsx`) | Reuse of TanStack Query's existing cache; no new store, table or persistence. No authentication transport was invented. | Added: purge-all on 401/403, session epoch, `ecc:session-boundary` event, stale-session response rejection, selection and triage clearing. Changed: dashboard and property-card contracts now fail closed (`ContractError`); `PropertyCard` kpis are nullable instead of defaulting to 0 and reject negative/fractional counts and cents. Removed: global `placeholderData`. | Any future sign-in/out or account-switch owner dispatches `ecc:session-boundary`. Compatibility owner: ECC frontend. Removal trigger: replace the event with the real auth layer's signal. | PR #113; source and local tests only; no live proof |

Record retention and dependency proof before retirement. Link larger decisions to existing ADRs or docs/database/decisions/. Preserve financial/legal custody.

## Verification and open work

- Complete the affected-domain inventory from actual source and verified database evidence when available.
- Trace representative read/write operations and changes through reload and recalculation.
- Measure before claiming efficiency gains; retain evidence limitations.
- Keep this record current in the same PR as architectural changes.

This bootstrap changes documentation only. It neither audits nor modifies operational data, schema, runtime, credentials or deployment.

## ORM package compatibility review — 2026-10-12

PR #121 proposes drizzle-orm0.44.7 to0.45.4 without schema or migration edits. `shared/schema.ts` is the concrete source consumer. Dependency regressions now import actual schema exports, inspect PK/FK/decimal/array metadata, exercise existing drizzle-zod insert/status validators, and compile parameterized PostgreSQL select/join/insert queries through a proxy that throws if execution is attempted. These source checks run in the existing Verify dependency step, with no new job/provider/browser activity. Exact-head CI must pass before merge.

No database connection, DDL, SQL execution, deployed identity, RLS/grant or server authorization proof is established. #119 remains open for actual backend/runtime ownership, privileged/synthetic-data findings and migration/export dependencies. Existing source schema is preserved; tests use isolated fixtures only. Rollback the package/test/documentation commit, never an applied migration. A package compatibility pass is not live database acceptance.
