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

test("summarizeActiveRent is loaded-result only; unknown status is not active; missing not zero", () => {
  const allKnown = summarizeActiveRent([
    { status: "active", rent: 1000 },
    { status: "active", rent: 0 },
    { status: "ended", rent: 500 },
    { status: null, rent: 200 },
  ]);
  assert.equal(allKnown.total, 1000);
  assert.equal(allKnown.partial, false);
  assert.equal(allKnown.activeCount, 2);
  assert.equal(allKnown.loadedOnly, true);

  const partial = summarizeActiveRent([
    { status: "active", rent: 800 },
    { status: "Active", rent: null },
    { status: "unknown", rent: 100 },
  ]);
  assert.equal(partial.total, 800);
  assert.equal(partial.partial, true);
  assert.equal(partial.activeCount, 2);
});

test("source-shaped LeaseOut/TenantOut fields and safe links", () => {
  assert.equal(joinTenants(["Jane Doe", "John Smith"]), "Jane Doe, John Smith");
  assert.equal(joinTenants([]), "");
  assert.equal(reportedStatus(null), null);
  assert.equal(safeCardHref("lease", 42), "/card/lease/42");
  assert.equal(safeCardHref("tenant", ""), undefined);
  assert.equal(safeCardHref("owner", null), undefined);
  assert.equal(safeCardHref("lease", "—"), undefined);
});
