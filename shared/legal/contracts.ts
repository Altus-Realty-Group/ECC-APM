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

/** Absent/null amount => null (unknown). Zero is a real recorded zero. Currency is required with an amount. */
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

/** Sum each award once per currency. Unknown amounts are counted, never treated as 0. Obligor count is irrelevant. */
export function totalAwards(awards: LegalAward[]): { byCurrency: Record<string, number>; unknownCount: number } {
  const byCurrency: Record<string, number> = {};
  let unknownCount = 0;
  for (const a of awards) {
    if (a.amount === null) { unknownCount++; continue; }
    byCurrency[a.amount.currency] = (byCurrency[a.amount.currency] ?? 0) + a.amount.cents;
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
