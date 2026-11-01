# ECC U06 operator cockpit — provenance labels

**PR:** #195  
**Branch:** codex/ecc-u06-operator-cockpit-20261101  
**Base:** 790ec073976e1dd764f6518760b11311c8b5eb9d  

## Change
Added an explicit provenance note on the dashboard: Revenue (30d) is reported revenue in cents, not NOI or collected cash. Missing occupancy history is unavailable, not a trend. Work, invoice and reconciliation producers are not bound.

## Preserved
kpiAdapter semantics: property/unit counts, occupancy fraction, revenue30dCents, reported occupancy history. Null remains unknown, never zero.

## Limitations
- 390px viewport resize remains unsupported by available browser tooling. Source CSS is not measured acceptance.
- No live data. Unaccepted work/invoice/reconciliation producers remain unavailable.
- Company workspace is not mounted.

## Rollback
Revert the provenance commit on this branch.
