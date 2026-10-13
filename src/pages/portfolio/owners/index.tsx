import React, { useMemo } from "react";
import DataTable from "../../../components/DataTable";
import { useAllOwners, useAllProperties } from "../../../lib/ecc-resolvers";
import { OWNER_COLUMNS, mapOwner } from "../columns";
import "../../../styles/table.css";

export default function OwnersPage() {
  const owners = useAllOwners();
  const properties = useAllProperties();

  const { rows, loading, error } = useMemo(() => {
    // Backend already provides structured data
    // Use it directly with minimal mapping
    const mapped = (owners.data || []).map(mapOwner);

    return {
      rows: mapped,
      loading: owners.isLoading,
      error: owners.error ? String(owners.error.message ?? owners.error) : undefined,
    };
  }, [owners]);


  const kpis = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((o) => o.active).length;
    // Count properties by owner_id if available, else use total
    const totalProps = Array.isArray(properties.data) ? properties.data.length : 0;
    return { total, active, totalProps };
  }, [rows, properties.data]);

  return (
    <section className="ecc-page">
      <div className="ecc-kpis">
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.total}</div>
          <div className="ecc-kpi-l">Total Owners</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.active}</div>
          <div className="ecc-kpi-l">Active</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.totalProps}</div>
          <div className="ecc-kpi-l">Total Properties</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">—</div>
          <div className="ecc-kpi-l">—</div>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={OWNER_COLUMNS}
        loading={loading}
        error={error}
        csvName="owners"
        drawerTitle={(row) => row.company || `Owner ${row.id}`}
        rowHref={(row) => `/card/owner/${row.id}`}
      />
    </section>
  );
}
