// TEST-ONLY harness (never part of the production build; it lives under e2e/ and is served only by the lifecycle spec).
//
// It mounts the REAL OperationsRecoveryView with the REAL createQueryClient, installSessionBoundary, access guard and the
// production session-scoped fetcher, exactly as src/main.tsx wires them. The only difference is the contract table:
// these FIXTURE contracts mark the three domains "verified" against /fixture/* paths that Playwright answers with
// invented rows. That proves the mounted lifecycle (populated rows, session boundary, denial purge, Retry). It is NOT
// operating-data acceptance and it never touches the production contract table, which stays unverified.
import "@/styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";
import { getSessionEpoch, installSessionBoundary, sessionFetchJSON } from "@/lib/sessionScope";
import { accessGuard } from "@/lib/useAccessGuard";
import { OperationsRecoveryView } from "@/features/recovery/operations/OperationsRecoveryPage";
import { OPERATIONS_CONTRACTS, type DomainContract, type OperationsDomain } from "@/lib/recovery/operationsRegistry";

const client = createQueryClient();
installSessionBoundary(client);

const FIXTURE_CONTRACTS: Readonly<Record<OperationsDomain, DomainContract>> = {
  legalCases: { ...OPERATIONS_CONTRACTS.legalCases, status: "verified", endpoint: "/fixture/legal" },
  workOrders: { ...OPERATIONS_CONTRACTS.workOrders, status: "verified", endpoint: "/fixture/work-orders" },
  ledgerEntries: { ...OPERATIONS_CONTRACTS.ledgerEntries, status: "verified", endpoint: "/fixture/ledger" },
};

/** Stands in for another feature's protected cache (portfolio data) so a cross-domain purge is visible in the DOM. */
function PortfolioProbe() {
  const q = useQuery({
    queryKey: ["portfolio", "properties"],
    queryFn: ({ signal }) => sessionFetchJSON<{ data: { id: string; name: string }[] }>("/fixture/portfolio", { signal }),
  });
  const { data, denied } = accessGuard(q);
  return (
    <section data-testid="portfolio-probe" aria-label="Portfolio probe">
      {denied ? <p data-testid="portfolio-denied">No access</p> : null}
      {data ? <ul>{data.data.map((p) => <li key={p.id}>{p.name}</li>)}</ul> : null}
    </section>
  );
}

declare global {
  interface Window {
    __eccHarness: {
      cachedKeys: () => string[];
      refetch: (prefix: unknown[]) => Promise<void>;
      epoch: () => number;
      productionStatuses: () => string[];
    };
  }
}

window.__eccHarness = {
  cachedKeys: () => client.getQueryCache().getAll().filter((q) => q.state.data !== undefined).map((q) => JSON.stringify(q.queryKey)),
  refetch: (prefix) => client.refetchQueries({ queryKey: prefix }),
  epoch: getSessionEpoch,
  productionStatuses: () => Object.values(OPERATIONS_CONTRACTS).map((c) => `${c.domain}:${c.status}:${c.endpoint ?? "none"}`),
};

// Same mode rule as src/main.tsx: strict double effects only outside development.
const Mode: React.ComponentType<{ children?: React.ReactNode }> = import.meta.env.DEV ? React.Fragment : React.StrictMode;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Mode>
    <QueryClientProvider client={client}>
      <main>
        <OperationsRecoveryView contracts={FIXTURE_CONTRACTS} />
        <PortfolioProbe />
      </main>
    </QueryClientProvider>
  </Mode>,
);
