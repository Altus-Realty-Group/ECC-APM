import React from "react";
import { Link } from "wouter";
import { REPORT_LAYOUTS, SNAPSHOT_SCOPE } from "@/features/reports/portfolioSnapshot";
import "@/features/reports/reports.css";

export default function ReportsTemplatesPage() {
  return <section className="ecc-reports" aria-labelledby="report-layouts-title">
    <header><p className="ecc-report-eyebrow">Reports</p><h1 id="report-layouts-title">Report layouts</h1>
      <p>Choose the records you want to review. Each layout opens a read of the selected collection and a CSV preview.</p></header>
    <p className="ecc-report-scope">{SNAPSHOT_SCOPE} These are reusable layouts, not sample records or saved reports.</p>
    <div className="ecc-report-layouts">
      {REPORT_LAYOUTS.map(layout => <article key={layout.id}>
        <p className="ecc-report-eyebrow">{layout.source}</p><h2>{layout.title}</h2><p>{layout.description}</p>
        <p>{layout.columns.map(column => column.label).join(" · ")}</p>
        <Link className="ecc-report-primary" href={`/reports/create?template=${layout.id}`}>Use {layout.title.toLowerCase()}</Link>
      </article>)}
    </div>
    <p className="ecc-report-footnote">Source access is checked when you open a layout. Saving reports in ECC and owner-statement PDFs require a separate verified reporting service.</p>
  </section>;
}
