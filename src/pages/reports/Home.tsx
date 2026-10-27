import React, { useState } from "react";
import { Link } from "wouter";
import { REPORT_LAYOUTS } from "@/features/reports/portfolioSnapshot";
import { SelectedPortfolioReport } from "@/features/reports/PortfolioReport";
import "@/features/reports/reports.css";

export default function ReportsHome() {
  const [layoutId, setLayoutId] = useState(REPORT_LAYOUTS[0].id);
  const layout = REPORT_LAYOUTS.find(item => item.id === layoutId)!;
  return <section className="ecc-reports" aria-labelledby="reports-home-title">
    <header><p className="ecc-report-eyebrow">Portfolio reporting</p><h1 id="reports-home-title">Reports</h1>
      <p>Select a register, inspect its source records and download a CSV snapshot.</p></header>
    <div className="ecc-report-selection"><label htmlFor="reports-home-layout">Report to review</label>
      <select id="reports-home-layout" value={layoutId} onChange={event => setLayoutId(event.target.value)}>
        {REPORT_LAYOUTS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select><p>{layout.description}</p></div>
    <SelectedPortfolioReport layout={layout} />
    <nav className="ecc-recover-actions" aria-label="Reporting workflows"><Link className="ecc-btn" href="/reports/templates">Browse layouts</Link><Link className="ecc-btn" href="/reports/saved">Saved-report availability</Link></nav>
  </section>;
}
