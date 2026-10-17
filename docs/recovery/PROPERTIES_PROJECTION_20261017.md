# Properties adapter projection repair - 2026-10-17

Base: `9f281cd1735910684ed372b8c4ed7700f6baab5b`. Repair of the existing source adapter and its paired mounted page; no backend ownership, endpoint, actor/session mechanism, database object, writer or runtime binding is introduced. No deployment or live connection is performed.

## Defect and behavior

The existing `GET /api/portfolio/properties` handler omitted the verified street column, selected vendor identifiers and joined units through a vendor fallback, read a potentially capped unit collection without completeness proof, guessed occupancy from status aliases, changed unknown activity to false and coordinate zero to null. It emitted `occPct` while the mounted Properties page read `occupancy_pct`.

The handler now delegates to `server/lib/propertyProjection.ts`. The verified source projection from `LIVE_SCHEMA_READ_20261017.md` is `id,name,type,class,active,address_street1,address_city,address_state,address_zip,lat,lng`. Properties are ordered by id with an exact count and the existing 5000 maximum. Fields/row shapes/types/IDs/duplicates are validated. Canonical `address_street1` maps to the already expected page field `street_1`; there is no address alias fallback. Missing text remains null, false activity remains false, unknown activity remains null and coordinate zero remains zero. Coordinates must be finite and within latitude/longitude bounds.

Related units select only `id,property_id`, scoped by the loaded canonical property IDs in batches of at most 250. There is no global unit scan, vendor-ID join or status read. Each query orders by id, requests an exact count and caps its returned rows at 5000. Count mismatch, truncation, query failure, malformed/duplicate IDs or records outside that batch fail the entire read with fixed 503 text. Only completely returned batches support per-property unit totals, including confirmed zero. A very large batch therefore becomes unavailable rather than displaying a partial count; paging or a verified database aggregation is separate work.

`occPct` is always null, including properties with no units. No approved occupancy/status classification policy was found, so neither unknown statuses nor zero units become a measured 0%. The existing `PropertyOut` fields now represent nullable source text/activity/occupancy honestly. The mounted page reads the established `occPct` wire field; malformed/nonfinite/negative/above-100 values remain unreported. Existing `toRows` passes nulls through without inventing defaults. It accepts raw arrays and data-array envelopes; the portfolio contract document now corrects its stale raw-array-only claim.

Property metadata distinguishes exact totalCount, returned, limit and truncated. The current collection hook discards metadata; the UI retains its loaded-record language and makes no portfolio completeness or freshness claim. Source update time is not selected or fabricated.

## Architecture and performance boundaries

Reused the existing properties/units entities and actual `units.property_id` relation. No table/view/RPC/schema/grant/index/cache/dependency/environment change. The existing adapter is still source-only; actor-to-record authorization and deployed binding remain unresolved and unchanged. A successful local query fixture is not production authorization or data freshness.

The read cost is one bounded property query plus at most 20 related-unit queries for 5000 properties. Only two unit columns are selected, and each batch is limited to 5000. Tests prove query shape and batch sizes, not live query performance or a transactionally consistent snapshot across queries. No EXPLAIN, database, vendor or operating-record read was run. Reusing the old global/dual-key scan was rejected because it cannot establish complete canonical counts. Occupancy calculation was rejected because its business classification policy is unverified.

## Validation

Eight new projection regressions plus eight Properties render cases (including the new percentage-bound test) passed: canonical query columns/keys/count/order/limit; 251-property batching; null/false/zero fidelity through the actual reader and collection adapter; confirmed empty; exact/truncated metadata; failed/missing/count-mismatched unit reads; malformed/duplicate/out-of-batch IDs; fixed error text; and projected data through the mounted Properties presentation. No source fixtures are application defaults.

Full unit suite 303/303, dependency checks 16/16, full typecheck and guardrail/build passed. Existing large-bundle advisory remains. No browser, published runtime, database, RLS/grant or live performance acceptance claimed. No deployment, cloud/credential or Control Plane action.

Rollback: revert this source/test/documentation change. No database rollback applies; do not bind the historical service as part of rollback.
