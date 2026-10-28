import React from "react";
import { Link } from "wouter";
import { ArrowUpRight, RefreshCw, ShieldAlert } from "lucide-react";
import "./dashboard-workflow.css";
import { useDashboardKpis } from "@/features/dashboard/hooks/useDashboardKpis";
import { useAllLeases, useAllUnits } from "@/lib/ecc-resolvers";
import { useSessionEpoch } from "@/lib/sessionScope";
import { usePlanningDate } from "@/features/renewals/usePlanningDate";
import { KpiCard } from "../components/KpiCard";
import OccupancyHistory from "@/components/recovery/OccupancyHistory";
import { DASHBOARD_KPI_TEST_IDS } from "../constants/testIds";
import { deriveDashboardStatus } from "../dashboardStatus";
import StateNotice from "@/components/ui/StateNotice";
import { OccupancyPosition } from "../components/CommandCenterPanels";
import CommandWorkSurface from "../components/CommandWorkSurface";
import type { RecordQuery } from "../commandWork";

type DashboardQuery = Pick<ReturnType<typeof useDashboardKpis>, "data" | "isLoading" | "isError" | "error" | "refetch" | "isFetching">;

/** One source banner, sourced infographics, and record-level review actions. */
export function DashboardView({ query, leases, units, today = "Planning date not supplied", epoch = 0 }: {
  query: DashboardQuery; leases?: RecordQuery; units?: RecordQuery; today?: string; epoch?: number;
}) {
  const { data, isLoading, isError, error, refetch, isFetching } = query;
  const status = deriveDashboardStatus({ isLoading, isError, error, data });
  const showFigures = status.mode === "ready" && data;
  const unbound = [error, leases?.error, units?.error].some(value => String((value as Error)?.message ?? "").includes("BACKEND_NOT_CONNECTED"));
  const updatedText = status.freshness === "future" ? "The reported update time is in the future, so freshness cannot be confirmed"
    : status.freshness === "invalid" ? "The reported update time is not valid, so freshness cannot be confirmed"
    : data?.lastUpdated ? "Updated " + new Date(data.lastUpdated).toLocaleString() : "Update time not reported";
  const sourceStatus = unbound ? "Data connection required" : status.mode === "loading" ? "Loading summary"
    : status.mode === "failed" ? "Summary unavailable" : status.mode === "empty" ? "Summary not yet available"
    : status.refreshFailed ? "Last loaded figures" : status.freshness === "stale" ? "Older figures"
    : status.freshness === "fresh" ? "Source updated" : "Update time unconfirmed";
  const busy = isFetching || leases?.isFetching || units?.isFetching;
  const retry = () => { void refetch(); void leases?.refetch(); void units?.refetch(); };
  const failureTitle = unbound ? "ECC is not connected to its operating data."
    : status.failure === "denied" ? "You don't have access to the portfolio summary."
    : status.contractViolation ? "The portfolio summary came back in an unexpected format."
    : "The portfolio summary could not be loaded.";

  return <section className="ecc-dashboard cc-command" aria-labelledby="dashboard-title">
    <header className="cc-heading">
      <div><p className="cc-overline">Altus Property Management · operations</p><h1 id="dashboard-title">Command center</h1><p className="cc-heading-note">See the signal. Review the record. Move the work forward.</p></div>
      <div className="cc-heading-actions"><button type="button" className="cc-secondary" onClick={retry} disabled={!!busy}><RefreshCw size={15} aria-hidden="true" />{busy ? "Refreshing…" : "Refresh figures"}</button><Link href="/portfolio/properties" className="cc-primary">Review properties <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    </header>

    <div className="cc-source-line" data-testid="dashboard-freshness"><span className={"cc-source-dot " + (showFigures ? "is-ready" : "")} aria-hidden="true" /><strong>{sourceStatus}</strong><span>Source: portfolio summary feed. {showFigures ? updatedText : "Figures are not confirmed."}</span></div>

    {status.mode === "failed" || unbound ? <div className="cc-connection-alert" role="alert" data-testid={status.failure === "denied" ? "state-denied" : "state-error"}>
      <ShieldAlert size={20} aria-hidden="true" /><div><strong>{failureTitle}</strong><p>{unbound ? "The workspace is running, but its protected data connection has not been configured. Retrying or refreshing the browser cannot create that connection. No operating figures are confirmed."
        : status.failure === "denied" ? "Cached figures are hidden. Confirm your access before retrying."
        : "No new figures can be confirmed. Retry the read or review the connection status."}</p></div>
      <button type="button" className="cc-secondary" onClick={retry} disabled={!!busy}>Retry</button>
      <Link href="/systems/integrations" className="cc-secondary">Connection status</Link>
    </div> : status.mode === "loading" ? <StateNotice kind="loading" title="Loading portfolio summary…" />
      : status.mode === "empty" ? <StateNotice kind="empty" title="No portfolio summary is available yet." onRetry={retry} retrying={isFetching} /> : null}

    {showFigures && status.refreshFailed ? <StateNotice kind={status.refreshFailed} title="Showing the last loaded figures; the latest refresh failed." onRetry={retry} retrying={isFetching} /> : null}
    {showFigures && status.coverage !== "full" ? <p className="cc-source-note" data-testid={status.coverage === "none" ? "state-empty" : "state-partial"}>Some summary values are not reported. Missing values stay unknown; they are not zero.</p> : null}
    {showFigures && status.freshness === "stale" ? <StateNotice kind="stale" title="These figures may be out of date." detail={updatedText} onRetry={retry} retrying={isFetching} /> : null}
    {showFigures && ["future", "invalid"].includes(status.freshness) ? <StateNotice kind="partial" title="The data source's update time can't be trusted." detail={updatedText} testId="state-timestamp" /> : null}

    <div className="cc-kpi-strip" aria-label="Reported portfolio figures">
      <KpiCard label="Properties" value={showFigures ? data.propertiesTotal : null} testId={DASHBOARD_KPI_TEST_IDS.PROPERTIES} />
      <KpiCard label="Units" value={showFigures ? data.unitsTotal : null} testId={DASHBOARD_KPI_TEST_IDS.UNITS} />
      <KpiCard label="Occupancy" value={showFigures ? data.occupancyRate : null} format="percent" decimals={1} testId={DASHBOARD_KPI_TEST_IDS.OCCUPANCY} />
      <KpiCard label="Revenue (30d)" value={showFigures ? data.revenue30dCents : null} format="currencyCents" testId={DASHBOARD_KPI_TEST_IDS.REVENUE} />
    </div>

    <div className={"cc-overview-layout" + (unbound && !showFigures ? " cc-overview-no-signal" : "")}>
      {(!unbound || showFigures) ? <section className="cc-signal cc-portfolio-signal" aria-labelledby="portfolio-signal-title"><header><div><p className="cc-overline">Portfolio signal</p><h2 id="portfolio-signal-title">Occupancy &amp; reported trend</h2></div></header>
        <div className="cc-portfolio-chart"><OccupancyPosition rate={showFigures ? data.occupancyRate : null} /><div className="cc-occupancy-history">{showFigures ? <OccupancyHistory series={data.series} /> : <p className="cc-inline-state">Occupancy history is unavailable. No historical observations have been confirmed.</p>}</div></div>
      </section> : null}
      <aside className="cc-workflow-rail" aria-labelledby="workflow-rail-title"><p className="cc-overline">Operational worklists</p><h2 id="workflow-rail-title">Start with the record</h2><nav aria-label="Portfolio workflows">
        <Link href="/ops/ai/renewal-forecasting"><span><strong>Plan lease reviews</strong><small>Reported end dates and records to verify</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
        <Link href="/ops/ai/vacancy-analytics"><span><strong>Review unit availability</strong><small>Reported status, condition and next review</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
        <Link href="/portfolio/leases"><span><strong>Review leases</strong><small>Open the lease and linked tenant records</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
        <Link href="/portfolio/owners"><span><strong>Review owners</strong><small>Owner records and linked properties</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
        <Link href="/ops/operations"><span><strong>Open operations</strong><small>Legal, maintenance and ledger availability</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
      </nav></aside>
    </div>
    <CommandWorkSurface key={epoch} leases={leases} units={units} today={today} />
    <details className="cc-capabilities"><summary>Data coverage &amp; additional operating intelligence</summary><p>Cash flow, collections, critical work orders, rent readiness, leasing conversion and city-level occupancy are not connected. They are not estimated from rent, status labels or property counts. Review lease dates and unit records above; unavailable feeds are not an all-clear.</p><Link href="/systems/integrations">Review integration status</Link></details>
  </section>;
}

export default function DashboardPage() {
  return <DashboardView query={useDashboardKpis()} leases={useAllLeases()} units={useAllUnits()} today={usePlanningDate()} epoch={useSessionEpoch()} />;
}
