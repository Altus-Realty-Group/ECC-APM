# R7-G canonical property activity

Status: IMPLEMENTED (R7-G V1) — RETURNED FOR REVIEW

## Scope
Only:
- server/lib/mapping.ts
- server/index.ts (property activity consumer only)
- tests/unit/propertyActivityMapping.test.ts
- docs/database/DATABASE_ARCHITECTURE.md (activity note)
- docs/recovery/R7_GROK_PROPERTY_ACTIVITY.md

## Decision
`mapPropertyActive` is canonical-first.
Present `active` wins, including `false`. Exact booleans only.
Null, strings (including `"false"`), numbers and objects are unavailable; never truthy-coerced.
Legacy `is_active` is used only when canonical `active` is absent and the value is an exact boolean.

Property list response uses `mapPropertyActive(row) ?? false`.
The `false` fallback satisfies the existing boolean wire contract and does not establish known inactivity.

Owners and other entity status fields are out of scope and unchanged.
Accepted address mapping is preserved.

## Validation
7 focused unit tests pass.
String `"false"` regression is closed.
No operational network access. Synthetic fixtures only.

## Limitations
Source-only. Not live-readiness or freshness proof.
