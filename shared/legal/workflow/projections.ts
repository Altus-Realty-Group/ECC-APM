import { parseMatter, parseAward, parseMoney, moneyToWire, CONFIDENCE, LegalContractError, type LegalMatter, type LegalAward } from "../contracts";

/** Provisional, pure read projection. No producer binding or resource authority. */
export type EvidenceRef = { id: string; matterId: string; filename: string | null; url: string | null; restricted: boolean; confidence: (typeof CONFIDENCE)[number] };
export type Requirement = { id: string; matterId: string; description: string; assignedActor: string | null; sourceDate: string | null; status: "open" | "resolved" };
export type CourtEvent = { id: string; matterId: string; date: string | null; source: string | null; responsibleActor: string | null };
export type WorkflowProjection = { matter: LegalMatter; evidence: EvidenceRef[]; requirements: Requirement[]; courtEvents: CourtEvent[]; awards: LegalAward[] };
export type ProjectionSummary = { publicEvidence: number; openRequirements: number; unassignedOpenRequirements: number; unknownAwards: number; verifiedMonetaryAwards: number };
export type ProjectionOutcome =
  | { kind: "ready"; projection: WorkflowProjection; summary: ProjectionSummary }
  | { kind: "unavailable"; reason: string }
  | { kind: "missing" } | { kind: "denied" }
  | { kind: "stale"; asOf: string | null }
  | { kind: "conflict"; reason: string };

const conflict = (): ProjectionOutcome => ({ kind: "conflict", reason: "Workflow records require review." });
const own = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);
function check(ok: unknown): asserts ok { if (!ok) throw new LegalContractError("Workflow input is invalid."); }
function object(v: unknown): Record<string, unknown> {
  check(v !== null && typeof v === "object" && !Array.isArray(v));
  return v as Record<string, unknown>;
}
function array(v: unknown): unknown[] { check(Array.isArray(v)); return v; }
function text(v: unknown): string {
  check(typeof v === "string" && v.trim() !== "" && !/[\u0000-\u001f\u007f]/.test(v));
  return v;
}
function nullableText(v: unknown): string | null { return v === null ? null : text(v); }
function identity(o: Record<string, unknown>) { return { id: text(o.id), matterId: text(o.matterId) }; }

function realDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [year, month, day] = v.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
function dateOrNull(v: unknown): string | null {
  if (v === null) return null;
  check(realDate(v));
  return v;
}
function asOf(v: unknown): string | null {
  if (v === null) return null;
  if (realDate(v)) return v;
  check(typeof v === "string");
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?Z$/.exec(v);
  check(m && realDate(m[1]) && Number(m[2]) < 24 && Number(m[3]) < 60 && Number(m[4]) < 60);
  return v;
}
function evidenceRow(v: unknown): EvidenceRef {
  const o = object(v), ids = identity(o);
  check((CONFIDENCE as readonly unknown[]).includes(o.confidence));
  const filename = nullableText(o.filename), url = nullableText(o.url);
  if (url !== null) {
    try {
      const parsed = new URL(url);
      check(["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password);
    } catch { throw new LegalContractError("Workflow input is invalid."); }
  }
  // Missing, malformed and true flags NEVER become false during normalization.
  return { ...ids, filename, url, restricted: !(own(o, "restricted") && o.restricted === false), confidence: o.confidence as EvidenceRef["confidence"] };
}
function requirementRow(v: unknown): Requirement {
  const o = object(v);
  check(o.status === "open" || o.status === "resolved");
  return { ...identity(o), description: text(o.description), assignedActor: nullableText(o.assignedActor), sourceDate: dateOrNull(o.sourceDate), status: o.status };
}
function courtRow(v: unknown): CourtEvent {
  const o = object(v);
  return { ...identity(o), date: dateOrNull(o.date), source: nullableText(o.source), responsibleActor: nullableText(o.responsibleActor) };
}
function awardRow(v: unknown): LegalAward {
  const o = object(v);
  let amountWire: { amountCents: unknown; currency: unknown } = { amountCents: o.amountCents, currency: o.currency };
  if (own(o, "amount")) {
    const a = o.amount;
    if (a === null) amountWire = moneyToWire(null);
    else {
      const m = object(a);
      check(own(m, "cents") && own(m, "currency"));
      const money = parseMoney(m.cents, m.currency);
      check(money !== null); // {} / {cents:null,currency:null} is not normalized Money.
      amountWire = moneyToWire(money);
    }
    if (own(o, "amountCents") || own(o, "currency")) {
      const other = moneyToWire(parseMoney(o.amountCents, o.currency));
      check(other.amountCents === amountWire.amountCents && other.currency === amountWire.currency);
    }
  }
  const award = parseAward({ ...o, ...amountWire });
  text(award.id); text(award.matterId);
  return award;
}
function unique<T extends { id: string }>(rows: T[]): T[] {
  check(new Set(rows.map(r => r.id)).size === rows.length);
  return rows;
}
function validated(input: unknown): WorkflowProjection {
  const root = object(input);
  const matter = parseMatter(root.matter);
  text(matter.id); text(matter.scopeRef);
  const evidence = array(root.evidence).map(evidenceRow);
  const requirements = array(root.requirements).map(requirementRow);
  const courtEvents = array(root.courtEvents).map(courtRow);
  const awards = array(root.awards).map(awardRow);
  const children = [...evidence, ...requirements, ...courtEvents, ...awards];
  unique(children);
  check(children.every(row => row.matterId === matter.id));
  // The public result itself is sanitized, not only an optional helper call.
  return { matter, evidence: evidence.filter(e => e.restricted === false), requirements, courtEvents, awards };
}
function ready(p: WorkflowProjection): ProjectionOutcome {
  const open = p.requirements.filter(r => r.status === "open");
  return { kind: "ready", projection: p, summary: {
    publicEvidence: p.evidence.length, openRequirements: open.length,
    unassignedOpenRequirements: open.filter(r => r.assignedActor === null).length,
    unknownAwards: p.awards.filter(a => a.amount === null).length,
    verifiedMonetaryAwards: p.awards.filter(a => a.judgmentVerification === "verified" && a.amount !== null).length,
  } };
}

/** Raw projection compatibility entry. All failures are non-identifying outcomes. */
export function validateProjection(input: unknown): ProjectionOutcome {
  try { return ready(validated(input)); } catch { return conflict(); }
}
/** Single public boundary for producer outcomes AND raw projections; never forwards raw fields/reasons. */
export function consumeProjection(input: unknown): ProjectionOutcome {
  try {
    const o = object(input);
    if (!own(o, "kind")) return ready(validated(o));
    switch (o.kind) {
      case "ready": return ready(validated(o.projection));
      case "unavailable": return { kind: "unavailable", reason: "Legal workflow is unavailable." };
      case "missing": return { kind: "missing" };
      case "denied": return { kind: "denied" };
      case "stale": return { kind: "stale", asOf: asOf(o.asOf) };
      case "conflict": return conflict();
      default: return conflict();
    }
  } catch { return conflict(); }
}

/** Compatibility helpers validate their own input; new consumers use consumeProjection and its summary. */
export function publicEvidence(rows: EvidenceRef[]): EvidenceRef[] {
  return unique(array(rows).map(evidenceRow)).filter(e => e.restricted === false);
}
export function openRequirements(rows: Requirement[]): Requirement[] {
  return unique(array(rows).map(requirementRow)).filter(r => r.status === "open");
}
export function unassignedOpenRequirements(rows: Requirement[]): Requirement[] {
  return openRequirements(rows).filter(r => r.assignedActor === null);
}
function distinctAwards(rows: LegalAward[]): LegalAward[] {
  const byId = new Map<string, LegalAward>();
  for (const raw of array(rows)) {
    const award = awardRow(raw), previous = byId.get(award.id);
    check(!previous || JSON.stringify(previous) === JSON.stringify(award));
    byId.set(award.id, award);
  }
  return [...byId.values()];
}
export function unknownAwardCount(rows: LegalAward[]): number { return distinctAwards(rows).filter(a => a.amount === null).length; }
export function verifiedAwardCount(rows: LegalAward[]): number { return distinctAwards(rows).filter(a => a.judgmentVerification === "verified" && a.amount !== null).length; }
export function courtEventsWithSource(rows: CourtEvent[]): CourtEvent[] { return unique(array(rows).map(courtRow)); }
