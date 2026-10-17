import assert from "node:assert/strict";
import { test } from "node:test";
import { knownRentDollars, summarizeActiveRent, reportedStatus } from "../../src/pages/portfolio/portfolioTruth.ts";

test("knownRentDollars preserves zero and does not invent from missing", () => {
  assert.equal(knownRentDollars({ rent: 0 }), 0);
  assert.equal(knownRentDollars({ rent_cents: 0 }), 0);
  assert.equal(knownRentDollars({ rent: 1250 }), 1250);
  assert.equal(knownRentDollars({ rent_cents: 125000 }), 1250);
  assert.equal(knownRentDollars({}), null);
  assert.equal(knownRentDollars({ rent: null, rent_cents: undefined }), null);
  assert.equal(knownRentDollars({ rent: "nope" }), null);
});

test("summarizeActiveRent does not treat missing rent as zero and labels partial", () => {
  const allKnown = summarizeActiveRent([
    { status: "active", rent: 1000 },
    { status: "active", rent: 0 },
    { status: "ended", rent: 500 },
  ]);
  assert.equal(allKnown.total, 1000);
  assert.equal(allKnown.partial, false);
  assert.equal(allKnown.knownCount, 2);
  assert.equal(allKnown.activeCount, 2);

  const partial = summarizeActiveRent([
    { status: "active", rent: 800 },
    { status: "Active", rent: null },
  ]);
  assert.equal(partial.total, 800);
  assert.equal(partial.partial, true);
  assert.equal(partial.knownCount, 1);
  assert.equal(partial.activeCount, 2);

  const none = summarizeActiveRent([
    { status: "active", rent: null },
    { status: "ended", rent: 100 },
  ]);
  assert.equal(none.total, null);
  assert.equal(none.partial, true);
  assert.equal(none.knownCount, 0);
  assert.equal(none.activeCount, 1);
});

test("reportedStatus never invents Current", () => {
  assert.equal(reportedStatus("Current"), "Current");
  assert.equal(reportedStatus("former"), "former");
  assert.equal(reportedStatus(null), null);
  assert.equal(reportedStatus(undefined), null);
  assert.equal(reportedStatus("  "), null);
  assert.equal(reportedStatus(""), null);
});
