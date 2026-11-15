// L5 ledger projection. Pure and total: it never throws; anything inconsistent yields status "conflict" with NO numbers (fail closed).
// Arithmetic is exact (BigInt) and every result must fit a JS safe integer. Nothing is clamped, defaulted, accrued or assumed.
import { MAX_MONEY_CENTS, type LegalAward } from "../contracts";
import { LedgerError, canonicalEntry, ledgerDigest, ledgerId, normalizeParties, parseLedgerEntry, parseReconciliation, validateAward } from "./entries";
import type { ConflictCode, LedgerAwardContext, LedgerEntry, LedgerProjection, Reconciliation, ReviewCode } from "./model";

const MAX = BigInt(MAX_MONEY_CENTS);
const CONFLICT_STATUS = "conflict" as const;

function conflictProjection(awardId: string, matterId: string, code: ConflictCode): LedgerProjection {
  return { awardId, matterId, status: CONFLICT_STATUS, conflict: code, review: [], currency: null, principal: null, principalVerified: false,
    chargedCents: null, satisfiedCents: null, netCents: null, outstandingCents: null, unknownEntryIds: [], lastSeq: 0, ledgerDigest: "", awardRevision: 0, creditorPartyId: null, obligors: [],
    reconciliation: { state: "none", asOf: null, unreconciledEntryIds: [], staleReasons: [] } };
}

export { validateAward };

type Parsed = { award: LegalAward; creditor: string | null; reconciliation: Reconciliation | null; entries: LedgerEntry[] };

/** Everything that can make a ledger untrustworthy, in one place. Throws LedgerError with a code; callers convert it to a conflict. */
function validate(ctx: LedgerAwardContext, rawEntries: readonly unknown[]): Parsed {
  const award = validateAward(ctx?.award);
  const creditor = ctx.creditorPartyId === null || ctx.creditorPartyId === undefined ? null : ledgerId(ctx.creditorPartyId, "creditorPartyId");
  if (creditor !== null && award.obligors.some((o) => o.partyId === creditor)) throw new LedgerError("the creditor cannot also be an obligor", "INVALID_AWARD");
  const reconciliation = parseReconciliation(ctx.reconciliation === undefined ? null : ctx.reconciliation);
  if (reconciliation && reconciliation.evidence.some((e) => e.matterId !== award.matterId)) throw new LedgerError("reconciliation evidence belongs to another matter", "WRONG_MATTER_EVIDENCE");
  if (!Array.isArray(rawEntries)) throw new LedgerError("entries must be an array", "INVALID_ENTRY");

  // Parse, associate, and collapse EXACT replays (conflicting replays fail).
  const byId = new Map<string, LedgerEntry>();
  for (const raw of rawEntries) {
    const e = parseLedgerEntry(raw);
    if (e.awardId !== award.id || e.matterId !== award.matterId) throw new LedgerError("entry belongs to another award or matter", "WRONG_ASSOCIATION");
    const prior = byId.get(e.entryId);
    if (prior) {
      if (canonicalEntry(prior) !== canonicalEntry(e)) throw new LedgerError("entry id replayed with different content", "DUPLICATE_ENTRY_CONFLICT");
      continue;
    }
    byId.set(e.entryId, e);
  }
  const entries = [...byId.values()].sort((a, b) => a.seq - b.seq);
  for (let i = 1; i < entries.length; i++) if (entries[i].seq === entries[i - 1].seq) throw new LedgerError("two entries share a sequence number", "DUPLICATE_SEQUENCE");
  // A hidden entry would silently change the balance, so a gap means the ledger is incomplete: refuse it.
  entries.forEach((e, i) => { if (e.seq !== i + 1) throw new LedgerError("sequence numbers must be contiguous from 1", "SEQUENCE_GAP"); });

  const reversed = new Map<string, string>();
  for (const r of entries) {
    if (r.kind !== "reversal") continue;
    const target = byId.get(r.targetEntryId as string);
    if (!target) throw new LedgerError("reversal target does not exist", "REVERSAL_TARGET_MISSING");
    if (target.entryId === r.entryId) throw new LedgerError("an entry cannot reverse itself", "REVERSAL_OF_SELF");
    if (target.kind === "reversal") throw new LedgerError("a reversal cannot be reversed", "REVERSAL_OF_REVERSAL");
    if (target.awardId !== r.awardId) throw new LedgerError("reversal target belongs to another award", "REVERSAL_WRONG_AWARD");
    if (target.seq >= r.seq) throw new LedgerError("a reversal must come after its target", "REVERSAL_TARGET_NOT_EARLIER");
    if (r.effectiveDate < target.effectiveDate) throw new LedgerError("a reversal cannot predate its target", "REVERSAL_PREDATES_TARGET");
    const fits = (r.reason === "returned_payment" && target.kind === "payment") || (r.reason === "withdrawn_credit" && target.kind === "credit")
      || (r.reason === "vacated_charge" && target.kind === "charge") || r.reason === "entered_in_error";
    if (!fits) throw new LedgerError("reversal reason does not fit the target", "REVERSAL_WRONG_REASON");
    if (reversed.has(target.entryId)) throw new LedgerError("an entry cannot be reversed twice", "DOUBLE_REVERSAL");
    reversed.set(target.entryId, r.entryId);
  }

  // Currency units are explicit and never mixed: the principal's currency and every known entry amount must agree.
  const currencies = new Set<string>();
  if (award.amount !== null) currencies.add(award.amount.currency);
  for (const e of entries) if (e.currency !== null) currencies.add(e.currency);
  if (currencies.size > 1) throw new LedgerError("currencies differ within one award ledger", "CURRENCY_MISMATCH");
  return { award, creditor, reconciliation, entries };
}

