// Strict parsing and canonical form of ledger records. Anything unexpected is rejected: unknown keys, missing keys, wrong types,
// unreal dates, unsafe numbers. Reuses the L1 money rules (`parseMoney`) so the database CHECKs, the award and the ledger agree.
import { AWARD_KINDS, LIABILITIES, LegalContractError, MAX_MONEY_CENTS, parseAward, parseMoney, type LegalAward } from "../contracts";
import { fingerprint } from "./digest";
import {
  CHARGE_COMPONENTS, type ConflictCode, LEDGER_ENTRY_KINDS, PROVENANCE_SOURCES, REVERSAL_REASONS,
  type CollectionApproval, type EvidenceReference, type LedgerEntry, type Provenance, type Reconciliation,
} from "./model";

export const LEDGER_ID = /^[A-Za-z0-9._:-]{1,128}$/;
/** A contract error that also says which conflict class it is, so a projection can fail closed with a precise code. */
export class LedgerError extends LegalContractError {
  constructor(message: string, public readonly code: ConflictCode = "INVALID_ENTRY") { super(`ledger: ${message}`); this.name = "LedgerError"; }
}
const fail = (what: string, code: ConflictCode = "INVALID_ENTRY"): never => { throw new LedgerError(what, code); };
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const own = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Reject any key outside the whitelist: an unexpected field (a rate, a deadline, an enforceability flag) is never silently ignored. */
function exactKeys(o: Record<string, unknown>, allowed: readonly string[], what: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${what} has an unexpected field`);
}
export function ledgerId(v: unknown, what: string): string {
  if (typeof v !== "string" || !LEDGER_ID.test(v)) return fail(`${what} must be an identifier`);
  return v;
}
function nonBlank(v: unknown, what: string): string {
  if (typeof v !== "string" || v.trim() === "" || v.length > 256 || /[\u0000-\u001f\u007f]/.test(v)) return fail(`${what} must be non-blank text`);
  return v;
}

/** A real calendar date (YYYY-MM-DD), leap years included. No time zone is ever applied or inferred. */
export function parseDate(v: unknown, what: string): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(`${what} must be a real YYYY-MM-DD date`);
  const [y, m, d] = v.split("-").map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1]) return fail(`${what} must be a real YYYY-MM-DD date`);
  return v;
}

export function parseEvidence(v: unknown, what: string): EvidenceReference[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > 100) return fail(`${what} needs at least one evidence reference`);
  const seen = new Set<string>();
  const out = v.map((raw) => {
    if (!isRecord(raw)) return fail(`${what} evidence must be an object`);
    exactKeys(raw, ["evidenceId", "matterId"], `${what} evidence`);
    const ref = { evidenceId: ledgerId(raw.evidenceId, "evidenceId"), matterId: ledgerId(raw.matterId, "evidence matterId") };
    if (seen.has(ref.evidenceId)) fail(`${what} repeats an evidence reference`);
    seen.add(ref.evidenceId);
    return ref;
  });
  return out;
}

function parseProvenance(v: unknown): Provenance {
  if (!isRecord(v)) return fail("provenance is required");
  exactKeys(v, ["source", "recordedBy", "approvedBy"], "provenance");
  if (!(PROVENANCE_SOURCES as readonly unknown[]).includes(v.source)) fail("provenance source is not recognised");
  if (!own(v, "approvedBy")) fail("provenance must state approvedBy (null when none)");
  return { source: v.source as Provenance["source"], recordedBy: nonBlank(v.recordedBy, "recordedBy"), approvedBy: v.approvedBy === null ? null : nonBlank(v.approvedBy, "approvedBy") };
}

const ENTRY_KEYS = ["entryId", "awardId", "matterId", "seq", "kind", "component", "targetEntryId", "reason", "amountCents", "currency", "effectiveDate", "evidence", "provenance"] as const;

/**
 * Parse one wire-form entry. Every key must be present (use null where a field does not apply); unknown keys are rejected. Authority rules:
 *  - fees/costs charges are authorized by a court order; interest charges additionally need an explicit approval and carry an explicit
 *    amount (there is no rate, accrual or formula anywhere in this model);
 *  - credits need an approver; payments come from payment-side records, never from an order;
 *  - reversals name an existing entry, give a reason, need an approver and carry no amount (they undo the target exactly).
 */
export function parseLedgerEntry(raw: unknown): LedgerEntry {
  if (!isRecord(raw)) return fail("entry must be an object");
  exactKeys(raw, ENTRY_KEYS, "entry");
  for (const k of ENTRY_KEYS) if (!own(raw, k)) fail(`entry is missing ${k}`);
  const kind = raw.kind;
  if (!(LEDGER_ENTRY_KINDS as readonly unknown[]).includes(kind)) fail("entry kind is not recognised");
  const k = kind as LedgerEntry["kind"];
  if (typeof raw.seq !== "number" || !Number.isSafeInteger(raw.seq) || raw.seq < 1) fail("seq must be a positive integer");
  const provenance = parseProvenance(raw.provenance);
  const entry: LedgerEntry = {
    entryId: ledgerId(raw.entryId, "entryId"), awardId: ledgerId(raw.awardId, "awardId"), matterId: ledgerId(raw.matterId, "matterId"),
    seq: raw.seq as number, kind: k, component: null, targetEntryId: null, reason: null, amountCents: null, currency: null,
    effectiveDate: parseDate(raw.effectiveDate, "effectiveDate"), evidence: parseEvidence(raw.evidence, "entry"), provenance,
  };
  if (entry.evidence.some((e) => e.matterId !== entry.matterId)) fail("evidence belongs to another matter", "WRONG_MATTER_EVIDENCE");

  if (k === "reversal") {
    if (raw.component !== null) fail("a reversal has no component");
    if (raw.amountCents !== null || raw.currency !== null) fail("a reversal carries no amount");
    entry.targetEntryId = ledgerId(raw.targetEntryId, "targetEntryId");
    if (!(REVERSAL_REASONS as readonly unknown[]).includes(raw.reason)) fail("a reversal needs a recognised reason");
    entry.reason = raw.reason as LedgerEntry["reason"];
    if (provenance.approvedBy === null) fail("a reversal needs an approver");
    return entry;
  }
  if (raw.targetEntryId !== null || raw.reason !== null) fail("only a reversal has a target or reason");
  // amountCents/currency are present on the wire; null/null is an explicit UNKNOWN amount (never zero). parseMoney enforces both-or-neither.
  const money = parseMoney(raw.amountCents, raw.currency);
  if (money !== null) { entry.amountCents = money.cents; entry.currency = money.currency; if (money.cents > MAX_MONEY_CENTS) fail("amount is out of range"); }
  if (k === "charge") {
    if (!(CHARGE_COMPONENTS as readonly unknown[]).includes(raw.component)) fail("a charge needs a component (fees, costs or interest; principal is the award amount)");
    entry.component = raw.component as LedgerEntry["component"];
    if (provenance.source !== "court_order") fail("charges are authorized by a court order");
    if (entry.component === "interest" && provenance.approvedBy === null) fail("interest needs an explicit approval and carries an explicit amount");
    return entry;
  }
  if (raw.component !== null) fail("only a charge has a component");
  if (k === "payment" && provenance.source === "court_order") fail("a payment is not authorized by an order");
  if (k === "credit" && provenance.approvedBy === null) fail("a credit needs an approver");
  return entry;
}

/** Stable text form for exact-replay comparison: key order and evidence order do not matter. */
export function canonicalEntry(e: LedgerEntry): string {
  return JSON.stringify([e.entryId, e.awardId, e.matterId, e.seq, e.kind, e.component, e.targetEntryId, e.reason,
    e.amountCents, e.currency, e.effectiveDate,
    [...e.evidence].map((x) => [x.evidenceId, x.matterId]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    [e.provenance.source, e.provenance.recordedBy, e.provenance.approvedBy]]);
}

export function parseReconciliation(raw: unknown): Reconciliation | null {
  if (raw === null) return null;
  if (!isRecord(raw)) return fail("reconciliation must be an object or null", "INVALID_RECONCILIATION");
  exactKeys(raw, ["asOf", "reconciledBy", "evidence", "ledgerSeq", "ledgerDigest"], "reconciliation");
  if (typeof raw.ledgerSeq !== "number" || !Number.isSafeInteger(raw.ledgerSeq) || raw.ledgerSeq < 0) fail("reconciliation must name the ledger position it reviewed", "INVALID_RECONCILIATION");
  if (typeof raw.ledgerDigest !== "string" || !DIGEST.test(raw.ledgerDigest)) fail("reconciliation must name the ledger state it reviewed", "INVALID_RECONCILIATION");
  return { asOf: parseDate(raw.asOf, "reconciliation asOf"), reconciledBy: nonBlank(raw.reconciledBy, "reconciledBy"), evidence: parseEvidence(raw.evidence, "reconciliation"),
    ledgerSeq: raw.ledgerSeq as number, ledgerDigest: raw.ledgerDigest as string };
}

export const DIGEST = /^[0-9a-f]{16}$/;

/** Fingerprint of the exact ledger content (entries in sequence order). Equal content gives equal digests; any appended or altered entry changes it. */
export function ledgerDigest(awardId: string, entriesInSeqOrder: readonly LedgerEntry[]): string {
  return fingerprint(JSON.stringify([awardId, entriesInSeqOrder.map(canonicalEntry)]));
}

/** Parties as a stable, order-independent list so a reordered but identical set compares equal. */
export function normalizeParties(obligors: LegalAward["obligors"]): LegalAward["obligors"] {
  return obligors.map((o) => ({ partyId: o.partyId, liability: o.liability })).sort((a, b) => (a.partyId < b.partyId ? -1 : a.partyId > b.partyId ? 1 : 0));
}

const AWARD_KEYS = ["id", "matterId", "kind", "amount", "judgmentVerification", "collectionReadiness", "revision", "obligors"];
const sameKeys = (o: Record<string, unknown>, keys: readonly string[]) => {
  const have = Object.keys(o).sort(); const want = [...keys].sort();
  return have.length === want.length && have.every((k, i) => k === want[i]);
};
/**
 * Strictly validate the ONE supported award representation (the normalized L1 `LegalAward`: `amount` is null or {cents, currency})
 * before it is converted for the L1 parser. Wire fields (amountCents/currency), a missing or malformed `amount`, extra keys and
 * parties carrying anything but partyId/liability are all rejected: recorded money is never silently erased or guessed.
 */
export function validateAward(award: unknown): LegalAward {
  const bad = (m: string): never => { throw new LedgerError(m, "INVALID_AWARD"); };
  if (!isRecord(award)) return bad("award is required");
  if (!sameKeys(award, AWARD_KEYS)) return bad("award must be a normalized L1 award (unsupported or conflicting representation)");
  let wire: { amountCents: number | null; currency: string | null };
  const amount = award.amount;
  if (amount === null) wire = { amountCents: null, currency: null };
  else if (isRecord(amount) && sameKeys(amount, ["cents", "currency"])) {
    // Only an explicit null amount means unknown. A recorded amount needs real cents and a real currency: null/undefined members are malformed, not "unknown".
    if (typeof amount.cents !== "number" || typeof amount.currency !== "string") return bad("a recorded award amount needs numeric cents and a currency");
    wire = { amountCents: amount.cents, currency: amount.currency };
  }
  else return bad("award amount must be null or {cents, currency}");
  if (!Array.isArray(award.obligors)) return bad("award obligors must be an array");
  for (const o of award.obligors) if (!isRecord(o) || !sameKeys(o, ["partyId", "liability"])) return bad("award obligors carry only partyId and liability");
  if (!(AWARD_KINDS as readonly unknown[]).includes(award.kind)) return bad("award kind is not recognised");
  let parsed: LegalAward;
  try { parsed = parseAward({ id: award.id, matterId: award.matterId, kind: award.kind, judgmentVerification: award.judgmentVerification, collectionReadiness: award.collectionReadiness, revision: award.revision, obligors: award.obligors, ...wire }); }
  catch { return bad("award is not a valid L1 award"); }
  return parsed;
}

export function parseCollectionApproval(raw: unknown): CollectionApproval {
  if (!isRecord(raw)) return fail("approval must be an object");
  exactKeys(raw, ["awardId", "matterId", "approvedBy", "approvedOn", "evidence", "currency", "outstandingCents", "ledgerSeq", "ledgerDigest", "awardRevision", "creditorPartyId", "obligors"], "approval");
  if (typeof raw.ledgerDigest !== "string" || !DIGEST.test(raw.ledgerDigest)) fail("approval must name the ledger state it approved");
  if (typeof raw.awardRevision !== "number" || !Number.isSafeInteger(raw.awardRevision) || raw.awardRevision < 1) fail("approval must name the positive award revision it approved");
  if (!Array.isArray(raw.obligors) || raw.obligors.length === 0) fail("approval must name the obligors it approved");
  const seenParty = new Set<string>();
  const obligors = (raw.obligors as unknown[]).map((x) => {
    if (!isRecord(x) || !sameKeys(x, ["partyId", "liability"])) return fail("approval obligors carry only partyId and liability");
    const partyId = ledgerId(x.partyId, "obligor partyId");
    if (seenParty.has(partyId)) fail("approval names an obligor twice");
    seenParty.add(partyId);
    if (!(LIABILITIES as readonly unknown[]).includes(x.liability)) fail("approval obligor liability is not recognised");
    return { partyId, liability: x.liability as LegalAward["obligors"][number]["liability"] };
  });
  if (typeof raw.currency !== "string" || !/^[A-Z]{3}$/.test(raw.currency)) fail("approval currency is required");
  if (typeof raw.outstandingCents !== "number" || !Number.isSafeInteger(raw.outstandingCents) || raw.outstandingCents < 1) fail("approval must name a positive outstanding amount");
  if (typeof raw.ledgerSeq !== "number" || !Number.isSafeInteger(raw.ledgerSeq) || raw.ledgerSeq < 0) fail("approval must name the ledger position it approved");
  return { awardId: ledgerId(raw.awardId, "awardId"), matterId: ledgerId(raw.matterId, "matterId"), approvedBy: nonBlank(raw.approvedBy, "approvedBy"),
    approvedOn: parseDate(raw.approvedOn, "approvedOn"), evidence: parseEvidence(raw.evidence, "approval"), currency: raw.currency as string,
    outstandingCents: raw.outstandingCents as number, ledgerSeq: raw.ledgerSeq as number,
    ledgerDigest: raw.ledgerDigest as string, awardRevision: raw.awardRevision as number, creditorPartyId: ledgerId(raw.creditorPartyId, "creditorPartyId"), obligors: normalizeParties(obligors) };
}
