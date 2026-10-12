import React from "react";
import { formatCurrencyFromCents as moneyCents } from "../../lib/format";

export type LedgerEntry = {
  id: string | number;
  ts: string;                 // ISO datetime
  type: "charge" | "payment" | "credit" | "adjustment";
  memo?: string | null;
  amount_cents: number;       // positive numbers; sign handled by type
  balance_cents?: number | null; // optional running balance if provided by API
};

export default function LedgerTable({
  entries,
  isLoading,
  emptyText = "No transactions found."
}: {
  entries: LedgerEntry[];
  isLoading?: boolean;
  emptyText?: string;
}) {
  if (isLoading) {
    return (
      <div className="ecc-object" style={{ padding: 12 }}>
        <div style={{ opacity: .8 }}>Loading transactions…</div>
      </div>
    );
  }
  if (!entries?.length) {
    return (
      <div className="ecc-object" style={{ padding: 12 }}>
        <div style={{ opacity: .8 }}>{emptyText}</div>
      </div>
    );
  }
  return (
    <div className="ecc-object" style={{ padding: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "160px 140px 1fr 140px 140px", gap: 0, fontWeight: 700, padding: "10px 12px", borderBottom: "1px solid var(--ecc-object-border)" }}>
        <div>Date/Time</div><div>Type</div><div>Memo</div><div>Amount</div><div>Balance</div>
      </div>
      <div style={{ maxHeight: 360, overflow: "auto" }}>
        {entries.map((e) => {
          const sign = e.type === "payment" || e.type === "credit" ? -1 : 1;
          const amount = moneyCents(sign * Math.abs(e.amount_cents));
          const ts = new Date(e.ts).toLocaleString();
          return (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "160px 140px 1fr 140px 140px", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ opacity: .9 }}>{ts}</div>
              <div style={{ textTransform: "none" }}>{e.type}</div>
              <div style={{ opacity: .9 }}>{e.memo ?? "—"}</div>
              <div style={{ fontWeight: 700 }}>{amount}</div>
              <div style={{ opacity: .9 }}>{e.balance_cents == null ? "—" : moneyCents(e.balance_cents)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}