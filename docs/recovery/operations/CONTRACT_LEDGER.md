# R1-C contract and provenance ledger

Lane R1-C, assignment V1, corrected under V2. Base main `1c8fd1022f46cd26ad0df748ffc053c0ed2c9542`, PR 129 (head at V2 start `bfb9be72`).
Source: Dropbox `ECC Reload/EmpireCommandCenter1` (active), `EstateCommand2`, `AltusCommand3`. Folder numbering is not chronology.
Duplicates of these pages exist (App Dump Move V3, Altus Deal Room copy); content equality was **not hash-verified**. The active EmpireCommandCenter1 copy was used.

Evidence labels: **source-read** = read in the recovery file; **repo-read** = read in this checkout; **source-only** = declared in repository source or a recovered file; says nothing about the live database or a running backend; **not verified** = no live or current-backend proof. No row in this ledger is live-schema verified.

## Current-repo findings (repo-read)

| Domain | Current state | Evidence |
| --- | --- | --- |
| Legal cases | No route and no table declared in repository source (source-only; live database not checked). `src/components/legal/LegalCasesList.tsx` is an unused 25-line stub. | grep of `server/`, `shared/schema.ts` |
| Work orders | `GET /api/maintenance/workorders` is mounted as `unavailableOperation` (HTTP 503) and pinned by `tests/dependencies/backendRecovery.test.mjs` and `server/lib/routeRegistry.ts`. A drizzle `workorders` table is declared in source (source-only; its presence in the live database is not verified); nothing reads it. | `server/index.ts:740` |
| Ledger | No lease-charge or lease-payment route or table declared in repository source (source-only). `/api/accounting/transactions` is `unavailableOperation`. Lease `rent` and tenant `balance` are zero-defaulted in the portfolio handlers, so they cannot back a ledger. | `server/index.ts` portfolio handlers |

Consequence: no authoritative current contract is established for any of the four pages' data. This slice therefore ships verified adapters and an honest gate, not a live read.

## Provenance and decisions

| Source (active copy) | Decision | Target | Defects repaired / rejected |
| --- | --- | --- | --- |
| `EmpireCommandCenter/client/src/pages/LegalCaseDetail.tsx` (20,074 B) | **Rebuild** | `parseLegalCase`, `LegalCasesTable` | Missing amount shown as `$0.00`; dates shifted by time zone; dead `/tenants/:id` and `/leases/:id` links; unauthenticated PATCH; orange Damages badge. PATCH rejected. |
| `.../EnhancedLegalCasesPage.tsx` (51,590 B) | **Rebuild (list/summary only)** | `LegalCasesTable` | `data.success ? data.data : []` turned failures into an empty list; `parseFloat(x) \|\| 0` made missing damages zero (and sorted as zero); string-typed money. Escalation (`escalateCase`), `/api/legal/sync-field-tasks` POST, export-pdf, import commit/delete rejected until write contracts exist. Excel upload and communication panel not ported. |
| `.../WorkOrdersPage.tsx` (23,980 B) | **Rebuild** | `parseWorkOrder`, `WorkOrdersTable` | MUI DataGrid dependency dropped; no `ok` checks; `actual_cost` 0 shown as "Pending"; ambiguous cost unit (now integer cents); CANCELLED missing from the filter; Edit button that silently set IN_PROGRESS; completion without confirmation; no-op "Advanced Filters". POST/PUT rejected. |
| `.../LedgerControlPage.tsx` (26,472 B) | **Rebuild (read-only)** | `parseLedgerEntry`, `summarizeLedger`, `LedgerView` | Fabricated entries; `parseFloat(amount \|\| '0')`; mock `pendingAdjustments`/`recentAuditActions`; hardcoded "Finance Admin"; adjust/reverse/reclassify only `console.log`; join by property name; `key={index}`; first 50 entries only; dead Export. Writes rejected. |
| `AltusCommand3/.../accounting/TenantLedger.tsx` (8,540 B) | **Reject** | none | Simulates a "Payment Received" equal to rent for each active lease. `summarizeLedger` uses recorded entries only; a test forbids this pattern. |
| `LegalAdvancedOpsPage.tsx`, Empire `legal-routes.ts`, `accounting-routes.ts`, `routes.ts`, `shared/schema.ts`, EstateCommand2 equivalents | **Still not read (V2)** | none | V2 attempt: `ECC_Recovery_Source_Pack_R1.zip` is not in the shared Dropbox folder this session can see, and the files in `ECC Reload/EmpireCommandCenter1/EmpireCommandCenter/server` and `shared` can be located but not read: text fetch rejects `.ts` ("File type is not supported") and the temporary download host `dl.dropboxusercontent.com` is denied by this environment's network policy. No provenance or redaction notes were read. These stay **historical, unreviewed candidates**; nothing was inferred from them. |

