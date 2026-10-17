# PR146 generic entity read boundary: corrections and proof

Lane: ECC-C3, existing PR146 only. Base main `bfe9540b7c0058e7368838117679b17ccc04e54a`; PR146 head before this
correction `6f30c3bc93829179d44ecbd30a742c0a3ab0ed91`.
Evidence class: **source and isolated local tests only.** No live database, RLS, grant, deployed identity or runtime was
read. Field names are source-declared (`shared/schema.ts`), not live-verified.

Scope: `server/lib/readBoundary.ts`, `server/routes/entities.ts`, `tests/unit/entities-read-boundary.test.ts`, this file.
Unchanged by design: actor-before-database ordering, scope intersection (`IN` on the entity's scope column), the field
allow-list, fixed generic denial bodies, and `noVerifiedActor` as the production default. Nothing here authenticates anyone.

## 1. Request contract (`GET /api/entities/:table` and `/:table/:id`)

| Key | Accepted | Otherwise |
| --- | --- | --- |
| `select` | `*` (= the allow-list) or comma list of allow-listed columns | 403 `not permitted` |
| `limit` | digits only, >= 1; lowered to `MAX_ROWS` (500) | 400 `invalid request` |
| `offset` | digits only, >= 0 | 400 `invalid request` |
| `order` | exactly one `<allow-listed column>.<asc\|desc>` (Data Hub sends `id.desc`) | malformed, bare, multi-key or empty column: 400; column outside the allow-list: 403 |
| `<column>` | allow-listed column, value `eq\|lt\|lte\|gt\|gte.<value>` | non-allow-listed column 403; other operator or empty value 400 |
| repeated key | n/a | 400 |

Ordering always ends in an `id` tiebreak (default `id.asc`), so `offset` paging is deterministic. By-id reads force
`limit=1, offset=0` and ignore caller paging. No allow-listed column collides with `select|limit|offset|order` (tested).

## 2. Response contract

Success: `200 { data: Row[], meta: PageMeta }`.

| `meta` field | Meaning |
| --- | --- |
| `returned` | rows in `data`. **Not** the total. |
| `totalCount` | rows matching the actor's scope and the filters, from the database's exact count, ignoring `limit`/`offset` |
| `limit` | page size actually applied (a request above 500 reports 500) |
| `offset` | offset applied |
| `truncated` | `offset + returned < totalCount` |
| `nextOffset` | `offset + returned` when truncated, else `null` |

Previously `totalCount` was `rows.length`, so a 500-row cap looked like a complete 500-row table. Nothing in `src/` reads
`meta.totalCount` (checked by search), so the redefinition has no in-repo consumer impact. Consumers must treat
`truncated: true` as an incomplete read and either page with `nextOffset` or refuse to present totals.

Failure bodies are fixed strings: `unauthenticated` (401), `not permitted` (403), `not found` (404), `invalid request`
(400), `unavailable` (503), `read failed` (500). None echoes a table, column, value, id or database text.

### Malformed database successes

A database result that reports no error is accepted only if the plan's shape holds; otherwise it is `500 read failed`,
never an empty list: `data` is an array of plain objects; every row's keys are a subset of the selected columns (a row
carrying an unselected column is rejected, not filtered); `count` is a non-negative safe integer; `data.length` equals
`min(limit, count - offset)`; and a by-id read has `count <= 1`. A genuinely empty read (`[]`, `count 0`) is a complete
`200` with `totalCount: 0`. An `offset` past the end is reported by the database as a range error and surfaces as the
generic `read failed`; clients should only use `nextOffset`.

## 3. Data Hub reconciliation (actual caller shapes)

Caller: `src/pages/DataHub.tsx` through `useDataHubEntities` and `Entities.*` (`src/lib/ecc-api.ts`), as sent on current
main and unchanged in PR148 (`25adab9d`). Not edited here.

| Caller request | Before (PR146 `6f30c3bc`) | Now |
| --- | --- | --- |
| `GET /api/entities/{owners,units,properties}?order=id.desc&limit=N` | 403 (`order` treated as an unknown column) | 200 when an actor is bound; ordered `id desc` |
| `GET /api/entities/leases?order=id.desc&limit=N` with no `select` | 403 | 200 when an actor is bound |
| same, `select=doorloop_id,property_id,unit_id,primary_tenant_id,rent_cents,status,start_date,end_date` | 403 | **403 (kept deliberately)**, generic body, no database call |
| `GET /api/entities/tenants?...` | 403 (no verified scope path) | 403 (unchanged) |
| any request with no verified actor | 401, no client created | 401, no client created (unchanged) |
| `select=*` | allow-list | allow-list (unchanged) |

### Unresolved schema mismatches (not widened)

`shared/schema.ts` is the only column declaration in the repository. Three Data Hub lease columns disagree with it:

| Requested | Declared in `shared/schema.ts` | Other source use | Decision |
| --- | --- | --- | --- |
| `doorloop_id` | present, but a vendor identifier | n/a | Excluded by policy (vendor ids are not readable). Data Hub must stop requesting it. |
| `primary_tenant_id` | absent; `tenant_id` declared | read by `server/index.ts`, `server/routes/rpc.ts`, `src/lib/ecc-contract.ts` | Not allow-listed. Needs the schema owner to say which column is live. |
| `rent_cents` | absent; `rent decimal(10,2)` declared (dollars) | read by `server/index.ts`, `rpc.ts`, `card-contracts.ts` (cents) | Not allow-listed. Cents versus dollars is a money-unit conflict, not a rename. |

