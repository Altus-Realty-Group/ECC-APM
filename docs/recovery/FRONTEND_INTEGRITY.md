# ECC-APM frontend integrity (ECC-C4-V1 through V4)

Repository: `Altus-Realty-Group/ECC-APM` (repository ID 1058195656; historical name `Altus-Realty-Group/Replit_Front_End_ECC`, see `docs/recovery/REPOSITORY_IDENTITY.md`).
PR: #113 (retained). Branch: `codex/ecc-frontend-integrity-20261012`. Owner: Claude Code. PM retains review and merge.
Source of truth: GitHub source. This document records source and local-test evidence only. **No live runtime, deployed-environment or live-data proof is claimed anywhere in it.**

## 1. Base and head record

| Item | Value |
| --- | --- |
| Seed base of the PR | `50ea0bd10a26566ce007e68fc56e8ae977a5924a` |
| First delivery head (V1) | `198996d08bcd1b85e084dd5c55f2b051052f842b` |
| PM refresh of the same branch (parents: V1 head and main `7ed2b8c4c5ed6121a9104e7f787e20999f2c4c4a`) | `cc3d31bc740d0c0f234e7004444c63a9c7d6d81e` |
| Current head | recorded in the PR report and PR comment after the final push |

The branch was refreshed by fast-forward to the PM's integration commit. No force, rebase, reset or history rewrite was used at any point. Existing main changes (hygiene, npm-only setup, Vite 7.3.1, Wouter 3.9.0, Playwright 1.58.2, PrefetchLink adaptation, `test:dependencies`) are preserved.

## 2. Lane and constraints

Frontend source, styles, tests and documentation only. No workflow, lockfile, dependency, backend, schema, secret, provider, proxy-target or deployment change. `package.json` changes are scripts only: `test` and `test:unit` (a discovery runner) and `typecheck`; `test:dependencies` and every dependency are untouched. Backend diagnostics are reported, not fixed.

## 3. Navigation: one source, genuine destinations (V1, unchanged in V3/V4)

- `src/config/navigation.ts` is the only navigation source; the Sidebar, the 404 recovery links and the legacy `navConfig.ts` derive from it. A test fails if a nav link has no `<Route>` in `src/App.tsx`.
- 11 destinations are linked: Dashboard; Portfolio (Properties, Units, Leases, Tenants, Owners); Reports (Create, Saved, Templates); Data Hub; Systems > Integrations.
- `HIDDEN_ROUTES` lists registered-but-unlinked routes: `/owners/transfer`, `/owners/transfer/detail` and `/admin/*`. `PLANNED_DESTINATIONS` inventories 46 unbuilt destinations, each verified to be a one-line stub page, with its dependency. Neither list is rendered and no placeholder page was routed.
- Hiding a link is **not access control**. The routes remain reachable by URL and server authorization is a separate defect.

## 4. Review findings: adjudication of the 12 inline findings (head `198996d0`)

| # | Finding (file) | Disposition | Where / proof |
| --- | --- | --- | --- |
| 1 | Denied refresh still rendered cached dashboard figures (`dashboardStatus.ts`) | **Fixed.** A 401/403 is `failed/denied` even when the cache holds data; transient failures keep same-session data with a refresh-failed notice. | `dashboardStatus.ts`; unit + render + browser tests |
| 2 | Denied refresh kept the cached property card (`card/property/index.tsx`) | **Fixed.** `accessGuard` hides retained data on denial; denied vs transient vs contract error are distinct. | render tests (denied, transient); browser |
| 3 | Properties kept rows, totals and selected ids after denial | **Fixed.** Rows hidden, selections cleared on denial and on session boundary, triage keyed to the session epoch. | `useAccessGuard.ts`, `Properties.tsx`; render + browser tests |
| 4 | Same for Units | **Fixed**, same mechanism. | `Units.tsx`; render tests |
| 5 | `npm test` missing; Verify skipped the new tests and never ran `typecheck` | **Partly fixed.** `npm test` now exists and `Verify`'s optional `npm test` will run 9 files / 91 tests with real discovery. **`typecheck` is not wired into Verify: that is a workflow edit and is outside this lane**; it is reported to the workflow owner. | `scripts/run-unit-tests.mjs`, `package.json` |
| 6 | Enter/Space left focus on the trigger (`Sidebar.tsx`) | **Fixed.** A click with `detail === 0` (Enter, Space, assistive tech) moves focus to the first item; pointer and touch do not. Escape returns focus. | unit + browser tests (Enter and Space) |
| 7 | Malformed dashboard responses rewritten to `{}` | **Fixed.** Non-objects, arrays, bad envelopes and bad fields throw `ContractError`; the page shows an "unexpected format" error with no figures. | `kpiAdapter.ts`; unit + browser tests |
| 8 | Generic coercion accepted `-2.5`, `1.4`, fractional cents and out-of-range series | **Fixed.** Counts: non-negative safe integers. Occupancy: 0..1 fraction. Cents: non-negative safe integers. Series points: parseable date and 0..1 fraction. Numeric strings are rejected. | `kpiAdapter.ts`; dashboard parser tests |
| 9 | Future source timestamps classified as fresh (`dataState.ts`) | **Fixed.** More than 5 minutes ahead is `future`, unparseable is `invalid`; neither is ever fresh and neither shows an "Updated" time. | `classifyTimestamp`, `freshness`; tests |
| 10 | Contacts/Key Dates read fields Zod strips (`card/property/index.tsx`) | **Fixed by removal, after verifying the source.** `get_property_card` (`server/routes/rpc.ts`) returns only `property{id,name,type,address}` and `kpis{units,activeLeases,occupancyPct,avgRentCents}`: no owner, no created/updated dates. The Contacts and Key Dates panels and the Overview rows for owner, class, status and DoorLoop id were removed; nothing was added to the schema. | `Overview.tsx`; render + browser tests |
| 11 | Receipt named the historical repository (`FRONTEND_INTEGRITY.md`) | **Fixed.** This document. | section header |
| 12 | Assignment named the historical repository (`FRONTEND_INTEGRITY_ASSIGNMENT.md`) | **Fixed.** Canonical name and ID recorded; the historical name is kept as history. | file |

