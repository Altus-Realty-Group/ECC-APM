import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAllProperties, useAllLeases, useAllOwners } from "@/lib/ecc-resolvers";
import { useSessionEpoch, getSessionEpoch } from "@/lib/sessionScope";
import { errorKind } from "@/lib/dataState";
import StateNotice from "@/components/ui/StateNotice";
import { prepareSnapshot, snapshotAtClick, downloadSnapshot, SNAPSHOT_SCOPE, type PortfolioSnapshot, type ReportLayout } from "./portfolioSnapshot";
import "./reports.css";

type ReportQuery = Pick<ReturnType<typeof useAllProperties>,
  "data" | "isLoading" | "isFetching" | "isSuccess" | "isError" | "error" | "refetch">;

/** No retained rows can be previewed/exported during failed, unresolved or active reads. */
export function readySnapshot(layout: ReportLayout, query: Pick<ReportQuery, "data" | "isSuccess" | "isError" | "isFetching">): PortfolioSnapshot | null {
  if (!query.isSuccess || query.isError || query.isFetching || query.data === undefined) return null;
  return prepareSnapshot(layout, query.data);
}

export function PortfolioReportPanel({ layout, query, onDownload }: {
  layout: ReportLayout; query: ReportQuery; onDownload: () => void;
}) {
  const [previewFilter, setPreviewFilter] = useState("");
  let snapshot: PortfolioSnapshot | null = null;
  let malformed = false;
  try { snapshot = readySnapshot(layout, query); } catch { malformed = true; }
  const ready = snapshot !== null;
  useEffect(() => { if (!ready) setPreviewFilter(""); }, [ready]);
  const needle = previewFilter.trim().toLowerCase();
  const previewRows = snapshot?.rows.filter(row => !needle || row.some(value => value !== null && String(value).toLowerCase().includes(needle))) ?? [];
  const denied = query.isError && errorKind(query.error) === "denied";
  const failed = query.isError || malformed;
  const loading = !failed && (query.isLoading || query.isFetching);
  return (
    <section className="ecc-report-preview" aria-labelledby="report-preview-title">
      <div className="ecc-report-heading">
        <div><h2 id="report-preview-title">{layout.title}</h2><p>{layout.description}</p></div>
        {snapshot ? <button type="button" className="ecc-report-primary" onClick={onDownload}>Download CSV</button> : null}
      </div>
      <div className="ecc-report-scope"><p>{SNAPSHOT_SCOPE}</p><p>Records: {layout.source.charAt(0).toUpperCase() + layout.source.slice(1)}</p></div>
      {snapshot ? <>
        <div className="ecc-report-read-status">
          <span>{snapshot.rows.length} loaded record{snapshot.rows.length === 1 ? "" : "s"}</span>
          <span>Records last updated: Not reported.</span>
          <button type="button" onClick={() => { void query.refetch(); }}>Refresh records</button>
        </div>
        <p>Missing values appear as “Not reported” in the preview and blank CSV cells. No rent, revenue or full-portfolio totals are inferred.</p>
        {snapshot.rows.length > 0 ? <div className="ecc-report-preview-filter">
          <label htmlFor="report-preview-filter">Filter preview</label>
          <input id="report-preview-filter" value={previewFilter} onChange={event => setPreviewFilter(event.target.value)} placeholder="Search the reported fields" />
          <button type="button" onClick={() => setPreviewFilter("")} disabled={!previewFilter}>Clear filter</button>
          <p>{previewRows.length} matching preview rows. CSV includes all {snapshot.rows.length} loaded records, regardless of this filter.</p>
        </div> : null}
        {snapshot.rows.length === 0 ? <StateNotice kind="empty" title="The selected collection returned no records." detail="A CSV download will contain the scope notes and column headings only." /> : (
          <div className="ecc-report-table-scroll" tabIndex={0} role="region" aria-label="Loaded report preview">
            <table>
              <caption>Loaded-record preview{previewRows.length > 100 ? " (first 100 rows; CSV includes all loaded rows)" : ""}</caption>
              <thead><tr>{snapshot.columns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
              <tbody>{previewRows.slice(0, 100).map((row) => <tr key={String(row[0])}>
                {row.map((value, j) => <td key={snapshot.columns[j].key}>{value === null ? <span className="ecc-report-missing">Not reported</span> : String(value)}</td>)}
              </tr>)}</tbody>
            </table>
            {previewRows.length === 0 ? <p className="ecc-report-no-match">No loaded records match the preview filter.</p> : null}
          </div>
        )}
      </> : <StateNotice
        kind={denied ? "denied" : failed ? "error" : loading ? "loading" : "partial"}
        title={denied ? "You don't have access to these report records."
          : malformed ? "These records could not be prepared safely."
          : failed ? "The report records could not be loaded."
          : loading ? "Loading the selected report records…" : "The report records have not been confirmed."}
        detail="No preview or download is available until the selected collection loads successfully."
        onRetry={loading ? undefined : () => { void query.refetch(); }} retrying={query.isFetching}
      />}
      <p className="ecc-report-footnote">This download is prepared in your browser. It is not saved in ECC. Saved-report registration and owner-statement PDFs are not available in this workflow.</p>
      <Link href={`/portfolio/${layout.source}`}>Review source {layout.source}</Link>
    </section>
  );
}

function ReportSource({ layout, query }: { layout: ReportLayout; query: ReportQuery }) {
  const client = useQueryClient();
  const epoch = useSessionEpoch();
  const [downloadError, setDownloadError] = useState(false);
  function onDownload() {
    setDownloadError(false);
    try {
      // Recheck actual cache and session at click time, not only the last rendered props.
      const current = client.getQueryState(["portfolio", layout.source]);
      const snapshot = snapshotAtClick(layout, current, query.data, epoch, getSessionEpoch());
      if (!snapshot) { setDownloadError(true); return; }
      downloadSnapshot(snapshot);
    } catch { setDownloadError(true); }
  }
  return <>
    {downloadError ? <StateNotice kind="error" title="The download could not be prepared." detail="Refresh the selected records and try again." /> : null}
    <PortfolioReportPanel layout={layout} query={query} onDownload={onDownload} />
  </>;
}
function PropertyReport({ layout }: { layout: ReportLayout }) { return <ReportSource layout={layout} query={useAllProperties()} />; }
function LeaseReport({ layout }: { layout: ReportLayout }) { return <ReportSource layout={layout} query={useAllLeases()} />; }
function OwnerReport({ layout }: { layout: ReportLayout }) { return <ReportSource layout={layout} query={useAllOwners()} />; }

/** Only one hook mounts: choosing a report never loads the other two datasets. */
export function SelectedPortfolioReport({ layout }: { layout: ReportLayout }) {
  const epoch = useSessionEpoch();
  const Report = layout.source === "properties" ? PropertyReport : layout.source === "leases" ? LeaseReport : OwnerReport;
  return <Report key={`${layout.id}:${epoch}`} layout={layout} />;
}
