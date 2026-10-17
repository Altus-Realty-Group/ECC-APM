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

export default function DataHub() {
  const [entity, setEntity] = useState<EntityKey>("owners");
  const [limit, setLimit]   = useState<number>(25);

  const params = entity === "leases"
    ? { order: "id.desc", limit, select: "id,property_id,unit_id,tenant_id,status,start_date,end_date,rent_cents" }
    : { order: "id.desc", limit };

  const entitiesQuery = useDataHubEntities(entity, params);
  const { data: rows, error: err, isLoading: loading } = entitiesQuery;

  const [searchQ, setSearchQ] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const searchQuery = useDataHubOwnersSearch(submittedSearch);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">ECC Data Hub</h1>
      <p className="text-gray-600">Explore available records and search owners. Connection failures and access restrictions are shown separately from empty results.</p>

      {/* Entities explorer */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm" htmlFor="datahub-entity">Entity:</label>
          <select id="datahub-entity" className="ecc-touch border rounded-md px-2 py-1"
                  value={entity} onChange={(e)=>setEntity(e.target.value as EntityKey)}>
            <option value="owners">owners</option>
            <option value="tenants">tenants</option>
            <option value="leases">leases</option>
            <option value="units">units</option>
            <option value="properties">properties</option>
          </select>
          <label className="text-sm" htmlFor="datahub-limit">Limit:</label>
          <input id="datahub-limit" className="ecc-touch border rounded-md px-2 py-1 w-24" type="number" min={1} max={200}
                 value={limit} onChange={(e)=>setLimit(parseInt(e.target.value||"25"))}/>

        </div>
        {err ? <StateNotice kind={errorKind(err)} title="Records could not be loaded" detail="Check your connection and access, then try again." onRetry={() => { void entitiesQuery.refetch(); }} />
          : loading ? <StateNotice kind="loading" title="Loading records" />
          : <Table rows={rows || []} />}
      </div>

      {/* Owner Search */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Owners Search</h2>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Search owners" className="ecc-touch border rounded-md px-2 py-1 flex-1 min-w-0" placeholder="Search owners"
                 value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} />
          <button className="ecc-touch rounded-lg px-3 py-1 bg-black text-white" onClick={()=>setSubmittedSearch(searchQ.trim())}>Search</button>
        </div>
        {submittedSearch && (searchQuery.error
          ? <StateNotice kind={errorKind(searchQuery.error)} title="Owner search could not be loaded" onRetry={() => { void searchQuery.refetch(); }} />
          : searchQuery.isLoading ? <StateNotice kind="loading" title="Searching owners" />
          : <Table rows={searchQuery.data || []} />)}
      </div>

      <StateNotice kind="partial" title="Owner transfers are unavailable" detail="Transfer access, confirmation and audit controls must be verified before transfers can be restored." />
    </div>
  );
}
