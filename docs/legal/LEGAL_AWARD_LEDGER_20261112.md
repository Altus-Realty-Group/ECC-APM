# Legal award/payment ledger — source foundation (issue #218, L5)

Status: **source only**. Pure TypeScript under `shared/legal/ledger/`. No UI, route, SQL, persistence, live data, grant, credential, provider call or enforcement. Net new database objects: **0**. Stacked on L1 (PR #223); L1 contracts are reused unmodified.

## Model
- **One ledger per L1 award.** The ledger is keyed to a single `LegalAward` (validated through L1 `parseAward`). Obligor count never multiplies it; distinct awards stay distinct, including for the same person. `summarizeLedgers` counts each award identity once, rejects a conflicting repeat (`DUPLICATE_AWARD_CONFLICT`) and entries naming no supplied award (`ORPHAN_ENTRIES`).
- **Principal = the L1 award amount.** Fees, costs and interest enter only as explicit `charge` entries authorized by a court order; **interest is an explicit approved amount** (no rate, accrual or formula exists in the model). `payment` and `credit` entries satisfy the balance; **no allocation order is assumed**.
- **Append-only entries** (`seq` contiguous from 1). A `reversal` names an existing earlier entry, a reason and an approver, carries no amount, and undoes its target exactly. No edits or deletes.
- **Evidence-referenced.** Every entry and reconciliation needs ≥1 evidence reference whose matter equals the award's matter.
- **Exact arithmetic.** BigInt accumulation, every result must be a safe integer, otherwise `UNSAFE_ARITHMETIC`.

## Projection (`projectLedger`, total, never throws)
| status | meaning | totals |
|---|---|---|
| `known` | principal and all active entries known | exact; `outstandingCents` ≥ 0 |
| `unknown` | principal or an active entry amount is null | **all null** (never 0, never partial) |
| `review` | overpayment (`OVERPAYMENT`) | signed `netCents` shown; `outstandingCents` null; never clamped |
| `conflict` | any structural violation (see codes) | **all null**, fail closed |

Recorded zero stays zero; unknown stays unknown. Exact replay (same id, identical content, evidence order ignored) is idempotent; the same id with different content is `DUPLICATE_ENTRY_CONFLICT`.

Conflict codes: wrong award/matter, wrong-matter evidence, currency mismatch (never converted), unsafe arithmetic, sequence gap/duplicate, reversal target missing / not earlier / predating / of a reversal / of itself / twice / wrong award / wrong reason, duplicate or conflicting award, orphan entries, invalid entry/award/reconciliation.

`planAppend` decides `append | noop | reject` for one new entry without storing anything; a conflicted ledger accepts nothing and the next entry must carry `lastSeq + 1`.

## Collection eligibility (`evaluateCollectionEligibility`)
Separate from arithmetic. Eligible only when the ledger is `known`, the principal's judgment is `verified`, reconciliation is current (no entry later than `asOf`), outstanding > 0, **and** an explicit `CollectionApproval` (approver, date, same-matter evidence) matches the award, matter, currency, outstanding amount and current `lastSeq` (any later entry, including a reversal, makes it stale). L1 `collectionReadiness` is not trusted. The result is only `{eligible, blockers}`: it states no enforceability, interest, accrual or legal deadline and authorizes no enforcement.

## Not provided / dependencies
- The workbook preview is **not** a verified award producer; fixtures are synthetic.
- Persisted intake (stored ledger rows) and write authorization are separate dependencies; nothing here writes.
- Interest/fees/costs amounts, creditor identity and reconciliation must come from explicit, reviewed inputs.
- Tests: `tests/unit/legal/ledger/`.
