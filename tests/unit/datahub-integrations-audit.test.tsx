import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DataHub from "../../src/pages/DataHub";
import IntegrationsHealthPage from "../../src/features/systems/integrations/IntegrationsHealthPage";
import { dataHubRows } from "../../src/lib/ecc-collection-hooks";
import { getSessionEpoch } from "../../src/lib/sessionScope";
import { HttpError } from "../../src/lib/http";

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, gcTime: Infinity, refetchOnMount: false } } });
}
function render(qc: QueryClient, node: React.ReactNode) {
  return renderToStaticMarkup(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}
function fail(qc: QueryClient, key: unknown[], status: number) {
  qc.getQueryCache().build(qc, { queryKey: key }).setState({
    status: "error", fetchStatus: "idle", error: new HttpError("Sensitive backend error", status),
  });
}
const entityKey = () => ["datahub", getSessionEpoch(), "owners", { order: "id.desc", limit: 25 }];

test("Data Hub distinguishes loading, denied, failed and verified-empty records without transfer commands", () => {
  for (const state of ["loading", "denied", "failed", "empty"] as const) {
    const qc = client();
    if (state === "denied" || state === "failed") fail(qc, entityKey(), state === "denied" ? 403 : 503);
    if (state === "empty") qc.setQueryData(entityKey(), []);
    const html = render(qc, <DataHub />);
    if (state === "empty") assert.match(html, /No rows/);
    else assert.doesNotMatch(html, /No rows/);
    if (state === "loading") assert.match(html, /Loading records/);
    if (state === "denied" || state === "failed") assert.match(html, /Records could not be loaded/);
    assert.doesNotMatch(html, /Sensitive backend error|Live Azure Functions|sourceOwnerId|transferId|1\) initiate|2\) approve|3\) authorize|4\) execute/);
    assert.match(html, /Owner transfers are unavailable/);
    qc.clear();
  }
});

test("Data Hub accepts collection envelopes and rejects malformed successful payloads", () => {
  const rows = [{ id: 7, name: "Isolated fixture" }];
  for (const value of [rows, { data: rows }, { results: rows }]) assert.deepEqual(dataHubRows(value), rows);
  for (const value of [null, {}, { data: null }, { data: null, results: [] }, { data: {} }, { ok: true }, [null], [7], [[]]]) {
    assert.throws(() => dataHubRows(value), /Invalid record collection/);
  }
  assert.deepEqual(dataHubRows({ data: [] }), []);
});

test("Integration read failures suppress scheduler assertions, token entry and mutation controls", () => {
  // SSR has no browser storage; the existing success-path token loader catches its absence.
  const savedWarn = console.warn;
  console.warn = () => {};
  try {
    for (const status of [401, 403, 503]) {
      const qc = client();
      fail(qc, ["/api/health/sync"], status);
      fail(qc, ["/api/config/integrations"], status);
      const html = render(qc, <IntegrationsHealthPage />);
      assert.match(html, /Integration health could not be loaded/);
      assert.doesNotMatch(html, /Sensitive backend error|input-admin-token|Scheduler|Send Test Alert|Force Reset|button-run/);
      qc.clear();
    }
  } finally { console.warn = savedWarn; }
});

test("Integration existing success interface still renders after verified read responses", () => {
  const qc = client();
  qc.setQueryData(["/api/health/sync"], { status: { last_success_at: "2026-10-17T12:00:00Z" }, enabled: false });
  qc.setQueryData(["/api/config/integrations"], { integrations: {} });
  const savedWarn = console.warn;
  console.warn = () => {};
  try {
    const html = render(qc, <IntegrationsHealthPage />);
    assert.match(html, /DoorLoop/);
    assert.match(html, /Monitoring/);
    assert.doesNotMatch(html, /Integration health could not be loaded/);
  } finally { console.warn = savedWarn; qc.clear(); }
});
