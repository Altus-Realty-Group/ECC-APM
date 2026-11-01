import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { KpiCard } from "../../src/features/dashboard/components/KpiCard";

test("KpiCard renders reported revenue and keeps missing unknown", () => {
  const reported = renderToStaticMarkup(<KpiCard label="Revenue (30d)" value={150000} format="currencyCents" testId="rev" />);
  assert.match(reported, /Revenue \(30d\)/);
  assert.match(reported, /\$1,500\.00/);
  const missing = renderToStaticMarkup(<KpiCard label="Revenue (30d)" value={null} format="currencyCents" testId="rev" />);
  assert.match(missing, /Not reported/);
  assert.doesNotMatch(missing, /\$0\.00/);
});

test("KpiCard occupancy fraction is not a count", () => {
  const html = renderToStaticMarkup(<KpiCard label="Occupancy" value={0.85} format="percent" decimals={1} testId="occ" />);
  assert.match(html, /85\.0%/);
  assert.doesNotMatch(html, />0</);
});

test("dashboard source uses operator language and verified drilldowns", () => {
  const src = readFileSync("src/features/dashboard/pages/DashboardPage.tsx", "utf8");
  assert.match(src, /not net operating income or collected cash/);
  assert.match(src, /Review properties/);
  assert.match(src, /Review leases/);
  assert.doesNotMatch(src, /cents|producers/);
});
