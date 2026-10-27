import { KPI } from "@/components/cardkit/KPI";
import { KPIRow } from "@/components/cardkit/KPIRow";
import { formatCurrencyFromCents, formatNumber, formatPercent } from "@/lib/format";

export default function HeroBlock({ data }: { data: any; isLoading?: boolean }) {
  const t = data?.tenant ?? data;

  const leases = Array.isArray(data?.leases) ? data.leases : [];
  const loaded = data?.activeLease ? [data.activeLease, ...leases.filter((lease: any) => lease.id !== data.activeLease.id)] : leases;
  const activeLeases = Array.isArray(data?.leases) || data?.activeLease
    ? new Set(loaded.filter((lease: any) => String(lease?.status).toUpperCase() === "ACTIVE").map((lease: any) => lease.id)).size
    : null;

  // Missing values render as an em dash, never as 0.
  return (
    <KPIRow>
      <KPI data-testid="kpi-active-leases"    label="Loaded Active Leases"    value={formatNumber(activeLeases)} />
      <KPI data-testid="kpi-current-balance"  label="Current Balance"  value={formatCurrencyFromCents(t?.current_balance_cents ?? t?.balance_cents)} />
      <KPI data-testid="kpi-on-time-rate"     label="On-Time Rate"     value={formatPercent(t?.on_time_rate ?? t?.onTimeRate, 0, "percent")} />
      <KPI data-testid="kpi-open-workorders"  label="Open Workorders"  value={formatNumber(t?.open_workorders ?? t?.openWorkorders)} />
    </KPIRow>
  );
}