/** Project ONE award's ledger. Total: any failure becomes a fail-closed conflict that carries no balance. */
export function projectLedger(ctx: LedgerAwardContext, rawEntries: readonly unknown[]): LedgerProjection {
  const awardId = typeof ctx?.award?.id === "string" ? ctx.award.id : "";
  const matterId = typeof ctx?.award?.matterId === "string" ? ctx.award.matterId : "";
  let p: Parsed;
  try { p = validate(ctx, rawEntries); }
  catch (e) { return conflictProjection(awardId, matterId, e instanceof LedgerError ? e.code : "INVALID_ENTRY"); }

  const { award, entries } = p;
  const reversedTargets = new Set(entries.filter((e) => e.kind === "reversal").map((e) => e.targetEntryId as string));
  const active = entries.filter((e) => e.kind !== "reversal" && !reversedTargets.has(e.entryId));

  const review: ReviewCode[] = [];
  const unknownEntryIds = active.filter((e) => e.amountCents === null).map((e) => e.entryId);
  if (award.amount === null) review.push("UNKNOWN_PRINCIPAL");
  if (unknownEntryIds.length > 0) review.push("UNKNOWN_ENTRY_AMOUNT");
  const currency = award.amount !== null ? award.amount.currency : (entries.find((e) => e.currency !== null)?.currency ?? null);

  const digest = ledgerDigest(award.id, entries);
  const reconciliation = reconciliationState(p.reconciliation, entries, digest);
  const base = {
    awardId: award.id, matterId: award.matterId, conflict: null as null, currency, principal: award.amount, principalVerified: award.judgmentVerification === "verified" && award.amount !== null,
    unknownEntryIds, lastSeq: entries.length, ledgerDigest: digest, awardRevision: award.revision, creditorPartyId: p.creditor, obligors: normalizeParties(award.obligors), reconciliation,
  };
  if (review.length > 0) {
    // Something contributing is UNKNOWN: report no total at all (never zero, never a partial sum).
    return { ...base, status: "unknown", review, chargedCents: null, satisfiedCents: null, netCents: null, outstandingCents: null };
  }
  let charged = BigInt(award.amount!.cents), satisfied = BigInt(0);
  for (const e of active) {
    const v = BigInt(e.amountCents as number);
    if (e.kind === "charge") charged += v; else satisfied += v;     // payments and credits both satisfy; no allocation order is assumed
    if (charged > MAX || satisfied > MAX) return conflictProjection(award.id, award.matterId, "UNSAFE_ARITHMETIC");
  }
  const net = charged - satisfied;
  if (net > MAX || net < -MAX) return conflictProjection(award.id, award.matterId, "UNSAFE_ARITHMETIC");
  const overpaid = net < BigInt(0);
  return { ...base, status: overpaid ? "review" : "known", review: overpaid ? ["OVERPAYMENT"] : [], chargedCents: Number(charged), satisfiedCents: Number(satisfied),
    netCents: Number(net), outstandingCents: overpaid ? null : Number(net) };
}

