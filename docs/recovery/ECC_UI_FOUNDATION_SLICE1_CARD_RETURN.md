# ECC UI foundation slice 1 — consistent card return navigation

**PR:** #172  
**Branch:** codex/ecc-plan-ui-foundation-20261027  
**Base:** c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e  
**Scope:** src/pages/card/** only. No shared CardShell, navigation, or resolver edits.

## Defect
Unit, lease, tenant, and owner cards had no return control on the success path. Breadcrumbs were plain text. Invalid-id paths returned a bare message with no way back. Only the property card had a back link, and only on error/invalid paths.

## Correction
Every card now renders an accessible “Back to {list}” control (`ecc-btn ecc-touch`, 44px target) on both the success path and the invalid-id path. Loading/denied/error paths already used CardLoadNotice with backPath; those are unchanged.

## Evidence
Source inspection of five card index files. Typecheck after the change. No new data, no invented records, no orange.

## Remaining
Shared CardShell still renders breadcrumbs as text. A precise patch request can make parent crumbs into links if Codex accepts it. This slice does not edit CardShell.

## Rollback
Revert the card index changes on this branch.
