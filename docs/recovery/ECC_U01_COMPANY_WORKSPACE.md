# ECC U01 company workspace - source checkpoint

Updated2026-11-01 America/Chicago. PR190 remains draft and unbound. Grok source head05bd121b4d9cd7a354904e5a25b89a3f766fa0a2 is the parent of the Codex harness/isolation patch. This is not live owner access or release approval.

## Behavior and boundary

The proposed frontend adapter receives WorkspaceContext containing sessionEpoch and management customerId. This is a display/request context, not a server authorization claim or a mapping of personal account to company. The adapter remains explicitly unavailable until an accepted producer exists. Primary contact has no implied administration, financial or banking grant. Denied company metadata is omitted.

Codex added an in-memory snapshot bound to the exact adapter and memoized context. A changed adapter/customer/session cannot render previous content, including the commit before passive effects start replacement loading. Results and selection belong to that snapshot. No cross-customer company key or persistent cache is introduced.

The current AbortController is owned by a ref. Replacement, retry, context change and unmount cancel the current request and invalidate its request epoch. Completion also checks the current supported session epoch and abort status. Both late success and late error are discarded. A synchronous adapter throw settles to the error notice. A collection containing only denied memberships shows the empty state without their names.

## Test harness and proof

react-test-renderer18.3.1 and @types/react-test-renderer18.3.1 are exact development dependencies, compatible with locked React18.3.1. No production dependency, CI job, trigger, timeout, browser download or provider call is added. The existing unit discovery and Verify job include the new mounted test filename automatically.

- Focused command: `node --import tsx --import ./tests/unit/register-css.mjs --test tests/unit/owner-company-workspace.test.tsx tests/unit/owner-company-workspace-mounted.test.tsx`:15/15 pass.
- New mounted tests:9. On the worker parent,5 fail (new-context first-commit exposure, adapter first-commit exposure, denied-only empty state and synchronous adapter throw); after the patch,9/9 pass. The existing active retry cancellation also passes in the mounted test.
- Mounted coverage: primary/viewer selection with no derived powers; denied/missing selected ID; ready/unavailable/empty/denied/error; first-commit customer/session/adapter replacement; old-context success and rejection; active retry/unmount and late completion; synchronous adapter failure.
- `npm run test:unit`:52 files,366 tests,366 pass,0 skipped,0 fail.
- `npm run typecheck`:pass. `npm run build`:pass with the existing large-chunk advisory.
- Source and lock hashes are retained in ECC_U01_SOURCE_VALIDATION_20261101.json. Hosted CI results must be checked at the pushed head separately.

## Remaining gates

No route was mounted and no accepted membership producer exists. These synthetic React-renderer tests are not live owner access, server authorization, browser layout,390px measurement or device acceptance. Local Chromium is unavailable; source44px/wrap rules remain unmeasured. The supported session boundary still depends on the eventual sign-in/session owner emitting it. A scoped producer and shared route integration remain Codex dependencies.

## Rollback

Revert the page-local snapshot/harness/test/docs patch and development dependency/lock additions to return to the worker parent. This reintroduces the recorded render-isolation gaps. No DB or live permission rollback is involved.
