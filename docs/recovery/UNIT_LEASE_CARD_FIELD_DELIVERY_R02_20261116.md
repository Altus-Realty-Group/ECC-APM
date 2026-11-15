# Unit and lease card field delivery (ECC-R02)

Baseline: `main` at `bae05740`. Source only. Supplements the field-binding sheet in draft #248 (not on main yet); when #248 lands, its "Existing accepted frontend card shapes" rows for Unit and Lease should be read with this page. No UI, CSS, navigation, route, tab, backend target, credential, live SQL or activation changed.

## Defect, reproduced against the real producer

`server/routes/rpc.ts` (`get_unit_card`, `get_lease_card`) emits names that `src/shared/card-contracts.ts` did not accept. Zod strips unknown keys, so the values vanished silently while the pages read the canonical names:

| Producer emits | Page reads | Before (parsed card) | After |
|---|---|---|---|
| `unit.label` | `unit.unit_label` (title, Overview) | `""` | `"A-101"` |
| `lease.rentCents` | `lease.rent_cents` (Hero, Overview) | `null` (key absent, so "Monthly Rent" blank) | `125000` |
| `lease.start`, `lease.end` | `lease.start_date`, `lease.end_date` (Overview) | `undefined` | `"2026-01-01"`, `"2026-12-31"` |
| unit card `lease.rentCents` | (no field) | stripped | `lease.rent_cents` |
| lease card `unit.label` | `unit.label` (Overview) | stripped | `unit.label` |

Reproduction: `tests/unit/card-field-delivery.test.ts` drives the real router against a loopback fake PostgREST (the `rpc-containment` pattern, no real database or vendor) and parses the actual JSON with the real contracts. Original change: 11 of 13 failed before, 13 of 13 pass after. Correction: the 7 reconciliation tests (3 updated, 4 new) failed against the first implementation, which let an explicit `null`/`""` fall back to the other spelling; all 20 pass now.

## Mapping decision (schema level, resolver unchanged)

The mapping sits in the contract, the one place every card parse passes through, so `src/lib/ecc-resolvers.ts` needed no edit. Each alias maps to exactly one canonical field. Reconciliation is presence-aware: each spelling is ABSENT (key missing or `undefined`), UNKNOWN (explicit `null`, or `""` for text and dates) or KNOWN.

| Canonical | Alias | Result |
|---|---|---|
| absent | absent | unknown (`null`; `""` for unit label) |
| absent | any | the supplied spelling stands (an absent alias may fall back) |
| unknown | unknown | unknown |
| known | equal known | that value (recorded `0` is known) |
| unknown | known | contract error (either order) |
| known | different known | contract error |

An explicit "no value" is therefore never silently overridden by the other spelling, and a known value is never silently dropped. Errors name the field only, never a value. A recorded `0` is a value, not a wildcard. Unknown keys are still stripped; no passthrough. The same rules cover `LeaseCard` and the lease nested in `UnitCard`.

- **Unit label**: `unit_label` (canonical) or `label`; empty/absent is `""` as before.
- **Rent**: `rent_cents` or `rentCents`. Integer cents, non-negative (was any number, including fractions and negatives, which would have rendered a wrong amount). Absent or `null` is unknown (`null`). `0` stays `0`. No unit conversion, no dollars, no currency inference.
- **Dates**: `start_date`/`start`, `end_date`/`end`. Exact calendar date `YYYY-MM-DD` (leap years honoured). `""`, `null` and absent are unknown (`null`). A time, offset, locale text or an impossible date such as `2026-02-30` is a contract error: a business date is not shifted by guessing a time zone.
- Identity validation, nullable relations and session clearing are untouched (`id` still a required number; relations still default `null`; the resolver still goes through `sessionFetchJSON`).

## Unresolved producer and data dependencies (not fixed here; server was read-only)

1. **Missing rent becomes 0.** The producer uses `n(lease.rent_cents, 0)`, so a lease with no recorded rent is delivered as `0` and the consumer cannot tell it from a true zero. The pinned test `KNOWN PRODUCER DEPENDENCY` documents this. The producer should emit `null` when absent (a separate, explicitly approved server change).
2. **Date column type is unverified.** The architecture record confirms `leases.rent_cents` is integer; it does not confirm `start_date`/`end_date` types (the stale ORM declares timestamp). If the live columns return timestamps, the strict date contract will reject them and the card will show an error. Producer must emit the business date part, or a deliberate contract extension is needed once the type and its time-zone meaning are verified.
3. **Unit rent is not delivered.** Pages read `unit.rent_cents` (unit Hero "Rent", Overview "Market Rent") but the producer emits no unit rent and market rent is a different concept from contract rent. Left blank/unknown; not mapped from the lease.
4. **Unit card lease selection.** The producer takes the first lease row for the unit with no status filter, so it may be an ended lease. Selection rule is a producer decision.
5. **Out of scope, still stripped:** lease `property.name`, tenant-card lease `rentCents`/unit/property ids, unit `beds`/`baths`/`sqft`, deposits, parties. These keep their pending status in the binding sheet (F04, F06, F07).

Nothing here establishes that a producer is mounted, authorized or live; these cards still need actor and scope handling before activation.

## Validation

`npx tsc --noEmit`, `npm run guardrail`, `npm run test:unit` (78 files, 762 tests pass), `git diff --check`. Mutation checks (remove the conflict check, the calendar check or the integer check; treat 0 as unknown or `""` as known; let an unknown spelling fall back, in either or one direction; drop the equality check) each fail the suite. No hosted run is claimed for the head.
