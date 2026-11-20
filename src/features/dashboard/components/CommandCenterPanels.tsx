import React from "react";
import { Link } from "wouter";
import { Building2, CircleDollarSign, MapPinned, TrendingUp, ArrowUpRight, Wrench, Wallet, KeyRound } from "lucide-react";
import { KpiCard } from "./KpiCard";
import type { DashboardKpis } from "../kpiAdapter";

/** An empty plotting area has no data marks, invented dates or zero-valued series. */
export function PendingChart({ label }: { label: string }) {
  return <div className="cc-empty-chart" role="img" aria-label={`${label}: data unavailable`}><div className="cc-empty-grid" aria-hidden="true" /><span>Awaiting data</span></div>;
}

export function OccupancyPosition({ rate }: { rate: number | null | undefined }) {
  const percent = typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate * 100 : null;
  return <section className="ecc-overview-panel" aria-labelledby="occupancy-position-title">
    <div className="ecc-overview-panel-heading"><h2 id="occupancy-position-title">Occupancy position</h2><Building2 size={18} aria-hidden="true" /></div>
    <div className="ecc-occupancy-position">
      <svg viewBox="0 0 160 160" role="img" aria-label={percent === null ? "Occupancy data unavailable" : `Reported occupancy ${percent.toFixed(1)} percent`}>
        <circle cx="80" cy="80" r="62" fill="none" stroke="#303030" strokeWidth="13" />
        {percent !== null ? <circle cx="80" cy="80" r="62" fill="none" stroke="#d4af37" strokeWidth="13" pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} transform="rotate(-90 80 80)" /> : null}
        <text x="80" y="78" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="600">{percent === null ? "—" : `${percent.toFixed(1)}%`}</text>
        <text x="80" y="98" textAnchor="middle" fill="#bdbdbd" fontSize="11">{percent === null ? "Awaiting data" : "occupied"}</text>
      </svg>
    </div>
    <Link className="ecc-panel-link" href="/portfolio/units">Review units <ArrowUpRight size={14} aria-hidden="true" /></Link>
  </section>;
}

/** Restore the original command-center areas. Each missing feed retains its own place. */
export function CommandCenterPanels({ summary: _summary }: { summary: DashboardKpis | null }) {
  return <>
    <section className="cc-operating-strip" aria-label="Operating health">
      <div><KeyRound size={20} aria-hidden="true" /><KpiCard label="Rent-ready vacancies" value={null} testId="operating.rent-ready" /></div>
      <div><Wallet size={20} aria-hidden="true" /><KpiCard label="Collections MTD" value={null} testId="operating.collections" /></div>
      <div><Wrench size={20} aria-hidden="true" /><KpiCard label="Critical work orders" value={null} testId="operating.critical-work" /></div>
    </section>
    <div className="cc-restored-grid">
      <section className="cc-signal cc-property-map" aria-labelledby="portfolio-geography-title">
        <header><div><p className="cc-overline">Portfolio geography</p><h2 id="portfolio-geography-title">Property map</h2></div><Link href="/portfolio/properties">Properties <ArrowUpRight size={14} aria-hidden="true" /></Link></header>
        <div className="cc-map-empty"><MapPinned size={48} strokeWidth={1} aria-hidden="true" /><strong>Property locations pending</strong><span>The map will appear when locations are available.</span></div>
        <footer><span>Portfolio locations</span><span>Awaiting data</span></footer>
      </section>
      <section className="cc-signal" aria-labelledby="priority-work-title">
        <header><div><p className="cc-overline">Action center</p><h2 id="priority-work-title">Priority work</h2></div><Link href="/ops/operations">Operations <ArrowUpRight size={14} aria-hidden="true" /></Link></header>
        <div className="cc-priority-list">{[
          { label: "Lease renewals", href: "/ops/ai/renewal-forecasting", icon: KeyRound },
          { label: "Collections", href: "/ops/accounting/tenant-ledgers", icon: Wallet },
          { label: "Maintenance", href: "/ops/operations", icon: Wrench },
        ].map(item => <Link href={item.href} key={item.label}><item.icon size={18} aria-hidden="true" /><span><strong>{item.label}</strong><small>Review records</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link>)}</div>
        <footer><span>Priority counts pending</span><span>—</span></footer>
      </section>
      <section className="cc-signal" aria-labelledby="cash-flow-title">
        <header><div><p className="cc-overline">Financial performance</p><h2 id="cash-flow-title">Income &amp; cash flow</h2></div><CircleDollarSign size={20} aria-hidden="true" /></header>
        <div className="cc-chart-legend"><span><i />Income</span><span><i />Expenses</span><span><i />Net operating income</span></div>
        <PendingChart label="Income, expenses and net operating income history" />
        <footer><span>Financial history pending</span><Link href="/ops/accounting/tenant-ledgers">Tenant ledgers <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
      </section>
      <section className="cc-signal" aria-labelledby="leasing-pipeline-title">
        <header><div><p className="cc-overline">Leasing performance</p><h2 id="leasing-pipeline-title">Leasing pipeline</h2></div><TrendingUp size={20} aria-hidden="true" /></header>
        <ol className="cc-pipeline" aria-label="Leasing stages; figures not reported">{["Leads", "Tours", "Applications", "Approved", "Signed"].map((stage, index) => <li key={stage}><span className="cc-stage-number" aria-hidden="true">0{index + 1}</span><strong>—</strong><span>{stage}</span></li>)}</ol>
        <footer><span>Leasing activity pending</span><Link href="/portfolio/leases">Leases <ArrowUpRight size={14} aria-hidden="true" /></Link></footer>
      </section>
    </div>
    <section className="cc-signal cc-city-panel" aria-labelledby="occupancy-city-title">
      <header><div><p className="cc-overline">Market performance</p><h2 id="occupancy-city-title">Occupancy by city</h2></div><Link href="/portfolio/properties">Portfolio <ArrowUpRight size={14} aria-hidden="true" /></Link></header>
      <div className="cc-city-head" aria-hidden="true"><span>City</span><span>Properties</span><span>Occupied</span><span>Occupancy</span></div>
      <div className="cc-city-empty"><Building2 size={24} aria-hidden="true" /><span>City-level occupancy pending</span></div>
    </section>
  </>;
}