/**
 * A reconciliation is current only for the exact ledger state it reviewed: same position AND same content fingerprint. Any entry appended
 * afterwards makes it stale whatever its effectiveDate (a backdated payment included). asOf stays a business date; no clock is consulted.
 * An entry effective after asOf is additionally unreviewed (the review could not have covered it).
 */
function reconciliationState(r: Reconciliation | null, entries: LedgerEntry[], digest: string): LedgerProjection["reconciliation"] {
  if (r === null) return { state: "none", asOf: null, unreconciledEntryIds: [], staleReasons: [] };
  const staleReasons: LedgerProjection["reconciliation"]["staleReasons"] = [];
  if (r.ledgerSeq !== entries.length || r.ledgerDigest !== digest) staleReasons.push("LEDGER_CHANGED");
  if (entries.some((e) => e.effectiveDate > r.asOf)) staleReasons.push("ENTRY_AFTER_AS_OF");
  const unreconciledEntryIds = entries.filter((e) => e.seq > r.ledgerSeq || e.effectiveDate > r.asOf).map((e) => e.entryId);
  return { state: staleReasons.length === 0 ? "current" : "stale", asOf: r.asOf, unreconciledEntryIds, staleReasons };
}

export type LedgerSummary = {
  conflict: ConflictCode | null;
  /** One projection per DISTINCT award identity, in award-id order. */
  awards: LedgerProjection[];
  /** Outstanding cents per currency, summed over awards whose arithmetic is fully known and not in review. Each award counts once. */
  outstandingByCurrency: Record<string, number>;
  unknownAwards: number;
  reviewAwards: number;
  conflictAwards: number;
};
const emptySummary = (conflict: ConflictCode): LedgerSummary => ({ conflict, awards: [], outstandingByCurrency: {}, unknownAwards: 0, reviewAwards: 0, conflictAwards: 0 });

/**
 * Summarize many awards. An award is its L1 identity: obligor count never multiplies it, and distinct awards (even for the same person)
 * stay distinct. An identical repeated award is one award; a conflicting repeat, or entries naming no supplied award, fail the whole summary.
 */
export function summarizeLedgers(contexts: readonly LedgerAwardContext[], rawEntries: readonly unknown[]): LedgerSummary {
  if (!Array.isArray(contexts) || !Array.isArray(rawEntries)) return emptySummary("INVALID_ENTRY");
  const byAward = new Map<string, LedgerAwardContext>();
  for (const ctx of contexts) {
    let award: LegalAward;
    try { award = validateAward(ctx?.award); } catch { return emptySummary("INVALID_AWARD"); }
    const prior = byAward.get(award.id);
    if (prior) {
      if (JSON.stringify([prior.award, prior.creditorPartyId, prior.reconciliation]) !== JSON.stringify([ctx.award, ctx.creditorPartyId, ctx.reconciliation])) return emptySummary("DUPLICATE_AWARD_CONFLICT");
      continue;
    }
    byAward.set(award.id, ctx);
  }
  const grouped = new Map<string, unknown[]>();
  for (const raw of rawEntries) {
    let awardId: string;
    try { awardId = parseLedgerEntry(raw).awardId; } catch (e) { return emptySummary(e instanceof LedgerError ? e.code : "INVALID_ENTRY"); }
    if (!byAward.has(awardId)) return emptySummary("ORPHAN_ENTRIES");
    grouped.set(awardId, [...(grouped.get(awardId) ?? []), raw]);
  }
  const awards = [...byAward.keys()].sort().map((id) => projectLedger(byAward.get(id)!, grouped.get(id) ?? []));
  const sums = new Map<string, bigint>();
  for (const a of awards) if (a.status === "known" && a.currency !== null && a.outstandingCents !== null) sums.set(a.currency, (sums.get(a.currency) ?? BigInt(0)) + BigInt(a.outstandingCents));
  const outstandingByCurrency: Record<string, number> = {};
  for (const [cur, total] of [...sums.entries()].sort()) {
    if (total > MAX) return emptySummary("UNSAFE_ARITHMETIC");
    outstandingByCurrency[cur] = Number(total);
  }
  return { conflict: null, awards, outstandingByCurrency, unknownAwards: awards.filter((a) => a.status === "unknown").length,
    reviewAwards: awards.filter((a) => a.status === "review").length, conflictAwards: awards.filter((a) => a.status === "conflict").length };
}
