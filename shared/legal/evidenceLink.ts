// L4 evidence-to-document-version linkage contracts (ADR-0004, docs/legal/schema/003_legal_evidence_linkage.proposal.sql, NOT applied).
// Pure: no network, no database, no imports from src/. It validates requests and plans transitions; it does not write anything and it does NOT authorize anything.
//
// ACTIVATION GATE (explicit, fail closed): every plan requires an `authority` decision for BOTH the matter and the document target. This module cannot verify either:
// SQL integrity proves a registered version exists and is bound exactly once, never that a caller may see the matter, the document, its classification or its bytes.
// All authority producers are unbound today, so nothing here can be called with a real `true` outside a test. A missing, partial or non-boolean decision denies.
//
// A legacy evidence reference is UNBOUND whatever its storageRef, filename, restricted flag or confidence say. storageRef is opaque and is never parsed into an identity.
import { LegalContractError } from "./contracts";

export const EVIDENCE_BINDING_STATES = ["unbound", "active", "withdrawn"] as const;
export type EvidenceBindingState = (typeof EVIDENCE_BINDING_STATES)[number];

/** Journal dimensions whose events are about an evidence subject and are masked unless that evidence is visible (mirrors legal_case_events_rt). */
export const EVIDENCE_SUBJECT_DIMENSIONS = ["evidence_confidence", "evidence_attachment"] as const;

export const ATTACHMENT_EVENT_TYPES = ["evidence_attached", "evidence_withdrawn"] as const;

/** Canonical UUID text, any case; the database compares uuid values, so identity is the lower-cased form. */
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function parseUuid(v: unknown, what: string): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new LegalContractError(`${what} must be a canonical uuid`);
  return v.toLowerCase();
}

export type EvidenceRef = {
  id: string;
  matterId: string;
  requirementId: string | null;     // null = explicitly unassigned
  documentVersionId: string | null; // null = unbound (legacy or not yet attached)
  withdrawnAt: string | null;       // ISO instant, set by the database clock only
  revision: number;
  restricted: boolean;
  /** Opaque legacy pointer. Never an identity; carried only so callers can prove it was ignored. */
  storageRef: string;
};

const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/;
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/**
 * Strict RFC 3339 instant: a date, a 'T', a time and an explicit zone (Z or +/-HH:MM). Impossible calendar dates (Feb 30, Apr 31, Feb 29 in a
 * non-leap year), hour 24, second 60, month 13 and zone-less values are REJECTED, never normalized to a neighbouring day. A valid value is returned
 * as its UTC ISO form (sub-millisecond digits are truncated; the server clock is the only writer of withdrawal time).
 */
function parseInstant(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== "string") throw new LegalContractError("withdrawnAt must be an ISO instant or null");
  const m = INSTANT.exec(v);
  if (!m) throw new LegalContractError("withdrawnAt must be a valid ISO instant with an explicit zone, or null");
  const [y, mo, d, h, mi, se] = [m[1], m[2], m[3], m[4], m[5], m[6]].map(Number) as [number, number, number, number, number, number];
  const dim = mo === 2 && isLeap(y) ? 29 : DAYS[mo - 1];
  if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > (dim as number) || h > 23 || mi > 59 || se > 59) throw new LegalContractError("withdrawnAt is not a real calendar instant");
  let offsetMin = 0;
  if (m[8] !== "Z") {
    const oh = Number(m[8]!.slice(1, 3)), om = Number(m[8]!.slice(4, 6));
    if (oh > 23 || om > 59) throw new LegalContractError("withdrawnAt has an invalid zone offset");
    offsetMin = (m[8]![0] === "-" ? -1 : 1) * (oh * 60 + om);
  }
  const ms = m[7] ? Number(m[7].padEnd(3, "0").slice(0, 3)) : 0;
  const t = new Date(0);
  t.setUTCFullYear(y, mo - 1, d);
  t.setUTCHours(h, mi, se, ms);
  const utc = new Date(t.getTime() - offsetMin * 60_000);
  const uy = utc.getUTCFullYear();
  if (!Number.isFinite(utc.getTime()) || uy < 1 || uy > 9999) throw new LegalContractError("withdrawnAt is outside the supported range");
  return utc.toISOString();
}
/**
 * The database column is PostgreSQL integer (max 2147483647) and a transition writes expected + 1, so:
 *  - a ROW revision may be 1..MAX_ROW_REVISION;
 *  - a REQUEST's expected revision may be 1..MAX_REQUEST_REVISION (= MAX_ROW_REVISION - 1): a request that expects the maximum could neither
 *    succeed (its successor does not exist) nor be a replay (its replay row would be at MAX_ROW_REVISION + 1), so it is refused at the boundary.
 * Number.MAX_SAFE_INTEGER and every other JavaScript-safe integer above the column range are rejected, never carried toward an overflow.
 */
