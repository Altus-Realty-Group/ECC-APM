import React, { useCallback, useEffect, useState } from "react";
import "./operations.css";
import StateNotice from "@/components/ui/StateNotice";
import { useSessionEpoch } from "@/lib/sessionScope";
import {
  OPERATIONS_CONTRACTS, resolveDomain,
  type DomainContract, type DomainState, type OperationsDomain,
} from "@/lib/recovery/operationsRegistry";
import {
  groupLedgerByLease, parseCollection, parseLedgerEntry, parseLegalCase, parseWorkOrder,
  type LedgerEntry, type LegalCase, type WorkOrder,
} from "@/lib/recovery/operationsContracts";
import { LedgerView, LegalCasesTable, WorkOrdersTable } from "./OperationsViews";

// Legal cases / Work orders / Tenant ledger. Read-only and contract-gated: a domain without a verified read
// source renders a plain availability message and makes NO request. Escalation, document generation and every
// operational write stay out of this page.

const parseLegal = (p: unknown) => parseCollection(p, parseLegalCase);
const parseWork = (p: unknown) => parseCollection(p, parseWorkOrder);
// Grouping runs here so an overflow or malformed ledger becomes an error state, never a render-time throw.
const parseLedger = (p: unknown) => {
  const rows = parseCollection(p, parseLedgerEntry);
  groupLedgerByLease(rows);
  return rows;
};

type Fetcher = (path: string, init?: { signal?: AbortSignal }) => Promise<unknown>;
type Contracts = Readonly<Record<OperationsDomain, DomainContract>>;

/** Loads one domain. Unverified domains settle to "unavailable" without any request. */
function useDomain<T>(
  domain: OperationsDomain, parse: (p: unknown) => T[], contracts?: Contracts, fetcher?: Fetcher,
): { state: DomainState<T>; retry: () => void } {
  const epoch = useSessionEpoch();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DomainState<T>>({ state: "loading" });
  useEffect(() => {
    const ctl = new AbortController();
    setState({ state: "loading" });
    resolveDomain(domain, parse, { contracts, fetcher, signal: ctl.signal }).then((r) => {
      if (r && !ctl.signal.aborted) setState(r);
    });
    return () => ctl.abort();
    // parse is a module-level constant per domain; epoch drops prior-identity data on a session change.
  }, [domain, parse, contracts, fetcher, epoch, attempt]);
  return { state, retry: useCallback(() => setAttempt((n) => n + 1), []) };
}

/** Pure renderer for every state; the page wires it to useDomain. */
export function DomainPanel<T>({ domain, label, state, onRetry, note, children }: {
  domain: OperationsDomain; label: string; state: DomainState<T>; onRetry?: () => void; note?: string;
  children: (rows: T[]) => React.ReactNode;
}) {
  let body: React.ReactNode;
  switch (state.state) {
    case "loading":
      body = <StateNotice kind="loading" title={`Loading ${label.toLowerCase()}…`} testId={`ops-loading-${domain}`} />;
      break;
    case "unavailable":
      body = <StateNotice kind="partial" title={state.contract.unavailableMessage} testId={`ops-gate-${domain}`} />;
      break;
    case "denied":
      body = <StateNotice kind="denied" title={`You don't have access to ${label.toLowerCase()}`} detail="Ask an administrator if you need it." testId={`ops-denied-${domain}`} />;
      break;
    case "error":
      body = <StateNotice kind="error" title={`${label} could not be loaded`} detail="Nothing is shown rather than partial or guessed data. Try again." onRetry={onRetry} testId={`ops-error-${domain}`} />;
      break;
    default:
      body = children(state.rows);
  }
  return (
    <section className="ops-section" aria-labelledby={`ops-${domain}`} data-testid={`ops-section-${domain}`}>
      <h2 id={`ops-${domain}`}>{label}</h2>
      {body}
      {note ? <p className="ops-disabled">{note}</p> : null}
    </section>
  );
}

/** A <section>, not <main>: App.tsx already provides the page's single <main> landmark. */
export function OperationsRecoveryView({ contracts = OPERATIONS_CONTRACTS, fetcher }: { contracts?: Contracts; fetcher?: Fetcher }) {
  const legal = useDomain<LegalCase>("legalCases", parseLegal, contracts, fetcher);
  const work = useDomain<WorkOrder>("workOrders", parseWork, contracts, fetcher);
  const ledger = useDomain<LedgerEntry>("ledgerEntries", parseLedger, contracts, fetcher);
  return (
    <section className="ops-page" data-testid="operations-recovery">
      <h1>Operations</h1>
      <p className="ops-lede">Legal cases, work orders and tenant ledgers. Nothing is shown until its source is confirmed.</p>
      <DomainPanel domain="legalCases" label={contracts.legalCases.label} state={legal.state} onRetry={legal.retry}
        note="This view is read-only.">
        {(rows) => <LegalCasesTable rows={rows} />}
      </DomainPanel>
      <DomainPanel domain="workOrders" label={contracts.workOrders.label} state={work.state} onRetry={work.retry}
        note="This view is read-only.">
        {(rows) => <WorkOrdersTable rows={rows} />}
      </DomainPanel>
      <DomainPanel domain="ledgerEntries" label={contracts.ledgerEntries.label} state={ledger.state} onRetry={ledger.retry}
        note="This view is read-only. Payments are never inferred from leases.">
        {(rows) => <LedgerView entries={rows} />}
      </DomainPanel>
    </section>
  );
}

/** Route entry (App.tsx mounts this): production contracts and the session-scoped fetcher, no injection. */
export default function OperationsRecoveryPage() {
  return <OperationsRecoveryView />;
}
