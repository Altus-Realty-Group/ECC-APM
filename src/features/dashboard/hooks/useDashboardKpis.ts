import { useQuery } from "@tanstack/react-query";
import { sessionFetchJSON } from "@/lib/sessionScope";
import { normalizeDashboardKpis, type DashboardKpis } from "@/features/dashboard/kpiAdapter";

export type { DashboardKpis };

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async ({ signal }): Promise<DashboardKpis> =>
      normalizeDashboardKpis(await sessionFetchJSON<unknown>("/api/dashboard/kpi/summary", { signal })),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
