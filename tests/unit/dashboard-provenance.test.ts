import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard provenance note states revenue is not NOI and missing history is not a trend", () => {
  const src = readFileSync("src/features/dashboard/pages/DashboardPage.tsx", "utf8");
  assert.match(src, /data-testid="dashboard-provenance"/);
  assert.match(src, /not net operating income or collected cash/);
  assert.match(src, /Missing occupancy history is unavailable, not a trend/);
  assert.match(src, /Work orders, invoices and reconciliation are not available/);
  assert.doesNotMatch(src, /cents|producers/);
});

test("kpiAdapter keeps revenue as cents and occupancy as fraction", () => {
  const src = readFileSync("src/features/dashboard/kpiAdapter.ts", "utf8");
  assert.match(src, /revenue30dCents/);
  assert.match(src, /occupancyRate/);
  assert.match(src, /null means/);
});
