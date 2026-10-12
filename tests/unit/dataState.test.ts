import { test } from "node:test";
import assert from "node:assert/strict";
import { FUTURE_SKEW_MS, STALE_AFTER_MS, ContractError, classifyTimestamp, errorKind, freshness, isStale, toIsoOrNull, toNumberOrNull } from "../../src/lib/dataState";
import { HttpError } from "../../src/lib/http";
import { coverage, missingMetrics, normalizeDashboardKpis } from "../../src/features/dashboard/kpiAdapter";
import { deriveDashboardStatus } from "../../src/features/dashboard/dashboardStatus";

const NOW = Date.parse("2026-10-12T12:00:00Z");

test("null versus zero: a reported 0 stays 0, missing/invalid become null (generic helper)", () => {
  assert.equal(toNumberOrNull(0), 0);
  assert.equal(toNumberOrNull("0"), 0);
  for (const v of [undefined, null, "", "  ", NaN, Infinity, {}]) assert.equal(toNumberOrNull(v as any), null);
});

test("dashboard: absent fields are null (unknown), never zero", () => {
  const k = normalizeDashboardKpis({}, NOW);
  assert.deepEqual([k.propertiesTotal, k.unitsTotal, k.occupancyRate, k.revenue30dCents], [null, null, null, null]);
  assert.deepEqual(k.series, []);
  assert.equal(k.lastUpdated, null);
  assert.equal(coverage(k), "none");
});

test("dashboard: explicit nulls are unknown, confirmed zeros are preserved", () => {
  const nulls = normalizeDashboardKpis({ propertiesTotal: null, unitsTotal: null, occupancyRate: null, revenue30dCents: null }, NOW);
  assert.equal(coverage(nulls), "none");
  const zeros = normalizeDashboardKpis({ propertiesTotal: 0, unitsTotal: 0, occupancyRate: 0, revenue30dCents: 0 }, NOW);
  assert.deepEqual([zeros.propertiesTotal, zeros.unitsTotal, zeros.occupancyRate, zeros.revenue30dCents], [0, 0, 0, 0]);
  assert.equal(coverage(zeros), "full");
});

test("dashboard: partial payloads name the missing metrics", () => {
  const k = normalizeDashboardKpis({ propertiesTotal: 12, occupancyRate: 0.93 }, NOW);
  assert.equal(coverage(k), "partial");
  assert.deepEqual(missingMetrics(k), ["Units", "Revenue (30d)"]);
});

test("dashboard: envelope accepted and validated the same way", () => {
  assert.equal(normalizeDashboardKpis({ data: { propertiesTotal: 5 } }, NOW).propertiesTotal, 5);
  assert.throws(() => normalizeDashboardKpis({ data: { propertiesTotal: -1 } }, NOW), ContractError);
});

test("dashboard: malformed raw/envelope shapes are contract errors, not 'no figures'", () => {
  for (const bad of [null, undefined, "x", 7, true, [], [1, 2], { data: null }, { data: [] }, { data: "x" }, { data: 5 }]) {
    assert.throws(() => normalizeDashboardKpis(bad, NOW), ContractError, JSON.stringify(bad));
  }
});

test("dashboard: counts must be non-negative integers (numbers only)", () => {
  for (const bad of [-1, -2.5, 1.5, "3", "", NaN, Infinity, {}, [], true, Number.MAX_SAFE_INTEGER + 2]) {
    assert.throws(() => normalizeDashboardKpis({ propertiesTotal: bad }, NOW), ContractError, `propertiesTotal=${String(bad)}`);
    assert.throws(() => normalizeDashboardKpis({ unitsTotal: bad }, NOW), ContractError, `unitsTotal=${String(bad)}`);
  }
  assert.equal(normalizeDashboardKpis({ propertiesTotal: 7 }, NOW).propertiesTotal, 7);
});

