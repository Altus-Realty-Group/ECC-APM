import React from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, XAxis } from "recharts";

type Pt = { date: string; value: number };

export function Sparkline({ data }: { data?: Pt[] }) {
  const safe = Array.isArray(data) ? data.filter((p) => Number.isFinite(p.value)) : [];
  return (
    <div className="ecc-kpi-card" data-testid="occupancy-trend">
      <div className="ecc-kpi-card__label">Occupancy trend</div>
      {safe.length === 0 ? (
        <div className="ecc-kpi-card__note">No trend data reported for this period.</div>
      ) : (
        <div style={{ width: "100%", height: 120 }}>
          <ResponsiveContainer>
            <LineChart data={safe}>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Line type="monotone" dataKey="value" dot={false} stroke="#d6b36a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
