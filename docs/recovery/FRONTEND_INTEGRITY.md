# ECC frontend integrity (ECC-C4-V1)

Repository: Altus-Realty-Group/Replit_Front_End_ECC. PR: #113 (draft). Branch: `codex/ecc-frontend-integrity-20261012`.
Owner: Claude Code. Source of truth: GitHub source. Runtime acceptance is a separate step and is **not** claimed here.

## 1. Base and refresh record

| Item | Value |
| --- | --- |
| Seed base of the PR | `50ea0bd10a26566ce007e68fc56e8ae977a5924a` |
| PR head before this work | `c51d2457701f580ad329f033c714c156fab0c39b` (assignment only) |
| Main merged into the same branch | `6ac571ba731bb1b79437571706b83ca3546a9e55` (includes CI repair #114 and restart plan #112) |
| Refresh merge commit | `02149e9bf441658e0ec058101fa14b7021e2c71b` (clean merge, no conflicts, no history rewrite) |
| Final head | recorded in the PR report and PR comment after the last push |

Existing PR work (the assignment file) is preserved untouched.

## 2. Lane

Frontend source, styles, tests and this document only. No `.github` workflows, backend, schema, secrets, providers, deployment,
proxy targets, package manager, or `package-lock.json` / `pnpm-lock.yaml` changes (dependencies were installed with `npm ci`, which does not write the lockfile).
The only `package.json` change is two scripts: `test:unit` and `typecheck`.

## 3. Navigation: one source, genuine destinations

Before: three competing navigation definitions. The active Sidebar had its own `NAV`; `src/config/navigation.ts` (documented as canonical) and
`src/components/layout/navConfig.ts` were not consumed by it. 10 of the 21 sidebar links had no matching route (accounting, AI, legal, communication, work orders, marketing, system settings, sync audit, investor, Dropbox), and the command palette linked to `/integrations/dropbox` (no route).

Now:

- `src/config/navigation.ts` is the only source. `Sidebar`, the 404 recovery links and the legacy `navConfig.ts` (now a derived view) all read it.
- It contains only destinations that have a registered route **and** a real page. Nothing was routed to a stub page to make a link resolve.
- `HIDDEN_ROUTES` lists registered-but-unlinked routes with reasons. `PLANNED_DESTINATIONS` inventories 46 unbuilt destinations with their dependency. Neither is rendered.
- `tests/unit/navigation.test.ts` fails if any nav link lacks a matching `<Route>` in `src/App.tsx`, if a planned destination gets linked or routed, or if a hidden route is linked.

### Linked now (all verified to render in a browser)

Dashboard; Portfolio: Properties, Units, Leases, Tenants, Owners; Reports: Create, Saved, Templates; Data Hub; Systems: Integrations.

### Registered but intentionally not linked

| Route | Reason |
| --- | --- |
| `/owners/transfer` | **Crashes on load** (see section 8, finding A) and, once repaired, exposes an immediate Execute action. Needs an owner decision. Was linked before this PR. |
| `/owners/transfer/detail` | Part of the same workflow. |
| `/admin/sync`, `/admin/geocode`, `/admin/transfers` | Dion-only Admin gating is not implemented in the frontend; no link is offered. |

### Unsupported destinations (inventory; need backend or product work first)

Accounting (12), AI Analytics (4), Legal Tracker (4), Communication (3), Construction & Repair (7), Reports Home, Growth/Marketing, System Settings and Automation,
Data Management sync pages (5), Investor Portal (3), provider integrations (4). Every one is currently a one-line "Stub" page.
The restart plan notes the maintenance and accounting server handlers return constructed data, so those pages must wait for a verified contract.
Full list with per-group dependency text: `PLANNED_DESTINATIONS` in `src/config/navigation.ts`.

## 4. Sidebar behavior

- Rows are components (`NavLinkRow`, `NavGroupRow`, `Flyout`). The `useRef` that ran inside `NAV.map` is gone; a test (TypeScript AST scan) fails on any hook inside a `.map` callback in the touched files, and was shown to fail against the original Sidebar.
- Group headers are real `<button>` elements with `aria-expanded` / `aria-controls`. Links carry `aria-current="page"`. Landmark is `<nav aria-label="Primary">` with real lists.
- Collapsed rail: click, tap, Enter, Space or ArrowRight/ArrowDown opens a flyout; ArrowUp/Down/Home/End move focus; Escape closes and returns focus to the trigger; outside press closes; hover (mouse only) is a convenience.
- The flyout previously had no positioning CSS; it is now fixed-positioned from the trigger and clamped to the viewport.
- Navigation rows, children, flyout items, the collapse control, Retry buttons and table checkboxes/links are at least 44px.
- Section expansion follows the route using segment-aware, longest-match logic (`/data` no longer matches `/database`).
- 404 page: client-side links built from the nav source plus Go back.
- Pre-existing layout defect fixed because it affected whether content fits: `.ecc-main` was offset by the rail width **twice** (flex row plus `margin-left`), costing 320px expanded / 64px collapsed.

## 5. Null versus zero, and states

Missing is `null`/"—" ("Not reported"); a reported `0` stays `0`.

| Surface | Before | Now |
| --- | --- | --- |
| Dashboard KPIs | `revenue30dCents ?? 0` rendered `$0`; no loading/error/empty handling beyond two plain strings | Adapter (`kpiAdapter.ts`) returns `null` for absent/invalid values; cards show "—" + "Not reported"; separate states for loading, denied (401/403), failed, empty, partial (names missing metrics), stale (>24h, constant `STALE_AFTER_MS`), refresh-failed-with-data; Retry on each; freshness line ("Update time not reported" when the source gives none) |
| Dashboard trend | Empty chart | "No trend data reported" message; invalid series points dropped, not plotted as 0 |
| Property card contract | `units`, `activeLeases`, `occupancyPct` defaulted to `0` in the shared zod schema | Nullable with `null` default (wire shape is a superset: number, null or absent) |
| Property card page | Crashed when data was undefined (`data.kpis` on `undefined`), mismatched props to Overview/Hero, `Created: undefined`, no loading/error, Export PDF / Edit buttons with no handlers | Loading, denied, failed (Retry + Back to properties), refresh-failed notice; dashes for missing dates/contacts; non-functional actions removed |
| Property card tabs | "No files", "No cases linked" (asserted emptiness with no data) and "will render here" copy | "Not available on this card yet" |
| Properties and Units tables | Average of unreported values showed `0%` / `$0`; developer copy (see below); no way to open a card from a row; raw error text | "Average … not reported"; rows link to `/card/property/:id` and `/card/unit/:id` (numeric ids unchanged); denied/failed with Retry; empty vs no-match messages |
| Collections | Hard crash if a handler returned `{data:[…],meta}` | `toRows()` accepts the documented raw array or the envelope; anything else is an explicit error, not an empty list |

Developer-facing copy removed: "T0 Context", "T2 Filters / Search", "T3 Dense Table", "T4 Footer / Summary", "T5 Drilldown Rail", "TanStack-powered grid…", "Type A zoning over the existing … resolver…", "cards in motion", "local proof shell", "Type A portfolio proof surface", "(BFF endpoint) will render here". A render test scans operator surfaces for these.

Palette: black/white/gold only; no orange added; gold is used for borders, focus rings and chart strokes, never body text (CSS test).

## 6. Overlapping PR dispositions (evidence: GitHub PR metadata and diffs; none merged, closed, or modified)

| PR | Facts | Disposition |
| --- | --- | --- |
| #81 Day 1-2 property drill chain (head `57776e63`, base `95fbb411`, 3 files, +238/-4) | Adds `/asset/property/:id` that dumps four raw record tables (property → first unit → first lease → first tenants); repoints Properties rows from the card route to it; rewrites the Vite `/api` proxy to the Azure staging host. PR text and diff disagree on endpoint paths. | **Idea preserved, code not taken.** Kept: independent per-section loading/empty/error and "—" for null, now in `StateNotice` and the table shell. Not taken: a second property route (the existing card route is the canonical drilldown and is guardrail-pinned; repointing would orphan it); the proxy rewrite (guarded surface); raw column/JSON dumps (developer-facing); silently drilling only the first unit/lease (misleading). Its `jget` returns `null` for any non-200, which erases the denied/failed/empty distinction. |
| #83 Dashboard go-live (head `7f064562`, base `7fe1077e`, 2 files, +66/-4) | Hook coerces every field with `numOrZero` and still calls `/api/occupancy-dashboard`. `api.ts` declares `API_PATH_PREFIX`, `getApiBaseUrl`, `joinUrl` twice (redeclaration errors) and hard-codes the staging host for Replit hostnames. The "build identifier" in the PR text is not in the diff. | **Rejected as written; one delta preserved.** `numOrZero` is exactly the false-zero defect. Preserved: a `lastUpdated` freshness field, now nullable and driving the stale/unknown states. Not ported: extra KPIs (delinquency, unit counts, rent collected/outstanding) have no verified contract; the stale endpoint; the base-URL logic (guarded surface, duplicated blocks). |
| #84 asset-card cosmetics (head `fb5c8da5`, 1 file, +8/-55) | Replaces the property card with a stub (no fetch, hero, tabs, errors) and prints `Property ID: 0` for an invalid id. | **Rejected.** Regression and a false zero. This PR instead repairs the real card. |
| #88 Restore Properties table rows (head `a5c52ef7`, 1 file, +1/-1) | Whitespace only (trailing newline). No behavior change despite its title. | **No-op / superseded.** The routed Properties page was verified in a browser to render rows when data is present, and now links each row to its card. Safe for the owner to close; not closed here. |
| #98 Phase 1 KPI strips (head `6e529181`, base `29655cd9`, 5 files, +182/-12) | `KpiStrip`, `ActiveFilterSummary`, metric registry. Uses `?? 0` for properties, units and revenue; averages occupancy with `Number(null) === 0` (counts null as 0); gold label text; "War-Room Metric Rail" copy. Base is from April. | **Deferred, not discarded.** Not ported in this PR because it would reintroduce false zeros, gold label text and jargon, and sits on a stale dashboard base. The idea of a labeled metric registry is reflected in `kpiAdapter.ts` (`KPI_LABELS`, `missingMetrics`, `coverage`). Recommended follow-up slice: a null-safe KPI strip and a visible active-scope summary on top of this PR's adapter. |

## 7. Validation (commands run in this session)

Environment: Node 22.22. `npm ci` completed (743 packages) and did not modify lockfiles. The sandbox did not create `node_modules/.bin` links, so `vite`, `tsc` and `playwright` were invoked via their `node_modules/<pkg>` entry points; `npm run build` itself was therefore not runnable here (its two steps were run individually).

| Check | Result |
| --- | --- |
| `npm run guardrail` | PASS (before and after) |
| `vite build` | Succeeds (chunk-size warning is existing) |
| `tsc --noEmit` | **288 errors on the base → 268 now.** No file got worse (compared per file). Baseline was hiding semantic errors behind a syntax error in `src/lib/format.test.ts` (an unterminated string, fixed). Property card page: 6 → 1 (the remaining `params` nullability is left because the guardrail pins the literal `Number(params?.id)`). |
| `npm run test:unit` (new, Node's built-in runner via the already-installed `tsx`) | 52 pass, 0 fail. Covers: nav↔route integrity, hook stability (AST), keyboard helpers, null-vs-zero adapters, every dashboard state, property hero/contract, table shell states and links, developer-copy scan, 44px and palette CSS checks. Shown to fail against the original Sidebar. |
| Browser journeys (`e2e/frontend-integrity.spec.ts`, Chromium, built bundle, network **mocked**) | 17 pass: crawl of every nav link (no 404, no page errors), mouse/keyboard/touch navigation, flyout focus management, 44px measurement, layout offset, dashboard null/zero/denied/error/retry/stale, list → card journey, envelope tolerance. |
| `scripts/vet.cjs` | Fails on the untouched base as well: "main.tsx should import exactly 2 CSS files, found 1" (existing debt, not changed). |
| `scripts/guard.sh` | Passes (the duplicate-nav check now holds because `navConfig.ts` derives from the single source). |

### What this does and does not prove

The browser run is **local, against the built bundle, with mocked API responses**. It proves UI behavior (navigation, keyboard/touch, states, null vs zero). It is **not** aligned preview/runtime acceptance and says nothing about live data, real contracts, or the deployed environment. Runtime acceptance still needs the aligned authorized preview.

Not run: `e2e/smoke.spec.ts` and `tests/*.spec.ts` (they need a live API / diag ids); the repo's `ecc:smoke` (needs the API).

## 8. Findings, dependencies and out-of-lane observations

**A. Owner Transfer page crashes (pre-existing).** `src/features/ownerTransfer/OwnerTransferPage.tsx` uses `<Section>` but imports nothing for it (the legacy component was banned and removed), so the route renders the root error boundary ("Contract violation | Section is not defined") before any API call. It was linked from the sidebar. It also posts `notes: "UI"` and has an immediate Execute action with no confirmation. This PR unlinks it and leaves the page unchanged. Proposed fix for the PM/owner to approve: replace `Section` with `CardPanel`, add confirmation for Execute, use palette-compliant button styles, and verify the transfer contract before relinking.

**B. Contract owner review.** `src/shared/card-contracts.ts` `PropertyCard.kpis.{units,activeLeases,occupancyPct}` now default to `null` instead of `0`. Wire-compatible, but it is a contract file; the owning contract should confirm. Numeric ids and `/card/:type/:id` routing are unchanged.

**C. Dashboard endpoint contract unverified.** The page reads `/api/dashboard/kpi/summary` (unchanged). The adapter accepts a raw object or `{data:{…}}`, and `lastUpdated` / `last_updated` / `asOf` / `updatedAt` for freshness. The restart plan already flags the array-vs-envelope mismatch for portfolio endpoints; the backend owner must confirm the real shape and whether a freshness timestamp exists. Until then "Update time not reported" is shown honestly.

**D. Dev bypass and Dion-only Admin.** No bypass or Dion-only gating exists anywhere in `src/` (searched). Nothing was changed or weakened; Admin routes are simply not linked. Gating, if wanted in the frontend, needs a separate approved task and must not give a local bypass central admin authority.

**E. Existing debt left alone.** 268 remaining type errors (largest: integrations health, owner-transfer pages, `server/index.ts`, unrouted `pages/portfolio/*/index.tsx` which also duplicate the routed `Properties.tsx`/`Units.tsx`, causing a case-sensitivity hazard on case-insensitive file systems). `src/lib/format.test.ts` and `src/app/__tests__/import-guards.test.ts` are jest-style tests with no configured runner. `KpiTicker.tsx` is unused and type-incompatible. `queryClient.ts` sets `keepPreviousData`, which is not a TanStack v5 option. `src/pages/card/*` other card types still carry their own `0` fallbacks and were not in this PR's scope (property card only).

**F. Backend dependencies, not invented.** Accounting, legal, communications, maintenance, investor, sync and provider pages need verified contracts and ownership before any link. Delinquency, unit-count and rent-collection KPIs (#83) need a verified contract before display.

## 9. Rollback

Revert the PR's commits (or the merge). No data, schema, workflow or environment change was made. The single `package.json` change (two scripts) reverts with them. To roll back only the navigation, revert `src/config/navigation.ts`, `src/components/Sidebar.tsx`, `src/components/nav/` and the `app.css` sidebar block; the rest of the state handling stands alone.

## 10. Next actions

1. PM/owner decision on finding A (Owner Transfer) and confirmation of finding B.
2. Backend owner to confirm dashboard and collection response shapes and freshness field (finding C).
3. Aligned, authorized preview run of the journeys in section 7 for runtime acceptance.
4. Follow-up slices: null-safe KPI strip and active-scope summary (from #98); other card types' zero fallbacks; remaining type debt.
