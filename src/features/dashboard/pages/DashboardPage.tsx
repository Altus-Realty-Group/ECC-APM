import React from "react";
import { useDashboardKpis } from "@/features/dashboard/hooks/useDashboardKpis";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { Sparkline } from "@/features/dashboard/components/Sparkline";
import { DASHBOARD_KPI_TEST_IDS } from "@/features/dashboard/constants/testIds";
import { deriveDashboardStatus } from "@/features/dashboard/dashboardStatus";
import StateNotice from "@/components/ui/StateNotice";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardKpis();
  const retry = () => { void refetch(); };
  const status = deriveDashboardStatus({ isLoading, isError, error, data });

  if (status.mode === "loading") {
    return <div className="p-6"><StateNotice kind="loading" title="Loading portfolio summary…" /></div>;
  }

  if (status.mode === "failed") {
    const denied = status.failure === "denied";
    return (
      <div className="p-6">
        <StateNotice
          kind={denied ? "denied" : "error"}
          title={denied ? "You don't have access to the portfolio summary." : "The portfolio summary could not be loaded."}
          detail={denied ? "Ask an administrator to confirm your access, then try again." : "Check your connection and try again."}
          onRetry={retry}
          retrying={isFetching}
        />
      </div>
    );
  }

  if (status.mode === "empty" || !data) {
    return <div className="p-6"><StateNotice kind="empty" title="No portfolio summary is available yet." onRetry={retry} retrying={isFetching} /></div>;
  }

  const updatedText = data.lastUpdated
    ? `Updated ${new Date(data.lastUpdated).toLocaleString()}`
    : "Update time not reported";
  const series = data.series.map((p) => ({ date: p.date, value: p.occupancy * 100 }));

  return (
    <div className="dashboard-grid p-6 space-y-6">
      {/* Refresh failed but earlier figures are still shown. */}
      {status.refreshFailed ? (
        <StateNotice
          kind={status.refreshFailed}
          title="Showing the last loaded figures; the latest refresh failed."
          onRetry={retry}
          retrying={isFetching}
        />
      ) : null}

      {status.coverage === "none" ? (
        <StateNotice
          kind="empty"
          title="The portfolio summary returned no figures."
          detail="Metrics below are shown as not reported rather than as zero."
          onRetry={retry}
          retrying={isFetching}
        />
      ) : null}

      {status.coverage === "partial" ? (
        <StateNotice kind="partial" title={`Some figures were not reported: ${status.missing.join(", ")}.`} />
      ) : null}

      {status.stale === true ? (
        <StateNotice kind="stale" title="These figures may be out of date." detail={updatedText} onRetry={retry} retrying={isFetching} />
      ) : null}

      <div className="ecc-kpi-grid">
        <KpiCard label="Properties" value={data.propertiesTotal} testId={DASHBOARD_KPI_TEST_IDS.PROPERTIES} />
        <KpiCard label="Units" value={data.unitsTotal} testId={DASHBOARD_KPI_TEST_IDS.UNITS} />
        <KpiCard label="Occupancy" value={data.occupancyRate} format="percent" decimals={1} testId={DASHBOARD_KPI_TEST_IDS.OCCUPANCY} />
        <KpiCard label="Revenue (30d)" value={data.revenue30dCents} format="currencyCents" testId={DASHBOARD_KPI_TEST_IDS.REVENUE} />
      </div>

      <Sparkline data={series} />

      <p className="ecc-muted" data-testid="dashboard-freshness">
        Source: portfolio summary feed. {status.stale === true ? "" : updatedText}
      </p>
    </div>
  );
}
