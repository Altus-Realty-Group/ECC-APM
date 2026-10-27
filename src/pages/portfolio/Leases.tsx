import React, { useMemo, useState } from "react";
import DataTable, { type DataColumn } from "../../components/DataTable";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard, useResetOnAccessLoss } from "@/lib/useAccessGuard";
import { useAllLeases } from "../../lib/ecc-resolvers";
import { BLANK } from "@/lib/format";
import { knownRentDollars, summarizeActiveRent, safeCardHref, joinTenants, reportedStatus } from "./portfolioTruth";
import "./leases/leases-list.css";

type LeaseRow = {
  id: string;
  tenants: string;
  property: string;
  rent: number | null;
  start: string;
  end: string;
  status: string;
};

function moneyOrBlank(rent: number | null): string {
  if (rent === null || !Number.isFinite(rent) || rent < 0) return BLANK;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(rent);
}

export default function LeasesPage() {
  const [q, setQ] = useState("");
  const query = useAllLeases();
  const { isLoading, isFetching, error, refetch } = query;
  const { data, denied } = accessGuard(query);
  useResetOnAccessLoss(denied, () => setQ(""));

  const rows = useMemo<LeaseRow[]>(() => {
    if (!data) return [];
    return data.map((l: any) => {
      const rent = knownRentDollars(l);
      const status = reportedStatus(l.status) ?? BLANK;
      const tenants = joinTenants(l.tenants) || BLANK;
      return {
        id: l.id != null ? String(l.id) : "",
        tenants,
        property: l.propertyName ?? BLANK,
        rent,
        start: l.start ?? BLANK,
        end: l.end ?? BLANK,
        status,
      };
    }).filter((r) => {
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return [r.tenants, r.property, r.status, r.id].join(" ").toLowerCase().includes(needle);
    });
  }, [data, q]);

  const summary = summarizeActiveRent(rows);

  const columns: DataColumn<LeaseRow>[] = [
    { key: "tenants", header: "TENANT(S)" },
    { key: "property", header: "PROPERTY" },
    {
      key: "rent",
      header: "RENT",
      align: "right",
      type: "number",
      render: (_v, r) => moneyOrBlank(r.rent),
    },
    { key: "start", header: "START" },
    { key: "end", header: "END" },
    { key: "status", header: "STATUS" },
  ];

  if (isLoading || (isFetching && !data)) {
    return <StateNotice kind="loading" title="Loading leases…" />;
  }

  if (denied || error) {
    return (
      <StateNotice
        kind={denied ? "denied" : "error"}
        title={denied ? "You don't have access to leases." : "Leases could not be loaded."}
        detail={denied ? "No lease records or revenue figures are shown." : "No figures are shown because the read failed. Try again."}
        onRetry={() => { void refetch(); }}
        retrying={isFetching}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <StateNotice
        kind="empty"
        title="No leases are available yet."
        detail="No revenue figures are shown. Counts and rent below would be loaded-result statistics only."
        onRetry={() => { void refetch(); }}
        retrying={isFetching}
      />
    );
  }

  const mrrLabel = summary.total === null
    ? "Loaded MRR not reported"
    : summary.partial
      ? `Loaded MRR (partial, ${summary.knownCount}/${summary.activeCount} active loaded)`
      : "Loaded MRR";

  const mrrValue = summary.total === null ? BLANK : moneyOrBlank(summary.total);

  return (
    <div className="ecc-page">
      <div className="ecc-leases-search">
        <label htmlFor="leases-search">Search leases</label>
        <input
          id="leases-search"
          className="ecc-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tenant, property, status or id"
          aria-label="Search leases"
        />
      </div>
      <div className="ecc-kpis" data-testid="leases-kpis">
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{rows.length.toLocaleString()}</div>
          <div className="ecc-kpi-l">LOADED LEASES</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{summary.activeCount.toLocaleString()}</div>
          <div className="ecc-kpi-l">LOADED ACTIVE</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{mrrValue}</div>
          <div className="ecc-kpi-l">{mrrLabel}</div>
        </div>
      </div>
      {summary.partial ? (
        <StateNotice
          kind="partial"
          title={
            summary.unclassifiedCount > 0
              ? "Loaded rent summary is uncertain."
              : "Some loaded active lease rents were not reported."
          }
          detail={
            summary.unclassifiedCount > 0
              ? `${summary.unclassifiedCount} loaded lease(s) have missing or unclassified status. They are not assumed active or inactive. The loaded MRR includes only explicitly active leases with a reported non-negative rent. Missing or invalid rents are not treated as zero. These are loaded-result statistics, not proven full-portfolio totals.`
              : "The loaded MRR includes only leases with a reported non-negative rent. Missing or invalid rents are not treated as zero. These are loaded-result statistics, not proven full-portfolio totals."
          }
        />
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        rowHref={(r) => safeCardHref("lease", r.id)}
        getRowId={(r) => r.id || "blank"}
      />
    </div>
  );
}
