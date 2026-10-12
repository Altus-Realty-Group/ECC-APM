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
| Not yet inventoried | Unknown | Unknown | Unknown | No operation traced |

## Values, assumptions and update behavior

| Field/domain | Source and units | Override scope / precedence | Clear/reset/reapply | Default propagation / snapshot version | Evidence |
| --- | --- | --- | --- | --- | --- |
| Not yet inventoried | Unknown | Unknown | Unknown | Unknown | Unverified |

Record applicability for existing and future scenarios, zero/null semantics, who may edit, conflict policy and reload/recalculation behavior. Do not bake scenario-number exceptions into the common resolver without a justified domain requirement.

## Efficiency baseline

| Operation and caller role | Workload/environment | Requests / rows / bytes | SQL and end-to-end latency | Evidence / limits |
| --- | --- | --- | --- | --- |
| Not measured | Unknown | Unknown | Unknown | No performance claim |

## Decisions, cleanup and compatibility

| Decision / affected objects | Reuse alternatives / rationale | Added / changed / retired | Consumer sequence / compatibility owner and removal trigger | PR / evidence |
| --- | --- | --- | --- | --- |
| Standard adoption | Establish a maintained design record before extending persistence | Documentation only | Inventory affected domain during next DB task | Initial adoption PR |

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
