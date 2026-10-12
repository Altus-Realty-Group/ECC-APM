import React, { useEffect, useState } from "react";
import { useOwnerTransfer, Transfer } from "../../ownerTransfer/hooks/useOwnerTransfer";
import TransferPreflightCheck from "../../ownerTransfer/components/TransferPreflightCheck";
import TransferDryRun from "../../ownerTransfer/components/TransferDryRun";
import { useToast } from "../../../hooks/use-toast";
import { FileEdit, CheckCircle, Lock, Settings, MapPin } from "lucide-react";

type AuditEvent = { id: number; event_type: string; label: string; created_at: string; ref_table?: string; ref_id?: number; payload?: any };

export default function OwnerTransferDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const transferHook = useOwnerTransfer();
  const { addToast } = useToast();
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  async function loadTransfer() {
    if (!id) return;
    const transferData = await transferHook.getTransfer(Number(id));
    setTransfer(transferData);
    
    // Load audit events for this transfer (still using direct API since it's a different endpoint)
    try {
      const response = await fetch(`/api/audit/owner_transfers/${id}`);
      if (response.ok) {
        const auditData = await response.json();
        setAuditEvents(auditData.events || []);
      }
    } catch (e) {
      console.error("Failed to load audit events:", e);
    }
  }
  
  useEffect(() => { 
    if (id) loadTransfer(); 
  }, [id]);

  async function handleApproveAccounting() {
    if (!id) return;
    const success = await transferHook.approveAccounting(Number(id));
    if (success) {
      addToast({ type: "success", title: "Approved. Audit logged." });
      await loadTransfer(); // Refresh data
    } else {
      addToast({ type: "error", title: "Authorization failed. Check admin token." });
    }
  }

  async function handleAuthorize() {
    if (!id) return;
    const success = await transferHook.authorizeTransfer(Number(id));
    if (success) {
      addToast({ type: "success", title: "Authorized for execution" });
      await loadTransfer(); // Refresh data
    } else {
      addToast({ type: "error", title: "Authorization failed. Check admin token." });
    }
  }

  async function handleExecute() {
    if (!id) return;
    const success = await transferHook.executeTransfer(Number(id));
    if (success) {
      addToast({ type: "success", title: "Transfer completed successfully" });
      await loadTransfer(); // Refresh data
    } else {
      addToast({ type: "error", title: "Execution failed. Check admin token." });
    }
  }

  const iconFor = (ev: string) => {
    // lucide icons for audit events
    if (/initiated/i.test(ev)) return <FileEdit className="w-4 h-4" />;
    if (/approved/i.test(ev))  return <CheckCircle className="w-4 h-4" />;
    if (/authorized/i.test(ev)) return <Lock className="w-4 h-4" />;
    if (/executed/i.test(ev))  return <Settings className="w-4 h-4" />;
    if (/GEOCODE/i.test(ev))   return <MapPin className="w-4 h-4" />;
    return <div className="w-1 h-1 bg-[var(--text-subtle)] rounded-full" />;
  };

  if (!id) return <div className="p-6 text-[var(--danger)]">Missing transfer id</div>;
  return (
    <main className="min-h-screen overflow-y-visible px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-1)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--text)]">Owner Transfer Detail — #{id}</h2>
          {transferHook.error && <div className="mt-2 text-sm text-[var(--danger)]">{transferHook.error}</div>}
          </div>
          <div className="p-4 space-y-3">
          {!transfer ? <div className="text-[var(--text-subtle)]">Loading…</div> : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-[var(--text-subtle)]">Status:</span> <span className="text-[var(--text)]">{transfer.status}</span></div>
                <div><span className="text-[var(--text-subtle)]">Effective:</span> <span className="text-[var(--text)]">{transfer.effective_date}</span></div>
                <div><span className="text-[var(--text-subtle)]">Old Owner:</span> <span className="text-[var(--text)]">{transfer.old_owner_id}</span></div>
                <div><span className="text-[var(--text-subtle)]">New Owner:</span> <span className="text-[var(--text)]">{transfer.new_owner_id}</span></div>
                <div className="col-span-2"><span className="text-[var(--text-subtle)]">Properties:</span> <span className="text-[var(--text)]">{transfer.property_ids?.join(", ")}</span></div>
              </div>
              <div className="pt-3 flex gap-2 justify-end">
                {transferHook.canApproveAccounting(transfer) && (
                  <button 
                    disabled={transferHook.loading} 
                    onClick={handleApproveAccounting} 
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="approve-accounting-btn"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Accounting
                  </button>
                )}
                {transferHook.canAuthorize(transfer) && (
                  <button 
                    disabled={transferHook.loading} 
                    onClick={handleAuthorize} 
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--gold)] text-[var(--bg)] hover:bg-[var(--gold-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    data-testid="authorize-btn"
                  >
                    <Lock className="w-4 h-4" />
                    Authorize
                  </button>
                )}
                {transferHook.canExecute(transfer) && (
                  <button 
                    disabled={transferHook.loading} 
                    onClick={handleExecute} 
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--success)] text-[var(--bg)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    data-testid="execute-now-btn"
                  >
                    <Settings className="w-4 h-4" />
                    Execute Now
                  </button>
                )}
                {transferHook.isTerminalStatus(transfer.status) && (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-subtle)] text-sm">
                    Transfer {transfer.status.toLowerCase()}
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-subtle)] pt-2">Note: “Authorize” and “Execute Now” require an admin token. Set <code>ADMIN_SYNC_TOKEN</code> into <code>localStorage</code> if prompted.</p>
            </>
          )}
          </div>
        </div>

        {/* Preflight Checks */}
        <TransferPreflightCheck 
          transferId={id ? Number(id) : null}
          onCheckComplete={(hasBlockers, checks) => {
            console.log('Preflight check completed:', { hasBlockers, checks });
          }}
        />

        {/* Dry Run Preview */}
        <TransferDryRun transferId={id ? Number(id) : null} />

        {/* Audit Events Timeline */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-1)]">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--text)]">Activity Timeline</h3>
          </div>
          <div className="p-4">
            <AuditFeed items={auditEvents} iconFor={iconFor} />
          </div>
        </div>
      </div>
    </main>
  );
}

function AuditFeed({ items, iconFor }: { items: AuditEvent[], iconFor: (ev: string) => React.ReactNode }) {
  return (
    <div className="mt-3 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-2)] p-3">
      <div className="text-sm font-medium mb-2 text-[var(--text)]">Recent Activity</div>
      {items.length === 0 ? <div className="text-xs text-[var(--text-subtle)]">No events</div> : (
        <div className="space-y-2">
          {items.map((e, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="mt-0.5 text-[var(--text-subtle)]">{iconFor(e.event_type)}</div>
              <div className="flex-1">
                <div className="text-xs text-[var(--text-subtle)]">{new Date(e.created_at).toLocaleString()}</div>
                <div className="text-sm">
                  <span className="px-1.5 py-0.5 mr-2 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">{e.event_type}</span>
                  <span className="text-[var(--text)]">{e.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
