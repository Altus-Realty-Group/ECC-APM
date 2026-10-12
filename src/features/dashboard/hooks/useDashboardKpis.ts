import { useQuery } from "@tanstack/react-query";

export type DashboardKpis = {
  propertiesTotal: number;   // expected live count
  unitsTotal: number;        // expected live count
  occupancyRate: number;     // 0..1 fraction
  revenue30dCents?: number;  // optional cents
  series?: { date: string; occupancy: number }[]; // 0..1
};

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/dashboard/kpi/summary", { signal });
      if (!res.ok) throw new Error(`Failed KPIs: ${res.status}`);
      const data = (await res.json()) as DashboardKpis;
      return data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
