import React from "react";
import { Link, useLocation, useSearch } from "wouter";
import { REPORT_LAYOUTS, reportSelection } from "@/features/reports/portfolioSnapshot";
import { SelectedPortfolioReport } from "@/features/reports/PortfolioReport";
import "@/features/reports/reports.css";

export default function ReportsCreatePage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const layout = reportSelection(search);
  return <section className="ecc-reports" aria-labelledby="create-report-title">
    <header className="ecc-report-heading">
      <div><p className="ecc-report-eyebrow">Reports</p><h1 id="create-report-title">Create a portfolio report</h1>
        <p>Choose a layout, review the loaded records and download a CSV snapshot.</p></div>
      <Link href="/reports/templates">Browse report layouts</Link>
    </header>
    <div className="ecc-report-selection">
      <label htmlFor="report-layout">Report layout and source</label>
      <select id="report-layout" value={layout.id} onChange={event => navigate(`/reports/create?template=${event.target.value}`)}>
        {REPORT_LAYOUTS.map(item => <option key={item.id} value={item.id}>{item.title} · {item.source}</option>)}
      </select>
      <p>Choose the register you need to review or share.</p>
    </div>
    <SelectedPortfolioReport layout={layout} />
  </section>;
}
