# Portfolio snapshot reporting - 2026-10-17

STATUS: LOCAL SOURCE / BROWSER VERIFIED; LIVE DATA ACCEPTANCE PENDING.
Repository: Altus-Realty-Group/ECC-APM (1058195656).
Branch: codex/ecc-portfolio-reports-20261017.
Base: bfe9540b7c0058e7368838117679b17ccc04e54a.
The containing commit identifies the exact implementation source for this receipt.

## Delivered operator workflow

/reports/templates now offers three real layout selections: Property register,
Lease dates and status, and Owner directory. Links open /reports/create with the
selected template in the query string. The existing Create route lets the
operator select a layout/source, preview known source fields, filter/clear the
preview, refresh or retry records and download a real CSV containing all loaded
records. The preview explicitly limits to100 matching rows while CSV includes
all loaded records regardless of the preview filter.

Layouts are presentation definitions, not business records. No sample operating
rows, rent totals, payments, currency guesses, forecasts, or new endpoints are
introduced. Unknown cells remain Not reported / blank CSV values; confirmed zero
is retained. Every preview/export states loaded-record scope and unproven full
portfolio completeness. Collection update time is not supplied by the existing
hooks and is explicitly unreported. Optional row updated_at is exported verbatim
only when present; browser/fetch/download time is never called source freshness.

Owner-statement PDF generation, saved-report registration/persistence and email
sends remain unfinished. CSV downloads are prepared locally and are not registered
as saved ECC reports. The existing Saved route is untouched in this lane.

## Implementation and security trace

Create -> URL layout selection -> SelectedPortfolioReport -> exactly one of
useAllProperties/useAllLeases/useAllOwners -> existing portfolio query/cache and
sessionFetchJSON -> source result -> prepareSnapshot -> preview/snapshotCsv.
Templates mounts no query. Switching source unmounts the previous hook; only the
selected source is requested. The source/session key resets local preview state.

The snapshot projector rejects malformed arrays/rows, unusable or duplicate IDs,
and incorrect known-field types. Only explicitly selected source fields are
included. Unknown extra fields are not exported. There are no new data access
contracts, database objects, caches, provider calls, target/auth/schema changes
or assumptions; existing source field ownership is unchanged. Repository database
standards/architecture and the current resolver/session/export paths were read.

DataTable's existing CSV helper is private and lacked formula neutralization.
This lane adds a narrow pure serializer: every CSV cell is quoted; internal
quotes escape; newline/comma text is retained; spreadsheet formula/control
prefixes are apostrophe-neutralized. Null is blank; numeric zero remains zero.
Metadata names the layout, loaded count, completeness limitation, absent collection
update time and missing-value semantics. Fixed source filenames and Blob downloads
are used; the temporary anchor/object URL are removed/revoked afterward.

No preview/download is available for loading, active refresh, paused/unresolved,
failed, malformed or denied reads, including retained cached rows. At download
click, current cache status/fetch state/data identity and session epoch are
rechecked. A changed session/cache or denial prevents export even before a UI
rerender. The existing global query-denial/session-purge behavior remains intact.
No financial conversion occurs: the lease layout deliberately excludes rent and
payment values whose current units/authority are not established in this lane.

## Dependency and state matrix

| Event | Source/state owner | Expected result |
| --- | --- | --- |
| Layout choice | Registered URL template + one existing collection hook | Selected source only; preview filter resets |
| Successful read | Existing governed collection payload | Exact selected source fields, loaded count, safe CSV |
| Preview filter/clear | Local browser text only | Matching preview rows; CSV still includes all loaded rows |
| Confirmed empty | Successful array [] | Zero loaded, scope/column-only CSV; no fabricated row |
| Null/missing | Source null/absence | Not reported in preview; blank CSV |
| Malformed | Pure projector rejects | Error/retry, no preview/export |
| Denial/failure | Existing query error | Cached rows suppressed, no export; existing Retry |
| Session boundary | Existing purge + epoch | Preview/filter reset; late click cannot export prior data |
| CSV action | Current cache + session recheck | Real Blob CSV, no server mutation or provider send |

## Validation

-14 focused tests passed: zero/null, exact fields, excluded fields, dates, malformed
rows/fields, duplicate IDs, formula/control-prefix safety, empty CSV, read states,
denial, preview cap/all-row CSV, template links, single selected hook, session
purge, actual Blob/anchor/revoke lifecycle and click-time cache/session admission.
- Full unit suite166 passed; zero failures/skips.
- Full typecheck, guardrail/build and git diff --check passed.
- Existing build advisory for the large main bundle remains; no dependency change.

Actual worktree Vite source was exercised with scratch Chromium153/Playwright at
1280x844 and390x844 touch viewports. Four combined dashboard/report journeys
passed; this report lane's two viewport journeys covered Templates->selection,
property preview, filter/clear, real CSV download/readback, lease/owner switching,
403 suppression/retry, session/filter reset, malformed200 and503 states. The
first property CSV contained all loaded rows and neutralized a formula-prefixed
source name. No report request occurred on Templates; property selection initially
requested only /api/portfolio/properties, then switches requested their selected
collections. Seven report controls measured at least44px high and99.640625px wide.
No horizontal page overflow, page errors or non-GET API calls. Desktop/mobile
screenshots were visually inspected. Table scrolling stays within its named,
keyboard-focusable region; page controls expose visible focus styles.

Scratch evidence for parent review:
- /tmp/ecc-ui-proof/reports-1280.png and reports-390.png
- /tmp/ecc-ui-proof/reports-templates-1280.png and reports-templates-390.png
- /tmp/ecc-ui-proof/receipts.json and run.mjs

Browser setup used separate scratch Vite optimization caches to avoid collisions
between worktrees sharing installed dependencies. No Vite config, dependency,
lockfile or CI change. Fixture interception is isolated to the test browser;
fixtures are not product data. Browser proof does not establish published source
alignment, real records, backend authorization/completeness or live readiness.

## Scope and rollback

Changed Create/Templates, own reports helper/component/CSS, focused tests and this
proof only. No shared resolver, App/navigation, dashboard, auth, backend, schema,
environment, transport, dependency or workflow change. No saved persistence claim,
main merge, publication or operational mutation. Revert the commit for rollback;
no data rollback is needed. Parent retains integration and release acceptance.

## Independent copy review follow-up

The selector guidance now reads "Choose the register you need to review or
share." Scope is plain operator language: "Includes the records loaded for this
report; it may not include your entire portfolio." A separate Records label names
the selected collection, and the timestamp label is "Records last updated: Not
reported." CSV scope/timestamp metadata uses the same plain language. No field,
source, freshness inference, financial behavior or export admission changed.

All14 targeted tests and guardrail/build passed after this copy-only correction.
The prior full166-test/typecheck and browser receipts cover unchanged behavior;
browser journeys were not repeated for wording. Existing screenshots precede
these wording changes and do not prove the final copy.
