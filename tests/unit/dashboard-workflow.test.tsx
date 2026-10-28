import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { DashboardView } from "../../src/features/dashboard/pages/DashboardPage";
import { normalizeDashboardKpis } from "../../src/features/dashboard/kpiAdapter";
import { ContractError } from "../../src/lib/dataState";

type Query = React.ComponentProps<typeof DashboardView>["query"];
const fresh = () => normalizeDashboardKpis({
  propertiesTotal: 4, unitsTotal: 40, occupancyRate: .9, revenue30dCents: 123456,
  lastUpdated: new Date().toISOString(),
  series: [{ date: "2026-10-01", occupancy: .8 }, { date: "2026-10-15", occupancy: .9 }],
});
function render(overrides: Partial<Query> = {}) {
  const query = { data: undefined, isLoading: false, isFetching: false, isError: false,
    error: null, refetch: async () => ({}), ...overrides } as Query;
  return renderToStaticMarkup(<Router ssrPath="/dashboard"><DashboardView query={query} /></Router>);
}
function context(html: string) {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /id="dashboard-title">Command center</);
  assert.match(html, /href="\/portfolio\/properties"[^>]*>Review properties/);
  assert.match(html, /href="\/portfolio\/leases"/);
  assert.match(html, /href="\/portfolio\/owners"/);
  assert.match(html, /href="\/ops\/operations"/);
  assert.match(html, /aria-label="Portfolio workflows"/);
  assert.match(html, /data-testid="dashboard-freshness"/);
  assert.match(html, /Source: portfolio summary feed/);
  assert.doesNotMatch(html, /\/reports|\/admin|sync|overdue tasks|urgent repairs/i);
}
function noFigures(html: string) {
  assert.equal((html.match(/data-testid="kpi\.[^"]+" data-missing="true"/g) ?? []).length, 4);
  assert.doesNotMatch(html, /data-testid="occupancy-trend"|<svg[^>]*role="img"/);
  assert.match(html, /Occupancy history is unavailable/);
  assert.match(html, /Figures are not confirmed/);
}

test("dashboard keeps title, source and workflows during initial loading", () => {
  const html = render({ isLoading: true, isFetching: true });
  context(html); noFigures(html);
  assert.match(html, /state-loading/);
  assert.doesNotMatch(html, /Refresh figures|\$0\.00/);
});

test("dashboard outage keeps navigation and Retry without fabricated data", () => {
  const html = render({ isError: true, error: new Error("HTTP 503") });
  context(html); noFigures(html);
  assert.match(html, /state-error/);
  assert.match(html, /could not be loaded/);
  assert.match(html, />Retry</);
});

test("dashboard contract failure preserves page context and hides rejected figures", () => {
  const html = render({ isError: true, error: new ContractError("Internal wire detail") });
  context(html); noFigures(html);
  assert.match(html, /unexpected format/);
  assert.doesNotMatch(html, /Internal wire detail/);
});

test("dashboard denial hides cached metrics and history while retaining useful page links", () => {
  for (const status of [401, 403]) {
    const html = render({ data: fresh(), isError: true, error: Object.assign(new Error("Denied"), { status }) });
    context(html); noFigures(html);
    assert.match(html, /state-denied/);
    assert.match(html, />Retry</);
    assert.doesNotMatch(html, /2026-10-01|1,234\.56/);
  }
});

test("dashboard unresolved read retains context without a pretend snapshot", () => {
  const html = render();
  context(html); noFigures(html);
  assert.match(html, /No portfolio summary is available yet/);
});

test("dashboard confirmed zero is distinct from missing values", () => {
  const html = render({ data: normalizeDashboardKpis({ propertiesTotal: 0, unitsTotal: 0, occupancyRate: 0, revenue30dCents: 0 }) });
  context(html);
  assert.match(html, /\$0\.00/);
  assert.match(html, /0\.0%/);
  assert.equal((html.match(/data-testid="kpi\.[^"]+" data-missing="true"/g) ?? []).length, 0);
  assert.match(html, /No trend data reported/);
});

test("dashboard missing values and empty history remain visibly unreported", () => {
  const html = render({ data: normalizeDashboardKpis({}) });
  context(html);
  assert.equal((html.match(/>Not reported</g) ?? []).length, 7);
  assert.doesNotMatch(html, /Lease renewals due/); // Actual date review has its own governed read.
  assert.match(html, /state-empty/);
  assert.match(html, /No trend data reported/);
  assert.doesNotMatch(html, /\$0\.00|View reported observations/);
});

test("dashboard full summary preserves exact values and source observations", () => {
  const html = render({ data: fresh() });
  context(html);
  assert.match(html, /\$1,234\.56/);
  assert.match(html, /90\.0%/);
  assert.match(html, /2026-10-01/);
  assert.match(html, /80\.0%/);
  assert.match(html, /View reported observations/);
  assert.match(html, />Refresh figures</);
  assert.doesNotMatch(html, /state-partial|state-empty|state-stale/);
});

test("dashboard older, unknown and invalid timestamps preserve explicit freshness state", () => {
  const older = render({ data: { ...fresh(), lastUpdated: "2026-01-01T00:00:00Z" } });
  context(older);
  assert.match(older, /state-stale/);
  assert.match(older, /Older figures/);
  for (const lastUpdatedProblem of ["invalid", "future"] as const) {
    const html = render({ data: { ...fresh(), lastUpdated: null, lastUpdatedProblem } });
    context(html);
    assert.match(html, /state-timestamp/);
    assert.match(html, /freshness cannot be confirmed/);
  }
});

test("dashboard failed refresh explicitly labels retained values and disables concurrent refresh", () => {
  const html = render({ data: fresh(), isError: true, error: new Error("HTTP 503"), isFetching: true });
  context(html);
  assert.match(html, /Last loaded figures/);
  assert.match(html, /latest refresh failed/);
  assert.match(html, /\$1,234\.56/);
  assert.match(html, /disabled=""[^>]*>Refreshing/);
});

test("dashboard refreshed source values replace headline metrics and reported observations together", () => {
  const original = render({ data: fresh() });
  const updated = render({ data: normalizeDashboardKpis({ propertiesTotal: 6, unitsTotal: 60, occupancyRate: .5,
    revenue30dCents: 100, series: [{ date: "2026-10-17", occupancy: .5 }] }) });
  assert.match(original, /\$1,234\.56|90\.0%/);
  assert.match(updated, /\$1\.00/);
  assert.match(updated, /50\.0%/);
  assert.match(updated, /2026-10-17/);
  assert.doesNotMatch(updated, /1,234\.56|2026-10-01|90\.0%/);
});
