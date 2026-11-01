# ECC U06 operator cockpit — operator language and KPI proof

**PR:** #195  
**Branch:** codex/ecc-u06-operator-cockpit-20261101  
**Head:** after this commit  

## Change
Provenance note now uses operator language: Revenue (30d) is reported revenue, not net operating income or collected cash. Missing occupancy history is unavailable, not a trend. Work orders, invoices and reconciliation are not available until their sources are connected. Implementation vocabulary (“cents”, “producers”) removed from the operator-facing note.

## Proof
- KpiCard renders reported revenue and keeps missing unknown (not $0.00).
- Occupancy fraction renders as percent, not a count.
- Dashboard source contains verified drilldowns (Review properties, Review leases).
- Typecheck pass.

## Limitations
- Full DashboardView mounted render is blocked by page-local CSS import under node:test. Pure KpiCard and source assertions are the retained proof.
- 390px viewport resize remains unsupported. Source CSS is not measured acceptance.
- No live data.

## Rollback
Revert this commit on the branch.
