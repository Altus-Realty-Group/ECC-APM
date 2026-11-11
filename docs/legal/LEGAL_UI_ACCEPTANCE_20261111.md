# Legal UI integration and acceptance

Owner: Codex. Dion assigned final ECC UI design, build-out and visual acceptance to Codex on 2026-11-11. Claude and Grok may advise on design and prepare structures; returned UI work is input to Codex integration. This slice incorporates Grok's source at 37b80b837d9638a4f72982fe9732f84857fa4c45 without modifying his branch.

## Operator and workflow

The property-management legal operator reviews the loaded matter register, identifies intake/attorney-review/missing-evidence work, opens a matter, and checks the next action and evidence before escalation. Incorrect verification, stale company records, hidden unknown amounts and misleading balances can cause a wrong referral. This is a frequent operations screen, so the register uses compact rows with caption, court, stage and next action; details use a small fact grid and keyboard-accessible sections.

Routes: `/ops/legal/case-manager` and `/ops/legal/matters/:id` in the existing ECC shell. Legal-specific pages reuse StateNotice, shared QueryClient, session epoch and Wouter. The route path alone identifies the matter; a query-string id cannot replace it. No create, filing, collection, export or communication action is enabled.

## Information and states

Counts describe loaded matters and distinct reported award identities only. Unknown amounts remain unknown, recorded zero stays zero cents, and currency is never invented. No balance or receivable total is computed. Provisional single-award frontend fields are not the accepted multi-award legal contract. Producer binding requires explicit contract mapping and the legal authorization gates.

The card separately presents lifecycle, judgment verification, collection readiness and evidence confidence. Timeline/documents/tasks/correspondence/court/packet/audit remain honestly unavailable until their accepted sources exist. The current operational adapter is unbound, makes no request and presents an unavailable state. Populated records exist only in the isolated browser/unit fixtures.

## Acceptance matrix

| Journey | Required evidence |
| --- | --- |
| Register | Loaded queues, search, no-match recovery, distinct award identity counts |
| Matter navigation | Valid, missing and invalid paths; reload; query id cannot override path |
| Amounts | Recorded zero versus unknown; no inferred currency or collection balance |
| Context | Session boundary clears filters; other-domain denial purges legal rows; late old response rejected |
| Keyboard | Roving tab focus, arrows, Home/End, linked tab panel |
| Narrow view | 390 and 1440 widths, long unbroken captions, no overflow, 44px controls |
| Failure | Loading, unavailable, denied, error, retry and stale notices |

`node scripts/legal-browser-proof.mjs` builds an isolated entry importing the actual legal components. It blocks external/API/BFF requests, captures screenshots and a labelled synthetic receipt, and records source commit/worktree. CI runs it only for affected legal/shared inputs in the existing Verify job, using the same installed browser as the dashboard proof. No added job or vendor call. The job remains bounded to 10 minutes; the legal step has a 3-minute limit and artifacts expire in 7 days. Expected additional execution is one bounded legal proof per affected PR, none for unrelated changes. No duplicate feature-push trigger is added.

Local evidence: unit/typecheck/guardrail/build passed. Local Chromium launch is blocked by the workspace socket policy, so local compilation is not measured visual acceptance. Hosted exact-head browser proof and screenshot inspection are required before acceptance. No deployed, installed-database or live-authorization claim is made.

Rollback: revert the Codex integration changes and, if released together, the originating Grok UI commits. There is no database or deployment rollback in this source-only slice.

## Reactive dependencies

| Event/input | Canonical source and state owner | Derived/display effect | Persisted/downstream effect |
| --- | --- | --- | --- |
| Search and queue | User input, register-local state | Filter loaded rows and matching count; all-loaded summary stays explicit | None; filters clear with context |
| Matter link and tab | Wouter path; card-local tab | New record read; independently labelled dimensions and section | No write; reload rereads the route |
| Typed snapshot | Unbound adapter in operating app; synthetic adapter in tests | Loaded counts, distinct award identities, unknown/zero presentation | Producer not accepted; no database/API mutation |
| Session boundary or denial | Existing shared session epoch/QueryCache | Drop prior rows, filters and tab state; reject late responses | No grant is inferred or changed |

No chart or editable financial calculation exists in this slice. No persistence claim applies to local filters or tab selection. Live producer, legal ledger, evidence organization and operational writes require their own acceptance.
