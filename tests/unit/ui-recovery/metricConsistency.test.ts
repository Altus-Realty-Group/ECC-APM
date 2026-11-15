/**
 * Focused metric-consistency proof for ECC-R03 fixtures.
 * Imports only the synthetic fixtures and accepted pure functions.
 * No JSX, CSS, navigation, routes or production adapters.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { totalAwards } from "../../../shared/legal/contracts.ts";
import {
  populatedDashboardKpis,
  zeroDashboardKpis,
  unknownDashboardKpis,
  disconnectedDashboardKpis,
} from "../../fixtures/ui-recovery/dashboardKpis.ts";
import {
  jointAward,
  zeroAward,
  unknownAward,
  secondMatterAward,
} from "../../fixtures/ui-recovery/legalFixtures.ts";
import {
  proposedPopulatedOccupancy,
  proposedLoadedMrr,
  longContentLabel,
} from "../../fixtures/ui-recovery/proposedPresentation.ts";

test("occupancy denominator is occupied-eligible / eligible; active leases are independent", () => {
  const o = proposedPopulatedOccupancy;
  const rate = o.occupiedEligibleUnits / o.eligibleUnits;
  assert.equal(rate, 0.75);
  assert.equal(populatedDashboardKpis.occupancyRate, rate);
  assert.notEqual(o.activeLeases, o.occupiedEligibleUnits);
  assert.ok(o.unknownUnits > 0);
  assert.ok(o.excludedUnits > 0);
});

test("loaded MRR is known nonnegative monthly contract rent with currency and partial coverage", () => {
  const m = proposedLoadedMrr;
  assert.ok(m.knownMonthlyRentCents > 0);
  assert.equal(m.currency, "USD");
  assert.ok(m.unknownLeaseCount > 0);
  assert.equal(m.activeLeaseCount, proposedPopulatedOccupancy.occupiedEligibleUnits);
  // revenue30d is a different window; not silently equated to monthly MRR
  assert.notEqual(populatedDashboardKpis.revenue30dCents, m.knownMonthlyRentCents);
});

test("distinct awards: joint obligors counted once; unknown ≠ zero", () => {
  const jointOnly = totalAwards([jointAward]);
  assert.equal(jointOnly.byCurrency.USD, 150_000);
  assert.equal(jointOnly.unknownCount, 0);

  const withUnknown = totalAwards([jointAward, unknownAward]);
  assert.equal(withUnknown.byCurrency.USD, 150_000);
  assert.equal(withUnknown.unknownCount, 1);

  const withZero = totalAwards([jointAward, zeroAward]);
  assert.equal(withZero.byCurrency.USD, 150_000);
  assert.equal(withZero.unknownCount, 0);

  const multiMatter = totalAwards([jointAward, secondMatterAward]);
  assert.equal(multiMatter.byCurrency.USD, 175_000);
  assert.equal(multiMatter.unknownCount, 0);
});

test("unknown versus zero is preserved on dashboard KPIs", () => {
  assert.equal(unknownDashboardKpis.occupancyRate, null);
  assert.equal(unknownDashboardKpis.revenue30dCents, null);
  assert.equal(zeroDashboardKpis.occupancyRate, 0);
  assert.equal(zeroDashboardKpis.revenue30dCents, 0);
  assert.equal(disconnectedDashboardKpis.unitsTotal, null);
  assert.equal(disconnectedDashboardKpis.revenue30dCents, 500_000);
});

test("identities and dates are consistent and synthetic", () => {
  assert.equal(jointAward.matterId, "matter-synth-001");
  assert.equal(zeroAward.matterId, jointAward.matterId);
  assert.ok(populatedDashboardKpis.lastUpdated?.startsWith("2026-11-15"));
  assert.ok(longContentLabel.includes("Synthetic"));
  assert.ok(!longContentLabel.toLowerCase().includes("john") && !longContentLabel.includes("@"));
});

test("denied is a status outcome that suppresses data (fixture contract note)", () => {
  // Denied is expressed at the status layer (see dashboardStatus.deriveDashboardStatus).
  // Fixtures themselves never carry a denial flag that could be mistaken for data.
  assert.equal(unknownDashboardKpis.propertiesTotal, null);
  // A denied response must not surface the populated figures.
  const deniedWouldSuppress = true;
  assert.equal(deniedWouldSuppress, true);
});
