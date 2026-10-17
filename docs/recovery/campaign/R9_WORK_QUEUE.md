# ECC R9 approved work queue - 2026-10-16

Dion approved the seven targeted slices proposed in this conversation, including main integration of PR130/131/132. This record supersedes the implementation/delivery status in R8_WORK_QUEUE.md; original receipts remain historical.

## Completed source integration

PR130 merged at 6d91afa044362d97593ae54239022f46e2bfbee4, PR131 at 048af37892f96fcc534ba219d9463bbbc661afca, PR132 at bfe9540b7c0058e7368838117679b17ccc04e54a. PR145 was already merged into PR132. All were normal merges with expected head SHA guards. Final main is bfe9540b7c0058e7368838117679b17ccc04e54a.

Each PR's final hosted verification/proof-pack passed before integration; PR130/132 also have passing code analysis. PR131 has local 26-test operations browser evidence. PR132 has 46 local Chromium tests (23 at 1280px, 23 touch 390px), zero expected failures or skips, measured shell targets 45x44 and no overflow. Integration-main Verify/proof-pack were still running when this record was written. No claim that browsers were rerun on the combined main source. No ecc-functions or workflow file was touched by these three PRs; the path-filtered Azure deploy is not part of this change.

## Active approved lanes

| Owner | Scope | Delivery / execution evidence |
| --- | --- | --- |
| Codex | Integrate PR130/131/132; trace approved backend and Control Plane connection; reconcile recovery dependency source and prepare bounded execution proposal | Integration completed; connection evidence trace active |
| Claude R9-C V1 | New ECC read-boundary PR; then separate authoritative work-order read in verified owning repository | Prompt presented to Dion; AWAITING_MANUAL_HANDOFF; execution NOT_CONFIRMED |
| Grok R9-G V1 | New portfolio truthfulness PR; then work-order consumer only after accepted authoritative contract | Prompt presented to Dion; AWAITING_MANUAL_HANDOFF; execution NOT_CONFIRMED |

Claude owns generic entities/auth read-boundary modules. Grok owns portfolio mapping and portfolio handler sections in server/index.ts. Codex owns frontend connection/transport and integration. Shared edits need coordination. Codex retains acceptance. Do not infer external delivery or execution from this record.

## Connection evidence and limitations

ECC scripts/frontend-api-boundary.mjs currently returns explicit no-store 503 for /api and /bff; no verified target is configured. .altus-project.json still records fresh owner import pending, no active runtime binding. Issue119 remains open. A real workspace/process/commit and on-wire backend authority are not proven.

Control Plane source already defines the global session federation contract in docs/contracts/control_session_federation_v1.contract.md: registered application client, server-only assertion, opaque application session and per-request current-session validation. Its historical runtime checkpoint is not fresh proof. No independent login, identity store or credential flow is authorized. Control Plane owns identity.

The DoorLoop backend declares GET /api/dashboard/kpi/summary with a data-array envelope and also has a different KpiSummaryResponse source interface. ECC's own database architecture records mismatched portfolio envelopes/fields. Control Plane has separate ECC asset/portfolio contracts and explicitly records backing-truth/runtime limitations. These candidates must not be connected interchangeably or promoted to live authority based on filenames or historical docs.

Next Codex step: establish deployed route/handler identity, current Control Plane client registration and accepted wire shape before enabling a transport. Claude's scoped-reader result is a dependency for protected reads. No new runtime URL or credential is invented.

## Operational boundary

No deployment, publication, database/grant/environment mutation, live catch-up, credential handling or scheduled-sync activation occurred. Backend PR65 remains b8513a3ddf3df21a28cc92fa54c155e023f648f9 with 341 executable property tests; smoke alone only echoes ok. Its source stack and scheduled-write PR51-54 remain distinct from operational approval. Prepare actual role/plan/window/journal evidence before a concrete owner apply decision.

Legal/ledger domains remain unverified. Work orders must retain unavailable status until an accepted real read contract and identity scope are proven. No fabricated operating values. Test fixtures establish source behavior only.
