import React, { useMemo, useState } from "react";
import FilterBar from "../../components/FilterBar";
import DataTable, { type DataColumn } from "../../components/DataTable";

type OwnerRow = {
  id: string;
  name: string;
  portfolio: string;
  email: string;
  phone: string;
};

const MOCK: OwnerRow[] = [
  { id: "O-9001", name: "Harbor Capital LLC", portfolio: "Harbor View Homes", email: "ops@harborcap.com", phone: "(813) 555-2212" },
  { id: "O-9002", name: "Crescent Partners", portfolio: "Crescent Ridge Apts", email: "partners@crescent.com", phone: "(512) 555-1144" },
];

export default function Owners() {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return MOCK;
    return MOCK.filter(r =>
      r.name.toLowerCase().includes(t) ||
      r.portfolio.toLowerCase().includes(t) ||
      r.id.toLowerCase().includes(t)
    );
  }, [q]);

  const columns: DataColumn<OwnerRow>[] = [
    { key: "id", header: "Owner ID" },
    { key: "name", header: "Owner / Entity" },
    { key: "portfolio", header: "Portfolio" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
  ];

  return (
    <section className="ecc-page">
      <FilterBar title="Owners" value={q} onChange={setQ} />
      <DataTable columns={columns} rows={rows} />
    </section>
  );
}
