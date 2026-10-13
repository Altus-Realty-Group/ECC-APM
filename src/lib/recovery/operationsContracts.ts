// R1-C: strict, pure adapters for the recovered legal / work-order / ledger candidates.
//
// Nothing here talks to the network. Every parser rejects a malformed payload with ContractError instead of
// coercing it, treats a missing value as null (never 0) and carries money as INTEGER CENTS only.
// Field names are the recovered candidates' (EmpireCommandCenter1), NOT a verified current backend contract;
// see operationsRegistry.ts and docs/recovery/operations/CONTRACT_LEDGER.md.

import { ContractError } from "@/lib/dataState";

export const LEGAL_STATUSES = ["Open", "Filed", "In Progress", "Resolved"] as const;
export const LEGAL_TYPES = ["Eviction", "Damages", "Late Payment", "Other"] as const;
export const WORK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"] as const;
export const WORK_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const LEDGER_KINDS = ["charge", "payment", "credit", "adjustment"] as const;

export type LegalStatus = (typeof LEGAL_STATUSES)[number] | "unknown";
export type LegalType = (typeof LEGAL_TYPES)[number] | "unknown";
export type WorkPriority = (typeof WORK_PRIORITIES)[number] | "unknown";
export type WorkStatus = (typeof WORK_STATUSES)[number] | "unknown";
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export type LegalCase = {
  id: string;
  type: LegalType;
  status: LegalStatus;
  tenantName: string | null;
  propertyName: string | null;
  unitLabel: string | null;
  /** Date-only (YYYY-MM-DD) as reported; never shifted through a time zone. */
  filedDate: string | null;
  courtDate: string | null;
  /** Claimed amount in integer cents; null = not reported (NOT zero). */
  amountClaimedCents: number | null;
  notes: string | null;
};

export type WorkOrder = {
  id: string;
  propertyName: string | null;
  unitLabel: string | null;
  description: string;
  priority: WorkPriority;
  status: WorkStatus;
  scheduledDate: string | null;
  estimatedCostCents: number | null;
  /** null = no actual cost recorded; 0 = a recorded zero-cost job. */
  actualCostCents: number | null;
  createdAt: string | null;
};

