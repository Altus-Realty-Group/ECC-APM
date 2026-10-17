// Scheduler display truth for the mounted Integrations Health panel.
// Uses only fields actually emitted by the producers (server/routes/syncHealth.ts
// and server/routes/admin/sync.ts). Does not invent defaults or next-run dates.
// Source/test fixtures are not application defaults.
//
// Next Run is observed only from the stored health status.next_run_at.
// Admin scheduler.nextRun is a calculated estimate (now + interval) and is never
// presented as an observed schedule.

export const NOT_REPORTED = "Not reported";

export type SchedulerDisplay = {
  statusLabel: "Enabled" | "Disabled" | typeof NOT_REPORTED;
  statusKind: "success" | "error" | "neutral";
  intervalLabel: string;
  nextRunLabel: string;
  nightlyLabel: string;
  lastRunLabel: string | null;
};

export type QueryReadFlags = {
  isPending?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  denied?: boolean;
};

/** True when a read is not a settled success. Cached data must not be shown. */
export function readIsUnsettled(flags: QueryReadFlags | null | undefined): boolean {
  if (!flags) return true;
  return !!(flags.isPending || flags.isFetching || flags.isError || flags.denied);
}

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

/**
 * Parse a real timezone-qualified calendar timestamp.
 * Requires a finite Date and an explicit timezone designator (Z or ±hh:mm).
 * Never invents a timestamp.
 */
export function validTimestamp(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(s)) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

export type SchedulerSource = {
  enabled?: unknown;
  intervalMinutes?: unknown;
  nightlyHour?: unknown;
  nextRunAt?: unknown;
  lastRunAt?: unknown;
} | null;

/**
 * Build display labels.
 * - preferred: admin scheduler fields when that read is settled success.
 * - fallback: health fields when that read is settled success.
 * - observedNextRun: ONLY the stored health status.next_run_at. Admin nextRun is ignored.
 * A present but null/malformed preferred field does not fall through to fallback.
 * Unsettled reads must be passed as null by the caller.
 */
export function schedulerDisplay(input: {
  preferred?: SchedulerSource;
  fallback?: SchedulerSource;
  observedNextRun?: unknown;
}): SchedulerDisplay {
  const pref = input.preferred ?? null;
  const fb = input.fallback ?? null;
  const usePreferred = pref != null;

  const pick = (key: "enabled" | "intervalMinutes" | "nightlyHour" | "lastRunAt") => {
    if (usePreferred) {
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

  // Observed next run comes only from the stored health field, never from an estimate.
  const next = validTimestamp(input.observedNextRun);
  const nextRunLabel = next ? next.toISOString() : NOT_REPORTED;

  const last = validTimestamp(pick("lastRunAt"));
  const lastRunLabel = last ? last.toISOString() : null;

  return { statusLabel, statusKind, intervalLabel, nextRunLabel, nightlyLabel, lastRunLabel };
}

/**
 * Adapter from mounted query state to display input.
 * Suppresses cached data whenever a read is pending, fetching, errored, or denied.
 * Never forwards admin nextRun as an observed schedule.
 * Credentials are not part of this adapter; the caller owns scope isolation.
 */
export function schedulerFromQueries(input: {
  adminFlags: QueryReadFlags;
  adminData: { scheduler?: Record<string, unknown> | null } | null | undefined;
  healthFlags: QueryReadFlags;
  healthData: {
    enabled?: unknown;
    intervalMinutes?: unknown;
    nightlyFullHourUtc?: unknown;
    status?: { next_run_at?: unknown } | null;
  } | null | undefined;
}): ReturnType<typeof schedulerDisplay> | null {
  if (readIsUnsettled(input.healthFlags)) return null;

  const preferred = readIsUnsettled(input.adminFlags) || !input.adminData?.scheduler
    ? null
    : {
        enabled: input.adminData.scheduler.enabled,
        intervalMinutes: input.adminData.scheduler.intervalMinutes,
        nightlyHour: input.adminData.scheduler.fullSyncHourUTC ?? input.adminData.scheduler.nightlyFullHourUtc,
        // nextRun intentionally omitted — it is a calculated estimate.
        lastRunAt: input.adminData.scheduler.lastRun,
      };

  const fallback = input.healthData
    ? {
        enabled: input.healthData.enabled,
        intervalMinutes: input.healthData.intervalMinutes,
        nightlyHour: input.healthData.nightlyFullHourUtc,
      }
    : null;

  return schedulerDisplay({
    preferred,
    fallback,
    observedNextRun: input.healthData?.status?.next_run_at,
  });
}
