// src/pages/DataHub.tsx
import { useMemo, useState } from "react";
import { useDataHubEntities, useDataHubOwnersSearch, useDataHubOwnerTransferContext, useDataHubOwnerTransferMutations } from "../lib/ecc-collection-hooks";

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

/** Reads transferId from an untyped mutation response; returns "" when absent. */
function readTransferId(res: unknown): string {
  if (typeof res !== "object" || res === null) return "";
  const id = (res as { transferId?: unknown }).transferId;
  return id ? String(id) : "";
}

export default function DataHub() {
  const [entity, setEntity] = useState<EntityKey>("owners");
  const [limit, setLimit]   = useState<number>(25);

  const params = entity === "leases" 
    ? { order: "id.desc", limit, select: "doorloop_id,property_id,unit_id,primary_tenant_id,rent_cents,status,start_date,end_date" }
    : { order: "id.desc", limit };
  
  const entitiesQuery = useDataHubEntities(entity, params);
  const { data: rows, error: err, isLoading: loading } = entitiesQuery;

  // Search + Transfer context + Admin flow
  const [searchQ, setSearchQ] = useState("");
  const [shouldSearch, setShouldSearch] = useState(false);
  const [sourceOwnerId, setSourceOwnerId] = useState("");
  const [shouldLoadContext, setShouldLoadContext] = useState(false);
  const [transferId, setTransferId] = useState<string>("");

  const searchQuery = useDataHubOwnersSearch(shouldSearch ? searchQ : "");
  const contextQuery = useDataHubOwnerTransferContext(shouldLoadContext ? sourceOwnerId : "");
  const mutations = useDataHubOwnerTransferMutations();

  const doSearch = () => setShouldSearch(true);
  const doContext = () => setShouldLoadContext(true);
  const doInitiate = () => {
    mutations.initiate.mutate(undefined, {
      onSuccess: (res) => setTransferId(readTransferId(res))
    });
  };
  const doApprove = () => {
    mutations.approve.mutate(transferId, {
      onSuccess: (res) => setTransferId(readTransferId(res) || transferId)
    });
  };
  const doAuthorize = () => {
    mutations.authorize.mutate(transferId, {
      onSuccess: (res) => setTransferId(readTransferId(res) || transferId)
    });
  };
  const doExecute = () => {
    mutations.execute.mutate(transferId, {
      onSuccess: (res) => setTransferId(readTransferId(res) || transferId)
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">ECC Data Hub</h1>
      <p className="text-gray-600">Live Azure Functions integration. Explore entities, search owners, view transfer context, and run the owner transfer workflow.</p>

      {/* Entities explorer */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm">Entity:</label>
          <select className="border rounded-md px-2 py-1"
                  value={entity} onChange={(e)=>setEntity(e.target.value as EntityKey)}>
            <option value="owners">owners</option>
            <option value="tenants">tenants</option>
            <option value="leases">leases</option>
            <option value="units">units</option>
            <option value="properties">properties</option>
          </select>
          <label className="text-sm ml-4">Limit:</label>
          <input className="border rounded-md px-2 py-1 w-24" type="number" min={1} max={200}
                 value={limit} onChange={(e)=>setLimit(parseInt(e.target.value||"25"))}/>
          {loading && <span className="text-sm text-gray-500">loading…</span>}
          {err && <span className="text-sm text-red-600">{String(err)}</span>}
        </div>
        <Table rows={rows || []} />
      </div>

      {/* Owner Search */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Owners Search</h2>
        <div className="flex gap-2">
          <input className="border rounded-md px-2 py-1 flex-1" placeholder="search owners (e.g., Jane)"
                 value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} />
          <button className="rounded-lg px-3 py-1 bg-black text-white" onClick={doSearch}>Search</button>
        </div>
        {searchQuery.data && <Table rows={Array.isArray(searchQuery.data?.results) ? searchQuery.data.results : [searchQuery.data]} />}
      </div>

      {/* Transfer Context */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Transfer Context</h2>
        <div className="flex gap-2">
          <input className="border rounded-md px-2 py-1" placeholder="sourceOwnerId"
                 value={sourceOwnerId} onChange={(e)=>setSourceOwnerId(e.target.value)} />
          <button className="rounded-lg px-3 py-1 bg-black text-white" onClick={doContext}>Load</button>
        </div>
        {contextQuery.data && <Table rows={[contextQuery.data]} />}
      </div>

      {/* Transfer Flow */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Owner Transfer Flow</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-lg px-3 py-1 bg-gray-800 text-white" onClick={doInitiate}>1) initiate</button>
          <button className="rounded-lg px-3 py-1 bg-gray-800 text-white disabled:opacity-50" disabled={!transferId} onClick={doApprove}>2) approve</button>
          <button className="rounded-lg px-3 py-1 bg-gray-800 text-white disabled:opacity-50" disabled={!transferId} onClick={doAuthorize}>3) authorize</button>
          <button className="rounded-lg px-3 py-1 bg-gray-800 text-white disabled:opacity-50" disabled={!transferId} onClick={doExecute}>4) execute</button>
          <span className="text-sm text-gray-600">transferId: <code>{transferId || "(not started)"}</code></span>
        </div>
      </div>
    </div>
  );
}