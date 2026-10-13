import React from "react";
import "./operations.css";
import {
  formatCents, formatDateOnly, groupLedgerByLease,
  type LedgerEntry, type LedgerLeaseGroup, type LegalCase, type WorkOrder,
} from "@/lib/recovery/operationsContracts";
import StateNotice from "@/components/ui/StateNotice";

// Presentational, read-only views over already-validated rows. No fetching, no mutation controls.

const dash = (v: string | null) => v ?? "—";

export function LegalCasesTable({ rows }: { rows: readonly LegalCase[] }) {
  if (rows.length === 0) return <StateNotice kind="empty" title="No legal cases recorded" testId="ops-legal-empty" />;
  return (
    <div className="ops-scroll" tabIndex={0} role="region" aria-label="Legal cases">
      <table className="ops-table" data-testid="ops-legal-table">
        <thead><tr>
          <th scope="col">Case</th><th scope="col">Tenant</th><th scope="col">Property / unit</th>
          <th scope="col">Status</th><th scope="col">Filed</th><th scope="col">Court date</th>
          <th scope="col" className="ops-num">Amount claimed</th>
        </tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.type === "unknown" ? "Unclassified" : c.type}</td>
              <td>{dash(c.tenantName)}</td>
              <td>{dash(c.propertyName)}{c.unitLabel ? ` · ${c.unitLabel}` : ""}</td>
              <td><span className="ops-badge ops-badge--gold">{c.status === "unknown" ? "Status unknown" : c.status}</span></td>
              <td>{formatDateOnly(c.filedDate)}</td>
              <td>{formatDateOnly(c.courtDate)}</td>
              <td className="ops-num">{formatCents(c.amountClaimedCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const label = (v: string) => (v === "unknown" ? "Unknown" : v.replace(/_/g, " "));

export function WorkOrdersTable({ rows }: { rows: readonly WorkOrder[] }) {
  if (rows.length === 0) return <StateNotice kind="empty" title="No work orders recorded" testId="ops-wo-empty" />;
  return (
    <div className="ops-scroll" tabIndex={0} role="region" aria-label="Work orders">
      <table className="ops-table" data-testid="ops-wo-table">
        <thead><tr>
          <th scope="col">Description</th><th scope="col">Property / unit</th><th scope="col">Priority</th>
          <th scope="col">Status</th><th scope="col">Scheduled</th>
          <th scope="col" className="ops-num">Estimated</th><th scope="col" className="ops-num">Actual</th>
        </tr></thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id}>
              <td>{w.description}</td>
              <td>{dash(w.propertyName)}{w.unitLabel ? ` · ${w.unitLabel}` : ""}</td>
              <td>{label(w.priority)}</td>
              <td><span className="ops-badge ops-badge--gold">{label(w.status)}</span></td>
              <td>{formatDateOnly(w.scheduledDate)}</td>
              <td className="ops-num">{formatCents(w.estimatedCostCents)}</td>
              {/* null = not recorded ("—"); a recorded $0.00 stays $0.00. */}
              <td className="ops-num">{formatCents(w.actualCostCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const KIND_LABEL = { charge: "Charge", payment: "Payment", credit: "Credit", adjustment: "Adjustment" } as const;

function LeaseLedger({ group }: { group: LedgerLeaseGroup }) {
  const { summary: sum, entries, leaseId } = group;
  const owes = sum.balanceCents > 0;
  const headingId = `ops-lease-${leaseId}`;
  return (
    <section aria-labelledby={headingId} data-testid="ops-ledger-lease" className="ops-lease">
      <h3 id={headingId}>Lease {leaseId}</h3>
      <dl className="ops-summary">
        <div><dt>Charges</dt><dd>{formatCents(sum.chargesCents)}</dd></div>
        <div><dt>Payments</dt><dd>{formatCents(sum.paymentsCents)}</dd></div>
        <div><dt>Credits</dt><dd>{formatCents(sum.creditsCents)}</dd></div>
        <div><dt>Adjustments</dt><dd>{formatCents(sum.adjustmentsCents)}</dd></div>
        <div><dt>Balance due</dt>
          <dd className={owes ? "ops-neg" : "ops-pos"} data-testid="ops-ledger-balance">{formatCents(sum.balanceCents)}</dd></div>
      </dl>
      <div className="ops-scroll" tabIndex={0} role="region" aria-label={`Ledger entries for lease ${leaseId}`}>
        <table className="ops-table">
          <thead><tr>
            <th scope="col">Posted</th><th scope="col">Type</th><th scope="col">Memo</th>
            <th scope="col" className="ops-num">Amount</th>
          </tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{formatDateOnly(e.postedOn)}</td>
                <td>{KIND_LABEL[e.kind]}</td>
                <td>{dash(e.memo)}</td>
                <td className="ops-num">{formatCents(e.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** One block per lease; balances are never combined across leases. */
export function LedgerView({ entries }: { entries: readonly LedgerEntry[] }) {
  if (entries.length === 0) return <StateNotice kind="empty" title="No recorded ledger entries" detail="Balance is unknown, not $0.00." testId="ops-ledger-empty" />;
  return (
    <div data-testid="ops-ledger">
      {groupLedgerByLease(entries).map((g) => <LeaseLedger key={g.leaseId} group={g} />)}
    </div>
  );
}
