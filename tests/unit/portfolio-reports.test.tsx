import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../src/lib/queryClient";
import { HttpError } from "../../src/lib/http";
import { handleSessionBoundary } from "../../src/lib/sessionScope";
import { REPORT_LAYOUTS, prepareSnapshot, safeCsvCell, snapshotCsv, snapshotAtClick, reportSelection, downloadSnapshot } from "../../src/features/reports/portfolioSnapshot";
import { PortfolioReportPanel, SelectedPortfolioReport, readySnapshot } from "../../src/features/reports/PortfolioReport";
import ReportsTemplatesPage from "../../src/pages/reports/Templates";

const property = REPORT_LAYOUTS[0];
const lease = REPORT_LAYOUTS[1];
const owner = REPORT_LAYOUTS[2];
const rows = [{ id: 42, name: "Fixture Property", city: "Gary", state: "IN", zip: "46408", type: "Residential", units: 0 }];
type Query = React.ComponentProps<typeof PortfolioReportPanel>["query"];
function panel(overrides: Partial<Query> = {}) {
  const query = { data: undefined, isSuccess: false, isError: false, isLoading: false,
    isFetching: false, error: null, refetch: async () => ({}), ...overrides } as Query;
  return renderToStaticMarkup(<Router ssrPath="/reports/create"><PortfolioReportPanel layout={property} query={query} onDownload={() => {}} /></Router>);
}
function notExportable(html: string) {
  assert.doesNotMatch(html, /Download CSV|Loaded-record preview|Fixture Property|>0 loaded|>1 loaded/);
}

test("snapshot projection preserves confirmed zero and null, excludes unrequested private fields", () => {
  const snapshot = prepareSnapshot(property, [{ ...rows[0], city: null, secret_note: "must not export" }]);
  assert.equal(snapshot.rows[0][2], null);
  assert.equal(snapshot.rows[0].at(-1), 0);
  const csv = snapshotCsv(snapshot);
  assert.match(csv, /"Reported units"/);
  assert.match(csv, /"42","Fixture Property","","IN","46408","Residential","0"/);
  assert.doesNotMatch(csv, /must not export|secret_note|\$/);
  assert.doesNotMatch(csv.split('"Disclosures"')[0], /2026/); // Rights year is not a record timestamp.
  assert.match(csv, /may not include your entire portfolio/);
  assert.match(csv, /Records last updated/);
  assert.match(csv, /Not reported; row dates/);
});

test("lease report uses source dates/status and tenant names without financial inference", () => {
  const snapshot = prepareSnapshot(lease, [{ id: 7, propertyName: "Fixture", unitLabel: "2", tenants: ["One", "Two"], status: null,
    start: "2026-01-01", end: null, rent_cents: 123456, rent: 999 }]);
  assert.deepEqual(snapshot.rows[0], [7, "Fixture", "2", "One; Two", null, "2026-01-01", null]);
  assert.doesNotMatch(snapshotCsv(snapshot), /123456|999|revenue|MRR/);
});

test("source updated_at is retained verbatim only when actually supplied, not invented from browser time", () => {
  const absent = prepareSnapshot(property, rows);
  assert.equal(absent.columns.some(column => column.key === "updated_at"), false);
  const withDate = prepareSnapshot(owner, [{ id: 1, name: "Fixture Owner", updated_at: "2026-10-01T12:30:00Z" }, { id: 2 }]);
  assert.equal(withDate.rows[0].at(-1), "2026-10-01T12:30:00Z");
  assert.equal(withDate.rows[1].at(-1), null);
  assert.match(snapshotCsv(withDate), /Source updated_at \(as reported\)/);
  assert.doesNotMatch(snapshotCsv(withDate), /Fresh|Current|Prepared at/);
});

test("malformed, duplicate and unsupported source field shapes reject rather than download empty", () => {
  for (const raw of [undefined, {}, [null], [42], [[]], [{}], [{ id: " " }], [{ id: -1 }], [{ id: 1 }, { id: "1" }],
    [{ id: 1, name: {} }], [{ id: 1, units: -1 }], [{ id: 1, units: NaN }], [{ id: 1, units: "5" }], [{ id: 1, updated_at: {} }]]) {
    assert.throws(() => prepareSnapshot(property, raw));
  }
  assert.throws(() => prepareSnapshot(lease, [{ id: 1, tenants: ["Name", {}] }]));
});

