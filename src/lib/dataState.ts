// Pure helpers for honest data states. A missing value is null (unknown), never 0.

/** Data older than this is flagged as stale on operator surfaces. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export type ErrorKind = "denied" | "error";

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

/** true = stale, false = fresh, null = freshness unknown (do not claim either). */
export function isStale(iso: string | null | undefined, now: number = Date.now(), maxAgeMs = STALE_AFTER_MS): boolean | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return now - t > maxAgeMs;
}
