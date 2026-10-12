import { useState, type ReactNode } from "react";
import { useOwnerTransfer } from "./hooks/useOwnerTransfer";

type Opt = { id:number|string; name?:string };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function OwnerTransferPage(){
  const {loading,error,searchOwners,getContext,initiate,approve,authorize,executeNow} = useOwnerTransfer();
  const [source,setSource]=useState<Opt|null>(null);
  const [target,setTarget]=useState<Opt|null>(null);
  const [context,setContext]=useState<any>(null);
  const [tid,setTid]=useState<string>("");

  async function pick(term:string, set:(v:Opt)=>void, withCtx=false) {
    const r = await searchOwners(term);
    const first = (Array.isArray(r) ? r[0] : r?.results?.[0]) || null;
    if (first) {
      set(first);
      if (withCtx) setContext(await getContext(first.id));
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Owner Transfer</h1>

      <Section title="Select Owners">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm">Source Owner (type & press Enter)</label>
            <input className="border rounded px-3 py-2 w-full" placeholder="Search source owner…" onKeyDown={async e=>{ if(e.key==="Enter"){ await pick((e.target as HTMLInputElement).value, setSource, true); } }} />
            <div className="text-sm opacity-80">Selected: {source?.name || source?.id || "—"}</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Target Owner (type & press Enter)</label>
            <input className="border rounded px-3 py-2 w-full" placeholder="Search target owner…" onKeyDown={async e=>{ if(e.key==="Enter"){ await pick((e.target as HTMLInputElement).value, setTarget, false); } }} />
            <div className="text-sm opacity-80">Selected: {target?.name || target?.id || "—"}</div>
          </div>
        </div>
      </Section>

      {context && (
        <Section title="Transfer Context">
          <div className="text-sm font-semibold">{context.owner?.name || context.owner?.full_name || `Owner #${source?.id}`}</div>
          <div className="text-sm opacity-80">
            Properties: {context.properties?.length||0} • Units: {context.units?.length||0} • Leases: {context.leases?.length||0}
          </div>
        </Section>
      )}

      <Section title="Actions">
        <div className="flex flex-wrap gap-2">
          <button disabled={!source||!target||loading}
            className="px-3 py-2 rounded bg-yellow-400 text-black font-semibold"
            onClick={async ()=>{
              const r = await initiate({ source_owner_id: source!.id, target_owner_id: target!.id, notes: "UI" });
              setTid(String(r.transferId || r.id || ""));
            }}>Initiate</button>

          <button disabled={!tid||loading} className="px-3 py-2 rounded bg-gray-200" onClick={()=>approve({ transferId: tid })}>Approve</button>
          <button disabled={!tid||loading} className="px-3 py-2 rounded bg-gray-200" onClick={()=>authorize({ transferId: tid })}>Authorize</button>
          <button disabled={!tid||loading} className="px-3 py-2 rounded bg-green-600 text-white" onClick={()=>executeNow({ transferId: tid })}>Execute</button>
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </Section>
    </div>
  );
}