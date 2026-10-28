import React from "react";
import { Link } from "wouter";
import { Building2, CircleDollarSign, ClipboardList, MapPinned, TrendingUp } from "lucide-react";
import { KpiCard } from "./KpiCard";
import type { DashboardKpis } from "../kpiAdapter";

/** The summary contract supplies occupancy only. It does not supply occupied-unit counts. */
export function OccupancyPosition({ rate }: { rate: number | null | undefined }) {
  const valid = typeof rate === "number" && Number.isFinite(rate);
  const percent = valid ? rate * 100 : null;
  return <section className="ecc-overview-panel" aria-labelledby="occupancy-position-title">
    <div className="ecc-overview-panel-heading"><h2 id="occupancy-position-title">Occupancy position</h2><Building2 size={18} aria-hidden="true" /></div>
    {percent === null ? <div className="ecc-panel-unavailable"><p>Occupancy is unavailable.</p><small>No portfolio occupancy has been confirmed.</small></div>
      : <div className="ecc-occupancy-position">
        <svg viewBox="0 0 160 160" role="img" aria-label={`Reported occupancy ${percent.toFixed(1)} percent`}>
          <circle cx="80" cy="80" r="62" fill="none" stroke="#393932" strokeWidth="13" />
          <circle cx="80" cy="80" r="62" fill="none" stroke="#d4af37" strokeWidth="13" pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} transform="rotate(-90 80 80)" />
          <text x="80" y="78" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="600">{percent.toFixed(1)}%</text>
          <text x="80" y="98" textAnchor="middle" fill="#c6c6bc" fontSize="11">occupied</text>
        </svg>
        <div><p><span className="ecc-chart-key" />Reported occupied share</p><strong>{percent.toFixed(1)}%</strong>
          <p className="ecc-chart-source">Reported portfolio occupancy. Review unit records to confirm availability and rent readiness.</p></div>
      </div>}
    <Link className="ecc-panel-link" href="/portfolio/units">Review units <span aria-hidden="true">&#8594;</span></Link>
  </section>;
}

/** Keep expected decision areas visible. Do not resurrect historical randomized cash flow,
 * fixed leasing totals, inferred rent readiness, or manufactured property coordinates. */
export function CommandCenterPanels({ summary }: { summary: DashboardKpis | null }) {
  return <>
    <section className="ecc-operations-snapshot" aria-labelledby="operations-snapshot-title">
      <div className="ecc-dashboard-section-heading"><h2 id="operations-snapshot-title">Operating health</h2><p>Operational figures require their own confirmed records</p></div>
      <div className="ecc-operation-metrics">
        <KpiCard label="Rent-ready vacancies" value={null} testId="operating.rent-ready" />
        <KpiCard label="Collections MTD" value={null} testId="operating.collections" />
        <KpiCard label="Critical work orders" value={null} testId="operating.critical-work" />
      </div>
    </section>
    <div className="ecc-command-panels">
      <section className="ecc-overview-panel" aria-labelledby="cash-flow-title">
        <div className="ecc-overview-panel-heading"><div><p className="ecc-panel-eyebrow">Financial performance</p><h2 id="cash-flow-title">Income, expenses &amp; cash flow</h2></div><CircleDollarSign size={18} aria-hidden="true" /></div>
        <div className="ecc-panel-unavailable"><p>Cash-flow history is unavailable.</p><small>Income receipts and expense records are needed to chart net operating income. Reported 30-day revenue alone cannot establish cash flow.</small></div>
        <Link className="ecc-panel-link" href="/ops/accounting/tenant-ledgers">Review tenant ledgers <span aria-hidden="true">&#8594;</span></Link>
      </section>
      <section className="ecc-overview-panel" aria-labelledby="leasing-pipeline-title">
        <div className="ecc-overview-panel-heading"><div><p className="ecc-panel-eyebrow">Leasing performance</p><h2 id="leasing-pipeline-title">Leasing pipeline</h2></div><TrendingUp size={18} aria-hidden="true" /></div>
        <div className="ecc-leasing-stages" aria-label="Leasing stages; figures not reported">{["Leads", "Tours", "Applications", "Approved", "Signed"].map(stage => <div key={stage}><span>{stage}</span><strong aria-label={`${stage}: not reported`}>—</strong></div>)}</div>
        <p className="ecc-chart-source">Lead, tour and application counts have not been reported. No conversion rate can be confirmed.</p>
        <Link className="ecc-panel-link" href="/portfolio/leases">Review leases <span aria-hidden="true">&#8594;</span></Link>
      </section>
      <section className="ecc-overview-panel" aria-labelledby="portfolio-geography-title">
        <div className="ecc-overview-panel-heading"><div><p className="ecc-panel-eyebrow">Portfolio geography</p><h2 id="portfolio-geography-title">Property map &amp; occupancy by city</h2></div><MapPinned size={18} aria-hidden="true" /></div>
        <div className="ecc-panel-unavailable"><p>Location and city-level occupancy are unavailable.</p><small>{summary?.propertiesTotal != null ? `${summary.propertiesTotal.toLocaleString()} properties reported. ` : ""}A property count does not establish coordinates or city-level occupancy. Location details are needed before a map can be shown.</small></div>
        <Link className="ecc-panel-link" href="/portfolio/properties">Review properties <span aria-hidden="true">&#8594;</span></Link>
      </section>
      <section className="ecc-overview-panel" aria-labelledby="priority-work-title">
        <div className="ecc-overview-panel-heading"><div><p className="ecc-panel-eyebrow">Action center</p><h2 id="priority-work-title">Priority work</h2></div><ClipboardList size={18} aria-hidden="true" /></div>
        <div className="ecc-panel-unavailable"><p>Delinquency and urgent maintenance records are unavailable.</p><small>The lease date review above shows separately confirmed expirations when available. An empty or unavailable priority feed is not an all-clear.</small></div>
        <Link className="ecc-panel-link" href="/ops/operations">Review operations <span aria-hidden="true">&#8594;</span></Link>
      </section>
    </div>
  </>;
}
