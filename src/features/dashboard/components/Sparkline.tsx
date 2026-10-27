import React from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, XAxis, CartesianGrid } from "recharts";

type Pt = { date: string; value: number };

export function Sparkline({ data }: { data?: Pt[] }) {
  const safe = Array.isArray(data) ? data.filter((p) => Number.isFinite(p.value)) : [];
  return (
    <div className="ecc-kpi-card" data-testid="occupancy-trend">
      <div className="ecc-kpi-card__label">Occupancy trend</div>
      {safe.length === 0 ? (
        <div className="ecc-kpi-card__note">No trend data reported for this period.</div>
      ) : (
        <div style={{ width: "100%", height: 210 }}>
          <ResponsiveContainer>
            <LineChart data={safe} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#35352e" strokeDasharray="3 5" />
              <XAxis dataKey="date" tick={{ fill: "#c6c6bc", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis domain={[0, 100]} width={42} ticks={[0, 25, 50, 75, 100]} tickFormatter={value => `${value}%`} tick={{ fill: "#c6c6bc", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Line type="monotone" dataKey="value" dot={{ r: 3, fill: "#d4af37" }} stroke="#d4af37" strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
