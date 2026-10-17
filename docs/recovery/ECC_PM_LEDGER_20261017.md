# ECC PM completion ledger

Interim PM: Claude (appointed by Dion, 2026-10-17). Repository: Altus-Realty-Group/ECC-APM (ID 1058195656). Codex is advisory only.
Verified main: `c0939cf39c4e5f67b52b2d2e6b51f79b2d62451e` (merged PR165). Backend `AltusDD/empirecommandcenter-backend` (ID 1044939166) main last reported `5a571f3b`; not refreshed (no access).
Standing holds (unchanged): no merge, deploy, live DB write, or cloud/access change without Dion's specific authorization.

## Defects and workstreams

| ID | Defect / goal | Owner | Exact head | Proof so far | Blocker | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| G7 | Scheduler panel shows cached/estimated values as truth | Grok (corrections), Claude (acceptance) | `eb9281e3ac2526c50eba162fa2421751a3b71c62`, draft PR166 | typecheck clean; `npm test` 312/312 on this head (reviewer-run). RPC-containment failure claim not reproduced | Corrections 1-6 in PR166 body; no mounted test; no build/browser proof | Grok returns corrections; Claude re-reviews |
| C7 | Owner-token validation for existing Properties read (disabled by default) | Claude | n/a | none | Backend repo not attached to this session | Dion access step below; meanwhile no backend writes |
| ACCESS | Protected sign-in: Entra app exists, no backend validation, localhost-only redirects | Claude (plan), Dion (cloud) | n/a | A5 report only | Audience, delegated scope and actor-to-record policy unverified | Do not accept ID tokens as API tokens; no new login |
| VS1 | Protected real-data vertical: sign-in, property list, detail, refresh, failure recovery, session isolation | Claude | n/a | PR165 source only; deployed identity unresolved | Depends on ACCESS and C7; data freshness unproven | Prove list/detail/refresh/failure/session-replacement in mounted tests first |
| PR155/156 | Control Plane host/session bridge stack | parked | `54e42095`, `51ab788e` | none | Control Plane parked | Do not merge or activate |

## Delegation state labels (Grok)

| Item | drafted | delivered | acknowledged | active | returned | accepted |
| --- | --- | --- | --- | --- | --- | --- |
| G7 corrections | yes | no (needs Dion to paste) | no | no | no | no |
| G7 initial work | yes | yes | yes | n/a | yes (eb9281e) | no |

## Freshness rule

A healthy response or populated list never proves current data. Acceptance requires a displayed, source-attributed observation time.
