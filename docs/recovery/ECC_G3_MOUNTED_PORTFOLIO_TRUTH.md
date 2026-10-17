# ECC-G3 Mounted Portfolio Truthfulness

**Repository:** Altus-Realty-Group/ECC-APM (ID 1058195656)  
**Branch:** grok/ecc-mounted-portfolio-truth-20261017  
**Base:** main bfe9540b7c0058e7368838117679b17ccc04e54a  
**Scope:** Mounted Owners.tsx, Leases.tsx, Tenants.tsx only.  
**Out of scope:** Server handlers, entity boundary, shared DataHub, Integrations, navigation, auth transport, other repos. Codex owns PR148; Claude owns PR146.

## Changes

- **Owners:** Removed hardcoded Harbor Capital / Crescent Partners fixtures. Uses existing `useAllOwners` + `accessGuard`. Loading / denied / error / verified-empty shown via StateNotice. No fabricated records.
- **Leases:** Replaced relative `useCollection` with `useAllLeases`. Failures surface as StateNotice (no $0 MRR, no "endpoint returned successfully"). Rent aggregation uses `knownRentDollars` / `summarizeActiveRent`: actual zero preserved, missing rent is not zero, partial active rents labeled. No invented field aliases.
- **Tenants:** Removed invented `status ?? "Current"`. Missing status is BLANK. Error/denied/empty handled by StateNotice; DataTable (and its empty chrome) only rendered on verified data.

## Evidence type
- Source inspection and unit tests on pure helpers.  
- No live database or published-app acceptance. Published app remains read-only observation.  
- Fixture proof is limited to the unit tests above; no mock operating records shipped.

## Remaining blockers
- Backend connection and verified-actor resolution still required for real data (consistent with R9 / PR146 notes).  
- Shared DataTable empty messaging left unchanged (out of scope); pages avoid invoking it on failure or verified-empty.  
- Mobile 390px and full keyboard/44px audit limited by inspection tooling; StateNotice Retry is 44px by existing component.

## Rollback
Revert this branch/commit. Navigation and recovery requirements unchanged.
