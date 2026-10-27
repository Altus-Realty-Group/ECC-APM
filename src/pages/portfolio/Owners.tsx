import "./styles/list-search.css";
import React, { useMemo, useState } from "react";
import DataTable, { type DataColumn } from "../../components/DataTable";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard, useResetOnAccessLoss } from "@/lib/useAccessGuard";
import { useAllOwners } from "../../lib/ecc-resolvers";
import { BLANK } from "@/lib/format";
import { safeCardHref } from "./portfolioTruth";

type OwnerRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
};

export default function Owners() {
  const [q, setQ] = useState("");
  const query = useAllOwners();
  const { isLoading, isFetching, error, refetch } = query;
  const { data, denied } = accessGuard(query);
  useResetOnAccessLoss(denied, () => setQ(""));

  const rows = useMemo(() => {
    if (!data) return [];
    const mapped: OwnerRow[] = data.map((owner: any) => ({
      id: owner.id != null ? String(owner.id) : "",
      name: owner.name ?? BLANK,
      company: owner.company ?? BLANK,
      email: owner.email ?? BLANK,
      phone: owner.phone ?? BLANK,
    }));
    const needle = q.trim().toLowerCase();
    if (!needle) return mapped;
    return mapped.filter((r) =>
      [r.name, r.company, r.id, r.email].join(" ").toLowerCase().includes(needle)
    );
  }, [data, q]);

  const columns: DataColumn<OwnerRow>[] = [
    { key: "id", header: "Owner ID" },
    { key: "name", header: "Name" },
    { key: "company", header: "Company" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
  ];

  if (isLoading || (isFetching && !data)) {
    return (
      <section className="ecc-page">
        <header className="ecc-collection-heading"><h1>Owners</h1><p>Find owners and open their portfolio and contact records.</p></header>
        <StateNotice kind="loading" title="Loading owners…" />
      </section>
    );
  }

  if (denied || error) {
    return (
      <section className="ecc-page">
        <header className="ecc-collection-heading"><h1>Owners</h1><p>Find owners and open their portfolio and contact records.</p></header>
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
        <header className="ecc-collection-heading"><h1>Owners</h1><p>Find owners and open their portfolio and contact records.</p></header>
        <StateNotice kind="empty" title="No owners are available yet." onRetry={() => { void refetch(); }} retrying={isFetching} />
      </section>
    );
  }

  return (
    <section className="ecc-page">
      <header className="ecc-collection-heading"><h1>Owners</h1><p>Find owners and open their portfolio and contact records.</p></header>
      <div className="ecc-list-search">
        <label htmlFor="owners-search">Search owners</label>
        <input
          id="owners-search"
          className="ecc-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, company or id"
          aria-label="Search owners"
        />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowHref={(r) => safeCardHref("owner", r.id)}
        getRowId={(r) => r.id || "blank"}
      />
    </section>
  );
}
