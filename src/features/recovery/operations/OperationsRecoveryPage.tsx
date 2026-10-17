import React from "react";
import { useQuery } from "@tanstack/react-query";
import { accessGuard } from "@/lib/useAccessGuard";
import "./operations.css";
import StateNotice from "@/components/ui/StateNotice";
import { useSessionEpoch } from "@/lib/sessionScope";
import {
  OPERATIONS_CONTRACTS, operationsQueryOptions,
  type DomainContract, type DomainResult, type DomainState, type OperationsDomain,
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

type QueryView<T> = {
  data: DomainResult<T> | undefined; isError: boolean; error: unknown; isPending: boolean; fetchStatus: "fetching" | "paused" | "idle";
};

/**
 * Maps one query result to what the operator sees. Order matters: a denial wins and hides retained data; any other
 * failure is an error; a pending query with NOTHING in flight was purged (the shared denial purge resets sibling
 * queries) and is "cleared", never "loading" - claiming a load that is not happening would be untrue.
 */
export function toDomainState<T>(q: QueryView<T>): DomainState<T> {
  const { data, denied } = accessGuard(q);
  if (denied) return { state: "denied" };
  if (q.isError) return { state: "error" };
  if (data) return data;
  return q.isPending && q.fetchStatus === "idle" ? { state: "cleared" } : { state: "loading" };
}

/** Loads one domain. Unverified domains settle to "unavailable" without any request. */
function useDomain<T>(
  domain: OperationsDomain, parse: (p: unknown) => T[], contracts?: Contracts, fetcher?: Fetcher,
): { state: DomainState<T>; retry: () => void } {
  const epoch = useSessionEpoch();
  const q = useQuery(operationsQueryOptions(domain, parse, epoch, { contracts, fetcher }));
  // Shared QueryCache purges every domain on a denial. Epoch-keyed queries never
  // render the prior identity's rows while a replacement request is loading.
  return { state: toDomainState<T>(q), retry: () => { void q.refetch(); } };
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
    case "cleared":
      body = <StateNotice kind="stale" title={`The ${label.toLowerCase()} view was cleared after an access change`} detail="Nothing is shown until you try again." onRetry={onRetry} testId={`ops-cleared-${domain}`} />;
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

type OperationRow = LegalCase | WorkOrder | LedgerEntry;
const DOMAIN_PARSERS = { legalCases: parseLegal, workOrders: parseWork, ledgerEntries: parseLedger };
export const ALL_OPERATIONS_DOMAINS: readonly OperationsDomain[] = ["legalCases", "workOrders", "ledgerEntries"];

/** Ledger searches select whole leases, preserving every entry used in the displayed balance. */
export function filterOperationRows(domain: OperationsDomain, rows: OperationRow[], search: string, status = ""): OperationRow[] {
  const needle = search.trim().toLocaleLowerCase();
  const matches = (values: unknown[]) => values.some((value) => String(value ?? "").toLocaleLowerCase().includes(needle));
  if (domain === "ledgerEntries") {
    const entries = rows as LedgerEntry[];
    const leases = new Set(entries.filter((entry) => matches([entry.leaseId, entry.memo])).map((entry) => entry.leaseId));
    return entries.filter((entry) => leases.has(entry.leaseId));
  }
  return rows.filter((row) => {
    const record = row as LegalCase | WorkOrder;
    const values = "description" in record
      ? [record.id, record.description, record.propertyName, record.unitLabel, record.priority]
      : [record.id, record.type, record.tenantName, record.propertyName, record.unitLabel];
    return (!status || record.status === status) && matches(values);
  });
}

export function OperationRecords({ domain, rows }: { domain: OperationsDomain; rows: OperationRow[] }) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const filtered = filterOperationRows(domain, rows, search, status);
  const statuses = domain === "ledgerEntries" ? [] : [...new Set((rows as (LegalCase | WorkOrder)[]).map((row) => row.status))].sort();
  const searchLabel = domain === "ledgerEntries" ? "Find a lease or ledger memo" : domain === "legalCases" ? "Find a case, tenant or property" : "Find work by description or property";
  return <>
    {rows.length > 0 ? <div className="ops-filters" role="search" aria-label={`Search ${domain === "ledgerEntries" ? "tenant ledgers" : domain === "legalCases" ? "legal cases" : "work orders"}`}>
      <label htmlFor={`ops-search-${domain}`}>{searchLabel}
        <input id={`ops-search-${domain}`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      {statuses.length ? <label htmlFor={`ops-status-${domain}`}>Status
        <select id={`ops-status-${domain}`} aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All recorded statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{value === "unknown" ? "Unknown" : value.replace(/_/g, " ")}</option>)}
        </select>
      </label> : null}
      {(search || status) ? <button className="ecc-btn" type="button" onClick={() => { setSearch(""); setStatus(""); }}>Clear filters</button> : null}
    </div> : null}
    {rows.length > 0 ? <p className="ops-disabled" role="status">{domain === "ledgerEntries"
      ? "Matching leases include all their loaded entries; balances cover those entries only."
      : `${filtered.length} of ${rows.length} loaded records shown.`}</p> : null}
    {rows.length > 0 && filtered.length === 0 ? <StateNotice kind="empty" title="No loaded records match these filters" detail="Clear the filters to see all loaded records." testId={`ops-filter-empty-${domain}`} />
      : domain === "legalCases" ? <LegalCasesTable rows={filtered as LegalCase[]} />
        : domain === "workOrders" ? <WorkOrdersTable rows={filtered as WorkOrder[]} />
          : <LedgerView entries={filtered as LedgerEntry[]} />}
  </>;
}

function OperationDomain({ domain, contracts, fetcher }: { domain: OperationsDomain; contracts: Contracts; fetcher?: Fetcher }) {
  const { state, retry } = useDomain<OperationRow>(domain, DOMAIN_PARSERS[domain], contracts, fetcher);
  return <DomainPanel domain={domain} label={contracts[domain].label} state={state} onRetry={retry}
    note={domain === "ledgerEntries" ? "Read-only. Payments are never inferred from lease terms." : "Read-only. Review recorded information; changes are not available here."}>
    {(rows) => <OperationRecords domain={domain} rows={rows} />}
  </DomainPanel>;
}

/** Only mounted domains participate in queries; individual routes never fetch their siblings. */
export function OperationsRecoveryView({ contracts = OPERATIONS_CONTRACTS, fetcher, domains = ALL_OPERATIONS_DOMAINS,
  title = "Operations", description = "Legal cases, work orders and tenant ledgers. Nothing is shown until its source is confirmed.",
}: { contracts?: Contracts; fetcher?: Fetcher; domains?: readonly OperationsDomain[]; title?: string; description?: string }) {
  return <section className="ops-page" data-testid="operations-recovery">
    <h1>{title}</h1>
    <p className="ops-lede">{description}</p>
    {[...new Set(domains)].map((domain) => <OperationDomain key={domain} domain={domain} contracts={contracts} fetcher={fetcher} />)}
  </section>;
}

export default function OperationsRecoveryPage() {
  return <OperationsRecoveryView />;
}
