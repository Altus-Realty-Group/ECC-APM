import type { LegalMatter, LegalAward } from "../contracts";

/** Provisional workflow types. Not an accepted producer contract. */

export type EvidenceRef = {
  id: string;
  matterId: string;
  filename: string | null;
  url: string | null;
  restricted: boolean;
  confidence: "unreviewed" | "low" | "medium" | "high";
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

/** Filter restricted evidence before general search/count. Unauthorized results expose no restricted filenames, IDs or URLs. */
export function publicEvidence(evidence: EvidenceRef[]): EvidenceRef[] {
  return evidence.filter((e) => !e.restricted).map((e) => ({ ...e, filename: e.restricted ? null : e.filename, url: e.restricted ? null : e.url }));
}

/** Central missing-requirement queue. "Request to" text is not an assigned user. */
export function missingRequirements(requirements: Requirement[]): Requirement[] {
  return requirements.filter((r) => r.status === "open" && !r.assignedActor);
}

/** Court events keep source and actor. Missing date stays unknown. No deadline is calculated. */
export function courtEventsWithSource(events: CourtEvent[]): CourtEvent[] {
  return events.map((e) => ({ ...e, date: e.date ?? null, source: e.source ?? null, responsibleActor: e.responsibleActor ?? null }));
}

/** Deduplicate awards by identity. Unknown amount is not zero. */
export function verifiedAwardCount(awards: LegalAward[]): number {
  const ids = new Set(awards.filter((a) => a.judgmentVerification === "verified" && a.amount !== null).map((a) => a.id));
  return ids.size;
}

export function unknownAwardCount(awards: LegalAward[]): number {
  return awards.filter((a) => a.amount === null).length;
}
