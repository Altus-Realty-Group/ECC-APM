# Merged frontend acceptance - 2026-10-27

Source main: 573778d61990b6771cdd41241031f478689d0da2. Product tree: 4bd8bd8bd304324f0f49f48f0ca37813b3934e22. Dion approved continuation after review of the five-PR source batch. PR166,170,172,176,177 are merged. Each head had successful Verify, proof-pack and CodeQL before its merge; prior draft skips were not treated as passes. Deployment workflow remains quarantined; no runtime publication, backend activation or database write occurred.

The previously tested isolated integration tree exactly matches merged main. That tree passed327 unit tests,16 dependency checks, full typecheck and guardrail/build. Code diff checks pass. Whole-document diff checks flag Markdown hard-break whitespace in delivery notes; this is not a code-test pass.

## Actual-page browser proof

scripts/verify-portfolio-browser.mjs ran against merged main with isolated API responses at1280x844 and390x844 using Chromium153. It passed84 assertions/checkpoints across:
- five successful card-return links, their44px heights, actual navigation to matching lists, and invalid-link return controls;
- Leases search by tenant/property/status/ID, trimming/case, clearing and no matches, stable loaded summaries and matching counts;
- Tenants/Owners search and clearing with labeled44px inputs;
- Vacancy status filtering and reset;
- denial after successful collection reads suppressing prior records/search;
- zero page errors, non-GET API calls or page-level overflow in tested journeys.

The existing scripts/verify-scheduler-browser.mjs also passed its actual-page desktop/mobile journeys on merged main: background refresh, stored Next Run, late credential response, failure/denial and session isolation. No errors/writes/overflow were observed in its tested journeys.

Desktop/mobile Leases screenshots were inspected locally. The table remains horizontally scrollable within its own container at390px. These screenshots are review material, not operating records or user deliverables.

## Reproduction and boundaries

Use the project's existing Playwright package. Provide ECC_BROWSER_EXECUTABLE when using a separately installed compatible Chromium, then run node scripts/verify-portfolio-browser.mjs. Default hosting is loopback only; ECC_BROWSER_BASE may specify an existing127.0.0.1 source host. The script aborts external requests and all non-GET API requests. ECC_BROWSER_SCREENSHOTS optionally selects an existing local directory; screenshots are otherwise omitted. The temporary browser binary installation did not modify app dependencies or lockfiles.

This proves the tested source workflows with test-only responses. It does not prove live backend/data freshness, all pages, all financial workflows, cross-app integration, real authentication or a published release. No fixture is stored in an operating database. Current runtime URL/import/source-process identity is still absent from the main manifest. Protected backend/session compatibility and ingestion activation remain separate campaign171 tasks.
