# ECC-G3 / G4 / G5 Mounted Portfolio Truthfulness

**Repository:** Altus-Realty-Group/ECC-APM (ID 1058195656)  
**Branch:** grok/ecc-mounted-portfolio-truth-20261017  
**Base:** main bfe9540b7c0058e7368838117679b17ccc04e54a  
**Scope:** Mounted Owners.tsx, Leases.tsx, Tenants.tsx + portfolioTruth helpers.  

## G5 correction (2026-10-17)
- safeCardHref follows the existing positive-safe-integer policy (`Number.isSafeInteger(n) && n > 0`), matching RelatedRecord.relatedRecordPath. 0, -1, 1.5, "abc" and blank IDs produce no link; rows stay readable.
- summarizeActiveRent treats missing/unclassified status as making the loaded result explicitly uncertain/partial. Does not assume those leases active or inactive.
- Leases page notice surfaces the uncertainty when unclassifiedCount > 0.

## Prior (G4)
Field mapping aligned to server/mappings.ts LeaseOut / TenantOut / OwnerOut. Metrics labeled as loaded-result statistics.

## Evidence
Unit tests cover positive-safe-integer links, unclassified partial, zero/negative/missing rent. Typecheck/unit/dependency/build re-run after G5.

## Remaining
Backend connection still required for live data. Shared DataTable unchanged. Codex owns acceptance and shared adapter. No second PR.

## Rollback
Revert commits on this branch.
