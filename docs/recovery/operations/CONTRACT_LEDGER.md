# R1-C contract and provenance ledger

Lane R1-C, assignment V1. Base main `1c8fd1022f46cd26ad0df748ffc053c0ed2c9542`, PR 129.
Source: Dropbox `ECC Reload/EmpireCommandCenter1` (active), `EstateCommand2`, `AltusCommand3`. Folder numbering is not chronology.
Duplicates of these pages exist (App Dump Move V3, Altus Deal Room copy); content equality was **not hash-verified**. The active EmpireCommandCenter1 copy was used.

Evidence labels: **source-read** = read in the recovery file; **repo-read** = read in this checkout; **not verified** = no live or current-backend proof.

## Current-repo findings (repo-read)

| Domain | Current state | Evidence |
| --- | --- | --- |
| Legal cases | No route, no table. `src/components/legal/LegalCasesList.tsx` is an unused 25-line stub. | grep of `server/`, `shared/schema.ts` |
| Work orders | `GET /api/maintenance/workorders` is mounted as `unavailableOperation` (HTTP 503) and pinned by `tests/dependencies/backendRecovery.test.mjs` and `server/lib/routeRegistry.ts`. A drizzle `workorders` table is declared; nothing reads it. | `server/index.ts:740` |
| Ledger | No lease-charge or lease-payment route or table. `/api/accounting/transactions` is `unavailableOperation`. Lease `rent` and tenant `balance` are zero-defaulted in the portfolio handlers, so they cannot back a ledger. | `server/index.ts` portfolio handlers |

Consequence: no authoritative current contract exists for any of the four pages' data. This slice therefore ships verified adapters and an honest gate, not a live read.

## Provenance and decisions

| Source (active copy) | Decision | Target | Defects repaired / rejected |
| --- | --- | --- | --- |
| `EmpireCommandCenter/client/src/pages/LegalCaseDetail.tsx` (20,074 B) | **Rebuild** | `parseLegalCase`, `LegalCasesTable` | Missing amount shown as `$0.00`; dates shifted by time zone; dead `/tenants/:id` and `/leases/:id` links; unauthenticated PATCH; orange Damages badge. PATCH rejected. |
| `.../EnhancedLegalCasesPage.tsx` (51,590 B) | **Rebuild (list/summary only)** | `LegalCasesTable` | `data.success ? data.data : []` turned failures into an empty list; `parseFloat(x) \|\| 0` made missing damages zero (and sorted as zero); string-typed money. Escalation (`escalateCase`), `/api/legal/sync-field-tasks` POST, export-pdf, import commit/delete rejected until write contracts exist. Excel upload and communication panel not ported. |
| `.../WorkOrdersPage.tsx` (23,980 B) | **Rebuild** | `parseWorkOrder`, `WorkOrdersTable` | MUI DataGrid dependency dropped; no `ok` checks; `actual_cost` 0 shown as "Pending"; ambiguous cost unit (now integer cents); CANCELLED missing from the filter; Edit button that silently set IN_PROGRESS; completion without confirmation; no-op "Advanced Filters". POST/PUT rejected. |
| `.../LedgerControlPage.tsx` (26,472 B) | **Rebuild (read-only)** | `parseLedgerEntry`, `summarizeLedger`, `LedgerView` | Fabricated entries; `parseFloat(amount \|\| '0')`; mock `pendingAdjustments`/`recentAuditActions`; hardcoded "Finance Admin"; adjust/reverse/reclassify only `console.log`; join by property name; `key={index}`; first 50 entries only; dead Export. Writes rejected. |
| `AltusCommand3/.../accounting/TenantLedger.tsx` (8,540 B) | **Reject** | none | Simulates a "Payment Received" equal to rent for each active lease. `summarizeLedger` uses recorded entries only; a test forbids this pattern. |
| `LegalAdvancedOpsPage.tsx`, Empire `legal-routes.ts`, `accounting-routes.ts`, `routes.ts`, `shared/schema.ts`, EstateCommand2 equivalents | **Not reviewed** | none | Server `.ts` files could not be extracted by the Dropbox text fetch ("File type is not supported"). See required files below. |

## Candidate (source-declared, unverified) contracts

- `GET /api/legal/cases`, `GET /api/legal/cases/:id` -> `{ data }`. Fields: id, type, status (Open/Filed/In Progress/Resolved), filedDate, courtDate, tenant, property, unit, amount claimed.
- `GET /api/maintenance/work-orders?status&priority&search` -> `{ data }`. Priority LOW..EMERGENCY; status OPEN..CANCELLED.
- `/api/lease-charges`, `/api/lease-payments` -> row arrays (money as decimal dollars in the source).

The adapters take **integer cents** (`amountClaimedCents`, `estimatedCostCents`, `actualCostCents`, `amountCents`) and calendar dates. A backend that returns dollars or datetimes must adapt before activation; the parsers reject floats rather than guess units.

## Tests

`tests/unit/recovery-operations.test.tsx` (10 tests): cents, date-only, null vs zero, strict rejection, envelope/duplicate ids, ledger totals, gate makes zero requests when unverified, verified path fetch + parse, honest rendering, guardrail source scan. All data in it is **source fixtures, not live-data proof**.

## Files required to continue

Plain-text copies (or a repository path) of Empire `server/legal-routes.ts`, `accounting-routes.ts`, the work-order section of `routes.ts`, `shared/schema.ts`, `LegalAdvancedOpsPage.tsx`, and the EstateCommand2 legal/work-order/ledger adapters. Plus: a read-only schema check (authorized separately) for legal cases, work orders, lease charges and payments.
