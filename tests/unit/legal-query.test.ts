import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QueryObserver } from "@tanstack/react-query";
import { createQueryClient } from "../../src/lib/queryClient";
import { legalQueryOptions } from "../../src/features/legal/legalQuery";
import { fixtureLegalAdapter, unboundLegalAdapter, SYNTHETIC_MATTERS } from "../../src/features/legal/adapter";
import { __resetSessionEpochForTests, getSessionEpoch, handleSessionBoundary, StaleSessionError } from "../../src/lib/sessionScope";
import { HttpError } from "../../src/lib/http";

beforeEach(__resetSessionEpochForTests);
test("detail adapter preserves unavailable/denied/error versus missing", async () => {
  assert.equal((await unboundLegalAdapter().getMatter("m-001")).kind, "unavailable");
  for (const state of [{ kind: "denied" }, { kind: "error", message: "Fixture failure" }, { kind: "unavailable", reason: "Fixture unavailable" }] as const) {
    assert.equal((await fixtureLegalAdapter(state).getMatter("m-001")).kind, state.kind);
  }
  assert.equal((await fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS }).getMatter("missing")).kind, "missing");
});

test("a denial in another app query purges an observed legal register", async () => {
  const client = createQueryClient();
  const adapter = fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS });
  const options = legalQueryOptions(adapter, "register", 0, "default", signal => adapter.load(signal));
  const observer = new QueryObserver(client, options);
  const off = observer.subscribe(() => {});
  await observer.refetch();
  assert.equal(observer.getCurrentResult().data?.kind, "ready");
  await assert.rejects(client.fetchQuery({ queryKey: ["other-domain"], retry: false,
    queryFn: async () => { throw new HttpError("HTTP 403", 403); } }));
  assert.equal(observer.getCurrentResult().data, undefined);
  off(); client.clear();
});

test("legal denial uses the shared purge and does not retain sibling data", async () => {
  const client = createQueryClient();
  client.setQueryData(["portfolio", "properties"], [{ id: 1 }]);
  const adapter = fixtureLegalAdapter({ kind: "denied" });
  await assert.rejects(client.fetchQuery(legalQueryOptions(adapter, "register", 0, "default", signal => adapter.load(signal))), /403/);
  assert.equal(client.getQueryData(["portfolio", "properties"]), undefined);
  client.clear();
});

test("session boundary removes rows before a delayed old-context response returns", async () => {
  const client = createQueryClient();
  let finish!: (v: { kind: "ready"; matters: typeof SYNTHETIC_MATTERS }) => void;
  const adapter = fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS });
  const options = legalQueryOptions(adapter, "register", getSessionEpoch(), "default", () => new Promise(resolve => { finish = resolve; }));
  const pending = options.queryFn({ signal: new AbortController().signal });
  handleSessionBoundary(client);
  finish({ kind: "ready", matters: SYNTHETIC_MATTERS });
  await assert.rejects(pending, StaleSessionError);
  assert.equal(client.getQueryCache().getAll().some(q => q.state.data !== undefined), false);
  client.clear();
});
