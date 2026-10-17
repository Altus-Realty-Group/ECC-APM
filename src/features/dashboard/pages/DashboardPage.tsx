import React from "react";
import { Link } from "wouter";
import "./dashboard-workflow.css";
import { useDashboardKpis } from "@/features/dashboard/hooks/useDashboardKpis";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import OccupancyHistory from "@/components/recovery/OccupancyHistory";
import { DASHBOARD_KPI_TEST_IDS } from "@/features/dashboard/constants/testIds";
import { deriveDashboardStatus } from "@/features/dashboard/dashboardStatus";
import StateNotice from "@/components/ui/StateNotice";

type DashboardQuery = Pick<ReturnType<typeof useDashboardKpis>,
  "data" | "isLoading" | "isError" | "error" | "refetch" | "isFetching">;

/** Keeps the same operator context and next actions around every source state. */
export function DashboardView({ query }: { query: DashboardQuery }) {
  const { data, isLoading, isError, error, refetch, isFetching } = query;
  const retry = () => { void refetch(); };
  const status = deriveDashboardStatus({ isLoading, isError, error, data });

  const updatedText = data?.lastUpdated
    ? `Updated ${new Date(data!.lastUpdated!).toLocaleString()}`
    : status.freshness === "future"
      ? "The reported update time is in the future, so freshness cannot be confirmed"
      : status.freshness === "invalid"
        ? "The reported update time is not valid, so freshness cannot be confirmed"
        : "Update time not reported";

  const showFigures = status.mode === "ready" && data;
  const sourceStatus = status.mode === "loading" ? "Loading summary"
    : status.mode === "failed" ? "Summary unavailable"
    : status.mode === "empty" ? "Summary not yet available"
    : status.refreshFailed ? "Last loaded figures"
    : status.freshness === "stale" ? "Older figures"
    : status.freshness === "fresh" ? "Source updated"
    : "Update time unconfirmed";

  let unavailable: React.ReactNode = null;
  if (status.mode === "loading") {
    unavailable = <StateNotice kind="loading" title="Loading portfolio summary…" />;
  } else if (status.mode === "failed") {
    const denied = status.failure === "denied";
    unavailable = <StateNotice
      kind={denied ? "denied" : "error"}
      title={denied ? "You don't have access to the portfolio summary."
        : status.contractViolation ? "The portfolio summary came back in an unexpected format."
        : "The portfolio summary could not be loaded."}
      detail={denied ? "No figures are shown. Ask an administrator to confirm your access, then try again."
        : status.contractViolation ? "No figures are shown because they could not be trusted. Try again; if it keeps happening, report it to the data owner."
        : "Check your connection and try again. You can still open your portfolio pages below."}
      onRetry={retry} retrying={isFetching}
    />;
  } else if (status.mode === "empty" || !data) {
    unavailable = <StateNotice kind="empty" title="No portfolio summary is available yet." onRetry={retry} retrying={isFetching} />;
  }

  return (
    <section className="ecc-dashboard" aria-labelledby="dashboard-title">
      <header className="ecc-dashboard-header">
        <div>
          <p className="ecc-dashboard-eyebrow">Portfolio overview</p>
          <h1 id="dashboard-title">Dashboard</h1>
          <p>Review portfolio performance, then open the records that need your attention.</p>
        </div>
        <Link className="ecc-dashboard-primary" href="/portfolio/properties">Review properties <span aria-hidden="true">→</span></Link>
      </header>

      <div className="ecc-dashboard-source" data-testid="dashboard-freshness">
        <span className="ecc-dashboard-source-status">{sourceStatus}</span>
        <p>Source: portfolio summary feed. {showFigures ? updatedText : "Figures are not confirmed."}</p>
        {showFigures ? <button type="button" onClick={retry} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh figures"}
        </button> : null}
      </div>

      {unavailable}

      {showFigures ? <>
        <div className="ecc-dashboard-notices">
          {status.refreshFailed ? <StateNotice kind={status.refreshFailed}
            title="Showing the last loaded figures; the latest refresh failed."
            onRetry={retry} retrying={isFetching} /> : null}
          {status.coverage === "none" ? <StateNotice kind="empty"
            title="The portfolio summary returned no figures."
            detail="Metrics below are shown as not reported rather than as zero."
            onRetry={retry} retrying={isFetching} /> : null}
          {status.coverage === "partial" ? <StateNotice kind="partial"
            title={`Some figures were not reported: ${status.missing.join(", ")}.`} /> : null}
          {status.freshness === "stale" ? <StateNotice kind="stale"
            title="These figures may be out of date." detail={updatedText}
            onRetry={retry} retrying={isFetching} /> : null}
          {status.freshness === "future" || status.freshness === "invalid" ? <StateNotice kind="partial"
            title="The data source's update time can't be trusted." detail={updatedText} testId="state-timestamp" /> : null}
        </div>

        <section className="ecc-dashboard-snapshot" aria-labelledby="dashboard-snapshot-title">
          <div className="ecc-dashboard-section-heading">
            <h2 id="dashboard-snapshot-title">Portfolio snapshot</h2>
            <p>Reported figures · missing values stay unreported</p>
          </div>
          <div className="ecc-kpi-grid ecc-dashboard-metrics">
            <KpiCard label="Properties" value={data.propertiesTotal} testId={DASHBOARD_KPI_TEST_IDS.PROPERTIES} />
            <KpiCard label="Units" value={data.unitsTotal} testId={DASHBOARD_KPI_TEST_IDS.UNITS} />
            <KpiCard label="Occupancy" value={data.occupancyRate} format="percent" decimals={1} testId={DASHBOARD_KPI_TEST_IDS.OCCUPANCY} />
            <KpiCard label="Revenue (30d)" value={data.revenue30dCents} format="currencyCents" testId={DASHBOARD_KPI_TEST_IDS.REVENUE} />
          </div>
        </section>
      </> : null}

      <div className={`ecc-dashboard-workspace${showFigures ? " ecc-dashboard-workspace--with-history" : ""}`}>
        {showFigures ? <div className="ecc-dashboard-history">
          <p className="ecc-dashboard-section-note">Use the reported history to review changes in occupancy.</p>
          <OccupancyHistory series={data.series} />
        </div> : null}
        <section className="ecc-dashboard-workflows" aria-labelledby="dashboard-workflows-title">
          <h2 id="dashboard-workflows-title">Continue your work</h2>
          <p>Open the records behind your next decision.</p>
          <nav aria-label="Portfolio workflows">
            <Link href="/portfolio/leases"><span><strong>Review leases</strong><small>Check lease records and reported rent.</small></span><span aria-hidden="true">→</span></Link>
            <Link href="/portfolio/owners"><span><strong>Review owners</strong><small>Open owner records and linked properties.</small></span><span aria-hidden="true">→</span></Link>
            <Link href="/ops/operations"><span><strong>Open operations</strong><small>Review availability of legal cases, work orders and tenant ledgers.</small></span><span aria-hidden="true">→</span></Link>
          </nav>
        </section>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return <DashboardView query={useDashboardKpis()} />;
}
