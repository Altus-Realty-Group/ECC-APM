# UI Recovery Synthetic Fixtures (ECC-R03)

These fixtures are **synthetic only**. They never enter operating readers, production adapters, routes, builds, or live data. Permanent review label: SYNTHETIC REVIEW FIXTURE — NOT OPERATING DATA.

## Purpose

Deterministic fixtures for design review and metric-consistency proof. Codex owns presentation, JSX, CSS, navigation and final UI. Grok owns only these test/fixture files.

## Scenarios provided

- **populated**: fully known values
- **zero**: recorded zeros (distinct from unknown)
- **unknown**: null / absent amounts and counts
- **disconnected**: partial coverage / missing series or sources
- **denied**: status-level denial with no data surface (see tests)
- **long-content**: long synthetic strings for layout stress (no real PII)

## Accepted contracts reused exactly

- `DashboardKpis` from `src/features/dashboard/kpiAdapter.ts`
- L1: `LegalAward`, `LegalMatter`, `totalAwards`, `parseMoney` from `shared/legal/contracts.ts`
- L5: `LedgerProjection` shape references from `shared/legal/ledger/model.ts` (no mutation)
- L6: `WorkflowProjection` / `ProjectionOutcome` from `shared/legal/workflow/projections.ts`
- D1 references remain read-only; no version writes

## Proposed presentation fixtures

Financial, location and leasing examples that go beyond the accepted summary contracts live in `proposedPresentation.ts`. They are **explicitly proposed presentation fixtures**, not accepted backend contracts, not evidence of operating data, and must not be bound into production readers.

## Metric challenges proven by the accompanying unit tests

- Occupancy denominator: occupied eligible units / eligible units; unknown and excluded units called out separately; active-lease count is never silently treated as occupied-unit count.
- Loaded MRR: known nonnegative monthly contract rent from explicitly active leases in the stated scope, with currency and partial-coverage count. Not collected cash, NOI or whole-portfolio revenue merely because some rows loaded.
- Award count: distinct by award identity; joint obligors do not multiply the award; unknown amount ≠ recorded zero; verified monetary awards counted separately.
- Counts, money (integer cents), identities and dates stay consistent across the fixture set.

No random generators. No real personal records. No provider calls.
