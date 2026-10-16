# R8-G linked-card completion

Status: RETURNED FOR REVIEW (R8-G V2) — browser proof blocked by environment

## Scope
Existing PR132 card files, tests/unit/recovery-linked-cards.test.tsx, e2e/recovery-linked-cards.spec.ts and this document.

## V2 validation attempt
- Confirmed branch/head ca64a206bd90bb745947427af27522b6630b0af1 (clean).
- Existing unit suite: 6 tests passed.
- Playwright Chromium install failed in this environment (setgroups / http method error). Browser journeys could not be executed here.
- Exact-head CI previously passed 119 unit and 16 dependency checks; Playwright is not part of existing CI.

## Source behavior confirmed by inspection and unit tests
- All reported owner properties rendered (no truncation).
- Current lease deduplicated.
- Invalid/missing IDs produce no link.
- Loading, empty, error/Retry and 403 states are access-safe.
- Session-boundary protection is shared and preserved; late prior-session responses do not restore details.

## Limitations
Full desktop/390px Playwright proof remains outstanding due to environment restriction on browser installation. Fixture proof is source-only. Not live-data acceptance.
