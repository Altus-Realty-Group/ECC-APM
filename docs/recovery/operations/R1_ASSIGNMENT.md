# R1-C: Operations and authoritative data recovery
Owner: Claude Code. Status: assignment seed, implementation not started/accepted.
Read the campaign plan and incoming-file standard in the Codex governance PR before implementation. Start from this independent branch, whose base is main at 1c8fd1022f46cd26ad0df748ffc053c0ed2c9542.

Objective: recover useful legal-case management, work-order and ledger functionality into current ECC-APM frontend structure. Begin with a current-field/endpoint contract ledger and one bounded real read-only vertical slice, then continue already-authorized frontend work through reviewable slices. Do not turn unverified endpoints into invented backend contracts.

Exclusive target paths: src/features/recovery/operations/**, src/lib/recovery/**, docs/recovery/operations/**, tests/unit/recovery-operations*, e2e/recovery-operations*. Inspect all relevant source, backend contracts and current repository architecture, but changes outside your targets require PM integration.

Sources: EmpireCommandCenter1/EmpireCommandCenter/client/src/pages/EnhancedLegalCasesPage.tsx, LegalCaseDetail.tsx, LegalAdvancedOpsPage.tsx, WorkOrdersPage.tsx, LedgerControlPage.tsx; relevant server implementations; EstateCommand2 current adapters/card/list contracts; AltusCommand3 ledger as a rejected simulated-payment example.

Required standards: verify transaction units and identity, no synthetic payments, unknown is not zero, bounded errors/timeouts, denied/session isolation, actual database/API provenance, accessible black/white/gold UI. Recover source as evidence; reimplement defects rather than copying them.

Do not touch App.tsx, navigation, common queryClient/session code, existing src/contracts, shared styles, package/lock/workflow/config files, backend business code, proxies, environment, secrets, live database or deployment. Record needed shared edits and exact contract evidence in docs/recovery/operations/INTEGRATION_REQUEST.md for Codex.

Validate every touched file and provenance entry; current mandatory typecheck/tests/dependency checks/build plus targeted operations tests and relevant browser journeys. Do not enable legal escalation, document generation, transaction mutation or operational writes until verified authority/confirmation/audit/idempotency contracts exist; report that dependency while advancing independent read functionality.

Return exact PR/head, files, validation results, provenance/contract ledger, remaining slice, lane integrity and next concrete action. No merge/publication authority. Rollback: revert source slice; no live-state changes.
