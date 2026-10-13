import React from "react";
import "./operations.css";
import StateNotice from "@/components/ui/StateNotice";
import { OPERATIONS_CONTRACTS, type DomainContract } from "@/lib/recovery/operationsRegistry";

// Recovered Legal / Work orders / Ledger surface. Read-only and contract-gated: a domain with no verified
// backend contract renders its dependency list and makes no request. Legal escalation, document generation
// and every operational write stay out until authority, confirmation, audit and idempotency contracts exist.

function Gate({ contract, extra }: { contract: DomainContract; extra?: string }) {
  return (
    <section className="ops-section" aria-labelledby={`ops-${contract.domain}`} data-testid={`ops-gate-${contract.domain}`}>
      <h2 id={`ops-${contract.domain}`}>{contract.label}</h2>
      <StateNotice kind="partial" title={`${contract.label} are not available yet`} detail={contract.reason} />
      <p className="ops-disabled">Required before activation:</p>
      <ul className="ops-needs">{contract.needs.map((n) => <li key={n}>{n}</li>)}</ul>
      {extra ? <p className="ops-disabled">{extra}</p> : null}
    </section>
  );
}

/** A <section>, not <main>: App.tsx already provides the page's single <main> landmark. */
export default function OperationsRecoveryPage() {
  const c = OPERATIONS_CONTRACTS;
  return (
    <section className="ops-page" data-testid="operations-recovery">
      <h1>Operations</h1>
      <p className="ops-lede">Legal cases, work orders and tenant ledgers. Nothing is shown until its source is verified.</p>
      <Gate contract={c.legalCases}
        extra="Escalation and document generation are disabled until verified authorization, confirmation, audit and idempotency contracts exist." />
      <Gate contract={c.workOrders} extra="Creating, editing and completing work orders is disabled for the same reason." />
      <Gate contract={c.ledgerEntries} extra="Adjustments, reversals and exports are disabled. Payments are never inferred from leases." />
    </section>
  );
}
