import React, { useMemo, useState } from "react";
import FilterBar from "../../components/FilterBar";
import DataTable, { type DataColumn } from "../../components/DataTable";
import { useAllTenants } from "../../lib/ecc-resolvers";
import { formatNumber, formatPercent, formatCurrencyFromCents, BLANK } from "@/lib/format";

type TenantRow = {
  id: string;
  name: string;
  property: string;
  unit: string;
  email: string;
  phone: string;
  status: "Current" | "Former" | "Prospect";
};

export default function Tenants() {
  const [q, setQ] = useState("");
  const { data, isLoading, isFetching, error } = useAllTenants();

  const rows = useMemo(() => {
    if (!data) return [];
    
    // Map API data to table format
    const mapped: TenantRow[] = data.map((tenant: any) => ({
      id: String(tenant.id),
      name: tenant.display_name ?? tenant.name ?? `Tenant ${tenant.id}`,
      property: tenant.property_name ?? BLANK,
      unit: tenant.unit_label ?? BLANK,
      email: tenant.email ?? BLANK,
      phone: tenant.phone ?? BLANK,
      status: tenant.status ?? "Current"
    }));

    // Apply search filter
    const t = q.trim().toLowerCase();
    if (!t) return mapped;
    return mapped.filter(r =>
      r.name.toLowerCase().includes(t) ||
      r.property.toLowerCase().includes(t) ||
      r.unit.toLowerCase().includes(t) ||
      r.status.toLowerCase().includes(t)
    );
  }, [data, q]);

  const columns: DataColumn<TenantRow>[] = [
    { key: "name", header: "Tenant" },
    { key: "property", header: "Property" },
    { key: "unit", header: "Unit" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "status", header: "Status" },
  ];

  return (
    <section className="ecc-page">
      <FilterBar 
        title="Tenants" 
        value={q} 
        onChange={setQ} 
        placeholder="Search name / property / status" 
      />
      <DataTable 
        columns={columns} 
        rows={rows} 
        loading={isLoading || (isFetching && rows.length === 0)}
        error={error ? String(error) : undefined}
        rowHref={(r) => `/card/tenant/${r.id}`}
        getRowId={(r) => r.id}
      />
    </section>
  );
}