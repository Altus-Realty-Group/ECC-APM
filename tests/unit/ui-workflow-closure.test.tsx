import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import DataTable from "../../src/components/DataTable";
import { tableCsv } from "../../src/components/tableCsv";
import { recordLimit } from "../../src/pages/DataHub";
import { LeaseCard, TenantCard, UnitCard } from "../../src/shared/card-contracts";
import LeaseOverview from "../../src/pages/card/lease/Overview";
import TenantOverview from "../../src/pages/card/tenant/Overview";
import TenantHero from "../../src/pages/card/tenant/HeroBlock";
import UnitHero from "../../src/pages/card/unit/HeroBlock";
import RightRailPanel from "../../src/components/cardkit/RightRailPanel";
import { prepareSnapshot, REPORT_LAYOUTS, snapshotCsv } from "../../src/features/reports/portfolioSnapshot";

const render = (node: React.ReactNode) => renderToStaticMarkup(<Router ssrPath="/dashboard">{node}</Router>);
test("table export neutralizes spreadsheet formulas in headers and values without changing numeric signs", () => {
  const csv = tableCsv([{ a: '=HYPERLINK("bad")', b: -12.34 }, { a: "\t=bad", b: 0 }], [{ key: "a", header: "@header" }, { key: "b", header: 'Amount, "USD"' }]);
  assert.match(csv, /"'@header"/); assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"'\t=bad"/); assert.match(csv, /"-12\.34"/); assert.match(csv, /"0"/);
  assert.match(csv, /"Amount, ""USD"""/);
});
test("table keeps native rows and exposes keyboard sort and record controls", () => {
  const html = render(<DataTable columns={[{ key: "name", header: "Name" }]} rows={[{ name: "Alpha" }]} />);
  assert.match(html, /aria-sort="none"/); assert.match(html, /class="ecc-table-sort"/);
  assert.match(html, /aria-label="Open record/); assert.doesNotMatch(html, /<tr[^>]+role="button"/);
});
test("lease overview opens valid ID-only related records with visible names", () => {
  const html = render(<LeaseOverview data={LeaseCard.parse({ lease: { id: 1 }, property: { id: 2 }, unit: { id: 3 }, tenant: { id: 4 } })} />);
  for (const [kind, id] of [["property", 2], ["unit", 3], ["tenant", 4]] as const) assert.match(html, new RegExp(`href="/card/${kind}/${id}"`));
  assert.match(html, /Property #2/); assert.match(html, /Unit #3/); assert.match(html, /Tenant #4/);
});
test("tenant KPI includes a separately linked active lease once and overview can open it", () => {
  for (const leases of [[], [{ id: 9, status: "ACTIVE" }]]) {
    const data = TenantCard.parse({ tenant: { id: 1 }, activeLease: { id: 9, status: "ACTIVE" }, leases });
    assert.match(render(<TenantHero data={data} />), /Loaded Active Leases<\/div><div class="kpi-value">1</);
    assert.match(render(<TenantOverview tenant={data.tenant} activeLease={data.activeLease} />), /href="\/card\/lease\/9"/);
  }
  assert.match(render(<TenantOverview />), /Current lease not reported/);
});
test("unit metric identifies the actual unit status and rail titles are visible", () => {
  const html = render(<UnitHero data={UnitCard.parse({ unit: { id: 1, status: "VACANT" }, lease: { id: 2, status: "ACTIVE" } })} />);
  assert.match(html, /Unit Status/); assert.match(html, /VACANT/); assert.doesNotMatch(html, /Lease Status/);
  assert.match(render(<RightRailPanel title="Current Lease">Details</RightRailPanel>), /<h2[^>]*>Current Lease<\/h2>/);
});
test("record limit accepts only bounded whole numbers", () => {
  for (const value of ["", "0", "-1", "201", "1.5", "abc"]) assert.equal(recordLimit(value), null);
  for (const value of ["1", "25", "200"]) assert.equal(recordLimit(value), Number(value));
});
test("portfolio reports retain scope and include disclosure, forward-looking and rights text", () => {
  const csv = snapshotCsv(prepareSnapshot(REPORT_LAYOUTS[0], [{ id: 1, name: "Property" }]));
  assert.match(csv, /"Property"/); assert.match(csv, /"Disclosures"/); assert.match(csv, /"Forward-looking information"/); assert.match(csv, /All rights reserved/);
});
