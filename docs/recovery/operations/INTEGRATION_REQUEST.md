# R1-C integration request (for Codex)

Nothing below was edited by this lane. Each item needs Codex ownership.

1. **Route (App.tsx)** - mount `src/features/recovery/operations/OperationsRecoveryPage` (default export) at one path, e.g. `/ops/operations`. It renders a `<section>`, so App's single `<main>` is preserved. Not linked from navigation yet; `PLANNED_DESTINATIONS` entries for Legal/Work Orders/Tenant Ledgers can stay until a contract is verified.
2. **Browser proof** - once mounted, desktop and 390px checks (no horizontal overflow, 44px targets) can be added as `e2e/recovery-operations.spec.ts`. Not written: no route exists to drive.
3. **Contract activation** - flip a domain in `src/lib/recovery/operationsRegistry.ts` to `status: "verified"` with an `endpoint` only when the backend owner provides: a current read route, scoped authority, integer-cents money and calendar dates. Evidence needed per domain:
   - legal cases: route and table that do not exist in this repo today;
   - work orders: replacement for the 503 `/api/maintenance/workorders` handler (this also changes `tests/dependencies/backendRecovery.test.mjs`);
   - ledger: recorded lease charges and payments.
4. **Writes stay disabled** - escalation, document generation, work-order create/update/complete and ledger adjust/reverse/export need verified authorization, confirmation, audit and idempotency contracts.
5. **Backend observation (not in lane)** - `/api/entities/:table` in `server/routes/entities.ts` is an unscoped generic reader; do not build operations reads on it.
