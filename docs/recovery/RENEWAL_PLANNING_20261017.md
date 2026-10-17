# Renewal planning from reported lease dates - 2026-10-17

STATUS: LOCAL SOURCE/BROWSER VERIFIED; LIVE DATA ACCEPTANCE PENDING.
Repository: Altus-Realty-Group/ECC-APM (1058195656).
Branch: codex/ecc-renewal-planning-20261017.
Base: main1278ab2cff5a789b171155c594ec7f13252022f5, not PR155/156.
The containing commit identifies the delivered implementation source.

## Operator job and delivered behavior

An ECC leasing operator needs to identify reported upcoming end dates, investigate
uncertain records and open the actual lease before deciding the next step.
Renewal planning now implements the existing planned URL
/ops/ai/renewal-forecasting. Its navigation label and page title say Renewal
planning: it does not claim an AI model, probability, renewal decision, proposed
rent, payment, notice or legal outcome.

The page shows date-based loaded-row counts, search, exact expiry-window filters,
status filters, reset, refresh/retry and safe lease-card navigation. Default view
includes explicitly active and unclassified rows; reported ended rows remain
accessible through the status filter. Unknown and malformed planning fields stay
visible for verification, rather than being assumed current, inactive or zero.
The operator can search a property/tenant/reference, narrow an end-date window,
inspect uncertainty, open the existing lease card and return to the planning view.
No new financial, notice, document, message or work-dispatch command exists.

## Source, date and identity semantics

Only existing useAllLeases is mounted, using the current shared query client,
/api/portfolio/leases and sessionFetchJSON/session purge. No extra collection,
provider, auth, backend, environment, database or dependency change.

Source inspection: server/mappings.ts declares LeaseOut.end; server/index.ts maps
the source database row.end_date to that wire field. The planner consumes the
documented end field and also explicitly handles end_date when present. An
explicit end_date, including null, cannot silently fall back to a different end.
If the two supplied fields disagree, the date is uncertain and both available
source strings are shown. No source precedence invents a resolved date.

The existing parseDateOnly validates actual calendar dates. It accepts YYYY-MM-DD
and its documented midnight-UTC representation; impossible days, locale-ambiguous
strings, non-midnight timestamps, timezone-offset timestamps and non-string values
remain uncertain. No timezone conversion guesses the intended lease end day.
Days-until-end subtracts UTC representations of already-validated calendar dates,
so DST cannot turn two calendar days into1or3.

Planning reference uses the current America/Chicago calendar date, labeled Central
time; it is never called source freshness. A small local minute/focus update keeps
the date current across midnight without issuing API requests. Source last-update
time is not present in the consumed LeaseOut contract and remains Not reported.
The page explicitly limits coverage to loaded rows; full-portfolio completeness
is not inferred from successful transport or row count.

Status uses existing reportedStatus/summarizeActiveRent classification: only the
reported active value (case-normalized) is explicitly active. The existing ended /
terminated/closed/past/inactive/cancelled/canceled cohort is ended. Other strings,
missing/blank or malformed status remain unclassified. A date never determines
that a lease ended or that an active lease renewed.

Card links use existing safeCardHref positive-safe-integer policy. Invalid values
remain readable without links. Duplicate normalized valid references are also
unlinked/uncertain. Active date summary counts require a usable unique lease link,
explicit active status and a valid non-conflicting end date; uncertain rows do not
contribute to those date totals. Loaded-row/verification statistics are labeled as
such, not unique full-portfolio lease totals.

## Dependency matrix

| Input/event | Source/state owner | Calculation/rendered result | Persistence |
| --- | --- | --- | --- |
| Loaded lease response | Existing portfolio lease API/query | Source property/unit/tenant labels, status, end and safe reference | Existing query cache only |
| Calendar end + planning date | Validated source date + local Chicago calendar | Past, today,1-30,31-60,61-90,>90 or unknown bucket | None |
| Active status/date/reference | Existing portfolio policy + pure planner | Loaded active0-30,31-90,past-end counts; verification count | None |
| Search / date / status filter | Page-local operator state | Matching loaded rows only; no source field changes | Not stored |
| Refresh failure | Existing query failure | Cached rows/counts withheld; Retry; filters retained for recovery | None |
| 401/403 or session change | Existing denial guard/purge/epoch | Rows/counts suppressed and filters reset | Existing session mechanisms unchanged |
| Open lease | Existing registered card route | Exact safe lease link; no mutation | Existing card read only |

## State and validation proof

Twelve new focused tests cover Chicago date/DST, strict date parsing, exact0/30/
31/60/61/90/91 boundaries, conflicting/null end_date semantics, existing status
classification, invalid/duplicate reference exclusion, search/status/date filters,
malformed rows/optional text, source coverage, safe links, read states, confirmed
empty zero, shared cache/session purge and actual navigation promotion.

- Focused planner/navigation run22 passed, zero failures/skips.
- Final full unit suite254 passed, zero failures/skips.
- Final full typecheck and guardrail/build passed.
- git diff --check passed. Existing main-bundle advisory remains.

Actual worktree Vite source with reusable scratch Chromium153 was exercised at
1280x844 and390x844 touch, with isolated intercepted HTTP responses only. Both
journeys passed loading; exact loaded date counts/uncertainty; search/date/status
filters and reset; keyboard Tab from search to date filter; actual safe lease-card
read/back navigation;503 cached-read suppression/retry with preserved filter;
403 suppression/reset; session replacement/filter reset; malformed200; and confirmed
empty zero. Twelve controls measured at least44px high and70.015625px wide. No page
errors, non-GET API calls or horizontal page overflow. Each journey issued11GETs
limited to the existing lease collection and lease-card read. No provider calls.

First browser pass identified implicit select labels that included option text;
controls were corrected to explicit labels/IDs. Final browser and mandatory checks
passed afterward. Desktop/mobile screenshots were visually inspected. Table
scrolling is confined to its named keyboard-focusable region. A scratch Vite cache
and existing Chromium were used without dependency/lockfile/config changes.
Browser/Vite processes exited after the bounded proof.

Scratch evidence: /tmp/ecc-renewals-proof/browser.mjs, receipts.json,
ready-1280.png and ready-390.png.

LIMITS: Source render/HTTP fixtures are not operating records, live lease term
verification, full-portfolio coverage or deployed acceptance. No source update
time, forecast, legal deadline or actual renewal decision is certified.

## Integration patch and rollback

Feature files: src/features/renewals/{renewalPlanning.ts,RenewalPlanningPage.tsx,
renewal-planning.css}; own unit test and this proof. Own-branch App.tsx adds the
page import/route; navigation.ts promotes only the renewal path from planned to
one real Renewal planning entry in the existing AI Analytics grouping. Parent
owns resolving those two shared-file integration patches against parallel work.
Existing unrelated destination inventory remains. Revert this commit for rollback;
no data rollback, schema or external system change.
