# ECC-G3 / G4 / G5 Mounted Portfolio Truthfulness

**Repository:** Altus-Realty-Group/ECC-APM (ID 1058195656)  
**Branch:** grok/ecc-mounted-portfolio-truth-20261017  
**Base:** main bfe9540b7c0058e7368838117679b17ccc04e54a  
**Scope:** Mounted Owners.tsx, Leases.tsx, Tenants.tsx + portfolioTruth helpers.  

## G5 correction (2026-10-17)
- safeCardHref follows the existing positive-safe-integer policy (`Number.isSafeInteger(n) && n > 0`), matching RelatedRecord.relatedRecordPath. 0, -1, 1.5, "abc" and blank IDs produce no link; rows stay readable.
- summarizeActiveRent treats missing/unclassified status as making the loaded result explicitly uncertain/partial. Does not assume those leases active or inactive.
- Leases page notice surfaces the uncertainty when unclassifiedCount > 0.

## Codex G5 follow-up (2026-10-17)
- Unexpected strings (including literal `unclassified`) and malformed non-string statuses now keep the rent summary partial. `reportedStatus` returns unavailable for non-string values instead of inventing printable classifications.
- Explicit active status is trimmed and case-normalized consistently. Only `active` contributes rent; the helper does not infer activity from aliases.
- Source evidence for known ended statuses is `server/lib/mapping.ts` `normalizeStatus`: ended, terminated, closed, past, inactive, cancelled and canceled. Those values can be excluded without making a known-active rent subtotal uncertain. Other non-active values remain conservatively unclassified; this does not assert a deployed status vocabulary.
- Two regressions failed on the prior helper (literal unclassified status and whitespace-padded Active) before the correction. Tests exercise both raw statuses and the mounted page's `reportedStatus(status) ?? BLANK` projection, including objects, booleans, numbers and arrays. Zero rent and missing rent retain their distinct meanings.
- Local validation: focused portfolio tests 6/6, full unit suite 158/158, dependency checks 16/16, full typecheck and build passed. Build reports the existing large-chunk warning. This is local source proof; no new mounted-browser, hosted, backend-binding or operating-data acceptance is claimed.

## Prior (G4)
Field mapping aligned to server/mappings.ts LeaseOut / TenantOut / OwnerOut. Metrics labeled as loaded-result statistics.

## Evidence
Unit tests cover positive-safe-integer links, unclassified partial, zero/negative/missing rent. Typecheck/unit/dependency/build re-run after G5.

## Remaining
Backend connection still required for live data. Shared DataTable unchanged. Codex owns acceptance and shared adapter. No second PR.

## Rollback
Revert commits on this branch.
