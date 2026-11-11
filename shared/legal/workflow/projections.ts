import type { LegalMatter, LegalAward } from "../contracts";
import { parseMatter, parseAward, parseMoney, CONFIDENCE, LegalContractError } from "../contracts";

/** Provisional workflow types. Not an accepted producer contract. */

export type EvidenceRef = {
  id: string;
  matterId: string;
  filename: string | null;
  url: string | null;
  restricted: boolean;
  confidence: (typeof CONFIDENCE)[number];
};

export type Requirement = {
  id: string;
  matterId: string;
  description: string;
  assignedActor: string | null;
  sourceDate: string | null;
  status: "open" | "resolved";
};

export type CourtEvent = {
  id: string;
  matterId: string;
  date: string | null;
  source: string | null;
  responsibleActor: string | null;
};

export type WorkflowProjection = {
  matter: LegalMatter;
  evidence: EvidenceRef[];
  requirements: Requirement[];
  courtEvents: CourtEvent[];
  awards: LegalAward[];
};

export type ProjectionOutcome =
  | { kind: "ready"; projection: WorkflowProjection }
  | { kind: "unavailable"; reason: string }
  | { kind: "missing" }
  | { kind: "denied" }
  | { kind: "stale"; asOf: string | null }
  | { kind: "conflict"; reason: string };

function isRealIsoDate(v: string | null): boolean {
  if (v === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function asArray(v: unknown, name: string): unknown[] | null {
  if (!Array.isArray(v)) return null;
  return v;
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/** Accept unknown input. Validate runtime shapes before dereferencing. Return whitelisted output. */
export function validateProjection(input: unknown): ProjectionOutcome {
  const root = asObject(input);
  if (!root) return { kind: "conflict", reason: "projection is not an object" };

  let matter: LegalMatter;
  try { matter = parseMatter(root.matter); }
  catch { return { kind: "conflict", reason: "matter is invalid" }; }

  const evidenceRaw = asArray(root.evidence, "evidence");
  const requirementsRaw = asArray(root.requirements, "requirements");
  const courtRaw = asArray(root.courtEvents, "courtEvents");
  const awardsRaw = asArray(root.awards, "awards");
  if (!evidenceRaw || !requirementsRaw || !courtRaw || !awardsRaw) return { kind: "conflict", reason: "collection is missing" };

  const ids = new Set<string>();
  const evidence: EvidenceRef[] = [];
  for (const row of evidenceRaw) {
    const o = asObject(row);
    if (!o || typeof o.id !== "string" || o.matterId !== matter.id) return { kind: "conflict", reason: "evidence row is invalid" };
    if (ids.has(o.id)) return { kind: "conflict", reason: "duplicate id" };
    ids.add(o.id);
    if (!(CONFIDENCE as readonly string[]).includes(o.confidence as string)) return { kind: "conflict", reason: "bad confidence" };
    evidence.push({ id: o.id, matterId: matter.id, filename: typeof o.filename === "string" ? o.filename : null, url: typeof o.url === "string" ? o.url : null, restricted: o.restricted === true, confidence: o.confidence as EvidenceRef["confidence"] });
  }

  const requirements: Requirement[] = [];
  for (const row of requirementsRaw) {
    const o = asObject(row);
    if (!o || typeof o.id !== "string" || o.matterId !== matter.id) return { kind: "conflict", reason: "requirement row is invalid" };
    if (ids.has(o.id)) return { kind: "conflict", reason: "duplicate id" };
    ids.add(o.id);
    if (typeof o.description !== "string" || o.description.trim() === "") return { kind: "conflict", reason: "requirement description is invalid" };
    if (o.assignedActor !== null && typeof o.assignedActor !== "string") return { kind: "conflict", reason: "requirement actor is invalid" };
    if (o.sourceDate !== null && !isRealIsoDate(o.sourceDate as string)) return { kind: "conflict", reason: "requirement date is invalid" };
    if (o.status !== "open" && o.status !== "resolved") return { kind: "conflict", reason: "requirement status is invalid" };
    requirements.push({ id: o.id, matterId: matter.id, description: o.description, assignedActor: o.assignedActor as string | null, sourceDate: o.sourceDate as string | null, status: o.status });
  }

  const courtEvents: CourtEvent[] = [];
  for (const row of courtRaw) {
    const o = asObject(row);
    if (!o || typeof o.id !== "string" || o.matterId !== matter.id) return { kind: "conflict", reason: "court event is invalid" };
    if (ids.has(o.id)) return { kind: "conflict", reason: "duplicate id" };
    ids.add(o.id);
    if (!isRealIsoDate(o.date as string | null)) return { kind: "conflict", reason: "court date is not a real calendar day" };
    courtEvents.push({ id: o.id, matterId: matter.id, date: o.date as string | null, source: typeof o.source === "string" ? o.source : null, responsibleActor: typeof o.responsibleActor === "string" ? o.responsibleActor : null });
  }

  const awards: LegalAward[] = [];
  for (const row of awardsRaw) {
    const o = asObject(row);
    if (!o) return { kind: "conflict", reason: "award row is invalid" };
    // Accept normalized amount or wire amountCents. Do not turn recorded amounts into unknown.
    const wire = { ...o, amountCents: o.amountCents ?? (o.amount && typeof o.amount === "object" ? (o.amount as { cents?: number }).cents : undefined), currency: o.currency ?? (o.amount && typeof o.amount === "object" ? (o.amount as { currency?: string }).currency : undefined) };
    try {
      const award = parseAward(wire);
      if (award.matterId !== matter.id) return { kind: "conflict", reason: "wrong-matter award" };
      if (ids.has(award.id)) return { kind: "conflict", reason: "duplicate id" };
      ids.add(award.id);
      awards.push(award);
    } catch (e) {
      if (e instanceof LegalContractError) return { kind: "conflict", reason: "award is invalid" };
      return { kind: "conflict", reason: "award is invalid" };
    }
  }

  return { kind: "ready", projection: { matter, evidence, requirements, courtEvents, awards } };
}

/** Validated consumption path. Conflicting input never produces trustworthy counts. */
export function consumeProjection(input: unknown): ProjectionOutcome {
  return validateProjection(input);
}

export function publicEvidence(evidence: EvidenceRef[]): EvidenceRef[] {
  return evidence.filter((e) => e.restricted === false);
}

export function openRequirements(requirements: Requirement[]): Requirement[] {
  return requirements.filter((r) => r.status === "open");
}

export function unassignedOpenRequirements(requirements: Requirement[]): Requirement[] {
  return openRequirements(requirements).filter((r) => !r.assignedActor);
}

export function unknownAwardCount(awards: LegalAward[]): number {
  return new Set(awards.filter((a) => a.amount === null).map((a) => a.id)).size;
}

export function verifiedAwardCount(awards: LegalAward[]): number {
  return new Set(awards.filter((a) => a.judgmentVerification === "verified" && a.amount !== null).map((a) => a.id)).size;
}

export function courtEventsWithSource(events: CourtEvent[]): CourtEvent[] {
  return events.map((e) => ({ ...e, date: e.date ?? null, source: e.source ?? null, responsibleActor: e.responsibleActor ?? null }));
}
