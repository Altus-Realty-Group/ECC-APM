import React, { useMemo } from "react";
import DataTable from "../../../components/DataTable";
import { useAllTenants } from "../../../lib/ecc-resolvers";
import { TENANT_COLUMNS, mapTenant } from "../columns";
import "../../../styles/table.css";

export default function TenantsPage() {
  const tenants = useAllTenants();

  const { rows, loading, error } = useMemo(() => {
    // Backend already provides structured data with relationships
    // Use it directly with minimal mapping
    const mapped = (tenants.data || []).map(mapTenant);

    return {
      rows: mapped,
      loading: tenants.isLoading,
      error: tenants.error ? String(tenants.error.message ?? tenants.error) : undefined,
    };
  }, [tenants]);


  const kpis = useMemo(() => {
    const total = rows.length;
    const contactable = rows.filter((r) => r.email !== "—" || r.phone !== "—").length;
    const withBalance = rows.filter((r) => Number.isFinite(Number(r.balance)) && Number(r.balance) > 0).length;
    const totalBalance = rows.reduce((s, r) => s + (Number.isFinite(Number(r.balance)) ? Number(r.balance) : 0), 0);
    return { total, contactable, withBalance, totalBalance };
  }, [rows]);

  return (
    <section className="ecc-page">
      <div className="ecc-kpis">
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.total}</div>
          <div className="ecc-kpi-l">Total Tenants</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.contactable}</div>
          <div className="ecc-kpi-l">Contactable</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.withBalance}</div>
          <div className="ecc-kpi-l">With Balance</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">${kpis.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="ecc-kpi-l">Total Balance</div>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={TENANT_COLUMNS}
        loading={loading}
        error={error}
        csvName="tenants"
        drawerTitle={(row) => row.name || `Tenant ${row.id}`}
        rowHref={(row) => `/card/tenant/${row.id}`}
      />
    </section>
  );
}
