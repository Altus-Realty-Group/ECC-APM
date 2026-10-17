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



## Migration/export transitive dependency review - 2026-10-12

ECC PM scoped dependency overrides to ExcelJS's UUID (`11.1.1`) and the
`@esbuild-kit/core-utils` loader's esbuild (`0.25.12`). Direct ExcelJS,
Drizzle kit and ORM versions, source schema, services and runtime targets
remain unchanged. Upstream advisories are GHSA-w5hq-g745-h8pq and
GHSA-67mh-4wv8-2f99. Scope these overrides to their actual consumers;
remove them when upstream dependencies resolve patched compatible versions.

Source consumer: `server/services/ownerTransferService.ts` generates an
ExcelJS Summary sheet using transfer ID, old/new owner IDs, effective date
and status. An isolated dependency test round-trips those column values
without importing the service, loading credentials or invoking storage/DB.
Extended icon-set formatting also exercises ExcelJS's CommonJS UUID v4
consumer. A loader test compiles and evaluates isolated TypeScript using
the exact scoped esbuild dependency.

Drizzle kit generated SQL from existing `shared/schema.ts` into a temporary
directory: 10 tables, no database connection or SQL execution. Generated
files are validation artifacts only and are not committed or applied.
The local audit changed from six moderate findings to zero known findings
in this registry snapshot. This is package evidence, not live security,
authorization, report completeness or migration acceptance. Backend
ownership and the service's accounting-sheet TODO remain tracked in #119.
Rollback this dependency/test/documentation commit; no database rollback
is involved. Exact-head CI is required before merge.

## Frontend transfer containment - PM review 2026-10-13

The three registered transfer/admin recovery routes now render an unavailable
notice. Their previous controls called absent hook methods or assumed an
unverified ownership-changing contract. The dormant alternate page and dry-run/
preflight components use the same notice. No write request, fake successful check,
unsupported report download or browser admin-token instruction remains in those
components. Previous source is recoverable at worker head
`e61104061b8c2263541bb11fb4cc4e0128e021df`. This retires frontend controls only,
not database records or backend endpoints. Verified backend contract, actor
authorization, confirmation, audit and idempotency are prerequisites to restore
those controls. #119 remains the backend ownership dependency; full typecheck
continues reporting 23 server diagnostics rather than excluding them.

## Source-only backend recovery - 2026-10-13

Dion approved a separate compiler-recovery lane with unfinished write operations
unavailable. This does not confirm that Node or Python is the deployed backend.
The Node transfer URL families are intercepted before the historical transfer
router and return 503 without data access; undefined handler bodies are retired
into Git history. The legacy alternative admin-sync router also returns 503
instead of referencing a missing module. Existing canonical sync routing and
provider activation/cadence are not changed.

Synthetic maintenance/accounting handlers and arbitrary debug-SQL handling now
return unavailable rather than fabricated records or SQL results. The dormant transfer service now exports unavailable methods without importing
database, storage, audit or vendor writer clients. Direct service calls reject
with status 503; no positive transfer/report/audit result is fabricated. Its former
implementation is preserved in Git history. Existing audit writer and actor/schema
fields are unchanged. No schema migration or live audit-column proof.

Provider adapters validate the fields they already read from responses: Dropbox
entries/search/link, Graph token/task/bucket/items and Google geocode coordinates.
Malformed shapes are errors rather than invented empty results. API URLs, scopes
and credential references remain unchanged. Native-fetch binary upload uses a
byte-preserving Uint8Array copy; local test calls are intercepted. The old geocode
wrapper never returned provider provenance, so an undefined output property was
removed instead of fabricating a provider label.

Backend-only compiler and regression proof runs in the existing dependency-test
step, with no new workflow, job, matrix or provider call. Full application
typecheck remains independently required when integrated with #113. Source
containment is not deployed authorization, live schema, database or runtime proof.
Rollback this source/test/documentation commit; previous handlers remain in Git.
Do not re-enable quarantined operations until authoritative contracts, actor
authorization, data truth, confirmation and audit/idempotency are verified.

### Integration compiler gate

