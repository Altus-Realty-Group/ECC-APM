# ECC C3/G3 acceptance review - 2026-10-17

Reviewed source heads: PR146 5f8bff205b975ec7389a8752456dbc0ccc77b4d2,
PR148 0eb6188321f99f3422eec1b05c08128f31502f81,
PR149 1311093386b03370bd1df8bbbb6570e556fe0c02. Grok's branch had no
submitted PR; Codex opened draft PR149 without changing its product code.
All three exact heads passed hosted Verify. CodeQL/proof-pack skipped while
draft; skipped checks are not passing acceptance.

A disposable local combined branch merged these source deltas without changing
main. The shared architecture append conflict was resolved by retaining both
sections. Combined full typecheck and185 unit tests passed. This is isolated
source proof, not a merge or runtime authorization.

## Claude C3

Request ordering, malformed-success rejection and exact-count paging corrections
are supported by source inspection and the combined suite. Keep PR146 unactivated:
noVerifiedActor still denies requests and real record scope remains unbound.
Data Hub's three incompatible lease fields were not evidence for expanding the
backend policy. Codex aligned its explorer projection to source-declared fields
and recorded remaining live schema/money-unit questions in the shared record.

## Grok G3 - return for correction

PR149 removes mounted owner fixtures and fake Current tenant defaults, and fixes
the relative lease request. Its current page projection still drops actual source
fields. server/mappings.ts declares LeaseOut.propertyName, tenants[], start/end;
server/index.ts emits those names. PR149 instead reads property_name/property,
tenant_name/display_name and start_date/end_date. TenantOut likewise emits
propertyName/unitLabel while the page still reads snake-case counterparts.
These are current source facts; deployed shape is not claimed.

Browser reproduction on combined source at1280x844 and390x844 used an isolated
LeaseOut response with propertyName='Fixture property', tenants=['Fixture tenant'],
start='2026-01-01', end='2026-12-31', rent1200. Lease KPIs appeared but the expected
property cell was absent at both widths. First-property assertions failed before
later name/date assertions; their mapping omissions are independently evident
in source. Acceptance remains held until actual returned values render.

A separate malformed owners response {data:[null]} reproduced a global
'Contract violation / Cannot read properties of null (reading id)' view at both
widths. This belongs to the shared collection adapter, which Codex fixes in
PR148 rather than editing Grok's scoped files. It is not a Grok-only defect.

Required PR149 corrections: use documented source projections without inventing
aliases or units; preserve actual record names/dates; label lease counts/rent as
loaded-result statistics instead of proven whole-portfolio totals; account for
missing statuses before calling rent totals complete; reject invalid negative
or non-finite rent rather than displaying it as ordinary monthly rent; and keep
invalid IDs readable without broken card links. Add mounted-page regressions
for actual source shapes and loading/denied/failed/empty/partial/zero states.
No shared-resolver changes are assigned to Grok.

No main merge, deployment, environment/schema/data/grant/credential change or
live operating-data request was performed. Remaining RPC/card/portfolio scope
and anonymous Azure-function findings continue to block backend activation.

## Codex follow-up verification

Shared-reader correction on PR148: own source typecheck/build and157 unit tests
passed. Four committed DataHub/Integration browser journeys passed again at both
widths after lease-request alignment. Refreshed disposable combined source passed
186 unit tests. The two malformed-owner browser regressions that failed above now
passed at1280 and390, with the page failure notice in place and no page errors.
The lease mapping failures remain unresolved and are not reported as passing.
