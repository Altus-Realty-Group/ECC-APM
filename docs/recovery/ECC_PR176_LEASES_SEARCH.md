# PR176 Leases search completion

**Branch:** grok/ecc-portfolio-list-readability-20261027  
**Base:** main c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e  
**Scope:** Leases page, page-local helper/styles, focused tests.

## Behavior
- Projected loaded rows and search-visible rows are separate.
- Loaded lease/active/MRR summaries are computed from the complete loaded collection. Search never changes them.
- UI shows “X matching of Y loaded leases.”
- Money, status, and missing-value rules are unchanged.
- Failure and denial still early-return before the search UI, so a failed refresh does not present a filtered total as current.

## Tests
`tests/unit/leases-search-filter.test.ts` covers tenant/property/status/ID match, trim, case, clear, no-match, and that filtering does not alter the loaded summary. `tests/unit/leases-list-search.test.ts` covers the labeled control and 44px/focus style.

## Limitations
- Success-path browser interaction requires a settled leases payload. Local preview returns the error path without a backend. Fixture-based unit proof is the acceptance for filtering.
- 390px viewport resize remains unsupported by the browser tooling.
- No live acceptance.

## Rollback
Revert the Leases search commits on this branch.
