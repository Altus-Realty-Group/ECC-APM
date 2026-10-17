import React, { useMemo, useState } from "react";
import FilterBar from "../../components/FilterBar";
import DataTable, { type DataColumn } from "../../components/DataTable";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard } from "@/lib/useAccessGuard";
import { useAllOwners } from "../../lib/ecc-resolvers";
import { BLANK } from "@/lib/format";

type OwnerRow = {
  id: string;
  name: string;
  portfolio: string;
  email: string;
  phone: string;
};

export default function Owners() {
  const [q, setQ] = useState("");
  const query = useAllOwners();
  const { isLoading, isFetching, error, refetch } = query;
  const { data, denied } = accessGuard(query);

  const rows = useMemo(() => {
    if (!data) return [];
    const mapped: OwnerRow[] = data.map((owner: any) => ({
      id: String(owner.id ?? BLANK),
      name: owner.name ?? owner.display_name ?? owner.entity_name ?? BLANK,
      portfolio: owner.portfolio ?? owner.portfolio_name ?? BLANK,
      email: owner.email ?? BLANK,
      phone: owner.phone ?? BLANK,
    }));
    const needle = q.trim().toLowerCase();
    if (!needle) return mapped;
    return mapped.filter((r) =>
      [r.name, r.portfolio, r.id, r.email].join(" ").toLowerCase().includes(needle)
    );
  }, [data, q]);

  const columns: DataColumn<OwnerRow>[] = [
    { key: "id", header: "Owner ID" },
    { key: "name", header: "Owner / Entity" },
    { key: "portfolio", header: "Portfolio" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
  ];

  if (isLoading || (isFetching && !data)) {
    return (
      <section className="ecc-page">
        <StateNotice kind="loading" title="Loading owners…" />
      </section>
    );
  }

  if (denied || error) {
    return (
      <section className="ecc-page">
        <StateNotice
          kind={denied ? "denied" : "error"}
          title={denied ? "You don't have access to owners." : "Owners could not be loaded."}
          detail={denied ? "No owner records are shown." : "Check your connection and try again."}
          onRetry={() => { void refetch(); }}
          retrying={isFetching}
        />
      </section>
    );
  }

  if (!data || data.length === 0) {
    return (
      <section className="ecc-page">
        <StateNotice kind="empty" title="No owners are available yet." onRetry={() => { void refetch(); }} retrying={isFetching} />
      </section>
    );
  }

  return (
    <section className="ecc-page">
      <FilterBar title="Owners" value={q} onChange={setQ} placeholder="Search name / portfolio / id" />
      <DataTable
        columns={columns}
        rows={rows}
        rowHref={(r) => `/card/owner/${r.id}`}
        getRowId={(r) => r.id}
      />
    </section>
  );
}