## 5. Cache, denial and identity (V3/V4)

Policy, implemented in `src/lib/sessionScope.ts` and `src/lib/queryClient.ts`:

- **Any 401/403 from any query purges every cached query result.** Access-controlled data must not outlive a denial. This is deliberately conservative: a denial on one record also clears the others; pages reload when next opened. Denied responses are never retried.
- **No authentication transport is invented.** The frontend has none. The single supported boundary signal is `window.dispatchEvent(new Event("ecc:session-boundary"))`, installed in `src/main.tsx`. Whatever later owns sign-in/out or account switching dispatches it. It bumps a session epoch, cancels in-flight requests, purges the cache and reloads mounted pages under the new session.
- **Late prior-session responses are rejected.** `sessionFetchJSON` captures the epoch when a request starts; a success or an error that arrives after the epoch changed becomes `StaleSessionError` and is never cached or shown.
- Component-local state (selected row ids, triage lanes) is cleared on denial and on a boundary.
- The global `placeholderData` carry-over (and the TanStack v4-only `keepPreviousData` option) was removed so one entity's or identity's data is never shown while another loads.
- Unsupported today: there is no logout, account switcher or token refresh in this frontend, so no real boundary currently fires. The mechanism is tested with injected events only.

## 6. Dashboard contract (V3/V4)

No handler for `/api/dashboard/kpi/summary` exists anywhere in this repository's server source. The only declared contract is the frontend's own type, which is what is enforced: `propertiesTotal` and `unitsTotal` non-negative integers; `occupancyRate` a 0..1 fraction; `revenue30dCents` non-negative integer cents; `series[]` of `{date, occupancy 0..1}`; optional `lastUpdated` ISO time. Absent or `null` means unknown; a reported `0` stays `0`. Invalid present values are a contract error. The `last_updated` / `asOf` / `updatedAt` aliases added in V1 were never in a verified contract and were removed. The backend owner must confirm the real shape, units and whether a source timestamp exists. Note the unit difference between the dashboard (`occupancyRate`, fraction) and the property card (`occupancyPct`, percent).

## 7. Operator states and null versus zero (carried from V1, extended)

Missing is `null`/"—"/"Not reported"; a reported `0` stays `0`. Loading, empty, partial (names the missing metrics), stale, future/invalid timestamp, denied, failed, contract-violation and refresh-failed states exist on the dashboard; denied, contract, failed and refresh-failed on the property card; denied, failed and empty vs no-match on the Properties and Units tables. Retry is offered where retrying can help. Developer-facing copy was removed from all of these surfaces and is scanned for in a test. The collection adapter accepts the documented raw array or the envelope the server source emits and otherwise errors.

## 8. Touch, keyboard and layout evidence (V4)

Measured in Chromium against the built bundle with simulated API responses: no horizontal page overflow at 390x844 or 768x1024; every interactive control is at least 44px except native checkboxes, which sit inside 44x44 labels. Fixed during measurement: asset-card tabs and actions were 20px tall (Tailwind utilities are not compiled in this app, so they now use real classes); command-palette trigger, search input and narrow sort headers were under 44px. A phone previously started with the rail expanded and left about 78px for content; it now starts on the narrow rail when there is no saved preference, and an explicit expand is an overlay. The active asset-card tab no longer uses amber/gold text (white text, gold underline).