test("dashboard: occupancy is a 0..1 fraction", () => {
  for (const bad of [1.4, 1.0000001, -0.1, "0.5", NaN, Infinity, 93.4]) {
    assert.throws(() => normalizeDashboardKpis({ occupancyRate: bad }, NOW), ContractError, `occupancyRate=${String(bad)}`);
  }
  for (const good of [0, 0.5, 1]) assert.equal(normalizeDashboardKpis({ occupancyRate: good }, NOW).occupancyRate, good);
});

test("dashboard: revenue is whole, non-negative cents", () => {
  for (const bad of [12.5, -1, "100", NaN, Infinity]) {
    assert.throws(() => normalizeDashboardKpis({ revenue30dCents: bad }, NOW), ContractError, `cents=${String(bad)}`);
  }
  assert.equal(normalizeDashboardKpis({ revenue30dCents: 0 }, NOW).revenue30dCents, 0);
  assert.equal(normalizeDashboardKpis({ revenue30dCents: 12345 }, NOW).revenue30dCents, 12345);
});

test("dashboard: series must be an array of valid points; nothing invalid is plotted", () => {
  for (const bad of ["x", 5, {}, [null], [{}], [{ date: "2026-10-01" }], [{ occupancy: 0.5 }], [{ date: "garbage", occupancy: 0.5 }],
    [{ date: "2026-10-01", occupancy: 1.2 }], [{ date: "2026-10-01", occupancy: -0.1 }], [{ date: "2026-10-01", occupancy: "0.5" }],
    [{ date: "2026-10-01", occupancy: 0.5 }, { date: "2026-10-02", occupancy: 7 }]]) {
    assert.throws(() => normalizeDashboardKpis({ series: bad }, NOW), ContractError, JSON.stringify(bad));
  }
  const ok = normalizeDashboardKpis({ series: [{ date: "2026-10-01", occupancy: 0 }, { date: "2026-10-02", occupancy: 1 }] }, NOW);
  assert.deepEqual(ok.series, [{ date: "2026-10-01", occupancy: 0 }, { date: "2026-10-02", occupancy: 1 }]);
  assert.deepEqual(normalizeDashboardKpis({ series: null }, NOW).series, []);
});

test("timestamps: future and invalid source times are never fresh", () => {
  const future = new Date(NOW + FUTURE_SKEW_MS + 60_000).toISOString();
  assert.deepEqual(classifyTimestamp(future, NOW), { iso: null, problem: "future" });
  assert.deepEqual(classifyTimestamp("garbage", NOW), { iso: null, problem: "invalid" });
  assert.deepEqual(classifyTimestamp(12345, NOW), { iso: null, problem: "invalid" });
  assert.deepEqual(classifyTimestamp(undefined, NOW), { iso: null, problem: null });
  assert.deepEqual(classifyTimestamp("", NOW), { iso: null, problem: null });
  // within clock skew is accepted
  assert.equal(classifyTimestamp(new Date(NOW + 60_000).toISOString(), NOW).problem, null);

  assert.equal(freshness(null, "future", NOW), "future");
  assert.equal(freshness(null, "invalid", NOW), "invalid");
  assert.equal(freshness(future, null, NOW), "future");
  assert.equal(freshness(null, null, NOW), "unknown");
  assert.equal(isStale(future, NOW), null);
  assert.equal(isStale("garbage", NOW), null);
  assert.equal(isStale(new Date(NOW - 1000).toISOString(), NOW), false);
  assert.equal(isStale(new Date(NOW - STALE_AFTER_MS - 1000).toISOString(), NOW), true);
  assert.equal(toIsoOrNull("nope"), null);
});

