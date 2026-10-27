# ECC portfolio list readability and mobile layout

Successor to PR172 (card return navigation). Not part of PR172.

## Outcome
Make the five portfolio lists (Properties, Units, Leases, Tenants, Owners) readable and operable at desktop and 390px: search, filters, row links, spacing, keyboard, and error recovery.

## Scope
src/pages/portfolio/** and page-local styles only. No shared CardShell, navigation, resolvers, auth, or backend.

## Acceptance
- Search and filter controls remain usable at 390px without overflow.
- Record links go to the correct card and are at least 44px.
- Keyboard focus is visible.
- Loading, empty, error, and denied states stay truthful.
- Black/white/gold; no orange.

## Dependency
PR172 must land or be rebased before this implementation starts, so list pages are not edited concurrently with the card-return slice.

## Out of scope
Breadcrumb links, shared infrastructure, backend contracts, live data.