## 9. Overlapping PR dispositions (unchanged; none merged, closed or modified)

| PR | Disposition |
| --- | --- |
| #81 property drill chain | Idea preserved (independent per-section loading/empty/error, "—" for null); code not taken (duplicate route, proxy rewrite, raw dumps, first-unit/lease-only drilling, `jget` erases denied/failed/empty). |
| #83 dashboard go-live | Rejected as written (`numOrZero` is the false-zero defect; stale endpoint; duplicated declarations). Freshness idea kept as a nullable timestamp, now validated. |
| #84 asset-card cosmetics | Rejected (stub that prints `Property ID: 0`). |
| #88 restore Properties rows | Whitespace only; no-op; owner may close. |
| #98 KPI strips | Deferred, not discarded (false zeros, gold label text, jargon, stale base); follow-up slice on the null-safe adapter. |

## 10. Validation (source and local only)

Environment: Node 22.22 locally; CI uses Node 20, which is why discovery is a script (glob arguments to `node --test` need Node 21+). Fresh `rm -rf node_modules && npm ci` completed with exit 0 and did not modify the lockfile.

| Check | Result |
| --- | --- |
| `npm test` | 9 files, **91 tests, 91 pass, 0 fail**, exit 0 (runner refuses zero discovery or fewer tests than files) |
| `npm run test:dependencies` | 8 tests, 8 pass |
| `npm run guardrail` | PASS |
| `npm run build` (Vite 7.3.1) | succeeds |
| `tsc --noEmit -p tsconfig.json` | **exit 2, 39 diagnostics (268 at the last reviewed head)**. See section 11. The full compiler does NOT pass and is not claimed to. |
| Exact-head CI, per-head results | recorded on the PR (links change with each head); the compiler step in CI reproduces the same 39 diagnostics as the local run |
| Browser journeys (`e2e/frontend-integrity.spec.ts`, Chromium, built bundle, **simulated API responses**) | 32 pass |

Not run: the repository's other Playwright specs and `ecc:smoke` (they need a live API or diagnostic ids). `scripts/vet.cjs` fails identically on the base (existing debt, unchanged).

Simulation labels: every browser journey and every render test uses fixtures or intercepted responses. They prove UI behavior and state handling. They do not prove live data, backend contracts or deployed behavior.

## 11. Compiler status and separately owned debt

39 diagnostics remain: **23 are server-side** (`server/index.ts` 11, `server/lib/m365/graph.ts` 4, `server/lib/integrations/dropbox.ts` 3, one each in `server/services/ownerTransferService.ts`, `server/routes/m365.ts`, `server/routes/adminSync.ts`, `server/lib/geocode/geocode.ts`, `server/lib/dropbox.ts`). These belong to the backend owner under #119 and were not changed.

**16 are frontend and unresolved on purpose**: `src/features/owners/pages/OwnerTransferPage.tsx` (5), `OwnerTransferDetailPage.tsx` (9), `ownerTransfer/components/TransferDryRun.tsx` and `TransferPreflightCheck.tsx` (1 each). These pages call hook members that do not exist (`getTransfer`, `approveAccounting`, `authorizeTransfer`, `executeTransfer`, `runDryRun`, `runPreflightCheck`, `getOwnerProperties`, `initiateTransfer`, `canApproveAccounting`, ...). The server source declares `/api/owner-transfer/{initiate,approve-accounting,authorize,execute}` and `GET /api/owner-transfer/:id` (execute defaults to `dryRun=true`), but those handlers in `server/index.ts` call `initiateTransfer`, `markApprovedByAccounting`, `authorizeExecution`, `executeTransfer`, `generateAccountingReport` and `getTransferDetails` without defining or importing them (compiler TS2304 at lines 851 to 960, confirmed by CI), so they cannot work as written; that belongs to #119. The client also posts to different `/api/owners/*transfer` routes with different payloads, and no preflight or dry-run endpoint exists. Closing these errors means wiring Approve, Authorize and **Execute** actions into a reachable page, which needs an owner decision and server authorization first. The route is unlinked. Options for the PM: retire the pages, or extend the hook only after the backend owner makes the `/api/owner-transfer/*` handlers real (they are not verified to work today). Nothing was suppressed.

Fixed in this correction (268 to 39, no suppression, no excluded files): about 230 diagnostics across card pages, integrations health, DataHub, dashboard components, dev tooling, the unrouted portfolio duplicates and two test files (converted from a runner-less style to `node:test` with every assertion kept). Real defects found and fixed on the way: the Owner Transfer `Section` crash; the `UiInspector.mount` call that would throw under `?debug=1`; the Leases table's Rent/Start/End columns receiving the wrong render argument (blank); `console.table` misuse; integrations-page toast calls to a function that does not exist; `LiveLogs` and recharts typing.

