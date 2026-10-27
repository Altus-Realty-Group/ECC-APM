import { test } from "node:test";
import assert from "node:assert/strict";
import { filterLeaseRows } from "../../src/pages/portfolio/leases/filterLeaseRows.ts";
import { summarizeActiveRent } from "../../src/pages/portfolio/portfolioTruth.ts";

const loaded = [
  { id: "1", tenants: "Jane Doe", property: "Maple House", rent: 1000, start: "2026-01-01", end: "2026-12-31", status: "active" },
  { id: "2", tenants: "John Smith", property: "Oak Court", rent: 0, start: "2026-02-01", end: "2026-11-30", status: "active" },
  { id: "3", tenants: "Ada Lovelace", property: "Maple House", rent: null, start: "2025-01-01", end: "2025-12-31", status: "ended" },
  { id: "4", tenants: "Grace Hopper", property: "Pine Lodge", rent: 500, start: "2026-03-01", end: "2026-09-30", status: "" },
];

test("search matches tenant, property, status and id; trims and ignores case", () => {
  assert.equal(filterLeaseRows(loaded, "jane").length, 1);
  assert.equal(filterLeaseRows(loaded, "  MAPLE ").length, 2);
  assert.equal(filterLeaseRows(loaded, "ACTIVE").length, 2);
  assert.equal(filterLeaseRows(loaded, "3").length, 1);
  assert.equal(filterLeaseRows(loaded, "").length, 4);
  assert.equal(filterLeaseRows(loaded, "   ").length, 4);
  assert.equal(filterLeaseRows(loaded, "no-such").length, 0);
});

test("search never changes loaded totals", () => {
  const summary = summarizeActiveRent(loaded);
  const filtered = filterLeaseRows(loaded, "maple");
  const filteredSummary = summarizeActiveRent(filtered);
  assert.equal(summary.activeCount, 2);
  assert.equal(summary.total, 1000);
  assert.notEqual(filteredSummary.activeCount, summary.activeCount);
  assert.equal(summarizeActiveRent(loaded).total, 1000);
});

test("clearing search restores the full loaded set", () => {
  assert.equal(filterLeaseRows(loaded, "oak").length, 1);
  assert.equal(filterLeaseRows(loaded, "").length, loaded.length);
});
