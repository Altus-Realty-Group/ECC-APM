# Legal and document source integration

This branch combines reviewed source. It does not activate a producer, mount a
handler, apply a schema, backfill records, copy files or establish live access.
All schema files remain proposals. Production adapters remain unbound.

## Inputs preserved

| Family | Reviewed head | Review source |
| --- | --- | --- |
| Native legal model | `5fb91423fc8cb41c972de96b5291a044c3a3ed04` | PR #223 |
| Workflow and requirement queues | `5ad572faa6876c5b5310981ad47dadb1a36a0dbc` | PR #230 / #236 |
| Protected reads and document registry/reader | `6cb1f316cb6c66523d3871d74d7f09e554856223` | PR #229 / #233 |
| Owner/property document UI and byte/page bridge | `691363dcb380ce49b71234c97a22b931187a540f` | PR #232 |
| Award/payment ledger | `e0af5a3c9913cdf99ac0f0cec2289209a90e43ad` | PR #235 |
| Offline copy reconciliation | `b38f3a2466beeab01524b55df88acbb6e7773d47` | PR #234 |

The approved simple ownership/property layout document is copied unchanged from
PR #231 at `6aa7ac40927dd185e49cf9324dc3d517ca2a8af5`. The historical task-prompt
file and workbook/import payloads are not added by this integration.

The package conflict is resolved by retaining all three isolated database test
scripts. TypeScript includes retain authz and documents and cover the entire
shared legal domain, including workflow/queue source that previously had no
application import to pull it into the typecheck. The
architecture record preserves all domain sections. No consumer contract or
algorithm is changed during those conflict resolutions. The expanded typecheck
found two unknown-return narrowings in the workflow date helpers; explicit null
and validated-string branches resolve them without weakening date validation.

## Validation boundary

Initial integration local unit suite: 681/681, including the bridge that runs the 14 Python
reconciliation tests. Typecheck and guardrail/build pass. These are synthetic
source checks. No operational data was queried or modified for this integration.
The integration head requires its own hosted Verify and browser proof; prior
passing heads do not prove the combined tree.

The isolated PostgreSQL suites were not rerun on the combined tree: this host
lacks PostgreSQL16. Retained author-reported component runs are separate evidence,
not combined-tree or installed database proof. No installed database proof is
claimed.

The document UI's transport factory accepts bounded pages and verifies bytes,
but no real HTTP transport/store/provider is bound. The native legal register/card now consumes validated L1/L6 projections, separate
award identities and requirement queues. L5 balance/eligibility binding still needs
an accepted producer. A planning eligibility result never authorizes collection.

## Remaining work before operational acceptance

| Work | Required evidence / dependency | Owner |
| --- | --- | --- |
| Native legal UI live binding | L1/L6 source mapping and synthetic journeys are integrated; accepted producer, L5 balances/eligibility and live journeys remain | Codex |
| Matter-to-document and party/court evidence linkage | Reviewed associations and classification; party capacities cannot be inferred from award liability; document access alone is not matter authority | Codex, with model support |
| Internal attorney packet | Accepted ledger and evidence inputs; protected completeness preflight, immutable snapshot/manifest, artifact hashes and audit; inaccessible required evidence blocks completeness without disclosure | Claude/Grok structure support; Codex integration |
| Persisted workbook intake | Existing offline preview plus authorized idempotent staging, conflict/revision matching and reviewed matter identity | Codex |
| Central resource grants and scope registry | Accepted producer; verified owner/property/matter-to-scope mappings; no developer-mode or folder-name authority | Control Plane dependency / Codex binding |
| Installed schema and runtime custody | Separately reviewed apply/backfill, non-bypass role, transaction isolation, RLS policies and installed allowed/denied proof | Codex / authorized operator |
| Real store and COPY ONLY provider delivery | Authenticated observations, verified full bytes and receipts, confidential destination access; originals preserved | Codex |
| Mounted server/browser transports | Current-session and resource authorization, exact document/version/record identity, final expiry/revocation checks | Codex |
| Operational acceptance and release | Allowed/denied/revoked/expired journeys, reload/persistence, reversal, packet completeness, desktop/mobile, current required checks and explicit release scope | Codex |

All live activation gates above remain open. No real matters, awards or file
deliveries are established by fixture proof. Unknown money remains unknown.
Existing original legal folders are never cleanup or rollback targets.

## Cost and rollback

The only workflow diff is the already-reviewed PR #232 document-browser scope
inside the existing Verify job: same triggers, job count and ten-minute ceiling;
shared browser install, two-minute document proof ceiling and one-day document
artifact retention. The existing 10-second-bounded Python unit subprocess is
retained. No new workflow, matrix, dependency, vendor call or service is added.

Revert the integration source commit or the relevant component PR commits. No
production data, applied schema or file operation exists to undo. Reverting
source must never run the proposal rollback scripts automatically.

## Combined release candidate - 2026-11-15

This candidate includes the existing integration plus the following exact reviewed
source heads, retaining their history. Nothing is applied or connected by merging
these source trees. The combined candidate needs its own hosted checks and browser
receipts; passing component heads do not prove the combined tree.

| Family | Exact source head | Source PR |
| --- | --- | --- |
| Native legal UI | `5aee7066cb8b3b6dd417032e11a7d81d77ce238c` | #240 |
| Private immutable-version manifest | `14cc97a1ddd80c5fdc10520cad68b961e7d7371f` | #239 |
| Combined DB reconstruction | `2226fe421f1c8291b2ab702e053316df876c2a02` | #238 |
| Reference protection | `6ecd51c7e3fea7ee8890be5919f919e0965b8b4f` | #241 |
| Evidence version-link model and exact SQL preconditions | `3d86efd7bf4db1ded0778846d1b8a3372fa89baa` | #243 |
| Non-authoritative evidence read preparation | `c8f10b7cabfc7886d7e5af88e40c23982e61fc9b` | #244 |

ADR-0004 and its acceptance matrix (#242) are retained through the model lineage.
All legal/document SQL files remain unapplied proposals. The current runtime
manifest has no active app binding. Candidate discovery found ECC-APM (v1.0),
replId `75cc12d4-f5f6-4751-b198-3a4ad61ccd0c`; a discovered title/ID is not proof
of its repository, branch, clean worktree or running process. The old import-
pending record is historical evidence, not proof that no workspace exists. No
active binding or runtime synchronization is inferred from that discovery.

The reviewable candidate is a fixture/source milestone, not operational go-live.
Fresh DoorLoop capture, promotion/reconciliation, verified runtime alignment,
protected data routes, reviewed schema/backfill and authenticated COPY ONLY
delivery remain required. No old sync workflow, privileged endpoint or provider
job is reactivated. Original legal folders are never moved or deleted.

Combined candidate local validation: 742/742 unit tests, typecheck, guardrail/build,
16/16 dependency checks and diff check pass. The candidate requires fresh hosted
Verify and scoped browser receipts. PostgreSQL server binaries are unavailable
on this host; no independent combined installed/PG proof is asserted.
