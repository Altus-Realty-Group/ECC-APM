import { coverage, missingMetrics, type Coverage, type DashboardKpis } from "@/features/dashboard/kpiAdapter";
import { errorKind, freshness, isContractError, type ErrorKind, type Freshness } from "@/lib/dataState";

export type DashboardMode = "loading" | "failed" | "empty" | "ready";

export type DashboardStatus = {
  mode: DashboardMode;
  /** Only when mode === "failed": access problem vs. load failure. */
  failure: ErrorKind | null;
  /** Only when mode === "failed": the response arrived but broke the documented contract. */
  contractViolation: boolean;
  /** A transient refresh failed but earlier figures (same session) are still on screen. */
  refreshFailed: ErrorKind | null;
  coverage: Coverage;
  missing: string[];
  freshness: Freshness;
};

type Input = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: DashboardKpis | undefined;
  now?: number;
};

/**
 * Single decision point for which dashboard state to show. Pure; no React.
 * A DENIED refresh is never "ready": cached figures are suppressed even if the cache still holds them.
 */
export function deriveDashboardStatus({ isLoading, isError, error, data, now }: Input): DashboardStatus {
  const base = {
    failure: null,
    contractViolation: false,
    refreshFailed: null,
    coverage: "none" as Coverage,
    missing: [] as string[],
    freshness: "unknown" as Freshness,
  };
  const denied = isError && errorKind(error) === "denied";
  if (denied) return { ...base, mode: "failed", failure: "denied" };
  if (isLoading) return { ...base, mode: "loading" };
  if (isError && !data) return { ...base, mode: "failed", failure: "error", contractViolation: isContractError(error) };
  if (!data) return { ...base, mode: "empty" };
  return {
    mode: "ready",
    failure: null,
    contractViolation: false,
    refreshFailed: isError ? "error" : null,
    coverage: coverage(data),
    missing: missingMetrics(data),
    freshness: freshness(data.lastUpdated, data.lastUpdatedProblem, now),
  };
}
