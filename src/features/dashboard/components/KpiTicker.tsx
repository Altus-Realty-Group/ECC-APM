// Genesis Grade KPI Ticker - Portfolio Health Dashboard

import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';

type ChartPoint = { name: string; value: number; color?: string };

const DASH = '—';

function pct(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : DASH;
}

function count(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : DASH;
}

function DonutChart({ data }: { data: ChartPoint[] }) {
  const total = data.reduce((sum, p) => sum + (Number.isFinite(p.value) ? Math.max(0, p.value) : 0), 0);
  if (total <= 0) return null;
  const r = 15.9155; // circumference ~= 100
  let offset = 25; // start at 12 o'clock
  return (
    <svg width="48" height="48" viewBox="0 0 42 42" aria-hidden="true">
      {data.map((p) => {
        const share = (Math.max(0, p.value) / total) * 100;
        const el = (
          <circle
            key={p.name}
            cx="21"
            cy="21"
            r={r}
            fill="none"
            stroke={p.color ?? 'var(--line)'}
            strokeWidth="5"
            strokeDasharray={`${share} ${100 - share}`}
            strokeDashoffset={offset}
          />
        );
        offset -= share;
        return el;
      })}
    </svg>
  );
}

function SparklineChart({ data }: { data: ChartPoint[] }) {
  const pts = data.filter((p) => Number.isFinite(p.value));
  if (pts.length < 2) return null;
  const w = 80;
  const h = 32;
  const max = Math.max(...pts.map((p) => p.value));
  const min = Math.min(...pts.map((p) => p.value));
  const span = max - min || 1;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.value - min) / span) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--altus-gold)" strokeWidth="2" />
    </svg>
  );
}

function TickerCard({
  title,
  value,
  metric,
  isLoading,
  chart,
}: {
  title: string;
  value: string;
  metric?: string;
  isLoading?: boolean;
  chart?: React.ReactNode;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__content">
        <div className="kpi-card__text">
          <div className="kpi-card__title">{title}</div>
          <div className="kpi-card__value">{isLoading ? DASH : value}</div>
          {metric ? <div className="kpi-card__metric">{metric}</div> : null}
        </div>
        {!isLoading && chart ? <div className="kpi-card__chart">{chart}</div> : null}
      </div>
    </div>
  );
}

export function KpiTicker() {
  const { data, kpiData, isLoading, occupancyChartData, collectionsSparklineData } = useDashboardData();
  // Unknown source metrics stay unavailable; confirmed zero remains zero.
  const missing = isLoading || !data;
  const rentReady = kpiData.rentReady;

  return (
    <div className="kpi-ticker">
      <TickerCard
        title="Occupancy"
        value={pct(kpiData.occupancy)}
        isLoading={missing}
        chart={<DonutChart data={occupancyChartData} />}
      />

      <TickerCard
        title="Rent Ready"
        value={`${count(rentReady?.ready)} of ${count(rentReady?.vacant)}`}
        metric="vacant units"
        isLoading={missing}
      />

      <TickerCard
        title="Collections MTD"
        value={pct(kpiData.collections)}
        isLoading={missing}
        chart={<SparklineChart data={collectionsSparklineData} />}
      />

      <TickerCard
        title="Critical WOs"
        value={count(kpiData.criticalWOs)}
        metric="open"
        isLoading={missing}
      />
    </div>
  );
}
