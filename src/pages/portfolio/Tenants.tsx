import "./styles/list-search.css";
import React, { useMemo, useState } from "react";
import DataTable, { type DataColumn } from "../../components/DataTable";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard, useResetOnAccessLoss } from "@/lib/useAccessGuard";
import { useAllTenants } from "../../lib/ecc-resolvers";
import { BLANK } from "@/lib/format";
import { reportedStatus, safeCardHref } from "./portfolioTruth";

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
  useResetOnAccessLoss(denied, () => setQ(""));

  const rows = useMemo(() => {
    if (!data) return [];
    const mapped: TenantRow[] = data.map((tenant: any) => ({
      id: tenant.id != null ? String(tenant.id) : "",
      name: tenant.name ?? BLANK,
      property: tenant.propertyName ?? BLANK,
      unit: tenant.unitLabel ?? BLANK,
      email: tenant.email ?? BLANK,
      phone: tenant.phone ?? BLANK,
      status: reportedStatus(tenant.type) ?? BLANK, // TenantOut uses type, not status; do not invent Current
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
    { key: "status", header: "Type" },
  ];

  if (isLoading || (isFetching && !data)) {
    return (
      <section className="ecc-page">
        <header className="ecc-collection-heading"><h1>Tenants</h1><p>Find tenants, review their reported lease context and open a tenant record.</p></header>
        <StateNotice kind="loading" title="Loading tenants…" />
      </section>
    );
  }

  if (denied || error) {
    return (
      <section className="ecc-page">
        <header className="ecc-collection-heading"><h1>Tenants</h1><p>Find tenants, review their reported lease context and open a tenant record.</p></header>
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
        <header className="ecc-collection-heading"><h1>Tenants</h1><p>Find tenants, review their reported lease context and open a tenant record.</p></header>
        <StateNotice kind="empty" title="No tenants are available yet." onRetry={() => { void refetch(); }} retrying={isFetching} />
      </section>
    );
  }

  return (
    <section className="ecc-page">
      <header className="ecc-collection-heading"><h1>Tenants</h1><p>Find tenants, review their reported lease context and open a tenant record.</p></header>
      <div className="ecc-list-search">
        <label htmlFor="tenants-search">Search tenants</label>
        <input
          id="tenants-search"
          className="ecc-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, property, type or email"
          aria-label="Search tenants"
        />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowHref={(r) => safeCardHref("tenant", r.id)}
        getRowId={(r) => r.id || "blank"}
      />
    </section>
  );
}
