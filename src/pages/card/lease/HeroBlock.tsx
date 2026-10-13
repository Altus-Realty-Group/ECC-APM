import { KPI } from "@/components/cardkit/KPI";
import { KPIRow } from "@/components/cardkit/KPIRow";
import { BLANK, formatCurrencyFromCents } from "@/lib/format";

export default function HeroBlock({ data }: { data: any; isLoading?: boolean }) {
  const safe = <T,>(v: T | null | undefined, d: T) => (v ?? d);

  // Accept either data.lease or data itself
  const lease = data?.lease ?? data;

  return (
    <KPIRow>
      {/* REQUIRED literal test-ids for guardrail */}
      <KPI data-testid="kpi-lease-status" label="Lease Status" value={safe(lease?.status, BLANK)} />
      <KPI data-testid="kpi-rent" label="Monthly Rent" value={formatCurrencyFromCents(lease?.rent_cents)} />
      <KPI data-testid="kpi-term" label="Term" value={safe(lease?.term ?? lease?.expiration, BLANK)} />
      <KPI data-testid="kpi-balance" label="Balance" value={formatCurrencyFromCents(lease?.balance_cents)} />
    </KPIRow>
  );
}
