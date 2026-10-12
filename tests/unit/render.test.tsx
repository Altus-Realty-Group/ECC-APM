import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import staticLocation from "wouter/static-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "../../src/components/Sidebar";
import { KpiCard } from "../../src/features/dashboard/components/KpiCard";
import DashboardPage from "../../src/features/dashboard/pages/DashboardPage";
import HeroBlock from "../../src/pages/card/property/HeroBlock";
import CanonicalDenseTableShell from "../../src/features/command-surface/CanonicalDenseTableShell";
import StateNotice from "../../src/components/ui/StateNotice";
import { HttpError } from "../../src/lib/http";
import { PropertyCard } from "../../src/shared/card-contracts";
import { NAV_SECTIONS, navLeafPaths } from "../../src/config/navigation";
import { normalizeDashboardKpis } from "../../src/features/dashboard/kpiAdapter";

const at = (path: string, node: React.ReactNode) =>
  renderToStaticMarkup(<Router hook={staticLocation(path)}>{node}</Router>);

const DEV_COPY = /\bT[0-5]\b|TanStack|Type A|proof shell|resolver|BFF|\bStub\b|war-room|will (appear|render) here/i;

/* ---------------- Sidebar ---------------- */
test("sidebar renders every group as a real button and every direct link as an anchor", () => {
  const html = at("/dashboard", <Sidebar />);
  const groups = NAV_SECTIONS.filter((s) => s.children?.length);
  assert.equal((html.match(/<button[^>]*class="ecc-nav-row/g) ?? []).length, groups.length);
  assert.match(html, /<a[^>]*href="\/dashboard"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /role="list"|ecc-row-clickable/, "no clickable divs");
});

test("active section is expanded with aria-expanded and exposes its child links", () => {
  const html = at("/portfolio/units", <Sidebar />);
  assert.match(html, /aria-expanded="true"[^>]*aria-controls=|aria-controls=[^>]*aria-expanded="true"/);
  for (const c of NAV_SECTIONS.find((s) => s.title === "Portfolio")!.children!) {
    assert.match(html, new RegExp(`href="${c.path}"`));
  }
  assert.match(html, /href="\/portfolio\/units"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/portfolio\/units"/);
});

test("rendering at different locations is stable (hook order does not depend on data)", () => {
  for (const p of ["/dashboard", "/reports/saved", "/systems/integrations", "/not-a-route", "/"]) {
    assert.doesNotThrow(() => at(p, <Sidebar />), p);
  }
});

test("every nav destination appears exactly once in the expanded rail markup", () => {
  const all = NAV_SECTIONS.filter((s) => s.children).map((s) => s.children!.map((c) => c.path)).flat();
  const html = at("/", <Sidebar />);
  // Only the active group is expanded; every direct link is always present.
  for (const s of NAV_SECTIONS.filter((x) => x.path)) assert.match(html, new RegExp(`href="${s.path}"`));
  assert.ok(all.length + NAV_SECTIONS.filter((x) => x.path).length === navLeafPaths().length);
});

/* ---------------- KPI null vs zero ---------------- */
test("KpiCard: null renders a dash + 'Not reported'; a reported 0 renders 0", () => {
  const missing = renderToStaticMarkup(<KpiCard label="Units" value={null} testId="kpi.units" />);
  assert.match(missing, />—</);
  assert.match(missing, /Not reported/);
  assert.match(missing, /data-missing="true"/);
  const zero = renderToStaticMarkup(<KpiCard label="Units" value={0} testId="kpi.units" />);
  assert.match(zero, /ecc-kpi-card__value">0</);
  assert.doesNotMatch(zero, /Not reported/);
  const pct = renderToStaticMarkup(<KpiCard label="Occupancy" value={0.934} format="percent" decimals={1} testId="kpi.occupancy" />);
  assert.match(pct, /93\.4%/);
  const cur = renderToStaticMarkup(<KpiCard label="Rev" value={null} format="currencyCents" testId="kpi.revenue" />);
  assert.doesNotMatch(cur, /\$0/);
});

/* ---------------- Dashboard page states ---------------- */
function dashboard(raw: unknown | undefined, mutate?: (qc: QueryClient) => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, refetchOnMount: false } } });
  if (raw !== undefined) qc.setQueryData(["dashboard-kpis"], normalizeDashboardKpis(raw));
  mutate?.(qc);
  return at("/dashboard", <QueryClientProvider client={qc}><DashboardPage /></QueryClientProvider>);
}

test("dashboard: full payload with confirmed zero revenue shows $0.00, no partial notice", () => {
  const html = dashboard({ propertiesTotal: 4, unitsTotal: 40, occupancyRate: 0.9, revenue30dCents: 0, lastUpdated: new Date().toISOString() });
  assert.match(html, /\$0\.00/);
  assert.doesNotMatch(html, /state-partial|state-stale|state-empty/);
});

test("dashboard: missing revenue is not shown as $0", () => {
  const html = dashboard({ propertiesTotal: 4, unitsTotal: 40, occupancyRate: 0.9, lastUpdated: new Date().toISOString() });
  assert.doesNotMatch(html, /\$0/);
  assert.match(html, /state-partial/);
  assert.match(html, /Revenue \(30d\)/);
  assert.match(html, /Not reported/);
});

test("dashboard: empty payload -> empty notice with retry, all metrics unreported", () => {
  const html = dashboard({});
  assert.match(html, /state-empty/);
  assert.match(html, />Retry</);
  assert.equal((html.match(/Not reported/g) ?? []).length, 4);
});

test("dashboard: stale data is flagged with its timestamp", () => {
  const html = dashboard({ propertiesTotal: 1, unitsTotal: 1, occupancyRate: 1, revenue30dCents: 1, lastUpdated: "2026-01-01T00:00:00Z" });
  assert.match(html, /state-stale/);
  assert.match(html, /out of date/);
});

test("dashboard: denied and failed states offer Retry and never show figures", () => {
  const denied = dashboard(undefined, (qc) =>
    qc.getQueryCache().build(qc, { queryKey: ["dashboard-kpis"] }).setState({ status: "error", error: new HttpError("HTTP 403", 403), fetchStatus: "idle", data: undefined } as any));
  assert.match(denied, /state-denied/);
  assert.match(denied, /don&#x27;t have access|don't have access/);
  assert.match(denied, />Retry</);
  const failed = dashboard(undefined, (qc) =>
    qc.getQueryCache().build(qc, { queryKey: ["dashboard-kpis"] }).setState({ status: "error", error: new Error("HTTP 500"), fetchStatus: "idle", data: undefined } as any));
  assert.match(failed, /state-error/);
  assert.match(failed, /could not be loaded/);
  assert.doesNotMatch(failed, /ecc-kpi-card__value/);
});

test("dashboard: failed refresh keeps last figures and offers Retry", () => {
  const html = dashboard({ propertiesTotal: 4, unitsTotal: 40, occupancyRate: 0.9, revenue30dCents: 5, lastUpdated: new Date().toISOString() }, (qc) =>
    qc.getQueryCache().find({ queryKey: ["dashboard-kpis"] })!.setState({ ...qc.getQueryCache().find({ queryKey: ["dashboard-kpis"] })!.state, status: "error", error: new Error("HTTP 500"), fetchStatus: "idle" } as any));
  assert.match(html, /latest refresh failed/);
  assert.match(html, /ecc-kpi-card__value">4</);
});

/* ---------------- Property card ---------------- */
test("property card contract: missing kpis are null, not 0", () => {
  const parsed = PropertyCard.parse({ property: { id: 7, address: {} }, kpis: {} });
  assert.equal(parsed.kpis.units, null);
  assert.equal(parsed.kpis.activeLeases, null);
  assert.equal(parsed.kpis.occupancyPct, null);
  const zero = PropertyCard.parse({ property: { id: 7, address: {} }, kpis: { units: 0, activeLeases: 0, occupancyPct: 0 } });
  assert.equal(zero.kpis.units, 0);
});

test("property hero: null renders dashes; confirmed zero renders 0 / 0%", () => {
  const unknown = renderToStaticMarkup(<HeroBlock data={PropertyCard.parse({ property: { id: 7, address: {} }, kpis: {} })} />);
  assert.doesNotMatch(unknown, />0</);
  assert.doesNotMatch(unknown, /0%/);
  const zero = renderToStaticMarkup(<HeroBlock data={PropertyCard.parse({ property: { id: 7, address: {} }, kpis: { units: 0, activeLeases: 0, occupancyPct: 0 } })} />);
  assert.match(zero, />0</);
  assert.match(zero, /0%/);
});

/* ---------------- Table shell ---------------- */
const config: any = {
  entityLabel: "Property", entityPluralLabel: "Properties", routePath: "/portfolio/properties", title: "Properties",
  subtitle: "s", searchPlaceholder: "p", searchLabel: "Search properties", tableSummary: "t", selectedLabel: "selected",
  metricALabel: "Units", metricBLabel: "Occupancy", metricBFormat: "percentage", segmentLabel: "Market", segmentSummaryLabel: "markets",
  triageTitle: "T", triageEmptyLabel: "e", focusCommandLabel: "f", rowHref: (id: string) => `/card/property/${id}`,
};
const shell = (props: Partial<React.ComponentProps<typeof CanonicalDenseTableShell>>) =>
  at("/portfolio/properties", <CanonicalDenseTableShell rows={[]} config={config} search="" onSearchChange={() => {}} selectedIds={[]} onSelectionChange={() => {}} {...props} />);

test("table shell: rows link to the numeric card route; unreported averages are not 0%", () => {
  const html = shell({ rows: [{ id: "12", primary: "Elm Court", secondary: "—", metricA: "—", metricB: "—", segment: "—" }] });
  assert.match(html, /href="\/card\/property\/12"/);
  assert.match(html, /Average occupancy not reported/);
  assert.doesNotMatch(html, /0% avg/);
});

test("table shell: reported averages still compute", () => {
  const html = shell({ rows: [{ id: "1", primary: "A", secondary: "", metricA: "1", metricB: "80%", segment: "x" }, { id: "2", primary: "B", secondary: "", metricA: "1", metricB: "90%", segment: "x" }] });
  assert.match(html, /85% avg occupancy/);
});

test("table shell: loading, denied, failed, empty, no-match", () => {
  assert.match(shell({ loading: true }), /state-loading/);
  assert.match(shell({ error: new HttpError("HTTP 403", 403), onRetry: () => {} }), /state-denied/);
  const failed = shell({ error: new Error("HTTP 500"), onRetry: () => {} });
  assert.match(failed, /state-error/);
  assert.match(failed, />Retry</);
  assert.match(shell({}), /No properties were returned/);
  assert.match(shell({ search: "zzz", rows: [{ id: "1", primary: "A", secondary: "", metricA: "", metricB: "", segment: "" }] }), /match the current search/);
});

/* ---------------- Copy + shared notice ---------------- */
test("no developer-facing copy in rendered operator surfaces", () => {
  const samples = [
    at("/portfolio/properties", <Sidebar />),
    shell({ rows: [{ id: "1", primary: "A", secondary: "", metricA: "", metricB: "", segment: "" }] }),
    dashboard({}),
  ];
  for (const html of samples) assert.doesNotMatch(html, DEV_COPY);
});

test("StateNotice: urgent states are alerts, others are polite status, Retry only when provided", () => {
  assert.match(renderToStaticMarkup(<StateNotice kind="error" title="x" onRetry={() => {}} />), /role="alert"[\s\S]*>Retry</);
  assert.match(renderToStaticMarkup(<StateNotice kind="partial" title="x" />), /role="status"/);
  assert.doesNotMatch(renderToStaticMarkup(<StateNotice kind="empty" title="x" />), /Retry/);
  assert.doesNotMatch(renderToStaticMarkup(<StateNotice kind="loading" title="x" onRetry={() => {}} />), /Retry/);
});

test("operator copy is correctly pluralized (no 'propertys')", async () => {
  const fs = await import("node:fs");
  for (const f of ["src/pages/portfolio/Properties.tsx", "src/pages/portfolio/Units.tsx"]) {
    assert.doesNotMatch(fs.readFileSync(f, "utf8"), /propertys|unitss/i, f);
  }
});
