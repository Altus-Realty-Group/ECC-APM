# ECC-C4: generic RPC dispatch and diagnostics containment

Lane: ECC-C4, one independent source-containment PR. Base main `bfe9540b7c0058e7368838117679b17ccc04e54a`.
Context: PR146 C3 head `5f8bff205b975ec7389a8752456dbc0ccc77b4d2` is neither extended nor duplicated here.
Evidence class: **source and isolated loopback HTTP tests only.** No live database, RLS, grant, deployed identity or runtime
was read. Whether any deployment mounts this router is unverified.

Scope: `server/routes/rpc.ts`, `tests/unit/rpc-containment.test.ts`, this file. No shared architecture-document edit.

## 1. What was removed

| Removed | Why it was dangerous (source facts at `bfe9540b`) |
| --- | --- |
| `POST /api/rpc/:functionName` | Ran `supabase.rpc(functionName, req.body)` on the service-role client with a caller-chosen function name and arguments. No actor, allow-list or scope. Write-capable. Returned database error text and, when unconfigured, a `501 supabaseUrl is required`. |
| `GET /api/rpc/diag/ids` | Unauthenticated; read one `id` from each of five tables with the service-role client. |
| `GET /api/rpc/debug_leases` | Unauthenticated; returned a full `leases` row sample plus the raw database error object. |
| `GET /api/rpc/simple_lease_test` | Unauthenticated; probed `leases` columns and returned data and error objects. |

None had a first-party caller: the only `src/` consumers of `/api/rpc/` are the five `GET get_*_card` reads in
`src/lib/ecc-resolvers.ts` (checked by search). Removal therefore changes no in-repo behavior.

## 2. New behavior

The router now registers only the five `GET` card routes. Every other path and method falls through to the app's existing generic
`/api` handler in `server/index.ts` (`404 {"ok":false,"message":"Not found"}`), which names no route, function, table, key or
configuration and is identical whether or not Supabase is configured. No terminal handler was added inside `rpc.ts`: the existing
`ownerCardAddressMapping` test evaluates `rpc.ts` against a stub router that only implements `get`, and changing that harness is outside
this lane. The unused `setContract` import was dropped. The five card handlers, their paths, parameters and response shapes are
byte-for-byte unchanged.

## 3. Proof (isolated; the real `getServerClient()` talks only to a loopback fake PostgREST that records every request)

`tests/unit/rpc-containment.test.ts`, 8 tests (the isolated app mirrors the production `/api` 404; test 1 asserts that fallback still exists in `server/index.ts` after the rpc mount):

1. Production keeps the generic `/api` 404 after the rpc mount (source assertion on `server/index.ts`), which is what the isolated app mirrors.
2. The router registers exactly the five `GET` card routes (introspected from the router stack); no POST route exists.
3. 4 methods (POST, PUT, PATCH, DELETE) x 9 function names (`exec_sql`, `pg_sleep`, `set_config`, `__proto__`, encoded path
   tricks, ...) x 5 bodies (including SQL text, injection-shaped keys, arrays and a 50 KB body): all `404`, identical body,
   **zero upstream requests**.
4. A POST to each card route name is not a card read: `404`, zero upstream requests.
5. The three diagnostics, in 7 path variants and GET, POST and HEAD: `404`, zero upstream requests.
6. Unknown paths: fixed body that matches none of `supabase|rpc|table|function|key|url|env|route`.
7. Unconfigured (fresh process, every Supabase variable deleted): removed and unknown paths return the same `404`; no
   `supabaseUrl is required` or variable names. If any removed path still reached `getServerClient()`, the constructor error would surface here.
8. Card registration intact without live reads: each card returns `400 missing id` without an id and `404 <entity> not found` with
   an empty fixture; every upstream request is a `GET /rest/v1/<table>` and none touches `/rest/v1/rpc/`. A fixture property
   still yields `{ property, kpis: { units: 2, activeLeases: 1, occupancyPct: 50, avgRentCents: 100000 } }`.

Mutation check: running the suite against the original `rpc.ts` from main fails the containment tests and passes the card-preservation test, so the tests detect the
old behavior and confirm the card contract did not move.

## 4. Residual blockers: the five card reads are NOT made safe to activate

Observed in the same isolated harness (a loopback fake; no real data), plus source:

| Blocker | Evidence |
| --- | --- |
| No actor, no scope | `get_owner_card?id=1` returned `200` with no identity of any kind and issued `owners`, `properties.owner_id` and `properties.ownerid` reads. Any caller can read any id. |
| Raw database text returned | An upstream failure surfaced as `500 {"error":"relation \"internal_secret_table\" does not exist"}`. All five handlers pass `e.message` through. |
| `select('*')` | Every card reads whole rows (including contact, balance and audit columns) and projects afterward; nothing is limited to an allow-list. |
| Vendor-id fallback lookups | When `id` is not numeric the handlers query vendor columns with the raw input: observed `tenants?doorloop_tenant_id=eq.abc-vendor`; the code also uses `doorloop_id` and `doorloop_owner_id`. |
| Guessed foreign key | `get_owner_card` queries both `owner_id` and `ownerid` and concatenates the results; the schema declares only `owner_id`. |
| Money units | `rent_cents` is read and returned as `rentCents` while `shared/schema.ts` declares `rent` as dollars (see PR146 proof §3). Unresolved. |

Proposed next slice (separate lane; `server/routes/rpc.ts` card handlers only): bind the same `resolveActor` and scope
intersection used by the PR146 entity boundary, project from `ENTITY_POLICY` fields instead of `*`, drop the vendor-id and `ownerid`
fallbacks, replace every error body with a fixed string, and add isolated tests mirroring `entities-read-boundary.test.ts`. Not
done here because it is explicitly out of scope and depends on the Control Plane resolver.

Other privileged surfaces that this change does not touch and that still block backend activation: the unscoped portfolio handlers
in `server/index.ts` (including the unauthenticated `POST /api/geocode/properties`, which writes `lat`/`lng`), and the anonymous
`ecc-functions/*` that use the service-role key.

## 5. Validation

At the head recorded in the PR report: `npm run typecheck`, `npm test` (unit), `npm run test:dependencies`, `npm run guardrail`,
`npm run build` and `git diff --check`; results are in the PR body. Not validated: any live read or RLS, whether any
deployment mounts this router, a bound Control Plane resolver.

## 6. Rollback

Revert the commit. It restores the removed handlers exactly. No schema, grant, migration, environment, deployment or
runtime-binding change.
