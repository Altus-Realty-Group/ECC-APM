import assert from "node:assert/strict";
import { test } from "node:test";
import { summaryMetrics } from "../../src/features/dashboard/hooks/useDashboardData";
import { normalizeDashboardKpis } from "../../src/features/dashboard/kpiAdapter";
import { useBadgeCounts } from "../../src/state/badges";

test("legacy dashboard readers preserve unknown metrics instead of sample figures", () => {
  assert.deepEqual(summaryMetrics(null), {
    occupancy: null, rentReady: { ready: null, vacant: null }, collections: null, criticalWOs: null,
  });
  assert.deepEqual(useBadgeCounts(), {});
});

test("only a sourced occupancy figure supports the legacy occupancy display", () => {
  const zero = summaryMetrics(normalizeDashboardKpis({ occupancyRate: 0 }));
  assert.equal(zero.occupancy, 0);
  const sourced = summaryMetrics(normalizeDashboardKpis({ occupancyRate: 0.75 }));
  assert.equal(sourced.occupancy, 75);
  assert.equal(sourced.collections, null);
  assert.equal(sourced.criticalWOs, null);
  assert.deepEqual(sourced.rentReady, { ready: null, vacant: null });
});
