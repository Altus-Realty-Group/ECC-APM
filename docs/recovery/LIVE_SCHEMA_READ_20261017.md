# Live read projection reconciliation -2026-10-17

## Authority and evidence

Dion explicitly requested backend connection and zero mock data. The current DoorLoop pipeline workflow points to ssexobxvtuxwnblwplzh.supabase.co. Read-only information_schema queries on that corroborated historical ECC store established the projected columns below. No credentials or operating records were fetched. This is live catalog evidence, not current dataset, authorization, RLS effectiveness, deployed API or runtime alignment proof.

## Corrected projections

| Entity | Verified projection decision |
|---|---|
| properties | id/name/type/class/active; address_street1/address_city/address_state/address_zip; lat/lng/updated_at. Removed nonexistent property_address/address/street_address/full_address aliases. |
| units | id/property_id/name/unit_number/unit_label/beds/baths/sqft/status; market_rent and explicitly named rent-cent columns; updated_at. Removed nonexistent rent/marketRent/unit_name/condition/unit_condition. |
| leases | id/property_id/unit_id/tenant_id/status/start_date/end_date/rent_cents/updated_at. No rent/start/end columns exist. rent_cents is integer; this raw explorer performs no money conversion. |
| owners | Existing id/company/name/active projection is present in the catalog; unchanged. |
| tenants | Remain unavailable: existing generic policy has no proven actor-to-record predicate. Presence of tenant keys alone does not authorize access. |

Contact, banking, tax, DOB, vendor identifiers, raw provider payloads and balances remain excluded. No extra field is authorized solely because it exists. Actor-first ordering, scope intersection, fixed errors, exact-count paging and noVerifiedActor default remain unchanged.

The old proof document's source-only schema assumptions are preserved as chronology and superseded by this dated catalog check. Data Hub's paired request must select rent_cents. Stale ORM declarations need separate reconciliation; do not generate or apply a migration from their mismatch.

## Limits

Historical backend owner AltusDD/empirecommandcenter-backend and DoorLoop ETL both declare the same staging target. Deployed API identity still needs reconciliation. Stored entity updates/sync observations are old. Central session registration and actor-to-record grants are not verified. No backend is activated by this source correction. No schema, RLS, grant, data, environment, secret, workflow or deployment change.

## Validation

Exact source tests exercise allowed live rent_cents, rejected nonexistent aliases/vendor/sensitive fields and unchanged denial/scoping/page guards. Full unit179/179, typecheck and guardrail/build passed locally. Hosted exact-head checks are required after publication. Existing source/query harnesses are isolated; no privileged live read was activated.

Rollback: revert this projection/test/documentation follow-up; no database rollback.