## Candidate (source-declared, unverified) contracts

- `GET /api/legal/cases`, `GET /api/legal/cases/:id` -> `{ data }`. Fields: id, type, status (Open/Filed/In Progress/Resolved), filedDate, courtDate, tenant, property, unit, amount claimed.
- `GET /api/maintenance/work-orders?status&priority&search` -> `{ data }`. Priority LOW..EMERGENCY; status OPEN..CANCELLED.
- `/api/lease-charges`, `/api/lease-payments` -> row arrays (money as decimal dollars in the source).

The adapters take **integer cents** (`amountClaimedCents`, `estimatedCostCents`, `actualCostCents`, `amountCents`) and calendar dates. A backend that returns dollars or datetimes must adapt before activation; the parsers reject floats rather than guess units.

## Corrections under V2

- **Page states.** `OperationsRecoveryPage` resolves each domain through `resolveDomain` and renders loading, unavailable, denied (401/403), error (retry) and ready (empty handled by the views). Stale-session and aborted results are dropped. All three domains are `unverified`, so the page makes **zero** requests; ready/denied/error are exercised in unit tests only.
- **Per-lease ledger.** `summarizeLedger` takes one lease and throws on mixed leases; `groupLedgerByLease` summarizes leases separately and the view renders one block per lease. There is no cross-lease total.
- **Overflow.** Each accumulator and each step of the final balance is checked with `Number.isSafeInteger`. The earlier check of the combined sum could pass when signed values cancelled an unsafe accumulator; regression: adjustment -5, charge MAX_SAFE_INTEGER, charge 5.
- **Operator copy.** Registry `reason`/`needs` removed from the UI; operators see a plain "not available yet" message. Technical requirements are below and in INTEGRATION_REQUEST.md.

## Technical requirements before any domain is activated (documentation only)

- Legal cases: a current read route returning cases scoped to the signed-in user's authority; money as integer cents, dates as calendar dates.
- Work orders: a read route replacing the unavailable (HTTP 503) handler; integer-cent cost unit and the property/unit join.
- Ledger: recorded charge and payment rows with integer cents and posting dates; one authoritative per-lease ledger read, not client-side joins.
- Writes (escalation, document generation, work-order create/update/complete, ledger adjust/reverse/export): authorization, confirmation, audit and idempotency contracts. Out of scope for this lane.

## Tests

`tests/unit/recovery-operations.test.tsx` covers cents, date-only, null vs zero, strict rejection, envelope/duplicate ids, per-lease ledger totals, mixed-lease rejection, overflow regressions, state rendering, `resolveDomain` classification, the zero-request gate, and a guardrail source scan. `e2e/recovery-operations.spec.ts` drives the built app at `/ops/operations` at desktop and 390px with mocked network. All data is **source fixtures; none of it is live-data acceptance**.

## Files required to continue

The source pack (or plain-text copies / a repository path) of Empire `server/legal-routes.ts`, `accounting-routes.ts`, the work-order section of `routes.ts`, `shared/schema.ts`, `LegalAdvancedOpsPage.tsx` and the EstateCommand2 equivalents, readable from this environment (allow `dl.dropboxusercontent.com` or attach the zip). Plus a separately authorized read-only schema check for legal cases, work orders, lease charges and payments.

## R8 integration (PR131 completion)

PR133's session-scoped query path and current main are integrated. The page now reads each domain through the shared query cache; a
denial purges every protected domain, and a purged sibling renders a plain "cleared" state with Retry instead of an indefinite loading
state. Populated lifecycle behavior is proven against invented fixtures only (`e2e/recovery-operations-lifecycle.spec.ts`,
`tests/unit/recovery-operations-lifecycle.test.tsx`). All three production contracts remain `unverified`; the real backend contract
gaps are inventoried in R8_COMPLETION.md. No row in this ledger is live-schema verified.
