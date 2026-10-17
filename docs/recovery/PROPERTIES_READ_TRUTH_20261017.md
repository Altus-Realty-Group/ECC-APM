# Properties read-state correction - 2026-10-17

Base: main bfe9540b7c0058e7368838117679b17ccc04e54a.
Scope: Properties page presentation, its render regressions and existing browser expectations.

## Published observation

Parent operator's read-only Chrome observation on 2026-10-17 at
/portfolio/properties (1363x936 screenshot): "Properties could not be loaded"
appeared alongside "0 loaded", "Markets: 0" and "0 visible rows". No deployed
source SHA was observable. No writes were performed.

Other parent-observed published failures remain separate lanes: Owners displayed
hardcoded O-9001/O-9002 records (PR149); Data Hub claimed live Azure integration
while showing 503 and no rows; Integrations crashed with process is not defined
(the latter two belong to PR148). This slice does not repair those pages.

## Result

Properties mounts the table summaries and selectable review panel only after a
completed successful collection read. Loading, active refresh, denied, failed
(including retained cached rows) and unresolved/paused reads show an explicit
notice without numeric loaded/market/visible/selection summaries. Failed and
unresolved reads retain Retry; access denial retains the existing Retry behavior.
Selection resets when the read ceases to be ready, and the review panel unmounts.

Successful empty reads still display confirmed zero and the actual empty state.
Successful populated reads keep existing source field mapping, counts, occupancy,
search, card navigation and selection behavior. No total-portfolio completeness
claim is added. This is a presentation change, not backend availability.

## Validation

- Seven new static render regressions cover failed initial read, failed cached
  refresh, 401/403 cached denial, initial loading/active refresh, unresolved read,
  confirmed empty success and populated success.
- Existing mounted-page server-render denial regression now requires absence of
  false-zero summaries rather than expecting them.
- Full unit suite: 159 tests passed, zero failures/skips.
- Dependency checks: 16 passed, zero failures/skips.
- Full typecheck and guardrail/build passed. Build retains the existing large
  bundle advisory.
- Existing Playwright denial and pending-session expectations updated to the
  corrected presentation. Browser execution was not performed for this slice;
  parent reports Chromium downloads are truncated. Mounted runtime retest and
  published alignment remain pending. Rendered fixtures are not real data proof.

No endpoint, adapter, auth, backend, runtime target, schema, data, navigation,
workflow, dependency or lockfile change. Rollback: revert this commit; no data
rollback is required. No push, merge or publication in this worker lane.
