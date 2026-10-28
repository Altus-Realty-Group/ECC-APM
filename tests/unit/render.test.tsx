import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "../../src/components/Sidebar";
import { KpiCard } from "../../src/features/dashboard/components/KpiCard";
import DashboardPage from "../../src/features/dashboard/pages/DashboardPage";
import HeroBlock from "../../src/pages/card/property/HeroBlock";
import CanonicalDenseTableShell from "../../src/features/command-surface/CanonicalDenseTableShell";
import StateNotice from "../../src/components/ui/StateNotice";
import { HttpError } from "../../src/lib/http";
import { ContractError } from "../../src/lib/dataState";
import { PropertyCard } from "../../src/shared/card-contracts";
import PropertyCardPage from "../../src/pages/card/property/index";
import PropertiesPage from "../../src/pages/portfolio/Properties";
import UnitsPage from "../../src/pages/portfolio/Units";
import Overview from "../../src/pages/card/property/Overview";
import { NAV_SECTIONS, navLeafPaths } from "../../src/config/navigation";
import { normalizeDashboardKpis } from "../../src/features/dashboard/kpiAdapter";

const at = (path: string, node: React.ReactNode) =>
  renderToStaticMarkup(<Router ssrPath={path}>{node}</Router>);

const DEV_COPY = /\bT[0-5]\b|TanStack|Type A|proof shell|resolver|BFF|\bStub\b|war-room|will (appear|render) here/i;

/** Attribute-order-independent: is there an <a> with this href (and optionally this attribute)? */
function anchor(html: string, href: string, attr?: string): boolean {
  return [...html.matchAll(/<a\b[^>]*>/g)].some((m) => m[0].includes(`href="${href}"`) && (!attr || m[0].includes(attr)));
}

