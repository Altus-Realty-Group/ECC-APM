import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useOwnerTransfer, OwnerLite, PropertyLite } from "../../ownerTransfer/hooks/useOwnerTransfer";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

export default function OwnerTransferPage(){
  const [, nav] = useLocation();
  const transferHook = useOwnerTransfer();
  
  const [ownerId, setOwnerId] = useState<number|undefined>(undefined);
  const [ownerProps, setOwnerProps] = useState<PropertyLite[]>([]);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<OwnerLite[]>([]);
  const [newOwnerId, setNewOwnerId] = useState<number|undefined>(undefined);
  const [selected, setSelected] = useState<number[]>([]);
  const [effDate, setEffDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<1|2|3|4>(1);
  const [msg, setMsg] = useState<string>("");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ownerId from ?ownerId=
  useEffect(()=> {
    const url = new URL(window.location.href);
    const id = Number(url.searchParams.get("ownerId") || "0");
    if (id) setOwnerId(id);
  },[]);

  // load properties for current owner
  useEffect(()=> {
    if (!ownerId) return;
    transferHook.getOwnerProperties(ownerId)
      .then((properties)=>{
        setOwnerProps(properties||[]);
        setSelected(properties.map(p=>p.id)); // preselect all (can unselect)
      }).catch(()=>{});
  },[ownerId, transferHook]);

  // debounce search for new owner
  useEffect(()=> {
    const t = setTimeout(()=>{
      if (!search.trim()) { setCandidates([]); return; }
      transferHook.searchOwners(search.trim())
        .then((owners)=>setCandidates(owners||[])).catch(()=>{});
    }, 150);
    return ()=>clearTimeout(t);
  },[search, transferHook]);

  const canNext1 = !!newOwnerId && selected.length>0 && !!ownerId;
  const humanSummary = useMemo(()=> {
    const count = selected.length;
    const timing = (()=> {
      const today = new Date(); today.setHours(0,0,0,0);
      const eff = new Date(effDate); eff.setHours(0,0,0,0);
      if (eff.getTime() < today.getTime()) return "Retro transfer (past date)";
      if (eff.getTime() > today.getTime()) return "Scheduled transfer (future date)";
      return "Effective today";
    })();
    return `${count} property${count===1?"":"ies"} • ${timing}`;
  },[selected, effDate]);

  function toggle(id:number) {
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  async function onCreate(){
    if (!ownerId || !newOwnerId || !selected.length) return;
    setMsg(""); setSuccessMsg(null);
    
    const result = await transferHook.initiateTransfer({
      old_owner_id: ownerId,
      new_owner_id: newOwnerId,
      property_ids: selected,
      effective_date: effDate,
      notes
    });
    
    if (result) {
      const idFromApi = result.id;
      setCreatedId(idFromApi);
      setSuccessMsg(
        idFromApi
          ? `Transfer #${idFromApi} created — proceed to detail to approve/authorize/execute.`
          : "Transfer created successfully."
      );
      setStep(4);
      setMsg(`Transfer #${idFromApi} created • Status: ${result.transfer?.status || 'PENDING_ACCOUNTING'}`);
    } else if (transferHook.error) {
      setMsg(`Error: ${transferHook.error}`);
    }
  }

  const newOwner = candidates.find(c=>c.id===newOwnerId);

  return (
    <main className="min-h-screen overflow-y-visible px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => nav("/")} className="text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-[var(--text)]">Owner Transfer</h1>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center gap-3 text-[var(--success)]">
              <span>{successMsg}</span>
              {createdId && (
                <Link href={`/owners/transfer/detail?id=${createdId}`}>
                  <a className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--success)] hover:bg-[var(--surface)] transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    View transfer details
                  </a>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1,2,3,4].map(n => (
            <div key={n} className={`flex-1 h-2 rounded ${n <= step ? 'bg-[var(--gold)]' : 'bg-[var(--surface-2)]'}`} />
          ))}
        </div>

        {/* Step 1: Select New Owner */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-[var(--text)]">1. Select New Owner</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text)]">Search for new owner</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type company name or person..."
                className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text)]"
              />
            </div>

            {candidates.length > 0 && (
              <div className="border border-[var(--border)] rounded-[var(--radius-md)] max-h-[50vh] overflow-y-auto bg-[var(--surface)]">
                {candidates.map(c => (
                  <div
                    key={c.id}
                    onClick={() => setNewOwnerId(c.id)}
                    className={`p-3 cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${newOwnerId === c.id ? 'bg-[var(--surface-2)] border-l-4 border-[var(--gold)]' : ''}`}
                  >
                    <div className="font-medium text-[var(--text)]">{c.display_name}</div>
                    {c.meta && <div className="text-sm text-[var(--text-subtle)]">{c.meta}</div>}
                  </div>
                ))}
              </div>
            )}

            {newOwner && (
              <div className="bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-[var(--radius-md)]">
                <div className="font-medium text-[var(--text)]">Selected: {newOwner.display_name}</div>
                {newOwner.meta && <div className="text-sm text-[var(--text-subtle)]">{newOwner.meta}</div>}
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!newOwnerId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              Next: Select Properties
            </button>
          </div>
        )}

        {/* Step 2: Select Properties */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-[var(--text)]">2. Select Properties to Transfer</h2>
            
            <div className="text-sm text-[var(--text-subtle)]">
              All properties are pre-selected. Uncheck any you don't want to transfer.
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {ownerProps.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 accent-[var(--gold)]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--text)]">{p.name}</div>
                    <div className="text-sm text-[var(--text-subtle)]">
                      {[p.address1, p.city, p.state, p.zip].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] text-[var(--text)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selected.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <ArrowRight className="w-4 h-4" />
                Next: Review & Submit
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-[var(--text)]">3. Review & Submit</h2>
            
            <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-[var(--radius-md)] space-y-3">
              <div className="text-[var(--text)]"><strong>New Owner:</strong> {newOwner?.display_name}</div>
              <div className="text-[var(--text)]"><strong>Properties:</strong> {humanSummary}</div>
              <div className="text-[var(--text)]"><strong>Effective Date:</strong> {effDate}</div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text)]">Effective Date</label>
              <input
                type="date"
                value={effDate}
                onChange={(e) => setEffDate(e.target.value)}
                className="px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text)]">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this transfer..."
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--text)]"
              />
            </div>

            {msg && (
              <div className={`p-3 rounded-[var(--radius-md)] border ${msg.includes('Error') ? 'bg-[var(--surface)] border-[var(--danger)] text-[var(--danger)]' : 'bg-[var(--surface)] border-[var(--success)] text-[var(--success)]'}`}>
                {msg}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] text-[var(--text)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={onCreate}
                disabled={transferHook.loading || !canNext1}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {transferHook.loading ? "Creating..." : "Create Transfer"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            <h2 className="text-xl font-semibold text-[var(--text)]">Transfer Created!</h2>
            
            <div className="bg-[var(--surface)] border border-[var(--success)] p-4 rounded-[var(--radius-lg)]">
              <div className="text-[var(--success)]">{msg}</div>
            </div>

            <div className="text-sm text-[var(--text-subtle)]">
              The transfer has been submitted and is now pending accounting approval.
              You will be notified when it's ready for execution.
            </div>

            <div className="flex gap-2 justify-center">
              {createdId && (
                <Link href={`/owners/transfer/detail?id=${createdId}`}>
                  <a className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold-700)] transition-colors font-medium">
                    <ExternalLink className="w-4 h-4" />
                    Open Detail Page
                  </a>
                </Link>
              )}
              <button
                onClick={() => nav("/")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text)] transition-colors"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setNewOwnerId(undefined);
                  setSelected([]);
                  setNotes("");
                  setMsg("");
                  setCreatedId(null);
                  setSuccessMsg(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] text-[var(--text)] transition-colors"
              >
                Create Another Transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}