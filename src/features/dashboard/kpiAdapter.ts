import { ContractError, classifyTimestamp, type TimestampProblem } from "@/lib/dataState";

/**
 * Validated dashboard summary. Every scalar is null when the source did not report it; null means
 * "unknown", never zero. A value that IS present but invalid is a contract error, not data.
 *
 * Declared contract (the frontend's own documented type; no server handler for this endpoint exists in
 * this repository, so it cannot be verified further here):
 *   propertiesTotal, unitsTotal   non-negative integer counts
 *   occupancyRate                 fraction in [0, 1]
 *   revenue30dCents               non-negative integer cents
 *   series[]                      { date: parseable date string, occupancy: fraction in [0, 1] }
 *   lastUpdated                   ISO timestamp (optional; absent = freshness unknown)
 */
export type DashboardKpis = {
  propertiesTotal: number | null;
  unitsTotal: number | null;
  occupancyRate: number | null;
  revenue30dCents: number | null;
  series: { date: string; occupancy: number }[];
  /** ISO timestamp when the source says the figures were produced; null = absent or unusable. */
  lastUpdated: string | null;
  /** Present when the source sent a timestamp that is unparseable or in the future. */
  lastUpdatedProblem: TimestampProblem | null;
};

export const KPI_LABELS: Record<"propertiesTotal" | "unitsTotal" | "occupancyRate" | "revenue30dCents", string> = {
  propertiesTotal: "Properties",
  unitsTotal: "Units",
  occupancyRate: "Occupancy",
  revenue30dCents: "Revenue (30d)",
};

const SCALAR_KEYS = Object.keys(KPI_LABELS) as Array<keyof typeof KPI_LABELS>;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const describe = (v: unknown) => (typeof v === "string" ? JSON.stringify(v) : String(v));

function count(src: Record<string, unknown>, key: string): number | null {
  const v = src[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) {
    throw new ContractError(`${key} must be a non-negative integer (got ${describe(v)})`);
  }
  return v;
}

function fraction(v: unknown, label: string): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
    throw new ContractError(`${label} must be a fraction between 0 and 1 (got ${describe(v)})`);
  }
  return v;
}

/**
 * Accepts the raw object or a { data: {...} } envelope. Anything else, and any present-but-invalid
 * field, throws ContractError so the query lands in its error state instead of "no figures".
 */
export function normalizeDashboardKpis(raw: unknown, now: number = Date.now()): DashboardKpis {
  if (!isPlainObject(raw)) throw new ContractError("Dashboard summary must be a JSON object");
  let src: Record<string, unknown> = raw;
  if ("data" in raw) {
    if (!isPlainObject(raw.data)) throw new ContractError("Dashboard summary envelope must contain a data object");
    src = raw.data;
  }

  const propertiesTotal = count(src, "propertiesTotal");
  const unitsTotal = count(src, "unitsTotal");
  const occupancyRate = src.occupancyRate === undefined || src.occupancyRate === null ? null : fraction(src.occupancyRate, "occupancyRate");
  const revenue30dCents = count(src, "revenue30dCents");

  const seriesIn = src.series;
  if (seriesIn !== undefined && seriesIn !== null && !Array.isArray(seriesIn)) {
    throw new ContractError("series must be an array");
  }
  const rawSeries: unknown[] = Array.isArray(seriesIn) ? seriesIn : [];
  const series = rawSeries.map((p, i) => {
    if (!isPlainObject(p)) throw new ContractError(`series[${i}] must be an object`);
    if (typeof p.date !== "string" || p.date.trim() === "" || !Number.isFinite(Date.parse(p.date))) {
      throw new ContractError(`series[${i}].date must be a valid date string (got ${describe(p.date)})`);
    }
    return { date: p.date, occupancy: fraction(p.occupancy, `series[${i}].occupancy`) };
  });

  const { iso, problem } = classifyTimestamp(src.lastUpdated, now);
  return { propertiesTotal, unitsTotal, occupancyRate, revenue30dCents, series, lastUpdated: iso, lastUpdatedProblem: problem };
}

/** Labels of headline metrics the source did not report. */
export function missingMetrics(k: DashboardKpis): string[] {
  return SCALAR_KEYS.filter((key) => k[key] === null).map((key) => KPI_LABELS[key]);
}

export type Coverage = "none" | "partial" | "full";
export function coverage(k: DashboardKpis): Coverage {
  const missing = missingMetrics(k).length;
  return missing === SCALAR_KEYS.length ? "none" : missing === 0 ? "full" : "partial";
}
