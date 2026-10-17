import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { APPLICATIONS, parseConnections, safeNavigationUrl } from "../../src/features/connections/connectionsContract";
import OperationalConnectionsPage, { OperationalConnectionsView } from "../../src/features/connections/OperationalConnectionsPage";
import { createQueryClient } from "../../src/lib/queryClient";
import { getSessionEpoch, handleSessionBoundary, __resetSessionEpochForTests } from "../../src/lib/sessionScope";
import { HttpError } from "../../src/lib/http";
import { navLeafPaths, activeSectionTitle } from "../../src/config/navigation";
import { routeExists } from "./helpers";
const payload = () => ({ applications: [
  { key: "field-app", navigationUrl: "https://field.example/properties" },
  { key: "construction-manager", navigationUrl: "https://construction.example/projects" },
  { key: "deal-room", navigationUrl: "https://deal.example/" },
  { key: "property-intelligence", navigationUrl: null },
] });
type Query = React.ComponentProps<typeof OperationalConnectionsView>["query"];
function render(overrides: Partial<Query> = {}) {
  const query = { data: undefined, isSuccess: false, isLoading: false, isFetching: false, isError: false,
    error: null, refetch: async () => ({}), ...overrides } as Query;
  return renderToStaticMarkup(<Router ssrPath="/systems/connections"><OperationalConnectionsView query={query} /></Router>);
}
function noExternalLinks(html: string) { assert.doesNotMatch(html, /href="https:|Application link available/); }

test("connections exact four-key contract normalizes fixed application order", () => {
  const raw = payload();raw.applications.reverse();
  const result = parseConnections(raw);
  assert.deepEqual(result.applications.map(item => item.key), APPLICATIONS.map(app => app.key));
  assert.equal(result.applications[0].navigationUrl, "https://field.example/properties");
  assert.equal(result.applications[3].navigationUrl, null);
});

test("connections reject omissions, unknown/duplicate keys, extra fields and malformed collections", () => {
  for (const raw of [null, [], {}, { applications: null }, { applications: [] },
    { applications: payload().applications.slice(0, 3) }, { ...payload(), count: 4 },
    { applications: [...payload().applications, { key: "unknown", navigationUrl: null }] },
    { applications: [payload().applications[0], ...payload().applications.slice(0, 3)] },
    { applications: [null, ...payload().applications.slice(1)] },
    { applications: [{ key: "field-app" }, ...payload().applications.slice(1)] },
    { applications: [{ key: "field-app", navigationUrl: null, recordId: "invented" }, ...payload().applications.slice(1)] }]) {
    assert.throws(() => parseConnections(raw));
  }
});

test("client rejects unsafe URL schemes, credentials, private hosts and record/write paths", () => {
  for (const value of [undefined, 42, "", "javascript:alert(1)", "http://field.example/properties", "//field.example/properties",
    "https://name:password@field.example/properties", "https://field.example:444/properties", "https://localhost/properties",
    "https://localhost./properties", "https://service.internal./properties", "https://127.0.0.1/properties", "https://[::1]/properties", "https://2130706433/properties", "https://service.internal/properties",
    "https://field.example/properties/42", "https://field.example/properties?record=42", "https://field.example/properties#item",
    " https://field.example/properties", "https://field.example/properties\\edit", "https://field.example/properties\n"]) {
    assert.throws(() => safeNavigationUrl("field-app", value), String(value));
  }
  assert.throws(() => safeNavigationUrl("property-intelligence", "https://intelligence.example/"));
  assert.throws(() => safeNavigationUrl("deal-room", "https://deal.example/deal/42"));
  assert.equal(safeNavigationUrl("field-app", null), null);
});

test("ready connections render purpose and safe app navigation without record/delivery claims", () => {
  const html = render({ data: parseConnections(payload()), isSuccess: true });
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  for (const app of APPLICATIONS) assert.match(html, new RegExp(app.title));
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) ?? []).length, 3);
  assert.match(html, /Application navigation/);
  assert.match(html, /Record matching and evidence delivery need separate confirmation/);
  assert.match(html, /Not available from ECC/);
  assert.doesNotMatch(html, /href="https:\/\/intelligence|recordId|delivered|\d+ connected|\d+ pending|live integration/i);
});

test("null app URLs remain unavailable without invented fallback links", () => {
  const html = render({ data: parseConnections({ applications: payload().applications.map(app => ({ ...app, navigationUrl: null })) }), isSuccess: true });
  noExternalLinks(html);
  assert.equal((html.match(/Application link unavailable/g) ?? []).length, 3);
  assert.match(html, /Review ECC properties/);
  assert.match(html, /Review ECC work orders/);
});

test("loading/unresolved/failed refresh suppress retained app URLs and keep operator context", () => {
  for (const state of [
    {}, { isLoading: true, isFetching: true },
    { data: parseConnections(payload()), isSuccess: true, isFetching: true },
    { data: parseConnections(payload()), isError: true, error: new HttpError("HTTP 503",503) },
  ]) {
    const html = render(state); noExternalLinks(html);
    assert.match(html, /Operational connections/);
    assert.match(html, /Review ECC work orders/);
    assert.match(html, /Field App/);
  }
  assert.match(render({ isError: true, error: new Error("failure") }), />Retry</);
});

test("denial removes cached navigation URLs and offers canonical sign-in", () => {
  const html = render({ data: parseConnections(payload()), isError: true, error: new HttpError("Denied",403) });
  noExternalLinks(html);
  assert.match(html, /state-denied/);
  assert.match(html, /href="\/api\/access\/sign-in"/);
});

test("page uses epoch-keyed shared query cache and session invalidation clears prior URLs", () => {
  __resetSessionEpochForTests();
  const client=createQueryClient();
  client.setQueryData(["workspace","connections",getSessionEpoch()],parseConnections(payload()));
  const page=()=>renderToStaticMarkup(<Router ssrPath="/systems/connections"><QueryClientProvider client={client}><OperationalConnectionsPage /></QueryClientProvider></Router>);
  assert.match(page(), /https:\/\/field.example\/properties/);
  handleSessionBoundary(client);
  noExternalLinks(page());
  client.clear();__resetSessionEpochForTests();
});

test("operational connections is an actual unique registered navigation destination", () => {
  assert.equal(navLeafPaths().filter(path => path === "/systems/connections").length,1);
  assert.equal(routeExists("/systems/connections"),true);
  assert.equal(activeSectionTitle("/systems/connections"),"Systems");
});
