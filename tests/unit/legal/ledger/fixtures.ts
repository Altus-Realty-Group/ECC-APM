// Synthetic fixtures only: invented ids and amounts. Nothing here is a real matter, party, award or payment.
import { parseAward, type LegalAward } from "../../../../shared/legal/contracts.ts";
import { projectLedger, type LedgerAwardContext } from "../../../../shared/legal/ledger/index.ts";

export const awardOf = (over: Record<string, unknown> = {}): LegalAward => parseAward({
  id: "award-1", matterId: "matter-1", kind: "damages", amountCents: 100000, currency: "USD", judgmentVerification: "verified",
  collectionReadiness: "not_ready", revision: 1, obligors: [{ partyId: "party-a", liability: "joint" }, { partyId: "party-b", liability: "joint" }], ...over,
});
export const ctxOf = (over: Partial<LedgerAwardContext> = {}, awardOver: Record<string, unknown> = {}): LedgerAwardContext =>
  ({ award: awardOf(awardOver), creditorPartyId: "creditor-1", reconciliation: null, ...over });

const ev = (matterId = "matter-1") => [{ evidenceId: "ev-1", matterId }];
export const entry = (over: Record<string, unknown> = {}) => ({
  entryId: "e1", awardId: "award-1", matterId: "matter-1", seq: 1, kind: "payment", component: null, targetEntryId: null, reason: null,
  amountCents: 25000, currency: "USD", effectiveDate: "2026-03-01", evidence: ev(),
  provenance: { source: "bank_record", recordedBy: "clerk-1", approvedBy: null }, ...over,
});
export const payment = (id: string, seq: number, cents: number | null, over: Record<string, unknown> = {}) =>
  entry({ entryId: id, seq, amountCents: cents, currency: cents === null ? null : "USD", ...over });
export const charge = (id: string, seq: number, component: string, cents: number, over: Record<string, unknown> = {}) =>
  entry({ entryId: id, seq, kind: "charge", component, amountCents: cents, provenance: { source: "court_order", recordedBy: "clerk-1", approvedBy: component === "interest" ? "attorney-1" : null }, ...over });
export const credit = (id: string, seq: number, cents: number, over: Record<string, unknown> = {}) =>
  entry({ entryId: id, seq, kind: "credit", amountCents: cents, provenance: { source: "creditor_statement", recordedBy: "clerk-1", approvedBy: "attorney-1" }, ...over });
export const reversal = (id: string, seq: number, target: string, reason = "returned_payment", over: Record<string, unknown> = {}) =>
  entry({ entryId: id, seq, kind: "reversal", targetEntryId: target, reason, amountCents: null, currency: null, effectiveDate: "2026-03-02",
    provenance: { source: "bank_record", recordedBy: "clerk-1", approvedBy: "attorney-1" }, ...over });
/** The ledger a default review/approval was made against: one 250.00 payment. */
export const DEFAULT_ENTRIES = (): unknown[] => [payment("p1", 1, 25000)];
const stateOf = (entries: unknown[]) => projectLedger(ctxOf(), entries);
export const approval = (over: Record<string, unknown> = {}, entries: unknown[] = DEFAULT_ENTRIES()) => {
  const p = stateOf(entries);
  return {
    awardId: "award-1", matterId: "matter-1", approvedBy: "attorney-1", approvedOn: "2026-03-05", evidence: ev(), currency: "USD",
    outstandingCents: p.outstandingCents ?? 1, ledgerSeq: p.lastSeq, ledgerDigest: p.ledgerDigest,
    awardRevision: 1, creditorPartyId: "creditor-1", obligors: [{ partyId: "party-a", liability: "joint" }, { partyId: "party-b", liability: "joint" }], ...over,
  };
};
export const reconciled = (asOf = "2026-03-05", entries: unknown[] = DEFAULT_ENTRIES(), over: Record<string, unknown> = {}) => {
  const p = stateOf(entries);
  return { asOf, reconciledBy: "clerk-2", evidence: ev(), ledgerSeq: p.lastSeq, ledgerDigest: p.ledgerDigest, ...over };
};
