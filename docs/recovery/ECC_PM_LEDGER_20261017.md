# ECC PM completion ledger

Interim PM: Claude (appointed by Dion, 2026-10-17). Repository: Altus-Realty-Group/ECC-APM (ID 1058195656). Codex is advisory only.
Verified main: `c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e` (merged PR165). Backend `AltusDD/empirecommandcenter-backend` (ID 1044939166) main last reported `5a571f3b`; not refreshed (no access).
Standing holds (unchanged): no merge, deploy, live DB write, or cloud/access change without Dion's specific authorization.

## Defects and workstreams

| ID | Defect / goal | Owner | Exact head | Proof so far | Blocker | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| G7/G8 | Scheduler panel shows cached/estimated values as truth | Claude (acceptance review) | PR166 head `42273dfcb2fceadbed440101a9abc3424258a2d9` (AltusDD, ready for review) | Reviewer-run on this head: typecheck clean; `npm test` 315/315; `test:dependencies` 16/16; `npm run build` passes; CI `verify` and `proof-pack` success, CodeQL pending at review time; date validator rejects Feb 31, Apr 31, hour 24, bad offsets, non-leap Feb 29 and accepts leap days. Author reports Chromium proof at 1280/390 (not re-run by reviewer). PM's own local fix commit `4647a9e5` abandoned as redundant | Merge hold in force; CodeQL result | Accept source once CodeQL green; merge needs Dion's approval |
| C7 | Owner-token validation for existing Properties read (disabled by default) | Claude | n/a | none | Backend repo not attached to this session | Dion access step below; meanwhile no backend writes |
| ACCESS | Protected sign-in: Entra app exists, no backend validation, localhost-only redirects | Claude (plan), Dion (cloud) | n/a | A5 report only | Audience, delegated scope and actor-to-record policy unverified | Do not accept ID tokens as API tokens; no new login |
| VS1 | Protected real-data vertical: sign-in, property list, detail, refresh, failure recovery, session isolation | Claude | n/a | PR165 source only; deployed identity unresolved | Depends on ACCESS and C7; data freshness unproven | Prove list/detail/refresh/failure/session-replacement in mounted tests first |
| G9 | Route truth audit | cancelled | n/a | `tests/unit/navigation.test.ts` already fails on nav links to missing routes and on unbuilt destinations being routed; 37 of 58 ledger paths are intentional unavailable inventory (`PLANNED_DESTINATIONS`) | none | none; ledger CSV statuses are from the stale published audit |
| PR155/156 | Control Plane host/session bridge stack | parked | `54e42095`, `51ab788e` | none | Control Plane parked | Do not merge or activate |

## Delegation state labels (Grok)

| Item | drafted | delivered | acknowledged | active | returned | accepted |
| --- | --- | --- | --- | --- | --- | --- |
| G8 corrections | n/a | n/a | n/a | n/a | n/a | superseded: done by Claude |
| G9 route truth | cancelled as redundant | n/a | n/a | n/a | n/a | n/a |
| G7 initial work | yes | yes | yes | n/a | yes (eb9281e) | no |

## Freshness rule

A healthy response or populated list never proves current data. Acceptance requires a displayed, source-attributed observation time.

## Why VS1 is gated (source facts, main c0939cf)

- `src/lib/sessionScope.ts` states the frontend has no authentication transport. No `Authorization` header is attached to `/api` reads; the only bearer use is an admin token typed on the owner-transfer page.
- Real protection therefore needs two things outside this repo: (1) backend token validation (C7, backend repo access), and (2) an approved audience, scope and redirect set for the existing Entra app. Until both exist the frontend can only show truthful denied/unavailable states.
- Safe independent work: scope isolation, failure/retry, late-response and cache-purge behaviour already tested in `session.test.ts`; G8 scheduler corrections (done).
