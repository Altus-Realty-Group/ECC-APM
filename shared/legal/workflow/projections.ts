import type { LegalMatter, LegalAward } from "../contracts";
import { CONFIDENCE, VERIFICATIONS, READINESS, LIFECYCLES } from "../contracts";

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

/** Validate whole projection against its matter. Reject wrong-matter children, conflicting duplicate IDs and malformed dimensions. */
export function validateProjection(input: unknown): ProjectionOutcome {
  if (input === null || typeof input !== "object") return { kind: "conflict", reason: "projection is not an object" };
  const p = input as WorkflowProjection;
  if (!p.matter || typeof p.matter.id !== "string") return { kind: "conflict", reason: "matter is missing" };
  if (!(LIFECYCLES as readonly string[]).includes(p.matter.lifecycle)) return { kind: "conflict", reason: "matter lifecycle is not allowed" };
  const mid = p.matter.id;
  const ids = new Set<string>();
  for (const child of [...p.evidence, ...p.requirements, ...p.courtEvents, ...p.awards]) {
    if (child.matterId !== mid) return { kind: "conflict", reason: "wrong-matter child" };
    if (ids.has(child.id)) return { kind: "conflict", reason: "duplicate id" };
    ids.add(child.id);
  }
  for (const e of p.evidence) {
    if (!(CONFIDENCE as readonly string[]).includes(e.confidence)) return { kind: "conflict", reason: "bad confidence" };
  }
  for (const a of p.awards) {
    if (!(VERIFICATIONS as readonly string[]).includes(a.judgmentVerification)) return { kind: "conflict", reason: "bad verification" };
    if (!(READINESS as readonly string[]).includes(a.collectionReadiness)) return { kind: "conflict", reason: "bad readiness" };
  }
  for (const c of p.courtEvents) {
    if (!isRealIsoDate(c.date)) return { kind: "conflict", reason: "court date is not a real calendar day" };
  }
  return { kind: "ready", projection: p };
}

/** Evidence is default-deny unless restricted is explicitly false. Filter before search/count/metadata. */
export function publicEvidence(evidence: EvidenceRef[]): EvidenceRef[] {
  return evidence.filter((e) => e.restricted === false).map((e) => ({ ...e }));
}

/** All open missing requirements, including assigned ones. */
export function openRequirements(requirements: Requirement[]): Requirement[] {
  return requirements.filter((r) => r.status === "open");
}

/** Unassigned subset only. Request-recipient wording is not an actor. */
export function unassignedOpenRequirements(requirements: Requirement[]): Requirement[] {
  return openRequirements(requirements).filter((r) => !r.assignedActor);
}

/** Deduplicate unknown award counts by identity. Unknown amount remains unknown, not zero. */
export function unknownAwardCount(awards: LegalAward[]): number {
  const ids = new Set(awards.filter((a) => a.amount === null).map((a) => a.id));
  return ids.size;
}

export function verifiedAwardCount(awards: LegalAward[]): number {
  const ids = new Set(awards.filter((a) => a.judgmentVerification === "verified" && a.amount !== null).map((a) => a.id));
  return ids.size;
}

/** Court events keep source and actor. Unknown date stays unknown. No deadline is calculated. */
export function courtEventsWithSource(events: CourtEvent[]): CourtEvent[] {
  return events.map((e) => ({ ...e, date: e.date ?? null, source: e.source ?? null, responsibleActor: e.responsibleActor ?? null }));
}
