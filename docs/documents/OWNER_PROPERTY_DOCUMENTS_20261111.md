# Owner and property documents - implemented frontend boundary

Status: source implementation with an unbound production adapter. No live
document-list/download producer or storage writer is activated by this PR.

## Operator and filing model

ECC/Altus; property management staff need to find owner contracts and records,
then property and tenancy evidence without duplicating documents or exposing
other owners' records. The owner card's Files tab contains Ownership Documents:
Property Management Contracts, Entity & Ownership Records, Financial & Tax
Documents, Owner Statements & Reports, and Correspondence. Property Files uses
the existing Tenant Documents, Property Pics & Video, Improvements & Construction,
Legal and Insurance sections, plus explicitly linked owner documents.

Dion directed the simple Assets Under Management layout rather than the
expanded canonical-category hierarchy. This frontend follows that local layout;
it does not introduce alternative record IDs or additional visible ID folders.
The complete local filing/retrieval plan is in PR #231. Original property and
legal folders remain intact; any future file intake is COPY ONLY.

## Verified Dropbox folder setup

November 11, 2026: all 44 existing destination owner folders now have
`0.  Ownership Documents` and its five numbered sections. Created 264 empty
folders:44 document roots plus 220 sections. One empty section set was created,
verified and copied to the other 43 owners with autorename disabled. The 43-copy
job completed with 43 successes and zero failures. A fresh recursive listing
contained 308 folders (44 owner roots plus 264 document folders), all expected
paths present, no unexpected file content. No document bytes, source folders,
sharing settings, database registry or credentials were changed. Detailed paths
and provider IDs remain private and are not committed.

## Actual source changes

`src/pages/card/{owner,property}/Files.tsx` now mounts `RecordDocuments`, using
the already-loaded native integer record ID. Missing data retains the previous
truthful unavailable fallback. No card RPC or shared shell/session code changes.
`documentModel.ts` validates a proposed frontend projection: exact requested
record, known sections/association/delivery states, unique document IDs, safe
names and at most 500 rows. Repeated identities and wrong-record responses fail
closed. Unknown source fields, especially raw links, are stripped.

One document may be explicitly linked from ownership to its covered properties.
The view neither copies the file nor interprets that association as a grant.
The accepted server must authorize and classify documents before search/counts
or any metadata reaches the browser. Native record IDs or folder visibility
never authorize file access.

`documentQuery.ts` reuses the existing shared QueryClient, denial purge and
session epoch. Keys include adapter, owner/property kind and record ID. Query
errors, refresh, denial and cache-clearing suppress old rows; record, adapter
and session changes reset folder/search state. Late reads from old epochs fail.
Nonready states never present confirmed-empty counts.

Downloads are enabled only for a verified delivery. The proposed adapter must
re-authorize the selected registered document/version and validate delivered
bytes before returning a Blob. The component verifies matching document/version
identity; it accepts no shared URL or browser-supplied provider path. The Blob
link is short-lived and revoked after triggering the browser download. A record,
adapter, delivery, version or session change/unmount suppresses late results.
Download denial participates in the same shared cache purge.

The default adapter returns unavailable and performs no network request. This
is a frontend dependency interface, not an accepted installed endpoint or an
authorization/registry producer. Synthetic data exists only in tests.

## Why live wiring is still pending

Current source inventory found no document/version/delivery registry in
`shared/schema.ts`. The old file router declares unavailable placeholders but
is not mounted by `server/index.ts`; its response is not runtime proof. The
legacy upload helper defaults to overwrite and creates shared links, and the
listing helper is caller-path based and lacks continuation handling. None is
activated or reused here. Existing service-role card reads do not establish
document authorization. PR #229 remains a separate resource-authz dependency.

An accepted registry/policy source, owner/property associations, protected
delivery transport, destination confidentiality and verified copy receipts
must be bound before live document access. Inspect actual candidate tables and
policies before selecting persistence; no new tables are invented in this PR.
No SQL, RLS/grant, cache persistence, provider credential, workflow or runtime
target changes. Net new database objects:0.

## Validation and limits

- Focused document component/model/query suite:16/16; independent deferred
  download checks for record/adapter/session/unmount plus a successful control.
- Existing no-data card compatibility is retained.
- Full unit suite, typecheck, guardrail and build are recorded in the PR.
- The browser harness uses actual Files components, CardShell, Sidebar,
  WorkspaceBar and styles, with synthetic adapters only. It specifies 390/1440,
  filtering, pending download denial, downloaded bytes, session reset, linked
  owner records, all error states, cross-domain denial, geometry and 44px targets.
- Browser proof is NOT PASSED: local Chromium failed at socket creation under
  host policy; remote browser could not reach the local preview. No screenshot,
  mobile-fit, measured accessibility, live producer or live download acceptance
  claim is made. The proof script is ready for a supported browser runner.

Rollback: revert source changes. This PR performs no live migration. Removing
newly created empty Dropbox folders is a separate explicitly requested action;
never remove originals or later-added files automatically.
