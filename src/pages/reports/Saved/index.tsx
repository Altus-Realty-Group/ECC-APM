import React from "react";
import { Link } from "wouter";
import StateNotice from "@/components/ui/StateNotice";
import "@/features/reports/reports.css";

export default function ReportsSavedPage() {
  return <section className="ecc-reports" aria-labelledby="saved-reports-title">
    <header><p className="ecc-report-eyebrow">Reporting workspace</p><h1 id="saved-reports-title">Saved reports</h1>
      <p>Prepare a portfolio snapshot and keep the exported file for your records.</p></header>
    <StateNotice kind="partial" title="Saved-report storage is unavailable"
      detail="ECC does not currently store or retrieve saved reports. Previously downloaded CSV files remain in the location you chose when downloading them. No saved-report inventory has been confirmed." />
    <div className="ecc-saved-report-steps">
      <article><strong>01 / SELECT</strong><h2>Choose a register</h2><p>Start with properties, leases or owners using an existing report layout.</p><Link href="/reports/templates">Browse report layouts</Link></article>
      <article><strong>02 / REVIEW</strong><h2>Review source records</h2><p>Check the loaded records, scope and missing values before preparing a download.</p><Link href="/reports/create">Create a portfolio report</Link></article>
      <article><strong>03 / RETAIN</strong><h2>Keep the exported file</h2><p>A CSV download is stored by your browser. It is not automatically saved to ECC or an owner record.</p></article>
    </div>
  </section>;
}
