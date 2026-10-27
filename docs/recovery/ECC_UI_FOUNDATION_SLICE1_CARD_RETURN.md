# ECC UI foundation — card return navigation (PR172 complete)

**PR:** #172  
**Branch:** codex/ecc-plan-ui-foundation-20261027  
**Base:** c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e  
**Scope:** Five card index pages, focused regression, this note. No shared CardShell, navigation, resolvers, auth, or backend.

## Changes
- Property loading state now renders the existing `backLink`.
- All five cards expose “Back to {list}” (`ecc-btn ecc-touch`) on success, invalid-link, and loading/error/denied paths.
- No breadcrumb links added.

## Focused regressions
`tests/unit/card-return-navigation.test.tsx`
- CardLoadNotice: correct list href on loading, error, and denied for property/unit/lease/tenant/owner.
- Source assertion: each card index hardcodes the correct list destination and touch class; property loading uses `{backLink}`.

## Commands / results
- `node --import tsx --test tests/unit/card-return-navigation.test.tsx`: 2/2 pass
- `npm run typecheck`: pass
- `npm run build`: success

## Browser evidence (isolated local preview, http://127.0.0.1:5173)
- `/card/property/abc`: “That property link is not valid.” / “Back to properties”. Link height 44px. No overflow.
- `/card/unit/1`: “This unit could not be loaded.” / “Back to units”. Link height 44px. No overflow.
- Click “Back to units” → navigated to `/portfolio/units`.
- 390px viewport resize is not supported by the available browser tooling (`page.setViewportSize` is not a function). Mobile acceptance is not claimed.

## Limitations
- Success-path return was verified in source and unit tests. Live success-path rendering requires a settled card payload; the local preview has no backend, so only invalid and error paths were exercised in the browser.
- No live acceptance. Fixtures are not operating records.

## Successor
Portfolio-list search/filter readability and 390px layout will be a separate PR. Not included here.

## Rollback
Revert the card index and test commits on this branch.