export type LedgerEntry = {
  id: string;
  leaseId: string;
  kind: LedgerKind;
  postedOn: string;
  /** Integer cents. charge/payment/credit are >= 0; adjustment is signed. */
  amountCents: number;
  memo: string | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Integer cents or null. Floats, numeric strings, NaN and unsafe integers are not cents. */
export function parseCents(v: unknown): number | null {
  return typeof v === "number" && Number.isSafeInteger(v) ? v : null;
}

/** Non-empty trimmed string or null. */
export function textOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** A real calendar date in YYYY-MM-DD, or null. Rejects 2026-02-30. */
export function parseDateOnly(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z)?$/.exec(v.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
    ? `${m[1]}-${m[2]}-${m[3]}`
    : null;
}

function parseIdValue(v: unknown, label: string): string {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  if (typeof v === "number" && Number.isSafeInteger(v) && v > 0) return String(v);
  throw new ContractError(`${label}: missing or invalid id`);
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | "unknown" {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : "unknown";
}

/** Required: money fields that are present but not integer cents make the whole row invalid. */
function optionalCents(row: Record<string, unknown>, key: string, label: string): number | null {
  const v = row[key];
  if (v === undefined || v === null) return null;
  const c = parseCents(v);
  if (c === null) throw new ContractError(`${label}: ${key} is not integer cents`);
  return c;
}

export function parseLegalCase(raw: unknown): LegalCase {
  if (!isRecord(raw)) throw new ContractError("legal case: not an object");
  const id = parseIdValue(raw.id, "legal case");
  return {
    id,
    type: oneOf(raw.type, LEGAL_TYPES),
    status: oneOf(raw.status, LEGAL_STATUSES),
    tenantName: textOrNull(raw.tenantName),
    propertyName: textOrNull(raw.propertyName),
    unitLabel: textOrNull(raw.unitLabel),
    filedDate: parseDateOnly(raw.filedDate),
    courtDate: parseDateOnly(raw.courtDate),
    amountClaimedCents: optionalCents(raw, "amountClaimedCents", `legal case ${id}`),
    notes: textOrNull(raw.notes),
  };
}

export function parseWorkOrder(raw: unknown): WorkOrder {
  if (!isRecord(raw)) throw new ContractError("work order: not an object");
  const id = parseIdValue(raw.id, "work order");
  const description = textOrNull(raw.description);
  if (!description) throw new ContractError(`work order ${id}: description is required`);
  const created = typeof raw.createdAt === "string" ? new Date(raw.createdAt).getTime() : NaN;
  return {
    id,
    propertyName: textOrNull(raw.propertyName),
    unitLabel: textOrNull(raw.unitLabel),
    description,
    priority: oneOf(raw.priority, WORK_PRIORITIES),
    status: oneOf(raw.status, WORK_STATUSES),
    scheduledDate: parseDateOnly(raw.scheduledDate),
    estimatedCostCents: optionalCents(raw, "estimatedCostCents", `work order ${id}`),
    actualCostCents: optionalCents(raw, "actualCostCents", `work order ${id}`),
    createdAt: Number.isFinite(created) ? new Date(created).toISOString() : null,
  };
}

export function parseLedgerEntry(raw: unknown): LedgerEntry {
  if (!isRecord(raw)) throw new ContractError("ledger entry: not an object");
  const id = parseIdValue(raw.id, "ledger entry");
  const kind = raw.kind;
  // An unknown kind cannot be summed safely, so it invalidates the payload rather than being guessed.
  if (typeof kind !== "string" || !(LEDGER_KINDS as readonly string[]).includes(kind)) {
    throw new ContractError(`ledger entry ${id}: unknown kind`);
  }
  const amountCents = parseCents(raw.amountCents);
  if (amountCents === null) throw new ContractError(`ledger entry ${id}: amountCents must be integer cents`);
  if (kind !== "adjustment" && amountCents < 0) throw new ContractError(`ledger entry ${id}: negative ${kind}`);
  const postedOn = parseDateOnly(raw.postedOn);
  if (!postedOn) throw new ContractError(`ledger entry ${id}: postedOn must be a calendar date`);
  return {
    id,
    leaseId: parseIdValue(raw.leaseId, `ledger entry ${id} lease`),
    kind: kind as LedgerKind,
    postedOn,
    amountCents,
    memo: textOrNull(raw.memo),
  };
}

/** Envelope `{ data: [...] }` -> rows. A non-array or any bad row rejects the payload; duplicate ids are rejected. */
export function parseCollection<T extends { id: string }>(payload: unknown, row: (raw: unknown) => T): T[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) throw new ContractError("expected { data: [] }");
  const out = payload.data.map(row);
  const seen = new Set<string>();
  for (const r of out) {
    if (seen.has(r.id)) throw new ContractError(`duplicate id ${r.id}`);
    seen.add(r.id);
  }
  return out;
}

export type LedgerSummary = {
  chargesCents: number;
  paymentsCents: number;
  creditsCents: number;
  adjustmentsCents: number;
  /** charges + adjustments - payments - credits. Positive = tenant owes. */
  balanceCents: number;
};

/**
 * Totals derived ONLY from recorded entries. No entries -> null (unknown), never a $0 balance, and nothing
 * is ever synthesized from leases or rent (the rejected AltusCommand3 TenantLedger behaviour).
 */
export function summarizeLedger(entries: readonly LedgerEntry[]): LedgerSummary | null {
  if (entries.length === 0) return null;
  const s = { chargesCents: 0, paymentsCents: 0, creditsCents: 0, adjustmentsCents: 0 };
  for (const e of entries) {
    if (e.kind === "charge") s.chargesCents += e.amountCents;
    else if (e.kind === "payment") s.paymentsCents += e.amountCents;
    else if (e.kind === "credit") s.creditsCents += e.amountCents;
    else s.adjustmentsCents += e.amountCents;
    if (!Number.isSafeInteger(s.chargesCents + s.paymentsCents + s.creditsCents + s.adjustmentsCents)) {
      throw new ContractError("ledger total exceeds safe integer range");
    }
  }
  return { ...s, balanceCents: s.chargesCents + s.adjustmentsCents - s.paymentsCents - s.creditsCents };
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Integer cents -> "$1,234.50"; null/invalid -> "—" (never "$0.00"). */
export function formatCents(c: number | null | undefined): string {
  return typeof c === "number" && Number.isSafeInteger(c) ? USD.format(c / 100) : "—";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** YYYY-MM-DD -> "Mar 5, 2026" using the literal parts, so no time-zone shift is possible. */
export function formatDateOnly(d: string | null | undefined): string {
  const ok = parseDateOnly(d);
  if (!ok) return "—";
  const [y, m, day] = ok.split("-").map(Number);
  return `${MONTHS[m - 1]} ${day}, ${y}`;
}
