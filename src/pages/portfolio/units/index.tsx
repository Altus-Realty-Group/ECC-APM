import React, { useMemo } from "react";
import DataTable from "../../../components/DataTable";
import { useAllUnits } from "../../../lib/ecc-resolvers";
import { UNIT_COLUMNS, mapUnit } from "../columns";
import "../../../styles/table.css";

export default function UnitsPage() {
  const units = useAllUnits();

  const { rows, loading, error } = useMemo(() => {
    // Backend provides structured data - apply mapping for consistency
    const mapped = (units.data || []).map(mapUnit);
    
    return {
      rows: mapped,
      loading: units.isLoading,
      error: units.error ? String(units.error.message ?? units.error) : undefined,
    };
  }, [units]);


  const kpis = useMemo(() => {
    const total = rows.length;
    const occupied = rows.filter((r) => String(r.status).toLowerCase() === "occupied").length;
    const vacant = total - occupied;
    const avgRent = rows.length > 0 ? rows.reduce((s, r) => s + (Number.isFinite(Number(r.marketRent)) ? Number(r.marketRent) : 0), 0) / rows.length : null;
    return { total, occupied, vacant, avgRent };
  }, [rows]);

  return (
    <section className="ecc-page">
      <div className="ecc-kpis">
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.total}</div>
          <div className="ecc-kpi-l">Units</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.occupied}</div>
          <div className="ecc-kpi-l">Occupied</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.vacant}</div>
          <div className="ecc-kpi-l">Vacant</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{kpis.avgRent === null ? "\u2014" : `$${kpis.avgRent.toFixed(0)}`}</div>
          <div className="ecc-kpi-l">Avg Market Rent</div>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={UNIT_COLUMNS}
        loading={loading}
        error={error}
        csvName="units"
        drawerTitle={(row) => `${row.property} - Unit ${row.unit}`}
        rowHref={(row) => `/card/unit/${row.id}`}
      />
    </section>
  );
}
