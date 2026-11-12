# Legal award/payment ledger — source foundation (issue #218, L5)

Status: **source only**. Pure TypeScript under `shared/legal/ledger/`. No UI, route, SQL, persistence, live data, grant, credential, provider call or enforcement. Net new database objects: **0**. Stacked on L1 (PR #223); L1 contracts are reused unmodified.

## Model
- **One ledger per L1 award.** The ledger is keyed to a single `LegalAward`. Only the normalized L1 representation is accepted (`amount` is `null` or `{cents, currency}`; exact key set). **Only `amount: null` means unknown**: a non-null amount must carry numeric cents and a currency, so `{cents: null, currency: null}`, `undefined` members and any undefined award field are `INVALID_AWARD`; a recorded zero stays zero. A malformed `amount`, wire `amountCents`/`currency` with or without a normalized amount, a missing `amount`, extra keys or parties carrying anything but `partyId`/`liability` are `INVALID_AWARD` conflicts: recorded money is never silently turned into "unknown". Obligor count never multiplies it; distinct awards stay distinct, including for the same person. `summarizeLedgers` counts each award identity once, rejects a conflicting repeat (`DUPLICATE_AWARD_CONFLICT`) and entries naming no supplied award (`ORPHAN_ENTRIES`).
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

## Reconciliation (bound to the reviewed state)
A `Reconciliation` carries `asOf` (a **business date**; no clock, no expiry threshold), `reconciledBy`, same-matter evidence, and the ledger state it reviewed: `ledgerSeq` and `ledgerDigest`. It is `current` only when both still match the ledger **and** no entry is effective after `asOf`. Any entry appended afterwards, a backdated payment or a reversal included, makes it `stale` (`staleReasons`: `LEDGER_CHANGED`, `ENTRY_AFTER_AS_OF`). Reconciliation stays a required eligibility input. `ledgerDigest` is a deterministic FNV-1a fingerprint of the canonical entries, for integrity of "which state was reviewed", not a security primitive.

## Collection eligibility (`evaluateCollectionEligibility`)
A **planning result, never enforcement authority**, and separate from arithmetic. The projection is first validated structurally (`isValidProjection`): null, non-objects, unrecognised `status`, missing/inconsistent fields, a non-positive `awardRevision` (L1 requires ≥ 1; `0` exists only as the conflict-projection sentinel), a malformed or self-contradictory reconciliation block, or a `known` projection that is not self-consistent (charged − satisfied = net = outstanding) yield `PROJECTION_INVALID` and nothing else. The reconciliation block must have exactly `state`, `asOf`, `unreconciledEntryIds`, `staleReasons`: `none` has no date, ids or reasons; `current` has a real calendar `asOf` and no ids or reasons; `stale` has at least one known reason, and `ENTRY_AFTER_AS_OF` needs at least one unreconciled id. Approvals also require a positive `awardRevision`. `evaluateCollectionEligibilityForLedger` projects the award and entries itself so no hand-made projection is needed.

Eligible only when all hold:
- ledger `known`; judgment `verified`; outstanding > 0;
- a **named creditor** and **at least one named obligor** (`CREDITOR_UNRESOLVED`, `OBLIGOR_UNRESOLVED` otherwise);
- reconciliation `current` (above);
- an explicit `CollectionApproval` (approver, date, same-matter evidence) that matches the award, matter, currency, outstanding amount, ledger `lastSeq` **and** `ledgerDigest`, the **award revision**, the **creditor** and the **obligor set with liabilities** (order-insensitive). Any change to the award or its parties, even with the same amount and sequence, gives `APPROVAL_AWARD_CHANGED` / `APPROVAL_PARTIES_CHANGED`; any ledger change gives `APPROVAL_STALE`.

L1 `collectionReadiness` is not trusted. The result is only `{eligible, blockers}`: no enforceability, interest, accrual or legal deadline, and no enforcement action.

## Not provided / dependencies
- The workbook preview is **not** a verified award producer; fixtures are synthetic.
- Persisted intake (stored ledger rows) and write authorization are separate dependencies; nothing here writes.
- Interest/fees/costs amounts, creditor identity and reconciliation must come from explicit, reviewed inputs.
- Tests: `tests/unit/legal/ledger/`.
