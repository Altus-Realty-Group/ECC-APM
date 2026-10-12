import { useQuery } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/http";
import { normalizeDashboardKpis, type DashboardKpis } from "@/features/dashboard/kpiAdapter";

export type { DashboardKpis };

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async ({ signal }): Promise<DashboardKpis> =>
      normalizeDashboardKpis(await fetchJSON<unknown>("/api/dashboard/kpi/summary", { signal })),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
