// Synthetic mounted fixtures only; no live backend, identity or database acceptance.
import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Router } from "wouter";
import { DashboardView } from "../../src/features/dashboard/pages/DashboardPage";
import { normalizeDashboardKpis } from "../../src/features/dashboard/kpiAdapter";

type Props = React.ComponentProps<typeof DashboardView>;
type Query = Props["query"];
// Test-only observer for Recharts effects; charts have no measured DOM box in this renderer.
// Values/history tables and mounted UI behavior are tested; chart geometry is NOT proven.
globalThis.ResizeObserver = class {
  constructor(_callback: ResizeObserverCallback) {}
  observe(_target: Element) {}
  unobserve(_target: Element) {}
  disconnect() {}
};
const query = (overrides: Partial<Query> = {}): Query => ({ data: undefined, isLoading: false,
  isFetching: false, isError: false, error: null, refetch: async () => ({}), ...overrides } as Query);
const ready = () => normalizeDashboardKpis({ propertiesTotal: 4, unitsTotal: 40,
  occupancyRate: .85, revenue30dCents: 150000, lastUpdated: new Date().toISOString(),
  series: [{ date: "2026-10-01", occupancy: .8 }, { date: "2026-10-15", occupancy: .85 }] });
const useFixtureLocation = (): [string, (to: string) => void] => ["/dashboard", () => {}];
const tree = (props: Props) => <Router hook={useFixtureLocation}><DashboardView {...props} /></Router>;
const text = (view: ReactTestRenderer) => JSON.stringify(view.toJSON());
async function mount(props: Props) {
  let view!: ReactTestRenderer;
  await act(async () => { view = TestRenderer.create(tree(props), {
    createNodeMock: () => ({ getBoundingClientRect: () => ({ width: 0, height: 0 }) }),
  }); });
  return view;
}
const metric = (view: ReactTestRenderer, id: string) => view.root.findByProps({ "data-testid": id });
const missing = (view: ReactTestRenderer) => {
  for (const id of ["kpi.properties", "kpi.units", "kpi.occupancy", "kpi.revenue"])
    assert.equal(metric(view, id).props["data-missing"], "true", id);
};

test("mounted dashboard renders reported metrics, history and actual drilldown anchors", async () => {
  const view = await mount({ query: query({ data: ready() }) });
  try {
    assert.match(text(view), /\$1,500\.00/);
    assert.match(text(view), /85\.0%/);
    assert.match(text(view), /2026-10-01/);
    const hrefs = view.root.findAllByType("a").map(a => a.props.href);
    for (const path of ["/portfolio/properties", "/portfolio/leases", "/portfolio/owners", "/ops/operations"])
      assert.ok(hrefs.includes(path), path);
  } finally { await act(async () => view.unmount()); }
});

test("mounted dashboard distinguishes confirmed zero, missing metrics and partial coverage", async () => {
  const view = await mount({ query: query({ data: normalizeDashboardKpis({ propertiesTotal: 0,
    unitsTotal: 0, occupancyRate: 0, revenue30dCents: 0 }) }) });
  try {
    assert.match(text(view), /\$0\.00/);
    assert.match(text(view), /0\.0%/);
    assert.match(text(view), /No trend data reported/);
    await act(async () => view.update(tree({ query: query({ data: normalizeDashboardKpis({}) }) })));
    missing(view); assert.doesNotMatch(text(view), /\$0\.00/);
    await act(async () => view.update(tree({ query: query({ data: normalizeDashboardKpis({ propertiesTotal: 0 }) }) })));
    assert.equal(metric(view, "kpi.properties").props["data-missing"], undefined);
    assert.equal(metric(view, "kpi.units").props["data-missing"], "true");
    assert.ok(view.root.findByProps({ "data-testid": "state-partial" }));
  } finally { await act(async () => view.unmount()); }
});

test("mounted loading, empty and error paths suppress unconfirmed figures", async () => {
  for (const state of [query({ isLoading: true, isFetching: true }), query(),
    query({ isError: true, error: new Error("HTTP 503") })]) {
    const view = await mount({ query: state });
    try { missing(view); assert.doesNotMatch(text(view), /\$0\.00|2026-10-01/); }
    finally { await act(async () => view.unmount()); }
  }
});

test("mounted denied replacement hides cached metrics and history on that commit", async () => {
  const data = ready(), view = await mount({ query: query({ data }) });
  try {
    await act(async () => view.update(tree({ query: query({ data, isError: true,
      error: Object.assign(new Error("Denied"), { status: 403 }) }) })));
    missing(view);
    assert.ok(view.root.findByProps({ "data-testid": "state-denied" }));
    assert.doesNotMatch(text(view), /1,500\.00|2026-10-01/);
  } finally { await act(async () => view.unmount()); }
});

test("mounted stale and failed-refresh states label retained values truthfully", async () => {
  const data = { ...ready(), lastUpdated: "2026-01-01T00:00:00Z" };
  const view = await mount({ query: query({ data }) });
  try {
    assert.ok(view.root.findByProps({ "data-testid": "state-stale" }));
    await act(async () => view.update(tree({ query: query({ data, isError: true, error: new Error("HTTP 503") }) })));
    assert.match(text(view), /latest refresh failed/);
    assert.match(text(view), /\$1,500\.00/);
  } finally { await act(async () => view.unmount()); }
});

test("mounted refresh invokes supplied reads and prevents another refresh while busy", async () => {
  const calls: string[] = [];
  const records = (name: string) => ({ data: [], isSuccess: true, isLoading: false, isFetching: false,
    isError: false, error: null, refetch: () => { calls.push(name); } });
  const refetch = (async () => { calls.push("summary"); return {}; }) as Query["refetch"];
  const props: Props = { query: query({ data: ready(), refetch }),
    leases: records("leases"), units: records("units"), today: "2026-11-01" };
  const view = await mount(props);
  try {
    const refresh = view.root.findAllByType("button").find(b => b.children.includes("Refresh figures"))!;
    await act(async () => { refresh.props.onClick(); });
    assert.deepEqual(calls, ["summary", "leases", "units"]);
    await act(async () => view.update(tree({ ...props, query: { ...props.query, isFetching: true } })));
    const busy = view.root.findAllByType("button").find(b => b.children.includes("Refreshing…"))!;
    assert.equal(busy.props.disabled, true);
  } finally { await act(async () => view.unmount()); }
});
