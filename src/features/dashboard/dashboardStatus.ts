import { coverage, missingMetrics, type Coverage, type DashboardKpis } from "@/features/dashboard/kpiAdapter";
import { errorKind, isStale, type ErrorKind } from "@/lib/dataState";

export type DashboardMode = "loading" | "failed" | "empty" | "ready";

export type DashboardStatus = {
  mode: DashboardMode;
  /** Only when mode === "failed": access problem vs. load failure. */
  failure: ErrorKind | null;
  /** A refresh failed but earlier figures are still on screen. */
  refreshFailed: ErrorKind | null;
  coverage: Coverage;
  missing: string[];
  /** true = stale, false = fresh, null = update time not reported. */
  stale: boolean | null;
};

type Input = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: DashboardKpis | undefined;
  now?: number;
};

/** Single decision point for which dashboard state to show. Pure; no React. */
export function deriveDashboardStatus({ isLoading, isError, error, data, now }: Input): DashboardStatus {
  const base = { failure: null, refreshFailed: null, coverage: "none" as Coverage, missing: [] as string[], stale: null };
  if (isLoading) return { ...base, mode: "loading" };
  if (isError && !data) return { ...base, mode: "failed", failure: errorKind(error) };
  if (!data) return { ...base, mode: "empty" };
  return {
    mode: "ready",
    failure: null,
    refreshFailed: isError ? errorKind(error) : null,
    coverage: coverage(data),
    missing: missingMetrics(data),
    stale: isStale(data.lastUpdated, now),
  };
}
