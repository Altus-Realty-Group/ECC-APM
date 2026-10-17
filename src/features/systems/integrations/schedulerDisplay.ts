// Scheduler display truth for the mounted Integrations Health panel.
// Uses only fields actually emitted by the producers (server/routes/syncHealth.ts
// and server/routes/admin/sync.ts). Does not invent defaults or next-run dates.
// Source/test fixtures are not application defaults.

export const NOT_REPORTED = "Not reported";

export type SchedulerDisplay = {
  statusLabel: "Enabled" | "Disabled" | typeof NOT_REPORTED;
  statusKind: "success" | "error" | "neutral";
  intervalLabel: string;
  nextRunLabel: string;
  nightlyLabel: string;
  lastRunLabel: string | null;
};

/** Positive finite number. Rejects 0, negative, NaN, Infinity, non-numbers. */
export function validPositiveFinite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Hour in 0–23. Preserves 0 and "0". Rejects outside range and non-numeric. */
export function validHourUtc(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  let n: number;
  if (typeof value === "number") n = value;
  else if (typeof value === "string" && /^\d+$/.test(value.trim())) n = Number(value.trim());
  else return null;
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n;
}

/** Parse an ISO-like date only when it is a real finite timestamp. Never invent one. */
export function validTimestamp(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

/**
 * Build display labels from a preferred source and an optional fallback source.
 * If the preferred source is present and a field is present but malformed,
 * do not fall through to the older source — show Not reported for that field.
 * If preferred is absent, fall back only for fields the fallback actually provides.
 * Query failure/denied must be handled by the caller (pass null sources).
 */
export function schedulerDisplay(input: {
  preferred?: {
    enabled?: unknown;
    intervalMinutes?: unknown;
    nightlyHour?: unknown;
    nextRunAt?: unknown;
    lastRunAt?: unknown;
  } | null;
  fallback?: {
    enabled?: unknown;
    intervalMinutes?: unknown;
    nightlyHour?: unknown;
    nextRunAt?: unknown;
    lastRunAt?: unknown;
  } | null;
}): SchedulerDisplay {
  const pref = input.preferred;
  const fb = input.fallback;
  const usePreferred = pref != null;

  const pick = (key: "enabled" | "intervalMinutes" | "nightlyHour" | "nextRunAt" | "lastRunAt") => {
    if (usePreferred) {
      // Present on preferred (even if null/malformed) blocks fall-through.
      if (pref && Object.prototype.hasOwnProperty.call(pref, key)) return pref[key];
      return fb?.[key];
    }
    return fb?.[key];
  };

  const enabledRaw = pick("enabled");
  let statusLabel: SchedulerDisplay["statusLabel"] = NOT_REPORTED;
  let statusKind: SchedulerDisplay["statusKind"] = "neutral";
  if (enabledRaw === true) {
    statusLabel = "Enabled";
    statusKind = "success";
  } else if (enabledRaw === false) {
    statusLabel = "Disabled";
    statusKind = "error";
  }

  const interval = validPositiveFinite(pick("intervalMinutes"));
  const intervalLabel = interval != null ? `${interval} minutes` : NOT_REPORTED;

  const hour = validHourUtc(pick("nightlyHour"));
  const nightlyLabel = hour != null ? formatHour(hour) : NOT_REPORTED;

  const next = validTimestamp(pick("nextRunAt"));
  const nextRunLabel = next ? next.toISOString() : NOT_REPORTED;

  const last = validTimestamp(pick("lastRunAt"));
  const lastRunLabel = last ? last.toISOString() : null;

  return { statusLabel, statusKind, intervalLabel, nextRunLabel, nightlyLabel, lastRunLabel };
}
