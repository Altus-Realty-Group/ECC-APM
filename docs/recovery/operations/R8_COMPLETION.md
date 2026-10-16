# R8-C operations completion (PR131)

Lane R8-C V1, repository `Altus-Realty-Group/ECC-APM` (ID 1058195656), branch `claude/zealous-newton-yvhlqv`.
Assignment commit and starting head `8b3a25330b2811179ff349e616168983ecfafe8c`; assignment base `89cc1a2c49325ff8e0ee51a2f342cd8c03c3c52f`.
Integrated normally (merge commits, no rebase, no force-push): PR133 accepted head `aebe38cab65196870f9bcdedccb95bb4617a55fa`
and current main `3464fc0efde6ffd6254ac4fab5947529ed10210b`. PR129/PR133 were not merged or closed remotely.

Status: SOURCE AND FIXTURE PROOF. No production domain is verified, no live data, backend, identity or authorization was
touched, and nothing here activates a domain. Source completion is not live readiness.

## Defect found and fixed

After a 403 in one operations domain the shared query cache purges every other query (`purgeSensitiveCache`, read-only here).
The mounted page then left the purged sibling domains on "Loading ...", with no request in flight and no Retry. That claimed a
load that was not happening. The page now treats a pending query with nothing in flight as a cleared view:

- `toDomainState` (exported, unit-tested) maps one query result to what the operator sees, in this order: denied (hides any
  retained data), error, ready/unavailable data, cleared (pending and idle), loading (pending and fetching or paused).
- `DomainState` gains `cleared`. The panel says "The <domain> view was cleared after an access change", offers Retry (44px
  target) and shows no rows. Nothing is requested on the operator's behalf; Retry refetches only in the current session.

No shared session, queryClient or access-guard code, App.tsx, endpoint, auth transport, package or workflow changed.

## Browser proof (fixture, desktop 1280x800 and 390px)

`e2e/recovery-operations-lifecycle.spec.ts` mounts the REAL `OperationsRecoveryView` through `e2e/fixtures/operations-harness`
(test only, under `e2e/`, never part of the production build) with the real `createQueryClient`, `installSessionBoundary`,
access guard and the production session-scoped fetcher, served by Vite from the repository's own config. The harness marks
the three domains verified ONLY for `/fixture/*` paths that Playwright answers with invented rows; the production contract
table is untouched and a journey asserts all three production domains are still `unverified` with no endpoint. The built
app's journeys (`e2e/recovery-operations.spec.ts`) still prove zero requests for unverified domains.

| Journey | Proof |
| --- | --- |
| Populated render | recorded claim formatted, unreported claim is a dash (never $0.00); recorded zero cost stays $0.00; unrecorded cost is a dash; two leases render as two separate blocks with their own balances ($1,000.00 and $800.00) and no combined total; plain copy; one `main`; headings in order; no page overflow; no undersized targets; every scroll region reachable by keyboard; only the fixture endpoints requested, once each |
| Empty, malformed, overflow | empty list shows the empty state; a payload with non-cent money is an error, not data; two charges that overflow the safe range make the ledger an error while other domains are unaffected; no balance and no $0.00 shown; empty ledger says the balance is unknown |
| Loading | each domain announces loading (`aria-busy`) while held and shows no rows |
| Session boundary | populated rows disappear at once, replacement requests show loading with no placeholder rows, no epoch-0 cache data survives, a late prior-session response cannot restore them, then only the new session's rows appear |
| 403 cross-domain purge | the denied domain says so; every protected row in all operations domains and in the portfolio cache is gone; siblings say they were cleared (not loading) and made no request; Retry by keyboard restores only that domain in the current session; portfolio data is not silently restored |
| Retry across a boundary | a Retry started in one session whose response arrives after the boundary is discarded; the old denial does not carry over; only the new session's rows appear |
| Ordinary failure | error with Retry; Retry is at least 44x44 and works with the keyboard; other domains unaffected |
| First-load denial | denied with no Retry and no rows |

All 10 journeys run at both viewports (20 tests). This is fixture and query-lifecycle proof. It is NOT operating-data
acceptance and NOT proof of deployed authorization: no live identity, backend or record is involved.

## Unit and mutation proof

`tests/unit/recovery-operations-lifecycle.test.tsx` (7 tests): the state mapping, the cleared panel, a 403 leaving a sibling
cleared and Retry recovering it on the real shared client, loading after a session boundary, and a new epoch key never
carrying prior rows even when nothing purged them first. Existing operations and PR133 session tests are unchanged.

Temporary mutants (restored byte for byte; sources compared to backups): cleared reported as loading, denial not hidden,
epoch dropped from the key, placeholder carry-over, mixed-lease ledger sum, unchecked overflow, null money shown as zero,
float cents accepted, failures shown as an empty list. Every mutant is caught by at least one layer. Three survive the
browser layer for equivalent-through-the-UI reasons (epoch key and cross-lease sum are masked by the purge and the view-level
grouping; placeholder carry-over is masked by the purge) and are caught by unit tests.

## Remaining real backend contract gaps (inventory only; none invented or activated)

| Domain | Gap |
| --- | --- |
| Legal cases | no current read route or table in repository source; live database not checked |
| Work orders | the mounted `GET /api/maintenance/workorders` is an unavailable (503) handler and is not the candidate `work-orders` path; no verified read route, cost unit or property/unit join |
| Tenant ledger | no recorded lease charge/payment read route; `/api/accounting/transactions` is unavailable; lease rent and balance are zero-defaulted upstream and cannot back a ledger |
| Identity and authorization | the frontend has no authentication transport; per-user scope for any operations route is unverified, so session safeguards are proven against fixtures only |
| Writes | escalation, document generation, work-order create/update/complete and ledger adjust/reverse/export remain disabled pending authorization, confirmation, audit and idempotency contracts |

Activation of any domain needs the backend owner's verified contract (see CONTRACT_LEDGER.md and INTEGRATION_REQUEST.md)
and a re-run of these journeys against the real identity and authorization implementation. Rollback: revert this branch's
operations commits; no database or deployment rollback.
