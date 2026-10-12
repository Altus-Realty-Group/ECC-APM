# Altus Supabase Architecture Standard

Standard version: 1.0.0 | Adopted in this proposal: 2026-10-02

## Design before adding persistence

Before changing schema or database integration, inspect the affected existing entities, relationships, migrations, types and consumers. Compare reuse, correcting a relationship, a constrained field, a view/query or RPC, and a new table. Record the choice before implementing DDL. Keep the review proportional to the affected domain; a local fix does not require redesigning the entire app.

For every new table, document business purpose, row grain, canonical owner, independent lifecycle, PK/FKs/cardinality, uniqueness/constraints, units/nulls, authorized readers/writers, retention, expected access pattern and why existing structures are inadequate. A screen, scenario number or workaround alone does not justify a table. State net objects added and any obsolete objects to retire. Fewer tables is not automatically better; preserve useful normalization, event history and reproducible snapshots.

## Canonical ownership and relationships

Use database first, governed API fallback second, calculation last. Keep one canonical owner/writer per fact. Use internal UUID identity and explicit provider-ID mappings. Enforce meaningful FK, uniqueness and check constraints. Specify money/rate/time units, timezone handling and null/zero semantics.

Separate imported observations, current editable operational values, scoped assumptions/overrides, calculated results and immutable snapshots in meaning; choose their physical representation from business requirements. Do not duplicate canonical values across tables, JSON and application state without an explicit synchronization contract. Avoid universal EAV/JSON models for core relationships.

Document owning app and accepted API/event contract for shared domains. Do not assume shared credentials or database, create sibling canonical copies, or activate Control Plane integration through a schema cleanup.

## Edits and assumptions

Define field-level precedence and scope; an authorized explicit override must not be silently replaced by defaults or provider data. Document edit, clear override, reset, reapply assumptions and source replacement semantics. Zero is a value; null/clear, unavailable and errors are different states. Do not use truthiness fallback or hide permission/schema errors with estimates.

Use field applicability/capabilities rather than scenario-number branches so new scenarios can use the common resolver. Document whether linked scenarios follow changed defaults, require reapply, or stay on a versioned snapshot. Preserve historical custody while allowing ordinary current-value edits.

Prove the full path: UI edit -> authorized write -> committed value/revision -> cache invalidation -> reread/recalculation -> visible result -> reload. Handle conflicting edits, retries, failed saves and old async results explicitly. For cost changes such as 85000 to 65000, require persistence and relevant recalculation without another table, hardcoded scenario path or unintended cross-scenario mutation. These numbers describe a regression fixture, not production data.

## Measure application and database efficiency

Measure both SQL execution and the surrounding application: calls per operation, serial waterfalls, redundant reads, selected columns, rows/bytes, pagination, cache churn, provider calls and latency. Record workload/environment/caller role and distinguish observed evidence from hypotheses. Do not call the database a bottleneck from table count alone or prescribe denormalization without measurement.

Prefer bounded projected queries, relational joins, batched keys, deduplication and appropriate independent parallel reads. Add indexes for actual filter/join/order/RLS patterns with before/after plans and write/storage tradeoffs. An ordinary view composes reads; a materialized view/cache requires measured benefit and a refresh/invalidation/recovery contract.

Use bounded EXPLAIN first. EXPLAIN ANALYZE executes its statement; isolate mutating functions, writes and expensive workloads. Treat query plans and logs as potentially sensitive. Consult current official documentation for version-dependent behavior:
- https://supabase.com/docs/guides/database/query-optimization
- https://supabase.com/docs/guides/database/debugging-performance
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/postgres/indexes
- https://www.postgresql.org/docs/current/sql-explain.html

## Security, change and retirement

Prove intended caller authorization, RLS/grants, invoker/definer behavior, function search_path and view exposure. Keep service-role credentials on trusted servers. Never weaken tenant isolation to improve speed or bypass an app defect.

Keep migrations in source control; do not rewrite applied migrations. Compare repo and deployed schema before live changes. Stage compatible expansion, bounded backfill with reconciliation, canonical writer/read cutover, then deliberate retirement. Record temporary compatibility owner and removal condition. Verify dynamic consumers, jobs, policies, triggers and retention before declaring an object unused; empty rows or recent unused-index counters are insufficient.

Use real migrated PostgreSQL and real read/write paths for database proof where relevant. Use isolated test fixtures, never mock operational data. Select tests for the affected behavior, including cross-tenant denial and permitted caller, concurrency and edit/reload when applicable. Preserve required merge checks; skipped checks are not passing evidence.

## Repository maintenance and review

Maintain DATABASE_ARCHITECTURE.md next to this standard. Keep app-specific facts, relationships, authority, read/write paths, assumptions, cache rules, evidence, decisions and retirement work there or in linked existing ADRs. Update affected entries in the same PR as schema, ownership, query contract, assumptions or caching. Record unknowns honestly; documentation is not proof of a live migration.

PRs must state architecture impact, alternatives considered, objects added/changed/retired, ownership and consumer changes, compatibility/sequence, relevant proof, performance evidence or lack of measurement, and documentation paths. Split independent DB/code/UI concerns into small PRs with explicit dependencies.

Version shared-rule changes and reconcile replicas deliberately while preserving each app's record. Enforcement starts through AGENTS.md and reviewer checks; this proposal adds no automated CI gate. This standard supplies design requirements, not authorization to mutate production, spend money or deploy.
