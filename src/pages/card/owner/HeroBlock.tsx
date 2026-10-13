import { KPI } from "@/components/cardkit/KPI";
import { KPIRow } from "@/components/cardkit/KPIRow";
import { formatCurrencyFromCents, formatNumber, formatPercent } from "@/lib/format";

export default function HeroBlock({ data }: { data: any; isLoading?: boolean }) {
  const o = data?.owner ?? data;

  // Missing values render as an em dash, never as 0.
  return (
    <KPIRow>
      <KPI data-testid="kpi-portfolio-units" label="Portfolio Units" value={formatNumber(o?.portfolio_units ?? o?.unitCount)} />
      <KPI data-testid="kpi-active-leases"   label="Active Leases"    value={formatNumber(o?.active_leases ?? o?.activeLeases)} />
      <KPI data-testid="kpi-occupancy"       label="Occupancy"        value={formatPercent(o?.occupancy_pct ?? o?.occupancyPct, 0, "percent")} />
      <KPI data-testid="kpi-avg-rent"        label="Avg. Rent"        value={formatCurrencyFromCents(o?.avg_rent_cents ?? o?.avgRent_cents)} />
    </KPIRow>
  );
}
