import React, { useMemo } from "react";
import DataTable, { type DataColumn } from "../../components/DataTable";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard } from "@/lib/useAccessGuard";
import { useAllLeases } from "../../lib/ecc-resolvers";
import { BLANK, formatCurrencyFromCents } from "@/lib/format";
import { knownRentDollars, summarizeActiveRent } from "./portfolioTruth";

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
  if (rent === null || !Number.isFinite(rent)) return BLANK;
  // Preserve reported zero. Format as currency dollars without inventing unit conversion beyond the existing rent/rent_cents contract.
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(rent);
}

export default function LeasesPage() {
  const query = useAllLeases();
  const { isLoading, isFetching, error, refetch } = query;
  const { data, denied } = accessGuard(query);

  const rows = useMemo<LeaseRow[]>(() => {
    if (!data) return [];
    return data.map((l: any) => {
      const rent = knownRentDollars(l);
      const status = l.status != null && String(l.status).trim() !== "" ? String(l.status) : BLANK;
      return {
        id: String(l.id ?? ""),
        tenants: l.tenant_name ?? l.display_name ?? BLANK,
        property: l.property_name ?? l.property ?? BLANK,
        rent,
        start: l.start_date ?? BLANK,
        end: l.end_date ?? BLANK,
        status,
      };
    });
  }, [data]);

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
        detail="No revenue figures are shown."
        onRetry={() => { void refetch(); }}
        retrying={isFetching}
      />
    );
  }

  const mrrLabel = summary.total === null
    ? "MRR not reported"
    : summary.partial
      ? `MRR (partial, ${summary.knownCount}/${summary.activeCount} active)`
      : "MRR";

  const mrrValue = summary.total === null ? BLANK : moneyOrBlank(summary.total);

  return (
    <div className="ecc-page">
      <div className="ecc-kpis" data-testid="leases-kpis">
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{rows.length.toLocaleString()}</div>
          <div className="ecc-kpi-l">LEASES</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{summary.activeCount.toLocaleString()}</div>
          <div className="ecc-kpi-l">ACTIVE</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{mrrValue}</div>
          <div className="ecc-kpi-l">{mrrLabel}</div>
        </div>
      </div>
      {summary.partial && summary.total !== null ? (
        <StateNotice
          kind="partial"
          title="Some active lease rents were not reported."
          detail="The MRR figure includes only leases with a reported rent. Missing rents are not treated as zero."
        />
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        rowHref={(r) => r.id ? `/card/lease/${r.id}` : undefined}
        getRowId={(r) => r.id}
      />
    </div>
  );
}
