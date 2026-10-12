import { KPI } from "@/components/cardkit/KPI";
import { KPIRow } from "@/components/cardkit/KPIRow";
import { formatCurrencyFromCents, formatNumber, formatPercent } from "@/lib/format";

export default function HeroBlock({ data }: { data: any; isLoading?: boolean }) {
  const t = data?.tenant ?? data;

  // Active leases come from the verified leases list on the tenant card.
  const leases: unknown = data?.leases;
  const activeLeases = Array.isArray(leases)
    ? leases.filter((l) => String(l?.status).toUpperCase() === "ACTIVE").length
    : (t?.active_leases ?? t?.activeLeases);

  // Missing values render as an em dash, never as 0.
  return (
    <KPIRow>
      <KPI data-testid="kpi-active-leases"    label="Active Leases"    value={formatNumber(activeLeases)} />
      <KPI data-testid="kpi-current-balance"  label="Current Balance"  value={formatCurrencyFromCents(t?.current_balance_cents ?? t?.balance_cents)} />
      <KPI data-testid="kpi-on-time-rate"     label="On-Time Rate"     value={formatPercent(t?.on_time_rate ?? t?.onTimeRate, 0, "percent")} />
      <KPI data-testid="kpi-open-workorders"  label="Open Workorders"  value={formatNumber(t?.open_workorders ?? t?.openWorkorders)} />
    </KPIRow>
  );
}
