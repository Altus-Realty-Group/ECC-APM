// L5 collection eligibility: a PLANNING result, never enforcement authority. Deliberately SEPARATE from arithmetic: a computed balance never
// makes an award collectible. It requires a structurally valid KNOWN projection plus an explicit, verified, approved input bound to the
// exact award revision, parties and ledger state. L1's collectionReadiness is not trusted, and nothing here assumes enforceability,
// interest, accrual or a legal deadline.
import { LIABILITIES, MAX_MONEY_CENTS } from "../contracts";
import { DIGEST, normalizeParties, parseCollectionApproval } from "./entries";
import { projectLedger } from "./project";
import type { LedgerAwardContext, LedgerProjection } from "./model";

export type EligibilityBlocker =
  | "PROJECTION_INVALID" | "LEDGER_CONFLICT" | "LEDGER_UNKNOWN" | "LEDGER_REVIEW" | "NOTHING_OUTSTANDING" | "PRINCIPAL_NOT_VERIFIED"
  | "CREDITOR_UNRESOLVED" | "OBLIGOR_UNRESOLVED" | "RECONCILIATION_NOT_CURRENT"
  | "APPROVAL_MISSING" | "APPROVAL_INVALID" | "APPROVAL_WRONG_AWARD" | "APPROVAL_WRONG_MATTER" | "APPROVAL_WRONG_EVIDENCE_MATTER"
  | "APPROVAL_CURRENCY_MISMATCH" | "APPROVAL_STALE" | "APPROVAL_AMOUNT_MISMATCH" | "APPROVAL_AWARD_CHANGED" | "APPROVAL_PARTIES_CHANGED";

export type CollectionEligibility = { eligible: boolean; blockers: EligibilityBlocker[] };

const STATUSES = ["conflict", "unknown", "review", "known"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nonBlank = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const safeInt = (v: unknown, min: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= MAX_MONEY_CENTS;
const ids = (v: unknown): v is string[] => Array.isArray(v) && v.every(nonBlank);

/**
 * Structural validation of a projection before anything is concluded from it. Fail closed: null, a non-object, an unrecognised status or any
 * inconsistent required field is invalid. A `known` projection must also be arithmetically self-consistent (charged - satisfied = net = outstanding).
 */
export function isValidProjection(p: unknown): p is LedgerProjection {
  if (!isObj(p)) return false;
  if (!nonBlank(p.awardId) || !nonBlank(p.matterId) || typeof p.status !== "string" || !STATUSES.includes(p.status)) return false;
  if (!Array.isArray(p.review) || !ids(p.unknownEntryIds) || !Array.isArray(p.obligors) || typeof p.principalVerified !== "boolean") return false;
  if (!(p.creditorPartyId === null || nonBlank(p.creditorPartyId))) return false;
  if (!isObj(p.reconciliation) || !["none", "current", "stale"].includes(p.reconciliation.state as string)) return false;
  if (p.status === "conflict") return nonBlank(p.conflict);
  if (p.conflict !== null) return false;
  if (!safeInt(p.lastSeq, 0) || !safeInt(p.awardRevision, 0) || typeof p.ledgerDigest !== "string" || !DIGEST.test(p.ledgerDigest)) return false;
  if (!(p.obligors as unknown[]).every((o) => isObj(o) && nonBlank(o.partyId) && (LIABILITIES as readonly unknown[]).includes(o.liability))) return false;
  if (p.status === "unknown") return (p.review as unknown[]).length > 0 && p.outstandingCents === null;
  // status is review or known: the arithmetic is fully known.
  if (!isObj(p.principal) || !safeInt(p.principal.cents, 0) || typeof p.principal.currency !== "string" || p.currency !== p.principal.currency) return false;
  if (!safeInt(p.chargedCents, 0) || !safeInt(p.satisfiedCents, 0) || typeof p.netCents !== "number" || !Number.isSafeInteger(p.netCents)) return false;
  if (p.netCents !== (p.chargedCents as number) - (p.satisfiedCents as number)) return false;
  if ((p.unknownEntryIds as unknown[]).length !== 0) return false;
  if (p.status === "review") return (p.review as unknown[]).length > 0 && p.netCents < 0 && p.outstandingCents === null;
  return (p.review as unknown[]).length === 0 && safeInt(p.outstandingCents, 0) && p.outstandingCents === p.netCents;
}

const sameParties = (a: LedgerProjection["obligors"], b: LedgerProjection["obligors"]) => JSON.stringify(normalizeParties(a)) === JSON.stringify(normalizeParties(b));

export function evaluateCollectionEligibility(projection: unknown, rawApproval: unknown | null): CollectionEligibility {
  if (!isValidProjection(projection)) return { eligible: false, blockers: ["PROJECTION_INVALID"] };
  const blockers: EligibilityBlocker[] = [];
  if (projection.status === "conflict") blockers.push("LEDGER_CONFLICT");
  if (projection.status === "unknown") blockers.push("LEDGER_UNKNOWN");
  if (projection.status === "review") blockers.push("LEDGER_REVIEW");
  if (projection.status === "known") {
    if (projection.outstandingCents === 0) blockers.push("NOTHING_OUTSTANDING");
    if (!projection.principalVerified) blockers.push("PRINCIPAL_NOT_VERIFIED");
    // Unresolved identity blocks the collection-ready projection: there must be a named creditor and at least one named obligor.
    if (projection.creditorPartyId === null) blockers.push("CREDITOR_UNRESOLVED");
    if (projection.obligors.length === 0) blockers.push("OBLIGOR_UNRESOLVED");
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
      if (a.ledgerSeq !== projection.lastSeq || a.ledgerDigest !== projection.ledgerDigest) blockers.push("APPROVAL_STALE");
      if (projection.outstandingCents !== null && a.outstandingCents !== projection.outstandingCents) blockers.push("APPROVAL_AMOUNT_MISMATCH");
      if (a.awardRevision !== projection.awardRevision) blockers.push("APPROVAL_AWARD_CHANGED");
      if (a.creditorPartyId !== projection.creditorPartyId || !sameParties(a.obligors, projection.obligors)) blockers.push("APPROVAL_PARTIES_CHANGED");
    } catch {
      blockers.push("APPROVAL_INVALID");
    }
  }
  return { eligible: blockers.length === 0, blockers };
}

/** Convenience that cannot be fed a hand-made projection: it projects the award and entries itself, then evaluates. */
export function evaluateCollectionEligibilityForLedger(ctx: LedgerAwardContext, entries: readonly unknown[], rawApproval: unknown | null): CollectionEligibility & { projection: LedgerProjection } {
  const projection = projectLedger(ctx, entries);
  return { ...evaluateCollectionEligibility(projection, rawApproval), projection };
}
