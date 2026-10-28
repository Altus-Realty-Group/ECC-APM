import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAllLeases } from "@/lib/ecc-resolvers";
import { accessGuard, useResetOnAccessLoss } from "@/lib/useAccessGuard";
import StateNotice from "@/components/ui/StateNotice";
import { BUCKET_LABELS, EXPIRY_BUCKETS, planningRows, planningSummary, filterPlanningRows, type ExpiryBucket, type StatusScope } from "./renewalPlanning";
import { usePlanningDate } from "./usePlanningDate";
import "./renewal-planning.css";

type Query = Pick<ReturnType<typeof useAllLeases>, "data" | "isSuccess" | "isLoading" | "isFetching" | "isError" | "error" | "refetch">;
export function RenewalPlanningView({ query, today }: { query: Query; today: string }) {
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<ExpiryBucket>("all");
  const [scope, setScope] = useState<StatusScope>("planning");
  const { data, denied } = accessGuard(query);
  const canRead = query.isSuccess && !query.isError && !query.isFetching && data !== undefined;
  const epoch = useResetOnAccessLoss(denied, () => { setSearch(""); setBucket("all"); setScope("planning"); });
  const parsed = useMemo(() => {
    if (!canRead) return { rows: null, malformed: false };
    try { return { rows: planningRows(data, today), malformed: false }; }
    catch { return { rows: null, malformed: true }; }
  }, [canRead, data, today, epoch]);
  const rows = parsed.rows;
  const summary = rows ? planningSummary(rows) : null;
  const visible = rows ? filterPlanningRows(rows, search, bucket, scope) : [];
  const loading = !query.isError && (query.isLoading || query.isFetching);
  return <section className="ecc-renewals" aria-labelledby="renewal-planning-title">
    <header className="ecc-renewals-heading">
      <div><p className="ecc-renewals-eyebrow">Leasing review</p><h1 id="renewal-planning-title">Renewal planning</h1>
        <p>Find reported lease end dates, verify uncertain records and open the lease before deciding the next step.</p></div>
      <Link className="ecc-renewals-primary" href="/portfolio/leases">Review leases</Link>
    </header>
    <div className="ecc-renewals-source">
      <p>Planning date: <strong>{today}</strong> · Central time. Records last updated: Not reported.</p>
      <p>Includes loaded lease records; it may not include your entire portfolio. Dates organize review and do not predict renewal outcomes or determine notice requirements.</p>
    </div>
    {rows && summary ? <>
      <div className="ecc-renewals-metrics" aria-label="Loaded active lease review">
        <div><span>Active ending in 0–30 days</span><strong>{summary.due30}</strong></div>
        <div><span>Active ending in 31–90 days</span><strong>{summary.due31to90}</strong></div>
        <div><span>Active past reported end</span><strong>{summary.past}</strong></div>
        <div><span>Records needing verification</span><strong>{summary.uncertain}</strong></div>
      </div>
      <div className="ecc-renewals-coverage"><p>{summary.loaded} loaded rows · {summary.ended} reported ended. Date counts use explicitly active records with a valid calendar date and usable lease link.</p>
        <button type="button" onClick={() => { void query.refetch(); }}>Refresh lease records</button></div>
      {summary.uncertain > 0 ? <StateNotice kind="partial" title="Some loaded lease records need verification."
        detail="Missing or unclassified status, missing or conflicting dates, and unusable lease links remain visible. These records do not count toward the active date totals." /> : null}
      <div className="ecc-renewals-filters">
        <div><label htmlFor="renewal-search">Search loaded records</label><input id="renewal-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Property, tenant, lease or status" /></div>
        <div><label htmlFor="renewal-expiry">Reported end date</label><select id="renewal-expiry" value={bucket} onChange={event => setBucket(event.target.value as ExpiryBucket)}>
          {EXPIRY_BUCKETS.map(value => <option key={value} value={value}>{BUCKET_LABELS[value]}</option>)}
        </select></div>
        <div><label htmlFor="renewal-status">Lease status</label><select id="renewal-status" value={scope} onChange={event => setScope(event.target.value as StatusScope)}>
          <option value="planning">Active and unclassified</option><option value="all">All loaded statuses</option>
          <option value="active">Explicitly active</option><option value="uncertain">Unclassified or missing</option><option value="ended">Reported ended</option>
        </select></div>
        <button type="button" onClick={() => { setSearch(""); setBucket("all"); setScope("planning"); }}>Reset filters</button>
      </div>
      <p className="ecc-renewals-result-count">{visible.length} matching loaded row{visible.length === 1 ? "" : "s"}. Ended leases are excluded from the default view.</p>
      {visible.length ? <div className="ecc-renewals-table-scroll" tabIndex={0} role="region" aria-label="Lease expiry review">
        <table><caption>Reported lease dates and review needs</caption><thead><tr>
          <th scope="col">Lease / property</th><th scope="col">Tenant names</th><th scope="col">Reported status</th><th scope="col">Reported end</th><th scope="col">Date window</th><th scope="col">Verification needed</th>
        </tr></thead><tbody>{visible.map(row => <tr key={row.key}>
          <td>{row.href ? <Link href={row.href}>{row.label}</Link> : <strong>{row.label}</strong>}<span>{row.property ?? "Property not reported"}{row.unit ? ` · ${row.unit}` : ""}</span></td>
          <td>{row.tenants ?? "Not reported"}</td><td>{row.status ?? "Not reported"}{row.classification === "uncertain" ? <span>Unclassified</span> : null}</td>
          <td>{row.endDate ?? row.reportedEnd ?? "Not reported"}</td><td>{BUCKET_LABELS[row.bucket]}</td>
          <td>{row.issues.length ? row.issues.join(" · ") : "No issue identified in these planning fields"}</td>
        </tr>)}</tbody></table>
      </div> : <StateNotice kind="empty" title={rows.length ? "No loaded leases match these filters." : "The lease collection returned no records."}
        detail={rows.length ? "Change or reset the filters to review other loaded records." : "No renewal dates or outcomes are inferred."} />}
    </> : <StateNotice kind={denied ? "denied" : query.isError || parsed.malformed ? "error" : loading ? "loading" : "partial"}
      title={denied ? "You don't have access to lease planning records." : parsed.malformed ? "The loaded lease records could not be verified."
        : query.isError ? "Lease planning records could not be loaded." : loading ? "Loading lease planning records…" : "Lease planning records have not been confirmed."}
      detail="No records or date counts are shown until the lease read succeeds."
      onRetry={loading ? undefined : () => { void query.refetch(); }} retrying={query.isFetching} />}
  </section>;
}

export default function RenewalPlanningPage() {
  const today = usePlanningDate();
  const query = useAllLeases();
  return <RenewalPlanningView query={query} today={today} />;
}
