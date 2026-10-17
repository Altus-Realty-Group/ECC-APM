import React, { useMemo, useState } from "react";
import FilterBar from "../../components/FilterBar";
import DataTable, { type DataColumn } from "../../components/DataTable";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard } from "@/lib/useAccessGuard";
import { useAllTenants } from "../../lib/ecc-resolvers";
import { BLANK } from "@/lib/format";
import { reportedStatus } from "./portfolioTruth";

type TenantRow = {
  id: string;
  name: string;
  property: string;
  unit: string;
  email: string;
  phone: string;
  status: string;
};

export default function Tenants() {
  const [q, setQ] = useState("");
  const query = useAllTenants();
  const { isLoading, isFetching, error, refetch } = query;
  const { data, denied } = accessGuard(query);

  const rows = useMemo(() => {
    if (!data) return [];
    const mapped: TenantRow[] = data.map((tenant: any) => ({
      id: String(tenant.id),
      name: tenant.display_name ?? tenant.name ?? `Tenant ${tenant.id}`,
      property: tenant.property_name ?? BLANK,
      unit: tenant.unit_label ?? BLANK,
      email: tenant.email ?? BLANK,
      phone: tenant.phone ?? BLANK,
      status: reportedStatus(tenant.status) ?? BLANK,
    }));
    const needle = q.trim().toLowerCase();
    if (!needle) return mapped;
    return mapped.filter((r) =>
      [r.name, r.property, r.unit, r.status, r.email].join(" ").toLowerCase().includes(needle)
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

  if (isLoading || (isFetching && !data)) {
    return (
      <section className="ecc-page">
        <StateNotice kind="loading" title="Loading tenants…" />
      </section>
    );
  }

  if (denied || error) {
    return (
      <section className="ecc-page">
        <StateNotice
          kind={denied ? "denied" : "error"}
          title={denied ? "You don't have access to tenants." : "Tenants could not be loaded."}
          detail="No tenant records are shown."
          onRetry={() => { void refetch(); }}
          retrying={isFetching}
        />
      </section>
    );
  }

  if (!data || data.length === 0) {
    return (
      <section className="ecc-page">
        <StateNotice kind="empty" title="No tenants are available yet." onRetry={() => { void refetch(); }} retrying={isFetching} />
      </section>
    );
  }

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
        rowHref={(r) => `/card/tenant/${r.id}`}
        getRowId={(r) => r.id}
      />
    </section>
  );
}
