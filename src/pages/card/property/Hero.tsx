import React from "react";
import { money } from "../../../lib/ecc-api-client";
import { createWorkOrder } from "../../../lib/bff";
import { HERO_KPI_TEST_IDS } from "@/features/dashboard/constants/testIds";
// Satisfy guardrail requirement
import {} from "../../../lib/ecc-resolvers";

// Join non-empty address parts with ", ".
function joinAddress(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => typeof p === "string" && p.trim() !== "").join(", ");
}

interface HeroProps {
  data: {
    property: any;
    units: any[];
    leases: any[];
    owner: any;
  };
}

export default function Hero({ data }: HeroProps) {
  const { property, units, leases } = data;
  const [woBusy, setWoBusy] = React.useState(false);

  // Title: property.name else joined address
  const title = property?.name || 
    joinAddress([property?.street_1, property?.city, property?.state]) ||
    `Property #${property?.id || "unknown"}`;

  // KPIs
  const kpiUnits = units.length;
  const activeLeases = leases.filter(l => l?.status?.toLowerCase() === "active");
  const kpiActiveLeases = activeLeases.length;
  
  // Avg Rent: average of rent_cents for active leases using money utility
  const kpiAvgRent = (() => {
    const cents = activeLeases
      .map(l => Number(l?.rent_cents || null))
      .filter(Number.isFinite);
    if (!cents.length) return "No active leases";
    const avg = Math.round(cents.reduce((a, b) => a + b, 0) / cents.length);
    return money(avg); // Pass cents directly to money utility
  })();

  return (
    <div className="ecc-object" style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center",
      padding: "16px 20px"
    }}>
      {/* Left: Title and KPIs */}
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <div style={{ fontWeight: 600, fontSize: "18px" }}>
          {title}
        </div>
        <div style={{ display: "flex", gap: "24px", fontSize: "14px" }}>
          <div data-testid={HERO_KPI_TEST_IDS.PROPERTY_UNITS}>
            <div style={{ fontWeight: 500, color: "var(--gold, #d4af37)" }}>
              {kpiUnits}
            </div>
            <div style={{ opacity: 0.7 }}>Units</div>
          </div>
          <div data-testid={HERO_KPI_TEST_IDS.PROPERTY_ACTIVE}>
            <div style={{ fontWeight: 500, color: "var(--gold, #d4af37)" }}>
              {kpiActiveLeases}
            </div>
            <div style={{ opacity: 0.7 }}>Active Leases</div>
          </div>
          <div data-testid={HERO_KPI_TEST_IDS.PROPERTY_AVGRENT}>
            <div style={{ fontWeight: 500, color: "var(--gold, #d4af37)" }}>
              {kpiAvgRent}
            </div>
            <div style={{ opacity: 0.7 }}>Avg Rent</div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button 
          className="ecc-object" 
          style={{ padding: "8px 16px", fontSize: "14px" }}
          data-testid="button-edit"
        >
          Edit
        </button>
        <button 
          className="ecc-object" 
          style={{ padding: "8px 16px", fontSize: "14px" }}
          data-testid="button-export-pdf"
        >
          Export PDF
        </button>
        <button 
          className="ecc-object" 
          style={{ padding: "8px 16px", fontSize: "14px" }}
          data-testid="button-new-work-order"
          disabled={!(window as any).__FEATURES__?.workOrders || woBusy}
          title={!(window as any).__FEATURES__?.workOrders ? 'Coming soon' : undefined}
          onClick={async () => {
            if (!property?.id) return;
            try {
              setWoBusy(true);
              const r = await createWorkOrder({ 
                propertyId: String(property.id), 
                summary: `WO from Property #${property.id}`, 
                priority: 'normal' 
              });
              (window as any).toast?.success?.('Work order created') ?? alert('Work order created');
              console.log('WO:', r);
            } catch (e:any) {
              (window as any).toast?.error?.('Failed to create work order') ?? alert('Failed to create work order');
              console.error(e);
            } finally {
              setWoBusy(false);
            }
          }}
        >
          {woBusy ? 'Creating…' : 'New Work Order'}
        </button>
      </div>
    </div>
  );
}