export const MAX_ROW_REVISION = 2_147_483_647;
export const MAX_REQUEST_REVISION = MAX_ROW_REVISION - 1;
function parseRevision(v: unknown, what: string, max: number = MAX_ROW_REVISION): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 1) throw new LegalContractError(`${what} must be a positive safe integer`);
  if (v > max) throw new LegalContractError(`${what} exceeds the supported revision range (1..${max})`);
  return v;
}
/** Checked addition: the only way a plan computes a successor revision. */
export function successorRevision(expected: number): number {
  if (!Number.isSafeInteger(expected) || expected < 1 || expected > MAX_REQUEST_REVISION) throw new LegalContractError("revision has no representable successor");
  const next = expected + 1;
  if (next > MAX_ROW_REVISION) throw new LegalContractError("revision has no representable successor");
  return next;
}

/**
 * A nullable binding field must be PRESENT: an omitted or undefined requirementId, documentVersionId or withdrawnAt never implies unassigned, unbound or
 * active. A caller states null explicitly (that is the legacy shape), so a truncated or partial row cannot silently become an operational state.
 */
function requiredNullable(o: Record<string, unknown>, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(o, key) || o[key] === undefined) throw new LegalContractError(`${key} must be present (null when there is no value)`);
  return o[key];
}

/** Parse one row. Rejects any shape the database CHECK constraint would reject (a withdrawal without a version). */
export function parseEvidenceRef(v: unknown): EvidenceRef {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new LegalContractError("evidence reference must be an object");
  const o = v as Record<string, unknown>;
  if (typeof o.storageRef !== "string") throw new LegalContractError("storageRef must be an opaque string");
  if (typeof o.restricted !== "boolean") throw new LegalContractError("restricted must be a boolean");
  const requirementId = requiredNullable(o, "requirementId"), documentVersionId = requiredNullable(o, "documentVersionId"), withdrawnAt = requiredNullable(o, "withdrawnAt");
  const ref: EvidenceRef = {
    id: parseUuid(o.id, "id"),
    matterId: parseUuid(o.matterId, "matterId"),
    requirementId: requirementId === null ? null : parseUuid(requirementId, "requirementId"),
    documentVersionId: documentVersionId === null ? null : parseUuid(documentVersionId, "documentVersionId"),
    withdrawnAt: parseInstant(withdrawnAt),
    revision: parseRevision(o.revision, "revision"),
    restricted: o.restricted,
    storageRef: o.storageRef,
  };
  if (ref.withdrawnAt !== null && ref.documentVersionId === null) throw new LegalContractError("a withdrawal requires a bound version");
  return ref;
}

/** Derived, never stored: null version = unbound (legacy); version without withdrawal = active; version with withdrawal = withdrawn. */
export function deriveBindingState(ref: Pick<EvidenceRef, "documentVersionId" | "withdrawnAt">): EvidenceBindingState {
  if (ref.documentVersionId === null) {
    if (ref.withdrawnAt !== null) throw new LegalContractError("a withdrawal requires a bound version");
    return "unbound";
  }
  return ref.withdrawnAt === null ? "active" : "withdrawn";
}

/** Always false: a storageRef is never an identity, so a legacy reference is bound only by an explicit, journalled attachment. */
export function storageRefIsIdentity(_storageRef: string): false { return false; }

/** Both decisions must be exactly `true`. Anything else (missing, partial, truthy non-boolean) denies without saying which side failed. */
export type AuthorityDecision = { matter: boolean; document: boolean };
export function assertAuthority(a: unknown): void {
  if (typeof a !== "object" || a === null || (a as AuthorityDecision).matter !== true || (a as AuthorityDecision).document !== true)
    throw new LegalContractError("evidence linkage unavailable");
}

export type AttachRequest = { evidenceId: string; documentVersionId: string; expectedRevision: number };
export type WithdrawRequest = { evidenceId: string; expectedRevision: number };

function rejectExtraKeys(o: Record<string, unknown>, allowed: readonly string[]): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new LegalContractError(`unexpected field ${JSON.stringify(k)}`);
}

export function parseAttachRequest(v: unknown): AttachRequest {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new LegalContractError("attachment request must be an object");
  const o = v as Record<string, unknown>;
  // the version is a registered-version key only: no filename, path, URL, digest or parsed storage reference is accepted in its place
  rejectExtraKeys(o, ["evidenceId", "documentVersionId", "expectedRevision"]);
  return { evidenceId: parseUuid(o.evidenceId, "evidenceId"), documentVersionId: parseUuid(o.documentVersionId, "documentVersionId"), expectedRevision: parseRevision(o.expectedRevision, "expectedRevision", MAX_REQUEST_REVISION) };
}
export function parseWithdrawRequest(v: unknown): WithdrawRequest {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new LegalContractError("withdrawal request must be an object");
  const o = v as Record<string, unknown>;
  rejectExtraKeys(o, ["evidenceId", "expectedRevision"]);   // a caller-supplied withdrawal time is refused: the server clock supplies it
  return { evidenceId: parseUuid(o.evidenceId, "evidenceId"), expectedRevision: parseRevision(o.expectedRevision, "expectedRevision", MAX_REQUEST_REVISION) };
}

