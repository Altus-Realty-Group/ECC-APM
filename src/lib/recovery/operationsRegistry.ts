// R1-C: contract gate for the recovered operations domains.
//
// A domain becomes "verified" only when Codex records a current, authoritative backend contract for it
// (see docs/recovery/operations/INTEGRATION_REQUEST.md). Until then the UI makes NO request for it and shows an
// honest unavailable state. The candidate paths below are the recovered source's, kept for traceability only.

import { errorKind } from "@/lib/dataState";
import { sessionFetchJSON, StaleSessionError } from "@/lib/sessionScope";

export type OperationsDomain = "legalCases" | "workOrders" | "ledgerEntries";

export type DomainContract = {
  domain: OperationsDomain;
  label: string;
  /** Path declared by the recovered source. Not evidence that a current backend serves it. */
  candidatePath: string;
  status: "unverified" | "verified";
  /** The verified read endpoint. Required once status is "verified"; never derived from candidatePath. */
  endpoint?: string;
  /**
   * Plain-language availability message shown to operators. It must not name backends, contracts, routes or
   * idempotency; the technical requirements live in docs/recovery/operations/CONTRACT_LEDGER.md.
   */
  unavailableMessage: string;
};

export const OPERATIONS_CONTRACTS: Readonly<Record<OperationsDomain, DomainContract>> = {
  legalCases: {
    domain: "legalCases",
    label: "Legal cases",
    candidatePath: "/api/legal/cases",
    status: "unverified",
    unavailableMessage: "Legal cases are not available yet. Nothing is shown until the records can be confirmed.",
  },
  workOrders: {
    domain: "workOrders",
    label: "Work orders",
    candidatePath: "/api/maintenance/work-orders",
    status: "unverified",
    unavailableMessage: "Work orders are not available yet. Nothing is shown until the records can be confirmed.",
  },
  ledgerEntries: {
    domain: "ledgerEntries",
    label: "Tenant ledger",
    candidatePath: "/api/lease-charges + /api/lease-payments",
    status: "unverified",
    unavailableMessage: "The tenant ledger is not available yet. Balances are never estimated from lease terms.",
  },
};

export type DomainResult<T> =
  | { state: "unavailable"; contract: DomainContract }
  | { state: "ready"; rows: T[] };

type LoadOpts = {
  contracts?: Readonly<Record<OperationsDomain, DomainContract>>;
  fetcher?: (path: string, init?: { signal?: AbortSignal }) => Promise<unknown>;
  signal?: AbortSignal;
};

/**
 * Loads a domain only if its contract is verified. For an unverified domain it returns "unavailable"
 * WITHOUT calling the fetcher, so no unverified request ever leaves the browser.
 */
export async function loadDomain<T>(
  domain: OperationsDomain,
  parse: (payload: unknown) => T[],
  opts: LoadOpts = {},
): Promise<DomainResult<T>> {
  const contract = (opts.contracts ?? OPERATIONS_CONTRACTS)[domain];
  if (contract.status !== "verified") return { state: "unavailable", contract };
  if (!contract.endpoint) throw new Error(`${domain}: verified contract has no endpoint`);
  const fetcher = opts.fetcher ?? ((p, init) => sessionFetchJSON<unknown>(p, init));
  return { state: "ready", rows: parse(await fetcher(contract.endpoint, { signal: opts.signal })) };
}

/** What a domain panel renders. "loading" is only ever produced by the caller before resolveDomain settles. */
export type DomainState<T> =
  | { state: "loading" }
  | { state: "unavailable"; contract: DomainContract }
  | { state: "denied" }
  | { state: "error" }
  | { state: "ready"; rows: T[] };

/**
 * loadDomain + failure classification. Returns null when the result must be dropped (aborted, or the
 * response belongs to a previous session) so a late prior-identity answer is never shown.
 * 401/403 -> denied; a bad payload (ContractError) or any other failure -> error. Never "empty" on failure.
 */
export async function resolveDomain<T>(
  domain: OperationsDomain,
  parse: (payload: unknown) => T[],
  opts: LoadOpts = {},
): Promise<DomainState<T> | null> {
  try {
    return await loadDomain(domain, parse, opts);
  } catch (err) {
    if (opts.signal?.aborted || err instanceof StaleSessionError || (err as { name?: string } | null)?.name === "AbortError") return null;
    return { state: errorKind(err) };
  }
}


/** Shared query-cache participation and per-session identity for mounted operations. */
export function operationsQueryOptions<T>(
  domain: OperationsDomain,
  parse: (payload: unknown) => T[],
  epoch: number,
  opts: Omit<LoadOpts, "signal"> = {},
) {
  const contract = (opts.contracts ?? OPERATIONS_CONTRACTS)[domain];
  return {
    queryKey: ["recovery-operations", domain, epoch, contract.status, contract.endpoint ?? null],
    queryFn: ({ signal }: { signal: AbortSignal }) => loadDomain(domain, parse, { ...opts, signal }),
    // Old rows must disappear during a refresh, denial or session transition.
    // Keep the common retry/abort/purge policy supplied by createQueryClient.
    placeholderData: undefined,
  };
}
