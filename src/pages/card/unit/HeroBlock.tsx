import { KPI } from "@/components/cardkit/KPI";
import { KPIRow } from "@/components/cardkit/KPIRow";
import { BLANK, formatCurrencyFromCents, formatNumber } from "@/lib/format";

export default function HeroBlock({ data }: { data: any; isLoading?: boolean }) {
  // Tiny helper identical to the other cards
  const safe = <T,>(v: T | null | undefined, d: T) => (v ?? d);

  // Accept either data.unit or data itself
  const unit = data?.unit ?? data;

  const hasBedsBaths = typeof unit?.beds === "number" && typeof unit?.baths === "number";
  const bedsBaths = hasBedsBaths ? `${unit.beds}bd/${unit.baths}ba` : BLANK;

  return (
    <KPIRow>
      {/* REQUIRED literal test-ids for guardrail */}
      <KPI data-testid="kpi-lease-status" label="Lease Status" value={safe(unit?.status, BLANK)} />
      <KPI data-testid="kpi-rent" label="Rent" value={formatCurrencyFromCents(unit?.rent_cents)} />
      <KPI data-testid="kpi-bedbath" label="Beds/Baths" value={bedsBaths} />
      <KPI data-testid="kpi-sqft" label="Sq Ft" value={formatNumber(unit?.sq_ft ?? unit?.sqft)} />
    </KPIRow>
  );
}
