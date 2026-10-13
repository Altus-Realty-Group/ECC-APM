import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "../../src/lib/queryClient";
import { HttpError } from "../../src/lib/http";
import { ContractError } from "../../src/lib/dataState";
import {
  SESSION_BOUNDARY_EVENT, StaleSessionError, __resetSessionEpochForTests, getSessionEpoch, handleSessionBoundary,
  installSessionBoundary, purgeSensitiveCache, sessionFetchJSON, subscribeSessionEpoch,
} from "../../src/lib/sessionScope";

/** createQueryClient with GC timers disabled so the test process can exit promptly. */
const mk = () => {
  const qc = createQueryClient();
  qc.setDefaultOptions({ queries: { ...qc.getDefaultOptions().queries, gcTime: Infinity } });
  return qc;
};

const realFetch = globalThis.fetch;
beforeEach(() => __resetSessionEpochForTests());
afterEach(() => { globalThis.fetch = realFetch; });

const secret = { propertiesTotal: 9, rows: ["Elm Court"] };
const seed = (qc: QueryClient) => {
  qc.setQueryData(["dashboard-kpis"], secret);
  qc.setQueryData(["card", "property", 7], { property: { name: "Secret Court" } });
  qc.setQueryData(["portfolio", "properties"], [{ id: 12, name: "Elm Court" }]);
};
const data = (qc: QueryClient, key: unknown[]) => qc.getQueryData(key);

test("a 403 from any query purges every cached result", async () => {
  const qc = mk();
  seed(qc);
  await qc.fetchQuery({ queryKey: ["other"], queryFn: () => { throw new HttpError("HTTP 403", 403); }, retry: false }).catch(() => {});
  assert.equal(data(qc, ["dashboard-kpis"]), undefined);
  assert.equal(data(qc, ["card", "property", 7]), undefined);
  assert.equal(data(qc, ["portfolio", "properties"]), undefined);
});

test("a 401 purges too, and the failing query's own retained data is dropped", async () => {
  const qc = mk();
  seed(qc);
  await qc.fetchQuery({ queryKey: ["dashboard-kpis"], queryFn: () => { throw new HttpError("HTTP 401", 401); }, retry: false, staleTime: 0 }).catch(() => {});
  assert.equal(data(qc, ["dashboard-kpis"]), undefined, "denied query must not keep its cached data");
  assert.equal(data(qc, ["portfolio", "properties"]), undefined);
});

test("transient failures (500, network, contract) do NOT purge", async () => {
  for (const err of [new HttpError("HTTP 500", 500), new Error("Failed to fetch"), new ContractError("bad shape")]) {
    const qc = mk();
    seed(qc);
    await qc.fetchQuery({ queryKey: ["other"], queryFn: () => { throw err; }, retry: false }).catch(() => {});
    assert.deepEqual(data(qc, ["dashboard-kpis"]), secret, err.message);
    assert.ok(data(qc, ["portfolio", "properties"]));
  }
});

test("retry policy: denials, contract violations and stale-session responses are never retried", () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (n: number, e: unknown) => boolean;
  assert.equal(retry(0, new HttpError("HTTP 403", 403)), false);
  assert.equal(retry(0, new HttpError("HTTP 401", 401)), false);
  assert.equal(retry(0, new ContractError("x")), false);
  assert.equal(retry(0, new StaleSessionError()), false);
  assert.equal(retry(0, new HttpError("HTTP 503", 503)), true);
  assert.equal(retry(1, new HttpError("HTTP 503", 503)), false);
});

test("no placeholder carry-over of another entity's/identity's data", () => {
  const o = createQueryClient().getDefaultOptions().queries as Record<string, unknown>;
  assert.equal(o.placeholderData, undefined);
  assert.equal(o.keepPreviousData, undefined);
});

test("purgeSensitiveCache resets everything except the reporter, and clears the reporter's data", () => {
  const qc = mk();
  seed(qc);
  const keep = qc.getQueryCache().find({ queryKey: ["dashboard-kpis"] })!;
  purgeSensitiveCache(qc, keep);
  assert.equal(data(qc, ["card", "property", 7]), undefined);
  assert.equal(data(qc, ["dashboard-kpis"]), undefined);
});

test("session boundary: bumps epoch, purges the cache, notifies subscribers", () => {
  const qc = mk();
  seed(qc);
  let notified = 0;
  const off = subscribeSessionEpoch(() => { notified += 1; });
  assert.equal(getSessionEpoch(), 0);
  handleSessionBoundary(qc);
  assert.equal(getSessionEpoch(), 1);
  assert.equal(notified, 1);
  assert.equal(data(qc, ["dashboard-kpis"]), undefined);
  assert.equal(data(qc, ["portfolio", "properties"]), undefined);
  off();
  handleSessionBoundary(qc);
  assert.equal(notified, 1, "unsubscribed listeners are not called");
});

test("the supported boundary event triggers the purge; cleanup detaches it", () => {
  const qc = mk();
  const target = new EventTarget();
  const off = installSessionBoundary(qc, target as any);
  seed(qc);
  target.dispatchEvent(new Event(SESSION_BOUNDARY_EVENT));
  assert.equal(getSessionEpoch(), 1);
  assert.equal(data(qc, ["dashboard-kpis"]), undefined);
  off();
  seed(qc);
  target.dispatchEvent(new Event(SESSION_BOUNDARY_EVENT));
  assert.equal(getSessionEpoch(), 1, "detached");
  assert.ok(data(qc, ["dashboard-kpis"]));
});

function deferredFetch() {
  let resolve!: (r: Response) => void;
  let reject!: (e: unknown) => void;
  const p = new Promise<Response>((res, rej) => { resolve = res; reject = rej; });
  globalThis.fetch = (() => p) as typeof fetch;
  return { resolve, reject };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("a late SUCCESS from the previous session is rejected, not delivered", async () => {
  const qc = mk();
  const d = deferredFetch();
  const pending = sessionFetchJSON<unknown>("/api/portfolio/properties");
  handleSessionBoundary(qc); // sign-out / account switch while the request is in flight
  d.resolve(json([{ id: 1, name: "Previous account's property" }]));
  await assert.rejects(pending, StaleSessionError);
});

test("a late ERROR from the previous session is also swallowed as stale", async () => {
  const qc = mk();
  const d = deferredFetch();
  const pending = sessionFetchJSON<unknown>("/api/portfolio/properties");
  handleSessionBoundary(qc);
  d.resolve(json({ error: "forbidden" }, 403));
  await assert.rejects(pending, StaleSessionError);
});

test("a response within the same session is delivered normally; real 403s keep their status", async () => {
  globalThis.fetch = (async () => json({ ok: 1 })) as typeof fetch;
  assert.deepEqual(await sessionFetchJSON<unknown>("/api/x"), { ok: 1 });
  globalThis.fetch = (async () => json({ error: "nope" }, 403)) as typeof fetch;
  await assert.rejects(sessionFetchJSON<unknown>("/api/x"), (e: any) => e instanceof HttpError && e.status === 403);
});

test("end to end: late prior-session response cannot repopulate a purged cache via the query layer", async () => {
  const qc = mk();
  const d = deferredFetch();
  const p = qc.fetchQuery({ queryKey: ["portfolio", "properties"], queryFn: () => sessionFetchJSON("/api/portfolio/properties"), retry: false }).catch((e) => e);
  handleSessionBoundary(qc);
  d.resolve(json([{ id: 1, name: "Previous account's property" }]));
  const err = await p;
  assert.ok(err instanceof StaleSessionError || err instanceof Error);
  assert.equal(qc.getQueryData(["portfolio", "properties"]), undefined);
});
