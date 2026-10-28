import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { confirmedLeases, confirmedUnits, inLeaseWindow, LEASE_WINDOWS, unitStatusGroups, unitStatusKey, type RecordQuery, type LeaseWindow } from "../commandWork";
import { errorKind } from "@/lib/dataState";

export default function CommandWorkSurface({ leases, units, today }: { leases?: RecordQuery; units?: RecordQuery; today: string }) {
  const leaseRows = confirmedLeases(leases, today), unitRows = confirmedUnits(units);
  const [tab, setTab] = useState<"leases" | "units">("leases");
  const [window, setWindow] = useState<LeaseWindow>("review");
  const [unitStatus, setUnitStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const denied = [leases?.error, units?.error].some(error => error && errorKind(error) === "denied");
  useEffect(() => {
    if (denied) { setSearch(""); setWindow("review"); setUnitStatus("all"); setPage(0); }
  }, [denied]);
  const workbench = useRef<HTMLElement>(null);
  function jumpToQueue() {
    setPage(0);
    workbench.current?.scrollIntoView({ block: "start" });
    workbench.current?.focus({ preventScroll: true });
  }
  const needle = search.trim().toLowerCase();
  const leaseVisible = leaseRows?.filter(row => inLeaseWindow(row, window) && (!needle || [row.label, row.property, row.unit, row.tenants, row.status].filter(Boolean).join(" ").toLowerCase().includes(needle))) ?? [];
  const unitVisible = unitRows?.filter(row => (unitStatus === "all" || unitStatusKey(row.status) === unitStatus) && (!needle || [row.unit, row.property, row.id, row.status].filter(Boolean).join(" ").toLowerCase().includes(needle))) ?? [];
  const groups = unitRows ? unitStatusGroups(unitRows) : [];
  const counts = LEASE_WINDOWS.map(item => ({ ...item, count: leaseRows?.filter(row => inLeaseWindow(row, item.key)).length ?? null }));
  const max = Math.max(1, ...counts.map(item => item.count ?? 0));
  const canRead = tab === "leases" ? leaseRows !== null : unitRows !== null;
  const query = tab === "leases" ? leases : units;
  const reviewHref = tab === "leases" ? "/ops/ai/renewal-forecasting" : "/ops/ai/vacancy-analytics";
  const total = tab === "leases" ? leaseVisible.length : unitVisible.length;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(total / 25) - 1));
  const start = currentPage * 25;
  function chooseTab(value: "leases" | "units") { setTab(value); setSearch(""); setPage(0); }
  return <>
    <div className="cc-record-signals">
      <section className="cc-signal" aria-labelledby="lease-horizon-title">
        <header><div><p className="cc-overline">Leasing exposure</p><h2 id="lease-horizon-title">Lease horizon</h2></div><Link href="/ops/ai/renewal-forecasting">Full review <span aria-hidden="true">↗</span></Link></header>
        <p className="cc-source-note">Active loaded leases with a valid end date and unique record link. Select a window to review its records.</p>
        {leaseRows ? <>
          <div className="cc-horizon" aria-label="Active lease end-date windows">{counts.map(item => <button key={item.key} type="button" aria-pressed={tab === "leases" && window === item.key} onClick={() => { setTab("leases"); setWindow(item.key); setSearch(""); jumpToQueue(); }}>
            <strong>{item.count}</strong><span className="cc-horizon-track" aria-hidden="true"><span style={{ height: `${(item.count ?? 0) / max * 100}%` }} /></span><span>{item.label}</span>
          </button>)}</div>
          <footer><span>{leaseRows.length} loaded rows · end dates, not renewal predictions</span><button type="button" className="cc-inline" onClick={() => { setTab("leases"); setWindow("verify"); setSearch(""); jumpToQueue(); }}>Verify {leaseRows.filter(row => row.issues.length > 0).length} records</button></footer>
        </> : <p className="cc-inline-state">Lease records unavailable. Expiration counts are not confirmed.</p>}
      </section>
      <section className="cc-signal" aria-labelledby="unit-status-title">
        <header><div><p className="cc-overline">Leasing inventory</p><h2 id="unit-status-title">Reported unit status</h2></div><Link href="/ops/ai/vacancy-analytics">Full review <span aria-hidden="true">↗</span></Link></header>
        <p className="cc-source-note">Loaded unit rows by their reported label. Missing status does not mean vacant or rent-ready.</p>
        {unitRows ? <>
          <div className="cc-status-stack" aria-hidden="true">{groups.map((group, i) => <span key={group.key} className={`cc-segment cc-segment-${i % 3}`} style={{ flexGrow: group.count, flexBasis: 0 }} />)}</div>
          <div className="cc-status-list">{groups.map((group, i) => <button type="button" key={group.key} aria-pressed={tab === "units" && unitStatus === group.key} onClick={() => { setTab("units"); setUnitStatus(group.key); setSearch(""); jumpToQueue(); }}>
            <span><i className={`cc-segment-${i % 3}`} aria-hidden="true" />{group.label}</span><strong>{group.count}</strong>
          </button>)}</div>
          <footer><span>{unitRows.length} loaded unit rows · completeness not reported</span></footer>
        </> : <p className="cc-inline-state">Unit records unavailable. No availability or readiness is inferred.</p>}
      </section>
    </div>
    <section className="cc-workbench" aria-labelledby="workbench-title" ref={workbench} tabIndex={-1}>
      <header><div><p className="cc-overline">From signal to record</p><h2 id="workbench-title">Review work queue</h2><p className="cc-source-note">Planning date {today} · Central time. Review source records before assigning work or sending notices.</p></div><Link className="cc-secondary" href={reviewHref}>Open full review <span aria-hidden="true">↗</span></Link></header>
      <div className="cc-workbench-toolbar">
        <div className="cc-review-tabs" role="group" aria-label="Review record type">
          <button type="button" aria-pressed={tab === "leases"} onClick={() => chooseTab("leases")}>Lease review</button>
          <button type="button" aria-pressed={tab === "units"} onClick={() => chooseTab("units")}>Unit review</button>
        </div>
        {canRead ? <div className="cc-queue-filters">
          {tab === "leases" ? <label>End-date window<select aria-label="End-date window" value={window} onChange={e => { setWindow(e.target.value as LeaseWindow); setPage(0); }}>
            <option value="review">Active: past end through 90 days</option>{LEASE_WINDOWS.map(item => <option value={item.key} key={item.key}>{item.label}</option>)}<option value="verify">Records needing verification</option><option value="all">All loaded leases</option>
          </select></label> : <label>Reported status<select aria-label="Queue unit status" value={unitStatus} onChange={e => { setUnitStatus(e.target.value); setPage(0); }}><option value="all">All loaded statuses</option>{groups.map(group => <option value={group.key} key={group.key}>{group.label}</option>)}</select></label>}
          <label>Search queue<input aria-label="Search review queue" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Property, unit, tenant or ID" /></label>
          <button type="button" className="cc-inline" onClick={() => { setSearch(""); setWindow("review"); setUnitStatus("all"); setPage(0); }}>Reset</button>
        </div> : null}
      </div>
      {canRead ? <>
        <p className="cc-result-count" role="status">{tab === "leases" ? leaseVisible.length : unitVisible.length} matching of {tab === "leases" ? leaseRows!.length : unitRows!.length} loaded rows. Chart counts use the full loaded collection.</p>
        <div className="cc-queue-scroll" tabIndex={0} role="region" aria-label="Review queue records"><table><caption>{tab === "leases" ? "Lease records for the selected date window" : "Units for the selected reported status"}</caption><thead><tr><th scope="col">Record / property</th><th scope="col">Reported context</th><th scope="col">Review reason</th><th scope="col">Next action</th></tr></thead><tbody>
          {tab === "leases" ? leaseVisible.slice(start, start + 25).map(row => <tr key={row.key}><td><strong>{row.label}</strong><small>{row.property ?? "Property not reported"}{row.unit ? ` · ${row.unit}` : ""}</small></td><td>{row.tenants ?? "Tenants not reported"}<small>{row.status ?? "Status not reported"}</small></td><td>{row.endDate ? `Reported end: ${row.endDate}` : "End date needs verification"}<small>{row.issues.length ? row.issues.join(" · ") : row.classification === "ended" ? "Reported status is ended; verify the source record" : row.days! < 0 ? "Active status is past the reported end date" : `${row.days} days to reported end`}</small></td><td>{row.href ? <Link href={row.href} className="cc-record-action">Review lease <span aria-hidden="true">→</span></Link> : "Verify record identity"}</td></tr>)
          : unitVisible.slice(start, start + 25).map(row => <tr key={row.key}><td><strong>{row.unit ?? `Unit ${row.id ?? "reference unavailable"}`}</strong><small>{row.property ?? "Property not reported"}</small></td><td>{row.status ?? "Status not reported"}</td><td>Verify current availability and condition<small>Reported status alone does not establish rent readiness.</small></td><td>{row.href ? <Link href={row.href} className="cc-record-action">Review unit <span aria-hidden="true">→</span></Link> : "Verify record identity"}</td></tr>)}
        </tbody></table></div>
        {!(tab === "leases" ? leaseVisible.length : unitVisible.length) ? <p className="cc-inline-state">No loaded records match this review. Reset filters to inspect the collection; this is not a portfolio-wide all-clear.</p> : null}
        {total > 25 ? <div className="cc-pagination"><span>{start + 1}–{Math.min(start + 25, total)} of {total} matching rows</span><button type="button" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous records</button><button type="button" disabled={start + 25 >= total} onClick={() => setPage(currentPage + 1)}>Next records</button></div> : null}
      </> : <div className="cc-workbench-unavailable"><p>{query?.isError && errorKind(query.error) === "denied" ? "You do not have access to these review records." : query?.isFetching || query?.isLoading ? "Loading review records…" : "Review records are not available."}</p><span>Records and counts stay hidden during refresh, failure or restricted access.</span><button type="button" className="cc-secondary" disabled={!query || query.isFetching} onClick={() => { void query?.refetch(); }}>Retry record read</button></div>}
    </section>
  </>;
}
