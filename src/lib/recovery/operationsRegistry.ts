// R1-C: contract gate for the recovered operations domains.
//
// A domain becomes "verified" only when Codex records a current, authoritative backend contract for it
// (see docs/recovery/operations/INTEGRATION_REQUEST.md). Until then the UI makes NO request for it and shows an
// honest unavailable state. The candidate paths below are the recovered source's, kept for traceability only.

import { sessionFetchJSON } from "@/lib/sessionScope";

export type OperationsDomain = "legalCases" | "workOrders" | "ledgerEntries";

export type DomainContract = {
  domain: OperationsDomain;
  label: string;
  /** Path declared by the recovered source. Not evidence that a current backend serves it. */
  candidatePath: string;
  status: "unverified" | "verified";
  /** The verified read endpoint. Required once status is "verified"; never derived from candidatePath. */
  endpoint?: string;
  /** Why it is gated; shown to operators in plain language. */
  reason: string;
  /** What must exist before activation. */
  needs: readonly string[];
};

export const OPERATIONS_CONTRACTS: Readonly<Record<OperationsDomain, DomainContract>> = {
  legalCases: {
    domain: "legalCases",
    label: "Legal cases",
    candidatePath: "/api/legal/cases",
    status: "unverified",
    reason: "No current ECC backend route or table provides legal cases.",
    needs: [
      "A verified read route returning cases scoped to the signed-in user's authority",
      "Money as integer cents and dates as calendar dates",
    ],
  },
  workOrders: {
    domain: "workOrders",
    label: "Work orders",
    candidatePath: "/api/maintenance/work-orders",
    status: "unverified",
    reason: "The current maintenance work-order route is deliberately unavailable (HTTP 503) until a real source is wired.",
    needs: [
      "A verified read route replacing the unavailable handler",
      "A declared cost unit (integer cents) and the property/unit join",
    ],
  },
  ledgerEntries: {
    domain: "ledgerEntries",
    label: "Tenant ledger",
    candidatePath: "/api/lease-charges + /api/lease-payments",
    status: "unverified",
    reason: "No current route or table provides recorded lease charges and payments; lease rent is not a payment.",
    needs: [
      "Recorded charge and payment rows with integer cents and posting dates",
      "A single authoritative per-lease ledger read, not client-side joins",
    ],
  },
};

export type DomainResult<T> =
  | { state: "unavailable"; contract: DomainContract }
  | { state: "ready"; rows: T[] };

/**
 * Loads a domain only if its contract is verified. For an unverified domain it returns "unavailable"
 * WITHOUT calling the fetcher, so no unverified request ever leaves the browser.
 */
export async function loadDomain<T>(
  domain: OperationsDomain,
  parse: (payload: unknown) => T[],
  opts: {
    contracts?: Readonly<Record<OperationsDomain, DomainContract>>;
    fetcher?: (path: string, init?: { signal?: AbortSignal }) => Promise<unknown>;
    signal?: AbortSignal;
  } = {},
): Promise<DomainResult<T>> {
  const contract = (opts.contracts ?? OPERATIONS_CONTRACTS)[domain];
  if (contract.status !== "verified") return { state: "unavailable", contract };
  if (!contract.endpoint) throw new Error(`${domain}: verified contract has no endpoint`);
  const fetcher = opts.fetcher ?? ((p, init) => sessionFetchJSON<unknown>(p, init));
  return { state: "ready", rows: parse(await fetcher(contract.endpoint, { signal: opts.signal })) };
}
