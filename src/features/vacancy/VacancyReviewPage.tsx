import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAllUnits } from "@/lib/ecc-resolvers";
import { accessGuard, useResetOnAccessLoss } from "@/lib/useAccessGuard";
import { mapUnitRows, filterUnitRows, reportedOptions } from "@/pages/portfolio/unitWorkflow";
import StateNotice from "@/components/ui/StateNotice";
import "@/features/renewals/renewal-planning.css";

type Query = Pick<ReturnType<typeof useAllUnits>, "data" | "isSuccess" | "isLoading" | "isFetching" | "isError" | "error" | "refetch">;
export function vacancyRows(raw: unknown) {
  if (!Array.isArray(raw) || raw.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("Invalid unit collection");
  const rows = mapUnitRows(raw);
  const counts = new Map<string, number>();
  rows.forEach(row => { if (row.href) counts.set(row.href, (counts.get(row.href) ?? 0) + 1); });
  return rows.map(row => ({ ...row, href: row.href && counts.get(row.href) === 1 ? row.href : undefined }));
}
export function VacancyReviewView({ query }: { query: Query }) {
  const [search, setSearch] = useState("");
  const [property, setProperty] = useState("");
  const [status, setStatus] = useState("");
  const { data, denied } = accessGuard(query);
  const epoch = useResetOnAccessLoss(denied, () => { setSearch(""); setProperty(""); setStatus(""); });
  const parsed = useMemo(() => {
    if (!query.isSuccess || query.isError || query.error || query.isLoading || query.isFetching) return null;
    try { return vacancyRows(data); } catch { return null; }
  }, [data, query.isSuccess, query.isError, query.error, query.isLoading, query.isFetching, epoch]);
  const visible = parsed ? filterUnitRows(parsed, { search, property, status }) : [];
  const loading = !query.isError && (query.isLoading || query.isFetching);
  return <section className="ecc-renewals" aria-labelledby="vacancy-title">
    <header className="ecc-renewals-heading"><div><p className="ecc-renewals-eyebrow">Leasing review</p>
      <h1 id="vacancy-title">Vacancy review</h1><p>Review reported unit statuses, find records needing verification and open the unit before planning leasing or repair work.</p></div>
      <Link href="/portfolio/units" className="ecc-renewals-primary">Review units</Link></header>
    <div className="ecc-renewals-source"><p>Uses loaded unit records. Portfolio completeness and source update time are not reported.</p>
      <p>Status labels are shown as received. Missing status does not mean vacant. Vacancy duration, lost rent and occupancy rates require verified dates and a complete collection.</p></div>
    {parsed ? <>
      <div className="ecc-renewals-metrics" aria-label="Loaded unit review">
        <div><span>Loaded unit rows</span><strong>{parsed.length}</strong></div>
        <div><span>Reported status labels</span><strong>{reportedOptions(parsed, "status").length}</strong></div>
        <div><span>Status not reported</span><strong>{parsed.filter(row => !row.status).length}</strong></div>
        <div><span>Record link needs verification</span><strong>{parsed.filter(row => !row.href).length}</strong></div>
      </div>
      <div className="ecc-renewals-coverage"><p>Choose a reported status to inspect its units. These counts describe loaded rows only.</p><button onClick={() => { void query.refetch(); }}>Refresh unit records</button></div>
      <div className="ecc-renewals-filters">
        <div><label htmlFor="vacancy-search">Search units</label><input id="vacancy-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Unit, property, status or ID" /></div>
        <div><label htmlFor="vacancy-property">Property</label><select id="vacancy-property" value={property} onChange={e => setProperty(e.target.value)}><option value="">All reported properties</option>{reportedOptions(parsed, "property").map(value => <option key={value}>{value}</option>)}</select></div>
        <div><label htmlFor="vacancy-status">Reported status</label><select id="vacancy-status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All reported statuses</option>{reportedOptions(parsed, "status").map(value => <option key={value}>{value}</option>)}</select></div>
        <button onClick={() => { setSearch(""); setProperty(""); setStatus(""); }}>Reset filters</button>
      </div>
      <p role="status">{visible.length} of {parsed.length} loaded rows shown.</p>
      {visible.length ? <div className="ecc-renewals-table-scroll" tabIndex={0} role="region" aria-label="Unit status review"><table><caption>Reported unit status and property</caption><thead><tr><th scope="col">Unit</th><th scope="col">Property</th><th scope="col">Reported status</th><th scope="col">Next step</th></tr></thead><tbody>{visible.map(row => <tr key={row.key}><td>{row.href ? <Link href={row.href}>{row.unit ?? `Unit ${row.id}`}</Link> : row.unit ?? "Unit label not reported"}</td><td>{row.property ?? "Property not reported"}</td><td>{row.status ?? "Not reported"}</td><td>{row.href ? "Open the unit to verify its current condition and leasing record." : "Verify a unique unit reference before opening its record."}</td></tr>)}</tbody></table></div>
        : <StateNotice kind="empty" title={parsed.length ? "No loaded units match these filters." : "No unit records were returned."} detail="No vacancy or occupancy outcome is inferred." />}
    </> : <StateNotice kind={denied ? "denied" : loading ? "loading" : query.isError || query.isSuccess ? "error" : "partial"}
      title={denied ? "You do not have access to unit records." : loading ? "Loading unit records..." : "Unit records could not be confirmed."}
      detail="Records and counts remain hidden until a unit read succeeds." onRetry={loading ? undefined : () => { void query.refetch(); }} />}
  </section>;
}
export default function VacancyReviewPage() { return <VacancyReviewView query={useAllUnits()} />; }
