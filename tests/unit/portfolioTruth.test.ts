import assert from "node:assert/strict";
import { test } from "node:test";
import {
  knownRentDollars,
  summarizeActiveRent,
  reportedStatus,
  safeCardHref,
  joinTenants,
} from "../../src/pages/portfolio/portfolioTruth.ts";

test("knownRentDollars preserves zero, rejects negative/non-finite, prefers documented rent dollars", () => {
  assert.equal(knownRentDollars({ rent: 0 }), 0);
  assert.equal(knownRentDollars({ rent: 1250 }), 1250);
  assert.equal(knownRentDollars({ rent: null }), null);
  assert.equal(knownRentDollars({ rent: -10 }), null);
  assert.equal(knownRentDollars({ rent: NaN }), null);
  assert.equal(knownRentDollars({ rent: Infinity }), null);
  assert.equal(knownRentDollars({}), null);
});

test("summarizeActiveRent is loaded-result only; unclassified status makes result partial/uncertain", () => {
  const allKnown = summarizeActiveRent([
    { status: "active", rent: 1000 },
    { status: "active", rent: 0 },
    { status: "ended", rent: 500 },
  ]);
  assert.equal(allKnown.total, 1000);
  assert.equal(allKnown.partial, false);
  assert.equal(allKnown.activeCount, 2);
  assert.equal(allKnown.unclassifiedCount, 0);
  assert.equal(allKnown.loadedOnly, true);

  const withUnclassified = summarizeActiveRent([
    { status: "active", rent: 1000 },
    { status: null, rent: 500 },
  ]);
  assert.equal(withUnclassified.total, 1000);
  assert.equal(withUnclassified.partial, true);
  assert.equal(withUnclassified.activeCount, 1);
  assert.equal(withUnclassified.unclassifiedCount, 1);

  const partial = summarizeActiveRent([
    { status: "active", rent: 800 },
    { status: "Active", rent: null },
    { status: "unknown", rent: 100 },
  ]);
  assert.equal(partial.total, 800);
  assert.equal(partial.partial, true);
  assert.equal(partial.activeCount, 2);
  assert.equal(partial.unclassifiedCount, 1);
});

test("safeCardHref only links positive safe integers; invalid IDs unlinked", () => {
  assert.equal(safeCardHref("lease", 42), "/card/lease/42");
  assert.equal(safeCardHref("tenant", "7"), "/card/tenant/7");
  assert.equal(safeCardHref("owner", 1), "/card/owner/1");

  assert.equal(safeCardHref("lease", 0), undefined);
  assert.equal(safeCardHref("lease", -1), undefined);
  assert.equal(safeCardHref("lease", 1.5), undefined);
  assert.equal(safeCardHref("lease", "abc"), undefined);
  assert.equal(safeCardHref("tenant", ""), undefined);
  assert.equal(safeCardHref("owner", null), undefined);
  assert.equal(safeCardHref("lease", "—"), undefined);
  assert.equal(safeCardHref("lease", Number.MAX_SAFE_INTEGER + 1), undefined);
});

test("unexpected and malformed lease statuses keep raw and mounted rent summaries uncertain", () => {
  for (const status of ["unclassified", "nonsense", "pending_review", "unknown", "", "   ", null, undefined, {}, false, 7, ["active"]]) {
    for (const suppliedStatus of [status, reportedStatus(status) ?? "—"]) {
      const summary = summarizeActiveRent([
        { status: "active", rent: 1000 },
        { status: suppliedStatus, rent: 500 },
      ]);
      assert.equal(summary.total, 1000);
      assert.equal(summary.partial, true, `Status ${String(status)} must preserve uncertainty`);
      assert.equal(summary.activeCount, 1);
      assert.equal(summary.unclassifiedCount, 1);
    }
  }
  for (const status of [{}, false, 7, ["active"]]) {
    assert.equal(reportedStatus(status), null);
  }
});

test("trimmed Active preserves zero while only source-supported ended statuses are excluded as known", () => {
  const endedStatuses = ["ended", "terminated", "closed", "past", "inactive", "cancelled", "canceled"];
  const summary = summarizeActiveRent([
    { status: " Active ", rent: 1000 },
    { status: " ACTIVE ", rent: 0 },
    ...endedStatuses.map((status) => ({ status: ` ${status.toUpperCase()} `, rent: 500 })),
  ]);
  assert.equal(summary.total, 1000);
  assert.equal(summary.activeCount, 2);
  assert.equal(summary.knownCount, 2);
  assert.equal(summary.partial, false);
  assert.equal(summary.unclassifiedCount, 0);
  const missing = summarizeActiveRent([{ status: " Active ", rent: null }]);
  assert.equal(missing.total, null);
  assert.equal(missing.partial, true);
});

test("source-shaped helpers", () => {
  assert.equal(joinTenants(["Jane Doe", "John Smith"]), "Jane Doe, John Smith");
  assert.equal(joinTenants([]), "");
  assert.equal(reportedStatus(null), null);
});
