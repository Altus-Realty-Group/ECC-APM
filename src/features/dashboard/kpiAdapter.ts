import { toIsoOrNull, toNumberOrNull } from "@/lib/dataState";

/**
 * Normalized dashboard summary. Every scalar is null when the source did not report it;
 * null means "unknown", never zero. Occupancy is a 0..1 fraction; revenue is integer cents.
 */
export type DashboardKpis = {
  propertiesTotal: number | null;
  unitsTotal: number | null;
  occupancyRate: number | null;
  revenue30dCents: number | null;
  series: { date: string; occupancy: number }[];
  /** ISO timestamp when the source says the figures were produced; null = not reported. */
  lastUpdated: string | null;
};

export const KPI_LABELS: Record<"propertiesTotal" | "unitsTotal" | "occupancyRate" | "revenue30dCents", string> = {
  propertiesTotal: "Properties",
  unitsTotal: "Units",
  occupancyRate: "Occupancy",
  revenue30dCents: "Revenue (30d)",
};

const SCALAR_KEYS = Object.keys(KPI_LABELS) as Array<keyof typeof KPI_LABELS>;

/** Accepts the raw object or a { data: {...} } envelope; anything else yields all-null. */
export function normalizeDashboardKpis(raw: unknown): DashboardKpis {
  let src: any = raw;
  if (src && typeof src === "object" && !Array.isArray(src) && src.data && typeof src.data === "object" && !Array.isArray(src.data)) {
    src = src.data;
  }
  if (!src || typeof src !== "object" || Array.isArray(src)) src = {};

  const series = (Array.isArray(src.series) ? src.series : [])
    .map((p: any) => ({ date: typeof p?.date === "string" ? p.date : null, occupancy: toNumberOrNull(p?.occupancy) }))
    .filter((p: { date: string | null; occupancy: number | null }): p is { date: string; occupancy: number } =>
      p.date !== null && p.occupancy !== null);

  return {
    propertiesTotal: toNumberOrNull(src.propertiesTotal),
    unitsTotal: toNumberOrNull(src.unitsTotal),
    occupancyRate: toNumberOrNull(src.occupancyRate),
    revenue30dCents: toNumberOrNull(src.revenue30dCents),
    series,
    lastUpdated: toIsoOrNull(src.lastUpdated ?? src.last_updated ?? src.asOf ?? src.updatedAt),
  };
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
