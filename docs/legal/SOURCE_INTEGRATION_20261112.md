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
scripts. TypeScript includes retain authz, document and ledger source. The
architecture record preserves all domain sections. No consumer contract or
algorithm is changed during those conflict resolutions.

## Validation boundary

Combined local unit suite: 681/681, including the bridge that runs the 14 Python
reconciliation tests. Typecheck and guardrail/build pass. These are synthetic
source checks. No operational data was queried or modified for this integration.
The integration head requires its own hosted Verify and browser proof; prior
passing heads do not prove the combined tree.

The isolated PostgreSQL suites were not rerun on the combined tree: this host
lacks PostgreSQL16. Retained author-reported component runs are separate evidence,
not combined-tree or installed database proof. No installed database proof is
claimed.

The document UI's transport factory accepts bounded pages and verifies bytes,
but no real HTTP transport/store/provider is bound. The legal card still uses
the provisional frontend projection; native multi-award/ledger/workflow binding
is remaining UI work. A planning eligibility result never authorizes collection.

## Remaining work before operational acceptance

| Work | Required evidence / dependency | Owner |
| --- | --- | --- |
| Native legal card/register integration | Explicit L1/L5/L6 mapping, per-currency amounts, unknown/partial values, task and event states, desktop/mobile journeys | Codex |
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
