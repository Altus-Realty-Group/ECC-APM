// L5 collection eligibility. Deliberately SEPARATE from arithmetic: a computed balance never makes an award collectible.
// It requires an explicit, verified, approved input bound to the current ledger state. L1's collectionReadiness flag is not trusted
// as a shortcut, and nothing here assumes enforceability, interest, accrual or a legal deadline. It authorizes no enforcement action.
import { LedgerError, parseCollectionApproval } from "./entries";
import type { LedgerProjection } from "./model";

export type EligibilityBlocker =
  | "LEDGER_CONFLICT" | "LEDGER_UNKNOWN" | "LEDGER_REVIEW" | "NOTHING_OUTSTANDING" | "PRINCIPAL_NOT_VERIFIED"
  | "RECONCILIATION_NOT_CURRENT" | "APPROVAL_MISSING" | "APPROVAL_INVALID" | "APPROVAL_WRONG_AWARD" | "APPROVAL_WRONG_MATTER"
  | "APPROVAL_WRONG_EVIDENCE_MATTER" | "APPROVAL_CURRENCY_MISMATCH" | "APPROVAL_STALE" | "APPROVAL_AMOUNT_MISMATCH";

export type CollectionEligibility = { eligible: boolean; blockers: EligibilityBlocker[] };

export function evaluateCollectionEligibility(projection: LedgerProjection, rawApproval: unknown | null): CollectionEligibility {
  const blockers: EligibilityBlocker[] = [];
  if (projection.status === "conflict") blockers.push("LEDGER_CONFLICT");
  if (projection.status === "unknown") blockers.push("LEDGER_UNKNOWN");
  if (projection.status === "review") blockers.push("LEDGER_REVIEW");
  if (projection.status === "known") {
    if (projection.outstandingCents === 0) blockers.push("NOTHING_OUTSTANDING");
    if (!projection.principalVerified) blockers.push("PRINCIPAL_NOT_VERIFIED");
    if (projection.reconciliation.state !== "current") blockers.push("RECONCILIATION_NOT_CURRENT");
  }
  if (rawApproval === null || rawApproval === undefined) blockers.push("APPROVAL_MISSING");
  else {
    try {
      const a = parseCollectionApproval(rawApproval);
      if (a.awardId !== projection.awardId) blockers.push("APPROVAL_WRONG_AWARD");
      if (a.matterId !== projection.matterId) blockers.push("APPROVAL_WRONG_MATTER");
      if (a.evidence.some((e) => e.matterId !== projection.matterId)) blockers.push("APPROVAL_WRONG_EVIDENCE_MATTER");
      if (projection.currency !== null && a.currency !== projection.currency) blockers.push("APPROVAL_CURRENCY_MISMATCH");
      if (a.ledgerSeq !== projection.lastSeq) blockers.push("APPROVAL_STALE");
      if (projection.outstandingCents !== null && a.outstandingCents !== projection.outstandingCents) blockers.push("APPROVAL_AMOUNT_MISMATCH");
    } catch (e) {
      if (!(e instanceof LedgerError) && !(e instanceof Error)) throw e;
      blockers.push("APPROVAL_INVALID");
    }
  }
  return { eligible: blockers.length === 0, blockers };
}
