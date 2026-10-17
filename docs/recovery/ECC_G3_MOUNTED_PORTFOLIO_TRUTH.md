# ECC-G3 / G4 Mounted Portfolio Truthfulness (correction)

**Repository:** Altus-Realty-Group/ECC-APM (ID 1058195656)  
**Branch:** grok/ecc-mounted-portfolio-truth-20261017  
**Base:** main bfe9540b7c0058e7368838117679b17ccc04e54a  
**Scope:** Mounted Owners.tsx, Leases.tsx, Tenants.tsx + portfolioTruth helpers.  
**Correction (G4):** Field mapping aligned to server/mappings.ts LeaseOut / TenantOut / OwnerOut. Metrics labeled as loaded-result statistics. Invalid IDs unlinked. Search reset on access loss.

## Source shapes used (not invented)
- LeaseOut: id, propertyName, unitLabel, tenants[], status, start, end, rent (dollars)
- TenantOut: id, name, email, phone, propertyName, unitLabel, type, balance
- OwnerOut: id, company, name, email, phone, active

## Changes
- Render propertyName, tenants joined, start/end, propertyName/unitLabel, company/name.
- Rent: non-negative finite only; zero preserved; missing/invalid flagged not coerced.
- Counts/MRR labeled "LOADED ..." / "Loaded MRR"; unknown status not counted as active.
- safeCardHref: blank/invalid IDs produce no link (row remains readable).
- useResetOnAccessLoss clears page search.

## Evidence
Unit tests cover source-shaped fields, zero/negative/missing rent, partial loaded MRR, safe links. Typecheck/unit/dependency/build re-run after correction.

## Remaining
Backend connection still required for live data. Shared DataTable unchanged. Codex owns acceptance and shared adapter. No second PR.

## Rollback
Revert commits on this branch.