test("CSV quoting preserves punctuation and neutralizes formula/control prefixes", () => {
  assert.equal(safeCsvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(safeCsvCell(null), '""');
  assert.equal(safeCsvCell(0), '"0"');
  for (const value of ["=1+1", "+SUM(A1)", "-1+2", "@SUM(A1)", "  =cmd", "\t=cmd", "\r=cmd", "\n@cmd", "\u0000=cmd"]) {
    assert.equal(safeCsvCell(value).startsWith('"\''), true, JSON.stringify(value));
  }
  const csv = snapshotCsv(prepareSnapshot(owner, [{ id: 1, name: "=HYPERLINK(\"bad\")", phone: "+13125550100" }]));
  assert.match(csv, /'=/);
  assert.match(csv, /'\+13125550100/);
});

test("successful zero records produce scope metadata and real headers, not mock rows", () => {
  const snapshot = prepareSnapshot(property, []);
  assert.equal(snapshot.rows.length, 0);
  const csv = snapshotCsv(snapshot);
  assert.match(csv, /"Loaded records","0"/);
  assert.match(csv, /"Property ID","Name"/);
  assert.doesNotMatch(csv, /Fixture Property/);
  const html = panel({ data: [], isSuccess: true });
  assert.match(html, /Download CSV/);
  assert.match(html, /Records: Properties/);
  assert.match(html, /Records last updated: Not reported/);
  assert.match(html, /returned no records/);
});

test("loading, paused and failed report reads show no preview, totals or export", () => {
  for (const state of [{ isLoading: true, isFetching: true }, {},
    { data: rows, isError: true, error: new HttpError("HTTP 503", 503) },
    { data: rows, isSuccess: true, isFetching: true }]) notExportable(panel(state));
  assert.match(panel({ isError: true, error: new Error("outage") }), />Retry</);
});

test("cached denial and malformed success cannot expose report records or export", () => {
  for (const status of [401, 403]) {
    const html = panel({ data: rows, isError: true, error: new HttpError("Denied", status) });
    notExportable(html);
    assert.match(html, /state-denied/);
  }
  const malformed = panel({ data: [null], isSuccess: true });
  notExportable(malformed);
  assert.match(malformed, /could not be prepared safely/);
});

test("successful preview limits screen rows but CSV includes every loaded record", () => {
  const data = Array.from({ length: 101 }, (_, i) => ({ id: i + 1, name: `Property${i + 1}` }));
  const html = panel({ data, isSuccess: true });
  assert.match(html, /101 loaded records/);
  assert.match(html, /first 100 rows/);
  assert.doesNotMatch(html, />Property101</);
  assert.match(snapshotCsv(prepareSnapshot(property, data)), /"101","Property101"/);
});

test("layout links select actual report sources and invalid selection falls back safely", () => {
  const html = renderToStaticMarkup(<Router ssrPath="/reports/templates"><ReportsTemplatesPage /></Router>);
  for (const layout of REPORT_LAYOUTS) {
    assert.match(html, new RegExp(`href="/reports/create\\?template=${layout.id}"`));
    assert.equal(reportSelection(`template=${layout.id}`).source, layout.source);
  }
  assert.equal(reportSelection("template=unknown").id, property.id);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Fixture|Download CSV|\/api\//);
});

test("only chosen collection hook mounts; denied/session purge clears exportable source state", () => {
  for (const layout of REPORT_LAYOUTS) {
    const client = createQueryClient();
    client.setQueryData(["portfolio", layout.source], [{ id: 1 }]);
    const html = renderToStaticMarkup(<Router ssrPath="/reports/create"><QueryClientProvider client={client}>
      <SelectedPortfolioReport layout={layout} />
    </QueryClientProvider></Router>);
    assert.match(html, /Download CSV/);
    assert.deepEqual(client.getQueryCache().getAll().map(query => query.queryKey), [["portfolio", layout.source]]);
    handleSessionBoundary(client);
    assert.equal(client.getQueryData(["portfolio", layout.source]), undefined);
    client.clear();
  }
});

test("ready snapshot gate refuses retained or unverified data independently of preview", () => {
  assert.equal(readySnapshot(property, { data: rows, isSuccess: false, isError: false, isFetching: false }), null);
  assert.equal(readySnapshot(property, { data: rows, isSuccess: true, isError: true, isFetching: false }), null);
  assert.equal(readySnapshot(property, { data: rows, isSuccess: true, isError: false, isFetching: true }), null);
});

test("download produces actual CSV blob, fixed source filename and revokes its object URL", async () => {
  const oldDocument = globalThis.document;
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  let blob: Blob | undefined;
  let clicked = false;
  let removed = false;
  let revoked = false;
  const anchor = { href: "", download: "", click() { clicked = true; }, remove() { removed = true; } };
  Object.assign(globalThis, { document: { createElement: () => anchor, body: { appendChild: () => {} } } });
  URL.createObjectURL = value => { blob = value as Blob; return "blob:fixture"; };
  URL.revokeObjectURL = value => { assert.equal(value, "blob:fixture"); revoked = true; };
  try {
    downloadSnapshot(prepareSnapshot(property, rows));
    assert.equal(clicked, true); assert.equal(removed, true);
    assert.equal(anchor.download, "ecc-properties-loaded-snapshot.csv");
    assert.match(await blob!.text(), /Fixture Property/);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(revoked, true);
  } finally {
    globalThis.document = oldDocument; URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke;
  }
});


test("click-time export rejects a changed cache, denial, fetching and a moved session", () => {
  const current = { status: "success", fetchStatus: "idle", data: rows };
  assert.equal(snapshotAtClick(property, current, rows, 4, 4)?.rows.length, 1);
  assert.equal(snapshotAtClick(property, current, rows, 4, 5), null);
  assert.equal(snapshotAtClick(property, undefined, rows, 4, 4), null);
  assert.equal(snapshotAtClick(property, { ...current, status: "error" }, rows, 4, 4), null);
  assert.equal(snapshotAtClick(property, { ...current, fetchStatus: "fetching" }, rows, 4, 4), null);
  assert.equal(snapshotAtClick(property, { ...current, data: undefined }, rows, 4, 4), null);
  assert.equal(snapshotAtClick(property, { ...current, data: [...rows] }, rows, 4, 4), null);
});
