# ECC operational recovery: 2026-10-17

Owner: Dion. Execution lead: this ECC chat. Canonical frontend repository: Altus-Realty-Group/ECC-APM, ID1058195656.

## Authorized outcome

Dion explicitly requested zero mock business data, backend-to-frontend connection, restoration of missing pages/navigation and workflow-focused UI design. This expands source implementation authority to backend integration; it does not establish a deployment, schema migration, credential or provider activation receipt.

## Implemented in this slice

- Retired the legacy dashboard's invented random cash-flow, collections trends, fixed leasing-funnel counts, guessed vacancy/occupancy joins and empty payment/charge sources. Compatibility readers now reuse the governed summary endpoint; unsupported metrics stay unknown.
- Removed fixed navigation badge values and the pretend refresh loop. Optional badge endpoint failure is unknown, not zero.
- Legacy map/task surfaces state their missing source capability instead of inventing coordinates or claiming no outstanding work.
- File-list responses fail if missing/malformed. The active file view isolates source/record/session transitions and rejects unsafe links. Unimplemented DoorLoop and unconfigured SharePoint readers no longer report successful empty lists.
- Retired the fake DLQ replay that fetched one unrelated provider item and announced success. Requeue returns503 after existing authorization and preserves queue items without provider or audit-success calls.

These are source corrections, not activation or restoration of missing provider capabilities. Test fixtures are isolated and never persisted as operational records. Archived originals remain inert; they are not startup data.

## Related delivery

PR149 removes mounted Owners sample rows and fixes portfolio field/status/ID truth. PR151 suppresses Properties counts on unverified reads. Separate worktrees prepare dashboard context, individual legal/work-order/ledger routes and a real loaded-record CSV reporting workflow. PR147 remains the complete historical destination inventory; disabled links are not completed workflows.

## Backend evidence and unresolved release dependency

Read-only investigation corroborated AltusCommandCenter (`ssexobxvtuxwnblwplzh`) through the current DoorLoop pipeline's explicit host reference and historical portfolio startup evidence. Stored records are old observations:191 properties,187 units,130 leases,684 tenants,37 owners; latest entity updates2025-10 through2025-12. Raw sync timestamps are2025-11-18, latest sync-status success2026-01-14. This does not prove current operating-data completeness.

Live leases have integer rent_cents and no rent dollar column, contradicting the source-only PR146 projection. Correct the read policy and corresponding explorer together before connection. Recorded ledger money units require lineage; do not infer conversion.

The historical API owner exists as private AltusDD/empirecommandcenter-backend (ID1044939166), current main5a571f3bb7f9b314513d4c19f4dcb6821687a478. Its anonymous arbitrary portfolio reader is unsafe to activate. Both it and the ETL repository declare the same staging deployment target; current deployed owner/SHA must be reconciled. ECC's local Node server is dormant and also has unscoped reads. No safe binding is established merely by changing a proxy URL.

A read-only Control Plane catalog query was rejected by automatic approval review because task-specific authority for that separate database was not established. No workaround was attempted. Current source federation contract was read; current registration, client/session and actor authority still require approved verification. No local login or role fallback was added.

## Completion gates

1. Verified authoritative API owner/route/SHA and runtime source/process.
2. Control Plane registration/session and actor-to-record authorization.
3. Schema/units/projections/freshness aligned with the existing store.
4. Protected transport plus real list-to-card and denied-session proof.
5. Current ingestion reconciliation; honest missing-data status until complete.
6. Missing workflows rebuilt from source evidence, with real reads and safe writes/exports.
7. Actual browser desktop/mobile workflow acceptance on deployed reviewed source.

No main merge, deployment, provider send, live sync, data/grant/schema mutation, key handling or runtime environment change occurred in this slice. No direct Claude or Grok execution channel was available; internal workers are not those providers.
