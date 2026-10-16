import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QueryObserver } from "@tanstack/react-query";
import { createQueryClient } from "../../src/lib/queryClient";
import { __resetSessionEpochForTests, getSessionEpoch, handleSessionBoundary } from "../../src/lib/sessionScope";
import { OPERATIONS_CONTRACTS, operationsQueryOptions } from "../../src/lib/recovery/operationsRegistry";
import { parseCollection, parseLegalCase, parseWorkOrder } from "../../src/lib/recovery/operationsContracts";
import { HttpError } from "../../src/lib/http";

beforeEach(() => __resetSessionEpochForTests());
const client = () => {
  const qc = createQueryClient();
  qc.setDefaultOptions({ queries: { ...qc.getDefaultOptions().queries, gcTime: Infinity } });
  return qc;
};
const contracts = {
  ...OPERATIONS_CONTRACTS,
  legalCases: { ...OPERATIONS_CONTRACTS.legalCases, status: "verified" as const, endpoint: "/test/legal" },
  workOrders: { ...OPERATIONS_CONTRACTS.workOrders, status: "verified" as const, endpoint: "/test/work" },
};
const legalParse = (p: unknown) => parseCollection(p, parseLegalCase);
const workParse = (p: unknown) => parseCollection(p, parseWorkOrder);

test("an operations denial clears the denying domain, another observed domain and portfolio cache", async () => {
  const qc = client();
  let denied = false;
  const fetcher = async (path: string) => {
    if (denied && path === "/test/legal") throw new HttpError("HTTP 403", 403);
    return { data: path === "/test/legal" ? [{ id: "case1" }] : [{ id: "job1", description: "Fixture repair" }] };
  };
  const legal = operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), { contracts, fetcher });
  const work = operationsQueryOptions("workOrders", workParse, getSessionEpoch(), { contracts, fetcher });
  await qc.fetchQuery(legal); await qc.fetchQuery(work);
  const legalObserver = new QueryObserver(qc, legal);
  const workObserver = new QueryObserver(qc, work);
  const offLegal = legalObserver.subscribe(() => {}), offWork = workObserver.subscribe(() => {});
  qc.setQueryData(["portfolio", "properties"], [{ id: 42 }]);
  assert.equal(workObserver.getCurrentResult().data?.state, "ready");
  denied = true;
  await legalObserver.refetch();
  assert.equal(legalObserver.getCurrentResult().data, undefined);
  assert.equal(workObserver.getCurrentResult().data, undefined);
  assert.equal(qc.getQueryData(["portfolio", "properties"]), undefined);
  assert.equal(legalObserver.getCurrentResult().error?.message, "HTTP 403");
  offLegal(); offWork(); qc.clear();
});

test("session transition immediately drops observed operations rows and discards a late previous-session response", async () => {
  const qc = client();
  const options = operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), {
    contracts, fetcher: async () => ({ data: [{ id: "previous-account" }] }),
  });
  await qc.fetchQuery(options);
  const observer = new QueryObserver(qc, options);
  const off = observer.subscribe(() => {});
  handleSessionBoundary(qc);
  // Same transition as useQuery receiving a new epoch: no placeholder carry-over.
  const next = operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), {
    contracts, fetcher: async (_p, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true })),
  });
  observer.setOptions(next);
  assert.equal(observer.getCurrentResult().data, undefined);
  assert.equal(observer.getCurrentResult().isPending, true);
  off(); await qc.cancelQueries(); qc.clear();

  // Use the production session-scoped fetcher for the late-response case.
  const originalFetch = globalThis.fetch;
  let finish!: (r: Response) => void;
  globalThis.fetch = () => new Promise<Response>(resolve => { finish = resolve; });
  try {
    const pending = qc.fetchQuery(operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), { contracts })).catch(e => e);
    handleSessionBoundary(qc);
    finish(new Response(JSON.stringify({ data: [{ id: "old-response" }] }), { headers: { "content-type": "application/json" } }));
    assert.ok(await pending instanceof Error);
    assert.equal(qc.getQueryCache().getAll().some(q => q.state.data !== undefined), false);
  } finally { globalThis.fetch = originalFetch; qc.clear(); }
});
