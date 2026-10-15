# R6-G: canonical property address read mapping

Status: IMPLEMENTED (R6-G V1) — RETURNED FOR REVIEW

## Scope
Only:
- server/lib/mapping.ts
- server/routes/rpc.ts
- tests/unit/propertyAddressMapping.test.ts
- docs/database/DATABASE_ARCHITECTURE.md (source-only note)
- docs/recovery/R6_PROPERTY_READ_MAPPING.md

## Decision
Canonical columns (`address_street1`, `address_city`, `address_state`, `address_zip`) take precedence.
A present canonical field is never replaced by a conflicting legacy alias.
Explicit null or empty canonical is treated as unavailable; legacy fallback is permitted only when the canonical key is absent.
Malformed non-string values are not coerced.

`rpc.ts` `addrFrom` now reuses the tested `mapAddress` helper. Response keys, IDs and status codes are unchanged.
`active` / `is_active` semantics remain explicitly unresolved.

## Validation
Focused unit tests cover conflicting aliases, legacy-only, null/empty, malformed, immutability and wire shape.
No operational network access. Synthetic fixtures only.

## Limitations
Source-only. Not live-readiness or freshness proof.