## 12. Findings and dependencies for other owners

- **Portfolio collection contract drift (backend, #119).** The approved contract (`docs/contracts/ECC_PORTFOLIO_LIST_CONTRACT_V1.md`) requires a raw array; the server source (`server/index.ts`) emits `{data, meta}`. Its row fields also differ from what the list pages read: properties send `occPct`, `city`, `state` (no `occupancy_pct`, no `street_1`); units send `propertyName`, `unitLabel`, `marketRent` (pages read `property_name`, `label`, `market_rent_cents`). The server also emits fabricated zeros (`occPct: 0` for a property with no units, `marketRent || 0`). Which backend is canonical is #119's open question, so the list-page field mapping was **not** changed here.
- **Other card contracts differ from the server source** (found by the card-pages pass; the contract file was not edited): `get_lease_card` sends `rentCents`, `start`, `end`, `unit.label`, `property.name` while the contract declares `rent_cents` and only ids; `get_unit_card` sends `label`, `beds`, `baths`, `sqft`, `property.name` while the contract has `unit_label` and no beds/baths/sqft; `get_tenant_card` sends `rentCents`, `unit_id`, `property_id`; `get_owner_card` sends property addresses. Effects today: lease Monthly Rent and unit bed/bath/sq ft show "—". Needs a contract-owner decision.
- `get_property_card` computes `occupancyPct` as active leases / units without capping it and emits `0` counts when absent; the frontend contract does not cap it either.
- **Dead code with fabricated data:** `useDashboardData` fabricates cash-flow and sparkline values with `Math.random()`. Its consumers (`KpiTicker`, `PriorityActionFeed`, `PortfolioGoogleMap`, `FinancialsAndLeasing`, `ActionCenter`) are not imported by any routed page. Recommend retiring them in the hygiene lane.
- **Toasts:** `src/hooks/use-toast.ts` keeps per-call state and nothing renders it, so integrations-page toasts are invisible; `src/hooks/useToast.ts` is the shared store. Needs an owner decision.
- `IntegrationsHealthPage` treats `integrations.doorloop` / `teams` objects as truthy (always "configured"); the server sends `{configured: boolean}`.
- `OwnerTransferAudit` fires its query before the admin flag resolves (`enabled: undefined`).
- Workflow owner: `Verify` does not run `typecheck`; it will run `npm test` once this PR is on main. Adding `typecheck` as a gate is only reasonable after the 16 owner-transfer diagnostics and #119's server diagnostics are resolved.
- Developer bypass and Dion-only Admin: no such code exists in `src/`; nothing was changed. Admin routes are unlinked.

## 13. Rollback and next actions

Rollback: revert this PR's commits; no data, schema, workflow, dependency or environment change was made. The session-scope layer can be removed independently by reverting `src/lib/sessionScope.ts`, `src/lib/useAccessGuard.ts`, the `queryClient.ts` factory and the `main.tsx` line; pages then behave as in V1 (without the denial guarantees).

Next: (1) PM decision on the owner-transfer pages; (2) backend owner confirmation of the dashboard, collection and card contracts under #119; (3) aligned, authorized preview run of the browser journeys for runtime acceptance; (4) workflow owner to gate on `typecheck` when it can pass; (5) follow-up slices: null-safe KPI strip (from #98), the other card types' contract alignment, retiring the dead fabricated-data components.

## PM review correction - 2026-10-13

Current main was merged without rewriting branch history, retaining #123 scoped
dependency fixes and #122 archive disposition. PM retired unfinished owner-transfer
page/control bodies from the current tree; exact previous versions remain in Git
at worker head e61104061b8c2263541bb11fb4cc4e0128e021df. Registered recovery
routes display an explicit unavailable state. They do not search, approve, authorize,
execute, simulate a successful preflight, download unsupported reports or instruct
operators to store admin credentials in the browser. This is frontend containment,
not backend authorization repair or a working transfer feature. Re-enable only after
verified actor authorization, contract, confirmation, audit, idempotency and dry-run
proof in the owning backend and aligned frontend.

Property card validation accepts missing/null metrics as unknown, retains real zero,
and rejects negative/fractional counts or cents. This is defensive client validation;
it does not change server schema or assert live-contract acceptance. Occupancy over
100 remains a backend anomaly to investigate, not a value clipped by the client.

Compiler exclusions and suppressions remain unchanged. Full compiler proof stays
non-passing while separately owned server diagnostics remain. No failed proof is
accepted as a passing gate. Local PM results: 9 files, 92 unit tests passing, 10 dependency
tests passing, guardrail/build passing; frontend diagnostics zero, server diagnostics 23.
The browser attempt failed before tests when the local preview could not start; it is
not a browser pass. Exact-head CI must be reviewed before acceptance.