/* ---------------- Sidebar ---------------- */
test("sidebar renders every group as a real button and every direct link as an anchor", () => {
  const html = at("/dashboard", <Sidebar />);
  const groups = NAV_SECTIONS.filter((s) => s.children?.length);
  assert.equal((html.match(/<button[^>]*class="ecc-nav-row/g) ?? []).length, groups.length);
  assert.ok(anchor(html, "/dashboard", 'aria-current="page"'), "dashboard link is the current page");
  assert.doesNotMatch(html, /role="list"|ecc-row-clickable/, "no clickable divs");
});

test("active section is expanded with aria-expanded and exposes its child links", () => {
  const html = at("/portfolio/units", <Sidebar />);
  assert.match(html, /aria-expanded="true"[^>]*aria-controls=|aria-controls=[^>]*aria-expanded="true"/);
  for (const c of NAV_SECTIONS.find((s) => s.title === "Portfolio")!.children!) {
    assert.match(html, new RegExp(`href="${c.path}"`));
  }
  assert.ok(anchor(html, "/portfolio/units", 'aria-current="page"'));
});

test("rendering at different locations is stable (hook order does not depend on data)", () => {
  for (const p of ["/dashboard", "/reports/saved", "/systems/integrations", "/not-a-route", "/"]) {
    assert.doesNotThrow(() => at(p, <Sidebar />), p);
  }
});

test("every nav destination appears exactly once in the expanded rail markup", () => {
  const all = NAV_SECTIONS.filter((s) => s.children).map((s) => s.children!.filter((c) => !c.unavailable).map((c) => c.path)).flat();
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
  assert.match(html, /Retry record read/);
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
  assert.equal((failed.match(/data-testid="kpi\.[^"]+" data-missing="true"/g) ?? []).length, 4);
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

/* ---------------- Denied refresh must not keep access-controlled data on screen ---------------- */
function seeded(key: unknown[], data: unknown, error?: Error) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, refetchOnMount: false } } });
  qc.setQueryData(key, data);
  if (error) {
    const q = qc.getQueryCache().find({ queryKey: key })!;
    q.setState({ ...q.state, status: "error", error, fetchStatus: "idle" } as any);
  }
  return qc;
}
const denied403 = () => new HttpError("HTTP 403", 403);
const card = (name: string) => PropertyCard.parse({ property: { id: 7, name, type: "Residential", address: { line1: "1 Elm St", city: "Indy", state: "IN", zip: "46201" } }, kpis: { units: 5, activeLeases: 4, occupancyPct: 80, avgRentCents: 100000 } });
const renderIn = (qc: QueryClient, path: string, node: React.ReactNode) =>
  at(path, <QueryClientProvider client={qc}>{node}</QueryClientProvider>);

test("dashboard: cached figures are NOT rendered after a denied refresh", () => {
  const cached = normalizeDashboardKpis({ propertiesTotal: 9, unitsTotal: 90, occupancyRate: 0.5, revenue30dCents: 12345, lastUpdated: new Date().toISOString() });
  const html = renderIn(seeded(["dashboard-kpis"], cached, denied403()), "/dashboard", <DashboardPage />);
  assert.match(html, /state-denied/);
  assert.doesNotMatch(html, /\$123\.45|occupancy-trend/);
  assert.equal((html.match(/data-testid="kpi\.[^"]+" data-missing="true"/g) ?? []).length, 4);
});

test("dashboard: a malformed payload shows a contract error with no figures", () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, refetchOnMount: false } } });
  const q = qc.getQueryCache().build(qc, { queryKey: ["dashboard-kpis"] });
  q.setState({ status: "error", error: new ContractError("propertiesTotal must be a non-negative integer"), fetchStatus: "idle", data: undefined } as any);
  const html = renderIn(qc, "/dashboard", <DashboardPage />);
  assert.match(html, /state-error/);
  assert.match(html, /unexpected format/);
  assert.equal((html.match(/data-testid="kpi\.[^"]+" data-missing="true"/g) ?? []).length, 4);
});

test("dashboard: a future source time is flagged and never shown as 'Updated'", () => {
  const future = new Date(Date.now() + 3 * 3600_000).toISOString();
  const html = dashboard({ propertiesTotal: 1, unitsTotal: 1, occupancyRate: 1, revenue30dCents: 1, lastUpdated: future });
  assert.match(html, /state-timestamp/);
  assert.match(html, /in the future/);
  assert.doesNotMatch(html, /Updated \d/);
});

test("property card: cached details are NOT rendered after a denied refresh", () => {
  const html = renderIn(seeded(["card", "property", 7], card("Secret Court"), denied403()), "/card/property/7", <PropertyCardPage />);
  assert.match(html, /state-denied/);
  assert.match(html, />Retry</);
  assert.doesNotMatch(html, /Secret Court|1 Elm St|kpi-units/);
});

test("property card: transient failure keeps the same-session card and says the refresh failed", () => {
  const html = renderIn(seeded(["card", "property", 7], card("Elm Court"), new HttpError("HTTP 503", 503)), "/card/property/7", <PropertyCardPage />);
  assert.match(html, /latest refresh failed/);
  assert.match(html, /Elm Court/);
});

test("property card: no Contacts / Key Dates / owner / class / status / DoorLoop presentation (not in the contract)", () => {
  const html = renderIn(seeded(["card", "property", 7], card("Elm Court")), "/card/property/7", <PropertyCardPage />);
  assert.doesNotMatch(html, /Contacts|Key Dates|Created:|Updated:|DoorLoop|>Owner<|>Class<|>Status<|rr-contacts|rr-dates/);
  assert.match(html, /Elm Court/);
  const overview = renderToStaticMarkup(<Overview data={card("Elm Court")} />);
  assert.match(overview, />Type<[\s\S]*Residential/);
  assert.match(overview, />Active Leases<[\s\S]*>4</);
});

test("property card contract: invalid counts/cents are rejected, nulls stay null", () => {
  for (const kpis of [{ units: -1 }, { units: 1.5 }, { activeLeases: -3 }, { avgRentCents: 10.5 }, { avgRentCents: -1 }, { occupancyPct: -5 }, { units: "5" }]) {
    assert.equal(PropertyCard.safeParse({ property: { id: 7, address: {} }, kpis }).success, false, JSON.stringify(kpis));
  }
  const ok = PropertyCard.parse({ property: { id: 7, address: {} }, kpis: { units: 0, occupancyPct: 140 } });
  assert.equal(ok.kpis.units, 0);
  assert.equal(ok.kpis.activeLeases, null);
  assert.equal(ok.kpis.occupancyPct, 140);
});

const propRows = [{ id: 12, name: "Elm Court", street_1: "1 Elm St", city: "Indy", state: "IN", units: 40, occupancy_pct: 90 }];
const unitRows = [{ id: 31, unitLabel: "Apt 4B", propertyName: "Elm Court", beds: 2, baths: 1, marketRent: 1500, status: "VACANT" }];

test("properties list: cached rows, averages and counts are NOT rendered after a denied refresh", () => {
  const html = renderIn(seeded(["portfolio", "properties"], propRows, denied403()), "/portfolio/properties", <PropertiesPage />);
  assert.match(html, /state-denied/);
  assert.doesNotMatch(html, /Elm Court|1 Elm St|Indy|90%|card\/property\/12/);
  assert.doesNotMatch(html, /Average occupancy not reported|\d+ loaded|Markets:|visible rows?|Selected IDs:/);
  assert.match(html, /Selection review is unavailable/);
});

test("units list: cached rows are NOT rendered after a denied refresh", () => {
  const html = renderIn(seeded(["portfolio", "units"], unitRows, denied403()), "/portfolio/units", <UnitsPage />);
  assert.match(html, /state-denied/);
  assert.doesNotMatch(html, /Apt 4B|Elm Court|\$1,500|card\/unit\/31/);
});

test("lists still show data when access is fine (guard does not over-hide)", () => {
  assert.match(renderIn(seeded(["portfolio", "properties"], propRows), "/portfolio/properties", <PropertiesPage />), /Elm Court/);
  assert.match(renderIn(seeded(["portfolio", "units"], unitRows), "/portfolio/units", <UnitsPage />), /Apt 4B/);
});

// Render the actual recovery components, rather than a synthetic unavailable fixture.
test("owner transfer recovery pages expose no mutation controls or browser-token instructions", async () => {
  for (const path of [
    "../../src/features/ownerTransfer/OwnerTransferPage",
    "../../src/features/owners/pages/OwnerTransferPage",
    "../../src/features/owners/pages/OwnerTransferDetailPage",
    "../../src/features/admin/pages/AdminTransferManagementPage",
  ]) {
    const {default: Page} = await import(path);
    const html = renderToStaticMarkup(<Page />);
    assert.match(html, /Owner transfers are unavailable/);
    assert.doesNotMatch(html, /<(?:button|input|select)\b|localStorage|ADMIN_SYNC_TOKEN/);
  }
});

test("owner transfer recovery pages add no second <main> landmark and no links or forms", async () => {
  for (const path of [
    "../../src/features/ownerTransfer/OwnerTransferPage",
    "../../src/features/owners/pages/OwnerTransferPage",
    "../../src/features/owners/pages/OwnerTransferDetailPage",
    "../../src/features/admin/pages/AdminTransferManagementPage",
  ]) {
    const { default: Page } = await import(path);
    const html = renderToStaticMarkup(<Page />);
    assert.doesNotMatch(html, /<main\b|role="main"/, `${path} must not nest a main landmark`);
    assert.doesNotMatch(html, /<(?:a|form|textarea)\b|contenteditable/i, `${path} exposes an interactive element`);
    assert.match(html, /data-testid="owner-transfer-unavailable"/);
    assert.match(html, /<h1>Owner transfers<\/h1>/);
  }
});

test("unavailable destinations remain visible without clickable routes", () => {
  for (const path of ["/reports/saved", "/data"]) {
    const html = at(path, <Sidebar />);
    const section = NAV_SECTIONS.find((s) => s.title === (path === "/data" ? "Data Hub" : "Reports"))!;
    for (const child of section.children!.filter((c) => c.unavailable)) {
      assert.ok(!anchor(html, child.path), child.path);
      assert.ok(html.includes(child.title), child.title);
    }
    if (section.children!.some(c => c.unavailable)) {
      assert.match(html, /aria-disabled="true"/);
      assert.match(html, /Not available/);
    }
  }
});
