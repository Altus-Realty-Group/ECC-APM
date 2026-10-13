// Pure helpers for honest data states. A missing value is null (unknown), never 0.

/** Data older than this is flagged as stale on operator surfaces. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** A source time this far ahead of the local clock is treated as invalid, not as "fresh". */
export const FUTURE_SKEW_MS = 5 * 60 * 1000;

export type ErrorKind = "denied" | "error";

/** Response arrived but does not match the documented shape or value ranges. Never rendered as data. */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractError";
  }
}

export const isContractError = (err: unknown): err is ContractError => err instanceof ContractError;

/** 401/403 are access problems, not outages; everything else is a failure to load. */
export function errorKind(err: unknown): ErrorKind {
  const status = (err as { status?: unknown } | null)?.status;
  if (status === 401 || status === 403) return "denied";
  const m = /\bHTTP (\d{3})\b/.exec(String((err as { message?: unknown } | null)?.message ?? ""));
  return m && (m[1] === "401" || m[1] === "403") ? "denied" : "error";
}

/** Finite number or numeric string -> number; anything else (null, "", NaN, objects) -> null. */
export function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Valid ISO-ish timestamp -> normalized ISO string, else null. */
export function toIsoOrNull(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const t = new Date(v as string).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export type TimestampProblem = "invalid" | "future";

/**
 * Classify a source-reported timestamp. Absent -> no value and no problem (freshness simply unknown).
 * Unparseable -> "invalid". More than FUTURE_SKEW_MS ahead of `now` -> "future". Neither is ever fresh.
 */
export function classifyTimestamp(
  v: unknown,
  now: number = Date.now(),
): { iso: string | null; problem: TimestampProblem | null } {
  if (v === undefined || v === null || v === "") return { iso: null, problem: null };
  if (typeof v !== "string") return { iso: null, problem: "invalid" };
  const iso = toIsoOrNull(v);
  if (!iso) return { iso: null, problem: "invalid" };
  if (new Date(iso).getTime() - now > FUTURE_SKEW_MS) return { iso: null, problem: "future" };
  return { iso, problem: null };
}

export type Freshness = "fresh" | "stale" | "unknown" | "future" | "invalid";

export function freshness(
  iso: string | null | undefined,
  problem: TimestampProblem | null | undefined,
  now: number = Date.now(),
  maxAgeMs = STALE_AFTER_MS,
): Freshness {
  if (problem) return problem;
  if (!iso) return "unknown";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "invalid";
  if (t - now > FUTURE_SKEW_MS) return "future";
  return now - t > maxAgeMs ? "stale" : "fresh";
}

/** true = stale, false = fresh, null = unknown/future/invalid (never reported as fresh). */
export function isStale(iso: string | null | undefined, now: number = Date.now(), maxAgeMs = STALE_AFTER_MS): boolean | null {
  const f = freshness(iso, null, now, maxAgeMs);
  return f === "stale" ? true : f === "fresh" ? false : null;
}
