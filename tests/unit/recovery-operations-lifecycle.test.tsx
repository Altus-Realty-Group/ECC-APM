import React from "react";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryObserver } from "@tanstack/react-query";
import { createQueryClient } from "../../src/lib/queryClient";
import { __resetSessionEpochForTests, getSessionEpoch, handleSessionBoundary } from "../../src/lib/sessionScope";
import { OPERATIONS_CONTRACTS, operationsQueryOptions, type DomainState } from "../../src/lib/recovery/operationsRegistry";
import { parseCollection, parseLegalCase, parseWorkOrder, type LegalCase } from "../../src/lib/recovery/operationsContracts";
import { DomainPanel, toDomainState } from "../../src/features/recovery/operations/OperationsRecoveryPage";
import { HttpError } from "../../src/lib/http";

// Invented fixtures. These exercise the shared query lifecycle only; they are not operating data and they never
// change the production contract table.
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
const ready: DomainState<LegalCase> = { state: "ready", rows: [parseLegalCase({ id: "c1" })] };
const base = { data: undefined, isError: false, error: null, isPending: false, fetchStatus: "idle" as const };

test("toDomainState: a denial wins and hides retained data; other failures are errors", () => {
  assert.deepEqual(toDomainState({ ...base, data: ready, isError: true, error: new HttpError("HTTP 403", 403) }), { state: "denied" });
  assert.deepEqual(toDomainState({ ...base, data: ready, isError: true, error: new Error("boom") }), { state: "error" });
  assert.deepEqual(toDomainState({ ...base, isError: true, error: new HttpError("HTTP 500", 500) }), { state: "error" });
});

test("toDomainState: ready and unavailable pass through untouched", () => {
  assert.equal(toDomainState({ ...base, data: ready }), ready);
  const gate: DomainState<LegalCase> = { state: "unavailable", contract: OPERATIONS_CONTRACTS.legalCases };
  assert.equal(toDomainState({ ...base, data: gate }), gate);
});

test("toDomainState: loading only while a request is in flight or paused; pending with nothing in flight is cleared", () => {
  assert.deepEqual(toDomainState({ ...base, isPending: true, fetchStatus: "fetching" }), { state: "loading" });
  assert.deepEqual(toDomainState({ ...base, isPending: true, fetchStatus: "paused" }), { state: "loading" });
  assert.deepEqual(toDomainState({ ...base, isPending: true, fetchStatus: "idle" }), { state: "cleared" });
});

test("the cleared panel is plain, offers Retry and shows no rows", () => {
  const html = renderToStaticMarkup(
    <DomainPanel domain="workOrders" label="Work orders" state={{ state: "cleared" }} onRetry={() => {}}>
      {() => <p>ROWS</p>}
    </DomainPanel>,
  );
  assert.match(html, /data-testid="ops-cleared-workOrders"/);
  assert.match(html, /The work orders view was cleared after an access change/);
  assert.match(html, /<button[^>]*>Retry<\/button>/);
  assert.doesNotMatch(html, /ROWS|Loading/);
  for (const word of ["backend", "contract", "endpoint", "/api/"]) assert.doesNotMatch(html.toLowerCase(), new RegExp(word));
});

test("a 403 in one domain leaves a sibling observer cleared (not loading, not ready); Retry recovers it", async () => {
  const qc = client();
  let denied = false;
  const fetcher = async (path: string) => {
    if (denied && path === "/test/legal") throw new HttpError("HTTP 403", 403);
    return { data: path === "/test/legal" ? [{ id: "case1" }] : [{ id: "job1", description: "Fixture repair" }] };
  };
  const legal = new QueryObserver(qc, operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), { contracts, fetcher }));
  const work = new QueryObserver(qc, operationsQueryOptions("workOrders", workParse, getSessionEpoch(), { contracts, fetcher }));
  const off = [legal.subscribe(() => {}), work.subscribe(() => {})];
  await Promise.all([legal.refetch(), work.refetch()]);
  assert.equal(toDomainState(work.getCurrentResult()).state, "ready");
  denied = true;
  await legal.refetch();
  assert.equal(toDomainState(legal.getCurrentResult()).state, "denied");
  assert.equal(toDomainState(work.getCurrentResult()).state, "cleared");
  assert.equal(qc.getQueryCache().getAll().some((q) => q.state.data !== undefined), false);
  await work.refetch();                              // current-session Retry
  assert.equal(toDomainState(work.getCurrentResult()).state, "ready");
  off.forEach((f) => f()); qc.clear();
});

test("after a session boundary the replacement query is loading, never the prior rows, and late data is current-session only", async () => {
  const qc = client();
  const first = operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), { contracts, fetcher: async () => ({ data: [{ id: "previous-account" }] }) });
  const observer = new QueryObserver(qc, first);
  const off = observer.subscribe(() => {});
  await observer.refetch();
  assert.equal(toDomainState(observer.getCurrentResult()).state, "ready");
  handleSessionBoundary(qc);
  let finish!: (v: unknown) => void;
  const next = operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), {
    contracts, fetcher: () => new Promise((resolve) => { finish = resolve; }),
  });
  observer.setOptions(next);
  void observer.refetch();
  const during = toDomainState(observer.getCurrentResult());
  assert.equal(during.state, "loading");
  finish({ data: [{ id: "current-account" }] });
  await new Promise((r) => setTimeout(r, 0));
  const after = toDomainState(observer.getCurrentResult());
  assert.equal(after.state === "ready" && after.rows[0].id, "current-account");
  off(); qc.clear();
});

test("a new session epoch key never carries prior rows as placeholder data, even when nothing purged them first", async () => {
  const qc = client();
  const first = operationsQueryOptions("legalCases", legalParse, getSessionEpoch(), { contracts, fetcher: async () => ({ data: [{ id: "previous-account" }] }) });
  const observer = new QueryObserver(qc, first);
  const off = observer.subscribe(() => {});
  await observer.refetch();
  assert.equal(toDomainState(observer.getCurrentResult()).state, "ready");
  // Epoch key changes with the old rows still cached (no purge): the replacement must start empty.
  const next = operationsQueryOptions("legalCases", legalParse, getSessionEpoch() + 1, {
    contracts, fetcher: () => new Promise(() => {}),
  });
  observer.setOptions(next);
  const r = observer.getCurrentResult();
  assert.equal(r.data, undefined);
  assert.equal(r.isPlaceholderData, false);
  assert.equal(toDomainState(r).state, "loading");
  off(); qc.clear();
});
