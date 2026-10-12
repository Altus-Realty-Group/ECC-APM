import * as React from "react";
import DataTable, { Column } from "../../components/DataTable";
import { useCollection } from "../../features/data/useCollection";
import { money, shortDate } from "../../utils/format";
import { indexBy } from "../../utils/dict";

type Lease = {
  id: string | number;
  property_id?: string | number;
  unit_id?: string | number;
  primary_tenant_id?: string | number;
  tenant_id?: string | number;
  rent?: number;
  rent_cents?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
};

type Property = { id: string | number; name?: string };
type Tenant = {
  id: string | number;
  display_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
};

type Row = {
  tenants: string;
  property: string;
  rent: number;
  start: string;
  end: string;
  status: string;
};

export default function LeasesPage() {
  // Pull raw data
  const leases = useCollection<Lease>("leases");
  const props = useCollection<Property>("properties");
  const tenants = useCollection<Tenant>("tenants");

  // Fast lookup maps
  const pById = React.useMemo(() => indexBy(props.data, "id"), [props.data]);
  const tById = React.useMemo(() => indexBy(tenants.data, "id"), [tenants.data]);

  // Normalize rows the table needs (defensive against schema drift)
  const rows: Row[] = React.useMemo(() => {
    return leases.data.map((l) => {
      const prop = (pById as any)[l.property_id]?.name || "Unknown property";
      const t1 = (tById as any)[l.primary_tenant_id];
      const t2 = (tById as any)[l.tenant_id];

      const tn =
        t1?.display_name ||
        t1?.full_name ||
        [t1?.first_name, t1?.last_name].filter(Boolean).join(" ") ||
        t2?.display_name ||
        t2?.full_name ||
        [t2?.first_name, t2?.last_name].filter(Boolean).join(" ") ||
        "No tenant assigned";

      const rent =
        typeof l.rent === "number"
          ? l.rent
          : typeof l.rent_cents === "number"
          ? Math.round(l.rent_cents) / 100
          : 0;

      return {
        tenants: tn,
        property: prop,
        rent,
        start: l.start_date || "",
        end: l.end_date || "",
        status: String(l.status || "").toLowerCase() || "unknown",
      };
    });
  }, [leases.data, pById, tById]);

  // KPIs
  const total = rows.length;
  const active = rows.filter((r) => r.status === "active");
  const ended = rows.filter((r) => r.status === "ended");
  const mrr = active.reduce((s, r) => s + (Number.isFinite(Number(r.rent)) ? Number(r.rent) : 0), 0);
  const avg = rows.length
    ? rows.reduce((s, r) => s + (Number.isFinite(Number(r.rent)) ? Number(r.rent) : 0), 0) / rows.length
    : 0;

  // Columns
  const columns: Column<Row>[] = [
    { key: "tenants", header: "TENANT(S)" },
    { key: "property", header: "PROPERTY" },
    {
      key: "rent",
      header: "RENT",
      className: "is-right",
      render: (r) => money(r.rent),
      sort: (a, b) => (Number.isFinite(Number(a.rent)) ? Number(a.rent) : 0) - (Number.isFinite(Number(b.rent)) ? Number(b.rent) : 0),
    },
    { key: "start", header: "START", render: (r) => shortDate(r.start) },
    { key: "end", header: "END", render: (r) => shortDate(r.end) },
    { key: "status", header: "STATUS" },
  ];

  return (
    <div>
      {/* KPI strip (styled by .ecc-kpis in table.css) */}
      <div className="ecc-kpis">
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{total.toLocaleString()}</div>
          <div className="ecc-kpi-l">LEASES</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{active.length.toLocaleString()}</div>
          <div className="ecc-kpi-l">ACTIVE</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{ended.length.toLocaleString()}</div>
          <div className="ecc-kpi-l">ENDED</div>
        </div>
        <div className="ecc-kpi">
          <div className="ecc-kpi-n">{money(mrr)}</div>
          <div className="ecc-kpi-l">MRR</div>
        </div>
      </div>

      <DataTable rows={rows} columns={columns} />
    </div>
  );
}


