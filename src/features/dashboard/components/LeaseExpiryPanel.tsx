import React, { useMemo } from "react";
import { Link } from "wouter";
import { useAllLeases } from "@/lib/ecc-resolvers";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard } from "@/lib/useAccessGuard";
import { usePlanningDate } from "@/features/renewals/usePlanningDate";
import { leaseExpiryDistribution } from "../leaseExpiry";

type LeaseQuery = Pick<ReturnType<typeof useAllLeases>, "data" | "isSuccess" | "isLoading" | "isFetching" | "isError" | "error" | "refetch">;

export function LeaseExpiryView({ query, today }: { query: LeaseQuery; today: string }) {
  const { data, denied } = accessGuard(query);
  const canRead = query.isSuccess && !query.isError && !query.error && !query.isLoading && !query.isFetching && data !== undefined;
  const summary = useMemo(() => {
    if (!canRead) return null;
    try { return leaseExpiryDistribution(data, today); } catch { return null; }
  }, [canRead, data, today]);
  const loading = !query.isError && (query.isLoading || query.isFetching);
  const maximum = Math.max(1, ...summary?.windows.map(window => window.count) ?? []);
  return <section className="ecc-overview-panel ecc-expiry-panel" aria-labelledby="lease-expiry-title">
    <div className="ecc-overview-panel-heading"><div><p className="ecc-panel-eyebrow">Lease date review</p>
      <h2 id="lease-expiry-title">Upcoming lease expirations</h2></div></div>
    <p className="ecc-chart-source">Planning date: {today} · Central time. Loaded lease records only; portfolio completeness and source update time are not reported.</p>
    {summary ? <>
      <dl className="ecc-expiry-metrics">
        <div><dt>Active ending in 0–30 days</dt><dd data-testid="expiry-due30">{summary.due30}</dd></div>
        <div><dt>Active ending in 31–90 days</dt><dd>{summary.due31to90}</dd></div>
        <div><dt>Records needing verification</dt><dd>{summary.uncertain}</dd></div>
      </dl>
      {summary.loaded ? <figure className="ecc-expiry-chart">
        <figcaption>Reported end dates for {summary.datedActive} active lease records with valid dates and usable record links. Bar lengths compare counts, not portfolio shares.</figcaption>
        <ul aria-label="Active lease end-date windows">{summary.windows.map(window => <li key={window.label}>
          <div><span>{window.label}</span><strong>{window.count}</strong></div>
          <div className="ecc-expiry-track" aria-hidden="true"><span style={{ width: `${window.count / maximum * 100}%` }} /></div>
        </li>)}</ul>
      </figure> : <StateNotice kind="empty" title="No lease records were returned." detail="No expiration counts or renewal outcomes are inferred." />}
      <p className="ecc-chart-source">{summary.loaded} loaded rows · {summary.ended} reported ended. Missing, conflicting or duplicate references are excluded from date counts. Reported dates do not establish renewal outcomes or notice deadlines.</p>
      <button type="button" className="ecc-btn ecc-touch" onClick={() => { void query.refetch(); }}>Refresh expiry records</button>
    </> : <StateNotice kind={denied ? "denied" : loading ? "loading" : "error"}
      title={denied ? "You don't have access to lease date records." : loading ? "Loading lease date records…" : "Lease date records could not be confirmed."}
      detail="No prior records, counts or bars are shown until the lease read succeeds."
      onRetry={loading ? undefined : () => { void query.refetch(); }} retrying={query.isFetching} />}
    <Link href="/ops/ai/renewal-forecasting" className="ecc-panel-link">Open renewal planning <span aria-hidden="true">&#8594;</span></Link>
  </section>;
}

export default function LeaseExpiryPanel() {
  return <LeaseExpiryView query={useAllLeases()} today={usePlanningDate()} />;
}
