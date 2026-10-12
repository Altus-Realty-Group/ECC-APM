import { test } from "node:test";
import assert from "node:assert/strict";
import { STALE_AFTER_MS, errorKind, isStale, toIsoOrNull, toNumberOrNull } from "../../src/lib/dataState";
import { HttpError } from "../../src/lib/http";
import { coverage, missingMetrics, normalizeDashboardKpis } from "../../src/features/dashboard/kpiAdapter";
import { deriveDashboardStatus } from "../../src/features/dashboard/dashboardStatus";

test("null versus zero: a reported 0 stays 0, missing/invalid become null", () => {
  assert.equal(toNumberOrNull(0), 0);
  assert.equal(toNumberOrNull("0"), 0);
  assert.equal(toNumberOrNull(undefined), null);
  assert.equal(toNumberOrNull(null), null);
  assert.equal(toNumberOrNull(""), null);
  assert.equal(toNumberOrNull("  "), null);
  assert.equal(toNumberOrNull(NaN), null);
  assert.equal(toNumberOrNull(Infinity), null);
  assert.equal(toNumberOrNull({}), null);
});

test("normalizeDashboardKpis never turns missing into zero", () => {
  const k = normalizeDashboardKpis({});
  assert.deepEqual([k.propertiesTotal, k.unitsTotal, k.occupancyRate, k.revenue30dCents], [null, null, null, null]);
  assert.deepEqual(k.series, []);
  assert.equal(k.lastUpdated, null);
  assert.equal(coverage(k), "none");
});

test("confirmed zeros are preserved", () => {
  const k = normalizeDashboardKpis({ propertiesTotal: 0, unitsTotal: 0, occupancyRate: 0, revenue30dCents: 0 });
  assert.deepEqual([k.propertiesTotal, k.unitsTotal, k.occupancyRate, k.revenue30dCents], [0, 0, 0, 0]);
  assert.equal(coverage(k), "full");
});

test("partial payloads report which metrics are missing", () => {
  const k = normalizeDashboardKpis({ propertiesTotal: 12, occupancyRate: 0.93 });
  assert.equal(coverage(k), "partial");
  assert.deepEqual(missingMetrics(k), ["Units", "Revenue (30d)"]);
});

test("accepts a { data } envelope and rejects non-objects safely", () => {
  assert.equal(normalizeDashboardKpis({ data: { propertiesTotal: 5 } }).propertiesTotal, 5);
  for (const bad of [null, undefined, "x", 7, [], [1, 2]]) {
    assert.equal(coverage(normalizeDashboardKpis(bad)), "none");
  }
});

test("series drops invalid points instead of plotting zeros", () => {
  const k = normalizeDashboardKpis({
    series: [{ date: "2026-10-01", occupancy: 0.9 }, { date: "2026-10-02" }, { occupancy: 0.5 }, { date: "2026-10-03", occupancy: "x" }, null],
  });
  assert.deepEqual(k.series, [{ date: "2026-10-01", occupancy: 0.9 }]);
});

test("freshness: stale / fresh / unknown", () => {
  const now = Date.parse("2026-10-12T12:00:00Z");
  assert.equal(isStale(null, now), null);
  assert.equal(isStale("garbage", now), null);
  assert.equal(isStale("2026-10-12T11:00:00Z", now), false);
  assert.equal(isStale(new Date(now - STALE_AFTER_MS - 1000).toISOString(), now), true);
  assert.equal(toIsoOrNull("nope"), null);
  assert.ok(normalizeDashboardKpis({ last_updated: "2026-10-12T11:00:00Z" }).lastUpdated);
});

test("errorKind separates denied from failed", () => {
  assert.equal(errorKind(new HttpError("HTTP 403", 403)), "denied");
  assert.equal(errorKind(new HttpError("HTTP 401", 401)), "denied");
  assert.equal(errorKind(new HttpError("HTTP 500", 500)), "error");
  assert.equal(errorKind(new Error("HTTP 403: nope")), "denied");
  assert.equal(errorKind(new Error("Failed to fetch")), "error");
  assert.equal(errorKind(undefined), "error");
});

test("dashboard status covers loading/denied/error/empty/ready/refresh-failed/stale", () => {
  const ok = normalizeDashboardKpis({ propertiesTotal: 1, unitsTotal: 2, occupancyRate: 0.5, revenue30dCents: 0, lastUpdated: "2026-10-12T11:00:00Z" });
  const now = Date.parse("2026-10-12T12:00:00Z");
  const base = { isLoading: false, isError: false, error: null, data: undefined as any, now };
  assert.equal(deriveDashboardStatus({ ...base, isLoading: true }).mode, "loading");
  const denied = deriveDashboardStatus({ ...base, isError: true, error: new HttpError("HTTP 403", 403) });
  assert.deepEqual([denied.mode, denied.failure], ["failed", "denied"]);
  const failed = deriveDashboardStatus({ ...base, isError: true, error: new Error("boom") });
  assert.deepEqual([failed.mode, failed.failure], ["failed", "error"]);
  assert.equal(deriveDashboardStatus(base).mode, "empty");
  const ready = deriveDashboardStatus({ ...base, data: ok });
  assert.deepEqual([ready.mode, ready.coverage, ready.stale, ready.refreshFailed], ["ready", "full", false, null]);
  const refresh = deriveDashboardStatus({ ...base, data: ok, isError: true, error: new Error("x") });
  assert.deepEqual([refresh.mode, refresh.refreshFailed], ["ready", "error"]);
  const stale = deriveDashboardStatus({ ...base, data: ok, now: now + 3 * STALE_AFTER_MS });
  assert.equal(stale.stale, true);
});
