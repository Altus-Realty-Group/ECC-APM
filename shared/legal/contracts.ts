// L1 native legal contracts (issue #214). Pure, no network, no imports from src/ (shared by server and UI).
// Source-only: shapes mirror docs/legal/schema/001_native_legal_foundation.proposal.sql, which is NOT applied.
// Money is integer cents; null = unknown, never 0. Dimensions are separate fields and never derived from each other.

export const CASE_TYPES = ["eviction", "damages", "eviction_and_damages", "collections", "quiet_title", "foreclosure", "other"] as const;
export const LIFECYCLES = ["draft", "pre_filing", "filed", "pending_hearing", "judgment_entered", "closed", "dismissed"] as const;
export const VERIFICATIONS = ["unverified", "verified", "disputed", "vacated"] as const;
export const READINESS = ["not_ready", "ready", "in_collection", "closed"] as const;
export const CONFIDENCE = ["unreviewed", "low", "medium", "high"] as const;
export const LIABILITIES = ["sole", "joint", "several"] as const;
export const AWARD_KINDS = ["possession", "rent", "damages", "fees", "costs", "interest", "other"] as const;

export class LegalContractError extends Error {
  constructor(message: string) { super(message); this.name = "LegalContractError"; }
}

/**
 * Largest cents value the contract can carry exactly. The SQL proposal caps amount_cents at the same value
 * (CHECK amount_cents <= 9007199254740991), so the database cannot hold a bigint the contract would have to round.
 * A reader that receives a larger bigint (as a number, string or bigint) must reject it, never truncate it.
 */
export const MAX_MONEY_CENTS = Number.MAX_SAFE_INTEGER;

export type Money = { cents: number; currency: string } | null;

export type LegalAward = {
  id: string;
  matterId: string;
  kind: (typeof AWARD_KINDS)[number];
  amount: Money;
  judgmentVerification: (typeof VERIFICATIONS)[number];
  collectionReadiness: (typeof READINESS)[number];
  revision: number;
  obligors: { partyId: string; liability: (typeof LIABILITIES)[number] }[];
};

export type LegalMatter = {
  id: string;
  scopeRef: string;
  caseType: (typeof CASE_TYPES)[number];
  lifecycle: (typeof LIFECYCLES)[number];
  /** Docket identity is (scopeRef, courtRef, docketNumber); any part may be unknown. */
  courtRef: string | null;
  docketNumber: string | null;
  revision: number;
};

const rec = (v: unknown): Record<string, unknown> => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new LegalContractError("expected an object");
  return v as Record<string, unknown>;
};
const str = (o: Record<string, unknown>, k: string): string => {
  const v = o[k];
  if (typeof v !== "string" || v.trim() === "") throw new LegalContractError(`${k} must be a non-empty string`);
  return v;
};
const strOrNull = (o: Record<string, unknown>, k: string): string | null => {
  const v = o[k];
  if (v === undefined || v === null) return null;
  if (typeof v !== "string" || v.trim() === "") throw new LegalContractError(`${k} must be a non-empty string or null`);
  return v;
};
const oneOf = <T extends readonly string[]>(o: Record<string, unknown>, k: string, set: T): T[number] => {
  const v = o[k];
  if (typeof v !== "string" || !(set as readonly string[]).includes(v)) throw new LegalContractError(`${k} is not an allowed value`);
  return v as T[number];
};
const revision = (o: Record<string, unknown>): number => {
  const v = o.revision;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 1) throw new LegalContractError("revision must be a positive integer");
  return v;
};

/**
 * Absent/null amount => null (unknown). Zero is a real recorded zero. Amount and currency are both present or both
 * absent, exactly as the SQL CHECK ((amount_cents IS NULL) = (currency IS NULL)). Only a JS safe integer is accepted,
 * so a bigint, string or unsafe number beyond MAX_MONEY_CENTS is rejected rather than rounded.
 */
