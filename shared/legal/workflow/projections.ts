import type { LegalMatter, LegalAward } from "../contracts";
import { CONFIDENCE, VERIFICATIONS, READINESS } from "../contracts";

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

function isIsoDate(v: string | null): boolean {
  if (v === null) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

/** Validate whole projection against its matter. Reject wrong-matter children, conflicting duplicate IDs and malformed dimensions. */
export function validateProjection(p: WorkflowProjection): ProjectionOutcome {
  const mid = p.matter.id;
  const ids = new Set<string>();
  for (const child of [...p.evidence, ...p.requirements, ...p.courtEvents, ...p.awards]) {
    if (child.matterId !== mid) return { kind: "conflict", reason: `wrong-matter child ${child.id}` };
    if (ids.has(child.id)) return { kind: "conflict", reason: `duplicate id ${child.id}` };
    ids.add(child.id);
  }
  for (const e of p.evidence) {
    if (!(CONFIDENCE as readonly string[]).includes(e.confidence)) return { kind: "conflict", reason: `bad confidence ${e.id}` };
  }
  for (const a of p.awards) {
    if (!(VERIFICATIONS as readonly string[]).includes(a.judgmentVerification)) return { kind: "conflict", reason: `bad verification ${a.id}` };
    if (!(READINESS as readonly string[]).includes(a.collectionReadiness)) return { kind: "conflict", reason: `bad readiness ${a.id}` };
  }
  for (const c of p.courtEvents) {
    if (!isIsoDate(c.date)) return { kind: "conflict", reason: `bad date ${c.id}` };
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
