# Protected evidence read: one download (source only) - 2026-11-16

`server/lib/legal/evidenceReader.ts` is an **unmounted** reader for ONE legal evidence download. It binds no route, handler, producer, grant, credential, database or provider.
Every dependency is injected and every default denies (`createUnboundEvidenceReader` returns `unavailable` and touches nothing). The dependency and authorization-order decision was
written first: [ADR-0005](adr/ADR-0005-protected-evidence-read.md). A read plan (`planEvidenceRead`, unchanged from #244) is a consistency result and is never permission.
No listing, pagination, journal UI, packet export, historical-version reader, handler, route, grant, live SQL or file copy exists here.

Files: `evidenceReader.ts`, `evidenceReaderPorts.ts`, `evidenceReaderUnbound.ts` (server/lib/legal), tests `tests/unit/legal/evidence-reader*.ts`. The planner, the D1 reader/ports/integrity,
A1 and the 001-003 SQL are unchanged.

## What it reuses (nothing copied)

- **A1**: `resolveReadAuthority` through the injected `AuthorityPort`; `snapshotContext`/`assertContext` freeze and validate the context (actor, scopes, finite lifetime, binding).
- **Planner**: `planEvidenceRead`, unchanged; **L4 contracts**: `parseEvidenceRef` (explicit nullable fields), `deriveBindingState`, `parseUuid`; L1 `parseMatter`.
- **D1**: `isStoreRow`, the D1 reader's `download` for verified delivery (latest verified receipt with matching digest and size, current version only, bounded provider read, size and SHA-256),
  and the D1 ports. Target authorization mirrors the D1 reader's (scope mapping, classification policy, linked owners) without touching any document, so it can run before any document operation.
- New minimal ports only for the legal side: `evidence.load`, `properties.rows` (same-row key join), `pinned.resolve` (pinned version to document and status).

## Order, and why it closes the oracle

The browser sends exactly `{ sessionId, matterId, evidenceId }`; any other key (a permission boolean, scope, version, document, property, revision) is refused with `denied` before any port runs.
Then: A1 session authority, matter stage (the reader itself requires `matter.scopeRef` in the context's scopes; out-of-scope, absent matter and absent evidence are all `missing`), evidence state
(unbound `unavailable`, withdrawn `missing`, restricted `denied`), same-row property keys, **D1 target authority for every candidate property before any document operation (none authorized: `denied`,
whether or not a document or version exists)**, only then version resolution, the registry row under the D1 visibility filter, the plan (its context must be the authorized target), the D1 delivery,
and a **revalidation from scratch** (steps 1-8 again with fresh reads, plan and target state equal, same A1 binding), a **final authorization** (fresh A1 decision and the target's scope mapping,
classification policy and linked owners, the last asynchronous step), and an expiry check against every authority lifetime immediately before anything leaves.
Revoked -> `denied`; changed or expired during the work -> `stale`; unreadable or malformed -> `unavailable`/`conflict`. A failure is exactly `{ kind }`. Success carries the bytes plus
`matterId, evidenceId, versionId, name, mediaType, byteSize, sha256`, never a provider reference, path, URL or receipt.

## Behaviour proven (synthetic ports, 50 reader tests)

Successful controls: a direct property document and an owner agreement through the exact owner-document-property link, in the decided port order, byte-identical to the D1 reader's delivery.
Denials and withholding: defaults and unbound ports; browser-supplied permission fields; malformed requests and `maxDownloadBytes`; every A1 denial and malformed authority context; non-finite or expired
clocks; out-of-scope matter (indistinguishable from absent, no D1 port touched, even if the evidence port ignores the context); the oracle (a caller with matter but no target authority gets the same `denied` for
an existing, missing or replaced version, and version resolution never runs); unbound, withdrawn and restricted evidence; a storage reference that looks like a version id; retired and unreadable document status;
a newer version (stale, never substituted, never read); unrelated property, unlinked or foreign-scope owner agreements; no property link; crossed and duplicate property keys; unmapped or wrong-scope targets;
restricted/financial-tax classification (public-only: invisible without a policy allow, `denied` with one); pending, failed, reconciliation, absent and mismatching receipts; corrupt, short and long bytes and provider errors;
the size bound; and change during the work: revocation and session revocation during the provider read, withdrawal, revision, pin, restriction, matter scope, property links, property-key mapping, target scope mapping,
classification policy, linked-owner authorization, document retirement, a new version, a vanished registry row, grant revision drift, revocation during revalidation, a mapping or revocation landing after every record read,
expiry at the last authorization read and a context lifetime ending between the runs. Malformed or throwing ports return fixed failures and a frozen context cannot be widened by a port.

Negative controls (`evidence-reader-controls.test.ts`, 12): each loads a copy of the reader with ONE protection removed and must fail the same behaviour: final authorization, D1 target authority before version
resolution, the reader's own matter-scope check, the request whitelist, the evidence-revision comparison, the delivered-document comparison, the final expiry check, evidence-state gating before document operations,
A1 binding drift, the target state key, the stale/denied collapse and the unavailable-authority short circuit.

## What building it found

- The first revalidation run resolved A1 first, so a revocation landing during that run's later reads was not re-checked. The D1 reader's convention (authorization is the LAST asynchronous step) is now
  followed by a `finalAuthorize` step, with its own test.
- Several candidate controls were equivalent mutants (a second layer, often the unchanged planner or the target state key, caught the same condition). Each control now removes exactly the layers that isolate one behaviour.

## Remaining gates

Every authority producer (central resource grants, the scope registry, owner/property to scope mappings, the classification policy); binders for `evidence.load`, `properties.rows` and `pinned.resolve` under
the A1 database seam (and a real store for D1); a provider with verified receipts; a mounted handler, route and browser transport; the audit journal intersection with D1 authority; restricted and financial-tax
entitlements (this reader is public-only because the planner is); listing, packet export and historical versions; installed behaviour; live acceptance. Two document-status values are the only ones the reader accepts
(`active`, `retired`); extending that is a reviewed change. Revert this PR to roll back: no database, file or runtime state exists.
