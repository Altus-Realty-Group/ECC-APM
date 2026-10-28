import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { leaseExpiryDistribution } from "../../src/features/dashboard/leaseExpiry";
import { LeaseExpiryView } from "../../src/features/dashboard/components/LeaseExpiryPanel";

const today = "2026-10-28";
const lease = (id: number, end: unknown, status = "active") => ({ id, end, status });
const rows = ["2026-10-27", today, "2026-11-27", "2026-11-28", "2026-12-27", "2026-12-28", "2027-01-26", "2027-01-27"].map((end, i) => lease(i + 1, end));
const ready = { data: rows, isSuccess: true, isLoading: false, isFetching: false, isError: false, error: null, refetch: () => Promise.resolve() };
const render = (overrides = {}) => renderToStaticMarkup(<Router ssrPath="/dashboard"><LeaseExpiryView query={{ ...ready, ...overrides }} today={today} /></Router>);

test("lease expiry windows preserve exact calendar boundaries and use the renewal review's rules", () => {
  const s = leaseExpiryDistribution(rows, today);
  assert.deepEqual(s.windows.map(w => w.count), [1, 2, 2, 2, 1]);
  assert.equal(s.due30, 2);
  assert.equal(s.due31to90, 4);
  assert.equal(s.datedActive, 8);
});

test("expired status, unknown status, missing/conflicting dates and duplicate/unusable links never inflate the chart", () => {
  const data = [...rows, lease(9, today, "ended"), lease(10, today, "unknown"), lease(11, null),
    lease(12, "2026-02-30"), { ...lease(13, today), end_date: "2026-11-01" },
    lease(14, today), lease(14, today), lease(0, today)];
  const s = leaseExpiryDistribution(data, today);
  assert.equal(s.datedActive, 8);
  assert.equal(s.ended, 1);
  assert.equal(s.uncertain, 7);
  assert.deepEqual(s.windows.map(w => w.count), [1, 2, 2, 2, 1]);
  assert.throws(() => leaseExpiryDistribution([null], today));
  assert.throws(() => leaseExpiryDistribution(rows, "2026-02-30"));
});

test("loaded charts expose counts and scope and link to the actual renewal workflow", () => {
  const html = render();
  assert.match(html, /Active lease end-date windows/);
  assert.match(html, /data-testid="expiry-due30">2</);
  assert.match(html, /width:100%/);
  assert.match(html, /loaded rows/);
  assert.match(html, /portfolio completeness and source update time are not reported/);
  assert.match(html, /href="\/ops\/ai\/renewal-forecasting"/);
  assert.doesNotMatch(html, /\$/);
  const zero = render({ data: [] });
  assert.match(zero, /No lease records were returned/);
  assert.doesNotMatch(zero, /Active lease end-date windows|width:NaN/);
});

test("retained data is suppressed during refresh, error, denial and malformed success", () => {
  for (const state of [
    { isFetching: true }, { isLoading: true }, { isError: true, error: new Error("failure") },
    { isError: true, error: Object.assign(new Error("denied"), { status: 403 }) },
    { data: [null] }, { isSuccess: false },
  ]) {
    const html = render(state);
    assert.doesNotMatch(html, /Active lease end-date windows|expiry-due30|ecc-expiry-track/);
  }
});
