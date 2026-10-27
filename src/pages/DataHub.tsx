import { useSessionEpoch } from "@/lib/sessionScope";
// src/pages/DataHub.tsx
import { useMemo, useState } from "react";
import StateNotice from "../components/ui/StateNotice";
import { errorKind } from "../lib/dataState";
import { useDataHubEntities, useDataHubOwnersSearch } from "../lib/ecc-collection-hooks";

type EntityKey = "owners" | "tenants" | "leases" | "units" | "properties";


function Table({ rows }: { rows: any[] }) {
  const cols = useMemo(() => {
    if (!rows?.length) return [];
    // union of keys for a simple explorer table
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows]);
  if (!rows?.length) return <div className="text-sm text-gray-500">No rows.</div>;
  return (
    <div className="overflow-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>{cols.map((c) => <th key={c} className="text-left px-3 py-2 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 align-top">
                  <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(r?.[c] ?? null)}</pre>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function recordLimit(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 200 ? n : null;
}

export default function DataHub() {
  const epoch = useSessionEpoch();
  return <DataHubWorkspace key={epoch} />;
}

function DataHubWorkspace() {
  const [entity, setEntity] = useState<EntityKey>("owners");
  const [limit, setLimit] = useState(25);
  const [draftEntity, setDraftEntity] = useState<EntityKey>("owners");
  const [draftLimit, setDraftLimit] = useState("25");
  const [limitError, setLimitError] = useState(false);

  const params = entity === "leases"
    ? { order: "id.desc", limit, select: "id,property_id,unit_id,tenant_id,status,start_date,end_date,rent_cents" }
    : { order: "id.desc", limit };

  const entitiesQuery = useDataHubEntities(entity, params);
  const { data: rows, error: err, isLoading: loading } = entitiesQuery;

  const [searchQ, setSearchQ] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const searchQuery = useDataHubOwnersSearch(submittedSearch);

  return (
    <div className="ecc-data-workspace">
      <h1 className="text-2xl font-semibold">ECC Data Hub</h1>
      <p className="ecc-page-description">Explore available records and search owners. Connection failures and access restrictions are shown separately from empty results.</p>

      {/* Entities explorer */}
      <div className="ecc-data-section">
        <h2>Record explorer</h2>
        <form className="ecc-data-controls" aria-label="Record explorer controls" onSubmit={event => { event.preventDefault(); const next = recordLimit(draftLimit); setLimitError(next === null); if (next !== null) { setLimit(next); setEntity(draftEntity); } }}>
          <label className="text-sm" htmlFor="datahub-entity">Entity:</label>
          <select id="datahub-entity" className="ecc-touch border rounded-md px-2 py-1"
                  value={draftEntity} onChange={(e)=>setDraftEntity(e.target.value as EntityKey)}>
            <option value="owners">owners</option>
            <option value="tenants">tenants</option>
            <option value="leases">leases</option>
            <option value="units">units</option>
            <option value="properties">properties</option>
          </select>
          <label className="text-sm" htmlFor="datahub-limit">Limit:</label>
          <input id="datahub-limit" className="ecc-touch border rounded-md px-2 py-1 w-24" type="number" min={1} max={200}
                 value={draftLimit} onChange={(e)=>setDraftLimit(e.target.value)}/>

          <button type="submit" className="ecc-btn">Load records</button>
        </form>
        {limitError ? <p role="alert">Enter a whole number from 1 to 200.</p> : null}
        <p className="ecc-page-description">Showing the {entity} read with a limit of {limit} records.</p>
        {err ? <StateNotice kind={errorKind(err)} title="Records could not be loaded" detail="Check your connection and access, then try again." onRetry={() => { void entitiesQuery.refetch(); }} />
          : loading ? <StateNotice kind="loading" title="Loading records" />
          : <Table rows={rows || []} />}
      </div>

      {/* Owner Search */}
      <div className="ecc-data-section">
        <h2 className="text-lg font-semibold">Owners Search</h2>
        <form className="flex flex-wrap gap-2" aria-label="Owner search" onSubmit={event => { event.preventDefault(); setSubmittedSearch(searchQ.trim()); }}>
          <input aria-label="Search owners" className="ecc-touch border rounded-md px-2 py-1 flex-1 min-w-0" placeholder="Search owners"
                 value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} />
          <button type="submit" className="ecc-btn ecc-btn-gold">Search</button>
        </form>
        {submittedSearch && (searchQuery.error
          ? <StateNotice kind={errorKind(searchQuery.error)} title="Owner search could not be loaded" onRetry={() => { void searchQuery.refetch(); }} />
          : searchQuery.isLoading ? <StateNotice kind="loading" title="Searching owners" />
          : <Table rows={searchQuery.data || []} />)}
      </div>

      <StateNotice kind="partial" title="Owner transfers are unavailable" detail="Transfer access, confirmation and audit controls must be verified before transfers can be restored." />
    </div>
  );
}
