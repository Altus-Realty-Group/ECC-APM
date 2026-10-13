import React, { useMemo } from "react";
import { formatCurrencyFromCents as moneyCents } from "../../lib/format";
import type { Lease, Tenant } from "../../lib/ecc-contract";

/** Read-only summary. Does NOT guess. If you lack balances, it renders placeholders. */
export default function DelinquencySummary({
  leases,
  tenants,
  balances
}: {
  leases: Lease[];
  tenants: Tenant[];
  balances?: Record<number, number> | null; // tenantId -> balance_cents (optional)
}) {
  const counts = useMemo(() => {
    if (!balances) return { delinquent: 0, current: tenants.length, totalDue: 0 };
    let delinquent = 0, totalDue = 0;
    for (const t of tenants) {
      const b = balances[t.id] ?? 0;
      if (b > 0) { delinquent++; totalDue += b; }
    }
    return { delinquent, current: tenants.length - delinquent, totalDue };
  }, [balances, tenants]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
      <div className="ecc-object" style={{ padding: 12 }}>
        <div className="ecc-label">Tenants Current</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{counts.current}</div>
      </div>
      <div className="ecc-object" style={{ padding: 12 }}>
        <div className="ecc-label">Tenants Delinquent</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{counts.delinquent}</div>
      </div>
      <div className="ecc-object" style={{ padding: 12 }}>
        <div className="ecc-label">Total Past Due</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>
          {balances ? moneyCents(counts.totalDue) : "—"}
        </div>
      </div>
    </div>
  );
}