With #113 and #124 integrated, Verify runs the full application typecheck as a
mandatory step. The temporary backend-only compiler regression is removed to
avoid duplicate subset work; recovery regression tests remain. Full compiler
proof still also runs in the established proof-pack check. No compiler exclusions
or suppressions are introduced. Live data and backend authority remain unverified.

## R6-G source note (2026-10-15)
Canonical address columns take precedence over legacy aliases in read mapping. See docs/recovery/R6_PROPERTY_READ_MAPPING.md. Active/is_active semantics remain unresolved.

## R7-G activity decision (2026-10-16)
Property activity is canonical-first via mapPropertyActive. Present active (including false) wins. Exact booleans only. String "false" is unavailable. Legacy is_active only when active is absent and exact boolean. Wire false for unavailable does not mean known inactive. See docs/recovery/R7_GROK_PROPERTY_ACTIVITY.md.

## R9-C generic entity read boundary (2026-10-16)

`GET /api/entities/:table[/:id]` previously accepted any table name, selected `*` with the server's privileged client and
returned database error text. It now sits behind `server/lib/readBoundary.ts` and `server/routes/entities.ts`:

- Order: verified actor, then policy and scope validation, then the database. Anything earlier than the database is a fixed
  body (`unauthenticated`, `not permitted`, `not found`, `unavailable`, `read failed`) that never echoes a table, column,
  value, id or database message. Unverified callers also learn nothing about environment setup.
- Explicit policy (`ENTITY_POLICY`, fields from `shared/schema.ts`, source-declared, not live-verified): `properties`,
  `units`, `leases`, `owners`. Contact details, vendor ids, balances and audit columns are not readable. `select=*` means the
  allow-list. Filters on non-allow-listed columns, unknown operators (formerly silently ignored, i.e. over-returning),
  repeated keys and bad limits are refused. Rows are capped at 500.
- Scope: rows are limited with `IN (scope ids)` on `properties.id` / `units.property_id` / `leases.property_id` /
  `owners.id`. `tenants` has no column linking a row to an owner or property, so it is unavailable rather than inferred
  through leases. An explicit out-of-scope filter is 403; an out-of-scope or missing id is an identical 404.
