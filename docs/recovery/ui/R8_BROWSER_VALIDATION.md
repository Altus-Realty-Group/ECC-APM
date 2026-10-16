# R8-C2 - PR132 linked-card browser validation (receipt)

Base under test: `8b963a066b784ecb507893c49ce72da2f7580f44` (branch `codex/ecc-recovery-linked-cards-20261013`).
Scope: tests and this receipt only. No product source, config, dependency, workflow or shared-contract file changed.

## Evidence class

- **Local browser evidence only.** Playwright 1.58.2 against the pre-installed Chromium
  (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `--no-sandbox`) through a git-excluded local config.
  The repository `playwright.config.ts` is untouched. Hosted CI (`verify`) does **not** run Playwright, so no CI check
  proves any browser claim below.
- Every API response is an invented fixture answered by Playwright. Nothing here is live data, identity, authorization
  or operating-data acceptance.
- The app served is the repository's own entry (Vite dev server from the repo's `vite.config.js`). The spec adds one
  in-memory, read-only transform that exposes the real `queryClient` as `window.__eccQc` so a test can ask it to refresh
  an already-loaded card (the shipped UI has no refresh control). Nothing is written to disk.

## Browser results (this run)

| Viewport | Tests | Result |
|---|---|---|
| 1280 x 844 | 23 | 23 passed |
| 390 x 844 (touch) | 23 | 23 passed (one is a pinned expected-failure, see Defects) |

Both runs include the pre-existing "reported relationships and denied recovery" journey, kept verbatim.

Per viewport the new tests prove:
- Loading (all four cards): announced, one busy region, no details, tabs, links or Retry.
- Empty relationships (all four cards): explicit "No ... reported" text, zero links, no invented destination.
- Invalid ids (0, -3, 1.5, -1): readable, not linked; names fall back to the record's own id.
- Owner with 8 properties all linked; tenant current lease first and once; real unit -> lease -> tenant keyboard navigation.
- First-load failures: 500, three malformed bodies, 403, 401 - each a distinct alert, no details, keyboard Retry recovers.
- Failed refresh keeps loaded details under an honest banner; denied refresh removes details, links and cached data.
- Session boundary (all four cards): a refresh held across the boundary; populated details and links disappear at once;
  the late prior-session response is discarded; only the new session's record shows.
- First load held across a boundary, released after the new session answered: still discarded.
- Failed load after a boundary shows the retryable alert; Retry yields only the current session's record.
- Keyboard reach, card-content targets >= 44 x 44, no horizontal overflow, no unexpected page errors or console errors
  (only the browser's own notice for a deliberately failed fixture response is tolerated).

Unit: 5 tests added (25-property owner, invalid ids per entity, id-based name fallbacks, tenant ordering, per-entity
empty text). Full unit suite 124/124.

## Defects and limitations

1. **App-shell nav is 43 x 44 px at 390px** (Dashboard, Portfolio, Reports, Data Hub, Systems). Outside PR132's files, so
   not fixed here. Card content is asserted strictly at >= 44px; the shell check is a separate test pinned with
   `test.fail` at 390px so it turns red the moment the shell is fixed (then remove that line). Return to Codex.
2. No PR132 product defect found.
3. Card query keys are not epoch-scoped; protection relies on the shared boundary (cancel, purge, refetch) and was
   proven in the browser, not by key design.
4. Mutation checks on the new tests were not run.
5. `e2e/smoke.spec.ts` fails on clean `origin/main` in this sandbox (no backend); pre-existing, untouched.
