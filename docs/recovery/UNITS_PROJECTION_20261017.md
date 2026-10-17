# Units producer projection correction - 2026-10-17

Repository: Altus-Realty-Group/ECC-APM (1058195656). Branch: codex/ecc-unit-projection-20261017. Base: 1278ab2cff5a789b171155c594ec7f13252022f5.

The historical units handler used select-star, guessed bedrooms/bathrooms/area/rent aliases, dropped studio zero via truthiness, made missing rent zero, ignored property-query errors and fell back to vendor IDs. A correct frontend projection cannot recover truth already lost in that response.

## Change and contract

The actual handler now invokes exported `readUnitCollection`, which uses the exported pure `projectUnits` in `server/lib/unitProjection.ts`. The source projection uses previously retained live catalog evidence; no new database inspection was performed. Units read exactly id/property_id/unit_number/unit_label/name/beds/baths/sqft/status/market_rent. Properties read only id/name for deduplicated actual property_id references, in batches of at most 250. Missing referenced properties, provider errors, malformed/missing/unexpected fields and duplicate/unsafe IDs fail instead of returning a falsely successful join. Genuine null property references or names remain unreported.

Studio zero, half baths, zero square feet/rent and null remain distinct. Finite numeric values are not coerced from strings. Label precedence is explicit unit_label, unit_number, name. Null source values never fall back to unrelated aliases. **marketRent remains the unchanged raw market_rent value on the legacy wire. Dollar/cents lineage is unresolved; no conversion or verified monetary-unit claim is made.**

The existing 5000 unit cap remains, with deterministic id ordering and exact count. Response data retains UnitOut fields; additive metadata returned/limit/truncated distinguishes the selected subset from totalCount. Empty-array/positive-count inconsistency fails. Full-portfolio pagination is not implemented. The UI must keep loaded-result labels. The handler returns a fixed generic 503 for read/projection failures without database/provider text.

## Proof and limits

Nine focused tests execute the pure projection and real query/read orchestration against an injected in-memory recorder: zero/null/fractional fields; explicit raw rent preservation; prohibited aliases/conversions; malformed/unsafe/duplicate rows; exact canonical joins and failed joins; exact bounded query/order/count; genuine empty reads; unit/property/count failures; 251-property batching. A source assertion verifies the mounted handler invokes that tested reader and no longer carries old star/vendor/truthiness logic. The server is never imported or booted by these tests.

This is source-only correction. It does not bind or deploy the historical backend, create authentication, resolve actor scope, verify live PostgreSQL/Supabase behavior or certify current data freshness. No schema, grant, data, credentials, Control Plane, Azure, environment, dependency, workflow or vendor activity changed. Existing backend identity/access defects still prohibit activation. Shared database architecture documents the exact read path, relationships, null/unit semantics, metadata and limits.

Rollback: revert this source/test/documentation commit; no database rollback.

Local validation passed: focused 9/9, full unit suite 251/251, dependency checks 16/16, full typecheck and guardrail/build. Build retains the existing large-chunk warning. The narrow exported query-client interface is adapted from the SDK with an explicit unknown boundary to avoid recursive generic instantiation; all response rows/counts still undergo runtime validation. No compiler diagnostic is suppressed or excluded. Hosted checks remain pending publication.