test("dashboard adapter carries timestamp problems instead of a fresh-looking date", () => {
  const future = new Date(NOW + 3 * 60 * 60 * 1000).toISOString();
  const k = normalizeDashboardKpis({ propertiesTotal: 1, lastUpdated: future }, NOW);
  assert.equal(k.lastUpdated, null);
  assert.equal(k.lastUpdatedProblem, "future");
  assert.equal(normalizeDashboardKpis({ lastUpdated: "garbage" }, NOW).lastUpdatedProblem, "invalid");
  // aliases that were never in a verified contract are ignored
  assert.equal(normalizeDashboardKpis({ last_updated: new Date(NOW - 1000).toISOString(), asOf: new Date(NOW - 1000).toISOString() }, NOW).lastUpdated, null);
});

test("errorKind separates denied from failed", () => {
  assert.equal(errorKind(new HttpError("HTTP 403", 403)), "denied");
  assert.equal(errorKind(new HttpError("HTTP 401", 401)), "denied");
  assert.equal(errorKind(new HttpError("HTTP 500", 500)), "error");
  assert.equal(errorKind(new Error("HTTP 403: nope")), "denied");
  assert.equal(errorKind(new Error("Failed to fetch")), "error");
  assert.equal(errorKind(new ContractError("bad")), "error");
  assert.equal(errorKind(undefined), "error");
});

test("dashboard status: loading/denied/error/contract/empty/ready/refresh-failed/stale/future", () => {
  const ok = normalizeDashboardKpis({ propertiesTotal: 1, unitsTotal: 2, occupancyRate: 0.5, revenue30dCents: 0, lastUpdated: "2026-10-12T11:00:00Z" }, NOW);
  const base = { isLoading: false, isError: false, error: null, data: undefined as any, now: NOW };
  assert.equal(deriveDashboardStatus({ ...base, isLoading: true }).mode, "loading");
  const denied = deriveDashboardStatus({ ...base, isError: true, error: new HttpError("HTTP 403", 403) });
  assert.deepEqual([denied.mode, denied.failure], ["failed", "denied"]);
  const failed = deriveDashboardStatus({ ...base, isError: true, error: new Error("boom") });
  assert.deepEqual([failed.mode, failed.failure, failed.contractViolation], ["failed", "error", false]);
  const contract = deriveDashboardStatus({ ...base, isError: true, error: new ContractError("bad") });
  assert.deepEqual([contract.mode, contract.contractViolation], ["failed", true]);
  assert.equal(deriveDashboardStatus(base).mode, "empty");
  const ready = deriveDashboardStatus({ ...base, data: ok });
  assert.deepEqual([ready.mode, ready.coverage, ready.freshness, ready.refreshFailed], ["ready", "full", "fresh", null]);
  const refresh = deriveDashboardStatus({ ...base, data: ok, isError: true, error: new Error("x") });
  assert.deepEqual([refresh.mode, refresh.refreshFailed], ["ready", "error"]);
  const stale = deriveDashboardStatus({ ...base, data: ok, now: NOW + 3 * STALE_AFTER_MS });
  assert.equal(stale.freshness, "stale");
  const futureData = normalizeDashboardKpis({ propertiesTotal: 1, lastUpdated: new Date(NOW + 86_400_000).toISOString() }, NOW);
  assert.equal(deriveDashboardStatus({ ...base, data: futureData }).freshness, "future");
});

test("dashboard status: a DENIED refresh suppresses cached figures (never 'ready')", () => {
  const cached = normalizeDashboardKpis({ propertiesTotal: 9, unitsTotal: 90, occupancyRate: 0.5, revenue30dCents: 100 }, NOW);
  for (const status of [401, 403]) {
    const s = deriveDashboardStatus({ isLoading: false, isError: true, error: new HttpError(`HTTP ${status}`, status), data: cached, now: NOW });
    assert.deepEqual([s.mode, s.failure], ["failed", "denied"], `HTTP ${status}`);
  }
  // transient failure with cached data from the same session keeps the data and says the refresh failed
  const t = deriveDashboardStatus({ isLoading: false, isError: true, error: new HttpError("HTTP 503", 503), data: cached, now: NOW });
  assert.deepEqual([t.mode, t.refreshFailed], ["ready", "error"]);
});