- **Identity is not bound.** This repository has no verified-actor mechanism: the only server authorization is the shared
  `ADMIN_SYNC_TOKEN` on sync routes, and the Control Plane consumer (#106) was retired. No login, user store, role fallback
  or identity contract was added. The router takes an injected `ReadActorResolver`; production uses `noVerifiedActor`, so
  every request is denied until Control Plane supplies a resolver that returns the actor's permitted owner/property ids.
  Legitimate scoped reads are proven with an isolated test resolver only.
- Consumer impact: `Entities.*` in `src/lib/ecc-api.ts` (DataHub) will receive 401 until the resolver is bound.
- Not covered: `/api/rpc/*` (`server/routes/rpc.ts`) and the portfolio handlers in `server/index.ts` use the same privileged
  client without an actor check (the latter is another lane's). Source-only evidence; no live database, RLS or grants checked.
- Rollback: revert this commit. No schema, grant, migration or environment change.

## Data Hub audit repairs - 2026-10-17

Data Hub entity reads retain the existing /api/entities/<entity> URL family and
request fields, including order=id.desc and historical lease selections. PR146
still needs caller compatibility review; this UI repair does not declare its
field allow-list or paging contract accepted. No backend binding is enabled.
The Data Hub hooks now use the existing sessionFetchJSON and session epoch in
query keys. A late previous-session result is rejected; HTTP denials retain
status for the existing global cache purge. Raw arrays and the existing data /
results array envelopes are accepted; malformed successes fail as contract
errors instead of empty records. No total cardinality is inferred.

The mounted Data Hub transfer initiation/approval/authorization/execution and
transfer-context controls are removed, matching the existing transfer-route
containment. Their workflow remains incomplete and must be restored with
verified actor scope, contract, confirmation and audit/idempotency proof.
No backend endpoint, database object, role, grant or data is changed. The
original UI remains in Git history. Owner search remains a read-only request;
its legacy source handler returns 410 and this is surfaced as failure.

Integration health now explicitly fetches its existing health/config endpoints
instead of relying on a missing default query function. Pending/error reads
show a notice before health badges or sync controls can render. Browser build
configuration uses import.meta.env rather than Node process.env. The legacy
success-path token/sync interface is NOT accepted as Control Plane integration;
that remains separate unfinished work. These changes prove source behavior,
not live backend authorization or production readiness. Roll back the PR to
restore the prior consumer implementation; no database rollback applies.

## C3 boundary review and consumer alignment - 2026-10-17

PR146 corrected head5f8bff205b975ec7389a8752456dbc0ccc77b4d2 remains a
source-only proposal, not an activated reader. Its query contract accepts one
allow-listed column.asc/desc order with an id tiebreak, and digits-only limit /
offset. The cap remains500; returned rows are distinct from exact totalCount.
Metadata includes returned/totalCount/limit/offset/truncated/nextOffset. Invalid
DB success shapes, missing/non-integer exact counts, unselected returned columns
or page/count inconsistencies fail with a generic read error. No source consumer
used the old totalCount definition. Live PostgREST/RLS/grants remain unverified.

Data Hub now requests the compatible source-declared lease projection:
id,property_id,unit_id,tenant_id,status,start_date,end_date,rent. It no longer
requests vendor doorloop_id or unresolved primary_tenant_id/rent_cents. This
explorer shows raw source fields; it does not translate rent into cents or claim
a live schema. The conflicting historical money/tenant columns remain a live
schema-verification prerequisite. No policy field was added to silence a denial.

The shared portfolio collection adapter now rejects scalar/null/array rows before
page mapping. A malformed successful envelope cannot crash the mounted page or
become a verified empty collection. This does not validate all row fields or
resolve portfolio response drift and completeness. Array and data-array
envelopes remain accepted for the existing consumers. No endpoint or backend
binding changes. A combined local browser review reproduced the old [null]
crash; the source adapter fix is separately tested from Grok's page mappings.

RPC findings remain activation blockers: caller-controlled privileged POST
forwarding, unauthenticated diagnostics/raw DB errors, unscoped card reads and
vendor-ID fallback lookup. The next bounded containment slice may remove unused
generic forwarding/diagnostic surfaces; it must not claim the remaining card or
portfolio reads authorized. No RPC or Azure Function was changed here.

## Live catalog read reconciliation -2026-10-17

The historical ECC store is corroborated as project ssexobxvtuxwnblwplzh through the current DoorLoop pipeline's explicit host reference and historical portfolio startup evidence. Read-only information_schema queries confirmed live projections for properties/units/leases/owners. ENTITY_POLICY now excludes nonexistent property and unit aliases and uses leases.rent_cents (integer); leases.rent/start/end do not exist. No money is converted in this explorer. Shared ORM declarations remain stale and are not migration authority.

This supersedes the earlier source-only lease field decision above. The paired Data Hub consumer must request rent_cents before connection. Missing field is not zero and raw count/paging remain distinct from completeness. Source read boundary default noVerifiedActor is unchanged. The backend owner/deployment collision, stale ingestion, Control Plane registration/session and record grants remain blockers; no live reader/authentication is activated. See docs/recovery/LIVE_SCHEMA_READ_20261017.md. No schema/grant/data/environment/credential changes.

## Live catalog consumer correction -2026-10-17

Read-only information_schema on the corroborated historical ECC store confirms leases.rent_cents integer and no leases.rent column. This supersedes the prior source-only request decision above. Data Hub now selects id,property_id,unit_id,tenant_id,status,start_date,end_date,rent_cents, matching the corrected PR146 allow-list. This is a raw explorer, with no inferred currency conversion or active backend binding. ORM schema remains stale. Existing privacy/actor/scope constraints stay unchanged; source presence never grants access. No live data/schema/grant/env changes. Protected API identity and current data completeness remain unresolved.


## Local email template authoring —2026-10-17

Communications Templates uses tab-local user input only. No database object, backend endpoint or stored template library is introduced. JSON export excludes recipient/completion values; email draft export is a local file download, not delivery. Session epoch changes and reload clear the workspace, including pending imports. No provider, schema, grants or backend binding changes. See docs/recovery/EMAIL_TEMPLATES_20261017.md.