Narrowest compatible request that works today: `select=id,property_id,unit_id,tenant_id,status,start_date,end_date,rent`
(tested). Adopting it, or confirming the live columns so the policy can change, belongs to the DataHub lane and the schema
owner; it is not decided here. Tenants stay unavailable until a verified owner/property relationship exists for them.

## 4. Privileged RPC forwarding: read-only inspection and containment proposal

Not modified. Source: `server/routes/rpc.ts`, mounted at `/api/rpc` in `server/index.ts` before any guard.

Findings (source facts at `bfe9540b`; reachability in any deployment is unverified):

1. `POST /api/rpc/:functionName` calls `supabase.rpc(functionName, req.body)` with the service-role client. The function name
   and arguments are caller-controlled; there is no actor check, allow-list or scope. It is a write-capable path.
   It returns `error.message` verbatim and `data || {}`.
2. Its only first-party callers are five `GET` card routes (`src/lib/ecc-resolvers.ts`). Nothing in `src/` calls the POST.
3. `GET get_{property,unit,lease,tenant,owner}_card` use the service-role client with `select('*')` and no actor or scope;
   they match by `id` or a vendor-id fallback column (`doorloop_id`, `doorloop_owner_id`, `doorloop_tenant_id`).
4. `GET /diag/ids`, `/debug_leases`, `/simple_lease_test` are unauthenticated diagnostics. `debug_leases` returns a full
   `leases` row sample plus the raw database error object.
5. All failures return `e.message`, disclosing database text.

Proposed follow-up PR (separate lane, `server/routes/rpc.ts` and tests only):

- Delete the generic `POST /:functionName` handler. It has no first-party caller. If a named function is later needed, add it
  to an explicit map of `{ name -> argument schema, scope rule }` and default everything else to `404 not found`.
- Delete `/diag/ids`, `/debug_leases`, `/simple_lease_test`.
- Put `resolveActor` and the same scope intersection in front of the five card reads, derive the card projections from
  `ENTITY_POLICY` fields instead of `select('*')`, and drop the vendor-id fallback lookup.
- Replace error bodies with the same fixed strings; keep detail in server logs only.
- Tests mirroring this file: unbound actor denied before any client, arbitrary function names and bodies never reach
  `rpc()`, cross-scope card id indistinguishable from missing, no database text in any body.
- Before binding any backend, the schema owner should confirm read-only that no database function accepts arbitrary SQL
  text (the earlier `exec_sql` finding in the restart plan); service-role bypasses grants, so an exposed function would be
  callable through this route today.

The portfolio handlers in `server/index.ts` and the anonymous `ecc-functions/*` share the same privileged-client pattern and
remain separate activation blockers, as recorded in `AUDIT_RECONCILIATION_20261017.md` (PR148).

## 5. Required follow-up to `docs/database/DATABASE_ARCHITECTURE.md` (not edited here)

PR146's own section ("R9-C generic entity read boundary") should be amended by its owner to say:

- Add `order` (`<column>.<asc|desc>`, allow-listed columns, `id` tiebreak) and `offset` to the policy summary; keep "repeated keys
  and bad limits are refused" and add that `limit`/`offset` accept digits only.
- Replace "Rows are capped at 500" with the response contract in section 2: exact count, `meta.truncated`, `nextOffset`; and state
  that `meta.totalCount` previously equalled the returned length.
- Add the malformed-success rule (section 2) and that a database row with an unselected column is a failed read.
- Record the three unresolved lease columns (section 3) as open schema questions, source-declared versus other source use,
  with money units (`rent` dollars versus `rent_cents`) called out.
- Replace the RPC bullet "Not covered" with the findings in section 4.
- Evidence label stays "source-only and isolated tests; not live-verified".

## 6. Validation (isolated fixtures; no database, vendor or network call)

Run at the final head recorded in the PR report:

- `npm run typecheck`: pass.
- `npm test` (unit): 20 files, 178 tests, 0 failed, 0 skipped.
- `npm run test:dependencies`: 16 passed.
- `npm run guardrail`: PASS. `npm run build`: built.
- Boundary suite `tests/unit/entities-read-boundary.test.ts`: 26 tests, covering real Data Hub shapes, ordering and
  hidden-column ordering, the historical lease selection, 15 malformed-success shapes on list and by-id reads, empty-read
  completeness, cap/limit/offset truncation and continuation, paging syntax, by-id paging override, and scope intersection on
  ordered, paged reads. Mutation check: restoring "non-array becomes empty" or "truncated is always false" fails the suite.

Not validated: any live read, RLS or grants, the real PostgREST count and range behavior (the fake client models the
documented `count: 'exact'` and `range` contract), a bound Control Plane resolver, the published runtime.

## 7. Rollback

Revert the correction commit; PR146's first commit stands alone. No schema, grant, migration, environment, deployment or
runtime-binding change. With `noVerifiedActor` the router still denies every request.

## Superseding live catalog evidence -2026-10-17

The earlier source-only field inventory and rent-vs-rent_cents hold are superseded by LIVE_SCHEMA_READ_20261017.md. Actual corroborated ECC schema has leases.rent_cents (integer), not rent. The policy now uses verified columns and excludes nonexistent aliases across properties/units/leases. Scope/actor behavior remains unactivated; no deployed, migration or operational-data acceptance follows from this correction.
