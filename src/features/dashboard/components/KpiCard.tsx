import React from "react";
import { formatCurrencyFromCents, formatNumber, formatPercent, BLANK } from "@/lib/format";

type Format = "number" | "percent" | "currencyCents";

/** A null/undefined value renders as an em dash with "Not reported" — never as 0. */
export function KpiCard({
  label,
  value,
  decimals = 0,
  format = "number",
  testId,
}: { label: string; value?: number | null; decimals?: number; format?: Format; testId: string }) {
  const missing = value === null || value === undefined || !Number.isFinite(value);
  const text = missing
    ? BLANK
    : format === "percent"
      ? formatPercent(value, decimals, "fraction")
      : format === "currencyCents"
        ? formatCurrencyFromCents(value)
        : formatNumber(value, decimals);
  return (
    <div className="ecc-kpi-card" data-testid={testId} data-missing={missing ? "true" : undefined}>
      <div className="ecc-kpi-card__label">{label}</div>
      <div className="ecc-kpi-card__value">{text}</div>
      {missing ? <div className="ecc-kpi-card__note">Not reported</div> : null}
    </div>
  );
}