export function parseMoney(cents: unknown, currency: unknown): Money {
  if (cents === undefined || cents === null) {
    if (currency !== undefined && currency !== null) throw new LegalContractError("currency without amount");
    return null;
  }
  if (typeof cents !== "number" || !Number.isSafeInteger(cents) || cents < 0) throw new LegalContractError("amount must be non-negative integer cents");
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) throw new LegalContractError("currency (ISO-4217) required with amount");
  return { cents, currency };
}

export function parseMatter(v: unknown): LegalMatter {
  const o = rec(v);
  return {
    id: str(o, "id"), scopeRef: str(o, "scopeRef"), caseType: oneOf(o, "caseType", CASE_TYPES),
    lifecycle: oneOf(o, "lifecycle", LIFECYCLES), courtRef: strOrNull(o, "courtRef"),
    docketNumber: strOrNull(o, "docketNumber"), revision: revision(o),
  };
}

export function parseAward(v: unknown): LegalAward {
  const o = rec(v);
  const obligorsRaw = o.obligors === undefined ? [] : o.obligors;
  if (!Array.isArray(obligorsRaw)) throw new LegalContractError("obligors must be an array");
  const seen = new Set<string>();
  const obligors = obligorsRaw.map((x) => {
    const r = rec(x);
    if ("amountCents" in r || "amount" in r) throw new LegalContractError("obligors carry no amounts (award is counted once)");
    const partyId = str(r, "partyId");
    if (seen.has(partyId)) throw new LegalContractError("duplicate obligor");
    seen.add(partyId);
    return { partyId, liability: oneOf(r, "liability", LIABILITIES) };
  });
  return {
    id: str(o, "id"), matterId: str(o, "matterId"), kind: oneOf(o, "kind", AWARD_KINDS),
    amount: parseMoney(o.amountCents, o.currency),
    judgmentVerification: oneOf(o, "judgmentVerification", VERIFICATIONS),
    collectionReadiness: oneOf(o, "collectionReadiness", READINESS), revision: revision(o), obligors,
  };
}

/** Wire form used for database/API round trips: both fields null, or both present. */
export function moneyToWire(m: Money): { amountCents: number | null; currency: string | null } {
  return m === null ? { amountCents: null, currency: null } : { amountCents: m.cents, currency: m.currency };
}

/**
 * Sum each award once per currency. Unknown amounts are counted, never treated as 0. Obligor count is irrelevant.
 * Rejects a repeated award id (identical or conflicting) and any total that is not a safe integer.
 */
export function totalAwards(awards: readonly LegalAward[]): { byCurrency: Record<string, number>; unknownCount: number } {
  const byCurrency: Record<string, number> = {};
  const seen = new Set<string>();
  let unknownCount = 0;
  for (const a of awards) {
    if (seen.has(a.id)) throw new LegalContractError(`duplicate award id ${a.id}`);
    seen.add(a.id);
    if (a.amount === null) { unknownCount++; continue; }
    const next = (byCurrency[a.amount.currency] ?? 0) + a.amount.cents;
    if (!Number.isSafeInteger(next)) throw new LegalContractError(`total for ${a.amount.currency} exceeds the safe integer range`);
    byCurrency[a.amount.currency] = next;
  }
  return { byCurrency, unknownCount };
}

/** Optimistic concurrency: a write carries the revision it read. */
export function assertRevision(read: number, current: number): void {
  if (read !== current) throw new LegalContractError(`stale revision (read ${read}, current ${current})`);
}

/** Fail-closed scope check: no scope list or unknown scope => denied. */
export function scopeAllows(grantedScopes: readonly string[] | null | undefined, scopeRef: string | null): boolean {
  return !!scopeRef && !!grantedScopes && grantedScopes.includes(scopeRef);
}

/** Docket identity key; null when any component is unknown (an unknown docket never collides). */
export function docketKey(m: Pick<LegalMatter, "scopeRef" | "courtRef" | "docketNumber">): string | null {
  return m.courtRef && m.docketNumber ? JSON.stringify([m.scopeRef, m.courtRef, m.docketNumber]) : null;
}
