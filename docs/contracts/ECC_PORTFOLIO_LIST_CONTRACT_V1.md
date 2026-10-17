# ECC PORTFOLIO LIST CONTRACT V1

This file records the existing consumer response boundary for canonical API portfolio endpoints (`/api/portfolio/*`). This source contract does not prove authorization or deployed backend identity.

## Applies To
- `GET /api/portfolio/properties`
- `GET /api/portfolio/units`
- `GET /api/portfolio/leases`
- `GET /api/portfolio/tenants`
- `GET /api/portfolio/owners`

## Request Contract
- Paging behavior is handler-specific. This repair does not introduce request limit/offset handling.
- Properties and Units retain their existing fixed maximum of 5000 returned collection records; exact metadata is distinct from returned length.

## Response Contract
- The existing `src/lib/ecc-resolvers.ts` `toRows` consumer accepts a raw array or an object containing a `data` array. This corrects the former raw-array-only documentation; no consumer behavior is changed.
- Scalar/null/array entries are rejected. A `rows` envelope, null, malformed response or failed read is not a successful empty list.
- A successful confirmed empty read may return `[]` or `{ data: [], meta: ... }`. Errors must not become successful empty results.
- Envelope metadata is not currently retained by `useAll*` collection hooks. Pages must describe loaded records, not full-portfolio completeness. Per-handler counts and paging behavior are not generalized across all portfolio endpoints.

```javascript
[
  {
    "id": 1,
    // ... record fields
  }
]
```

## Error State Contract
- Missing dependencies or unconfigured states must trigger a `503 Service Unavailable`, optionally returning `{ ok: false, error: "Server misconfigured" }`.
- Do not return blank 500 pages. Do not crash the node process.

## Properties source adapter correction - 2026-10-17

The existing Properties handler returns `{data,meta}`. Its projection uses the catalog-confirmed canonical address fields and maps `address_street1` to the existing page field `street_1`. `name/type/class/city/state/zip/street_1/lat/lng/active` preserve null; explicit false activity and zero coordinates remain values. The page reads the existing occupancy wire key `occPct`, not `occupancy_pct`.

`units` counts only a completely returned exact-count related-unit query using canonical `units.property_id`; incomplete or failed related reads fail the handler. `occPct` is null because this collection has no verified occupancy/status classification policy. No status aliases or occupied/vacant assumptions are introduced, even for zero units. Property metadata reports exact totalCount separately from returned/limit/truncated; it is not a claim that the frontend retained or displayed all records. Query errors/malformed reads return a fixed 503, never raw database diagnostics. See `docs/recovery/PROPERTIES_PROJECTION_20261017.md` for bounds and proof limits.