export type AttachPlan = { kind: "attach"; nextRevision: number } | { kind: "replay" };
export type WithdrawPlan = { kind: "withdraw"; nextRevision: number } | { kind: "replay" };

/**
 * Mirror of legal_attach_evidence_version. An exact replay (active binding to the SAME version at expected + 1) is a no-op and writes nothing,
 * so a lost reply cannot duplicate a row, a revision or a journal event. Everything else that is not a clean attach throws.
 */
export function planAttach(current: EvidenceRef, req: AttachRequest, authority: unknown): AttachPlan {
  assertAuthority(authority);
  if (current.id !== req.evidenceId) throw new LegalContractError("request does not match the evidence reference");
  const state = deriveBindingState(current);
  if (state === "active" && current.documentVersionId === req.documentVersionId && current.revision === successorRevision(req.expectedRevision)) return { kind: "replay" };
  if (state !== "unbound") throw new LegalContractError("evidence reference is already bound (retarget, restore and rebind are refused)");
  if (current.revision !== req.expectedRevision) throw new LegalContractError(`stale revision (read ${req.expectedRevision}, current ${current.revision})`);
  return { kind: "attach", nextRevision: successorRevision(req.expectedRevision) };
}

export function planWithdraw(current: EvidenceRef, req: WithdrawRequest, authority: unknown): WithdrawPlan {
  assertAuthority(authority);
  if (current.id !== req.evidenceId) throw new LegalContractError("request does not match the evidence reference");
  const state = deriveBindingState(current);
  if (state === "withdrawn" && current.revision === successorRevision(req.expectedRevision)) return { kind: "replay" };
  if (state !== "active") throw new LegalContractError("evidence reference is not an active binding");
  if (current.revision !== req.expectedRevision) throw new LegalContractError(`stale revision (read ${req.expectedRevision}, current ${current.revision})`);
  return { kind: "withdraw", nextRevision: successorRevision(req.expectedRevision) };
}

/** Identity of one binding, mirroring the partial unique index: an unassigned requirement is a real, comparable key part (NULLS NOT DISTINCT). */
export function bindingKey(b: { matterId: string; requirementId: string | null; documentVersionId: string }): string {
  return JSON.stringify([parseUuid(b.matterId, "matterId"), b.requirementId === null ? null : parseUuid(b.requirementId, "requirementId"), parseUuid(b.documentVersionId, "documentVersionId")]);
}

/** A candidate binding conflicts if ANY existing ref (active or withdrawn, another row) already holds the same matter/requirement/version. */
export function findBindingConflict(existing: readonly EvidenceRef[], candidate: { evidenceId: string; matterId: string; requirementId: string | null; documentVersionId: string }): EvidenceRef | null {
  const key = bindingKey(candidate);
  for (const e of existing)
    if (e.id !== candidate.evidenceId && e.documentVersionId !== null && bindingKey({ matterId: e.matterId, requirementId: e.requirementId, documentVersionId: e.documentVersionId }) === key) return e;
  return null;
}

/** Packet manifest input: ACTIVE bindings only, deduplicated by immutable version identity (one version may support several requirements; bytes are never copied). */
export function manifestVersionIds(refs: readonly EvidenceRef[]): string[] {
  const seen = new Set<string>();
  for (const r of refs) if (deriveBindingState(r) === "active") seen.add(r.documentVersionId as string);
  return [...seen].sort();
}

export type JournalEventPlan = { eventType: (typeof ATTACHMENT_EVENT_TYPES)[number]; dimension: "evidence_attachment"; fromStatus: string; toStatus: string; subjectId: string };
/** The content-free event the database appends in the same statement: states and the evidence subject id only, never a version, document, name, URL or digest. */
export function journalEventFor(plan: AttachPlan | WithdrawPlan, evidenceId: string): JournalEventPlan | null {
  if (plan.kind === "replay") return null;
  return plan.kind === "attach"
    ? { eventType: "evidence_attached", dimension: "evidence_attachment", fromStatus: "unbound", toStatus: "attached", subjectId: parseUuid(evidenceId, "evidenceId") }
    : { eventType: "evidence_withdrawn", dimension: "evidence_attachment", fromStatus: "attached", toStatus: "withdrawn", subjectId: parseUuid(evidenceId, "evidenceId") };
}

/** True when a journal row about this dimension must be hidden unless the evidence subject itself is visible to the caller. */
export function journalDimensionIsEvidenceSubject(dimension: string | null): boolean {
  return dimension !== null && (EVIDENCE_SUBJECT_DIMENSIONS as readonly string[]).includes(dimension);
}
