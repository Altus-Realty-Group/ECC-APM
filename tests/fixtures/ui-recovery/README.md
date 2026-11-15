# UI Recovery Synthetic Fixtures (ECC-R03)

These fixtures are **synthetic only**. They never enter operating readers, production adapters, routes, builds, or live data. Permanent review label: SYNTHETIC REVIEW FIXTURE — NOT OPERATING DATA.

## Purpose

Deterministic fixtures for design review and metric-consistency proof. Codex owns presentation, JSX, CSS, navigation and final UI. Grok owns only these test/fixture files.

## Scenarios provided

- **populated**: fully known values
- **zero**: recorded zeros (distinct from unknown)
- **unknown**: null / absent amounts and counts
- **partial**: some known operating values, some missing (not an error outcome)
- **disconnected**: no known operating values (error/unavailable posture)
- **denied**: exercised through `deriveDashboardStatus`; prior cached values are withheld
- **long-content**: long synthetic strings for layout stress (no real PII)

## Accepted contracts reused exactly

- `DashboardKpis` from `src/features/dashboard/kpiAdapter.ts`
- `deriveDashboardStatus` from `src/features/dashboard/dashboardStatus.ts`
- L1: `LegalAward`, `LegalMatter`, `totalAwards` from `shared/legal/contracts.ts`
- L5: `LedgerProjection` from `shared/legal/ledger/model.ts` (actual typed fixture)
- L6: `WorkflowProjection` / `ProjectionOutcome` from `shared/legal/workflow/projections.ts` (actual typed fixture)

## Proposed presentation fixtures

Financial, location and leasing examples that go beyond the accepted summary contracts live in `proposedPresentation.ts`. They are **explicitly proposed presentation fixtures**, not accepted backend contracts, not evidence of operating data, and must not be bound into production readers.

Deterministic `ProposedLeaseRow` arrays support MRR assertions (known subtotal, unknown rents, recorded zero, excluded ended leases). Currency is explicit when known.

## Metric challenges proven by the accompanying unit tests

- Occupancy denominator: occupied eligible units / eligible units when eligible > 0; zero denominator is not divided (no NaN, no false 0%); wholly unknown occupancy remains null, not 0%.
- Active-lease count is consistent across same-scope occupancy and MRR fixtures and is never silently treated as occupied-unit count.
- Loaded MRR: known nonnegative monthly contract rent from explicitly active leases in the stated scope, with currency and partial-coverage count. Not collected cash, NOI or whole-portfolio revenue merely because some rows loaded. Wholly unknown MRR (null) is distinct from confirmed zero.
- Award count: distinct by award identity; joint obligors do not multiply the award; unknown amount ≠ recorded zero.
- Denied outcome via the accepted dashboard boundary withholds prior cached values.
- Counts, money (integer cents), identities and dates stay consistent across the fixture set.

No random generators. No real personal records. No provider calls.
