/**
 * Focused metric-consistency proof for ECC-R03 fixtures.
 * Imports only the synthetic fixtures and accepted pure functions.
 * No JSX, CSS, navigation, routes or production adapters.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { totalAwards } from "../../../shared/legal/contracts.ts";
import { deriveDashboardStatus } from "../../../src/features/dashboard/dashboardStatus.ts";
import { isValidProjection, evaluateCollectionEligibility } from "../../../shared/legal/ledger/eligibility.ts";
import {
  populatedDashboardKpis,
  zeroDashboardKpis,
  unknownDashboardKpis,
  partialDataDashboardKpis,
  disconnectedDashboardKpis,
} from "../../fixtures/ui-recovery/dashboardKpis.ts";
import {
  jointAward,
  zeroAward,
  unknownAward,
  secondMatterAward,
  knownLedgerProjection,
  readyProjectionOutcome,
} from "../../fixtures/ui-recovery/legalFixtures.ts";
import {
  proposedPopulatedOccupancy,
  proposedZeroOccupancy,
  proposedUnknownOccupancy,
  proposedConfirmedZeroOccupancy,
  proposedOccupancyRate,
  proposedLoadedMrr,
  proposedZeroMrr,
  proposedUnknownMrr,
  proposedLeaseRows,
  longContentLabel,
} from "../../fixtures/ui-recovery/proposedPresentation.ts";

test("occupancy denominator is occupied-eligible / eligible; active leases are independent", () => {
  const o = proposedPopulatedOccupancy;
  assert.ok(o.eligibleUnits > 0);
  const rate = proposedOccupancyRate(o);
  assert.equal(rate, 0.75);
  assert.equal(populatedDashboardKpis.occupancyRate, rate);
  assert.notEqual(o.activeLeases, o.occupiedEligibleUnits);
  assert.ok(o.unknownUnits > 0);
  assert.ok(o.excludedUnits > 0);
});

test("proposed occupancy rate: zero denominator -> null; wholly unknown -> null; confirmed zero -> 0%; populated -> 75%", () => {
  assert.equal(proposedOccupancyRate(proposedZeroOccupancy), null);
  assert.notEqual(proposedOccupancyRate(proposedZeroOccupancy), 0);
  assert.ok(!Number.isNaN(proposedOccupancyRate(proposedZeroOccupancy) as number));

  assert.equal(proposedOccupancyRate(proposedUnknownOccupancy), null);
  assert.notEqual(proposedOccupancyRate(proposedUnknownOccupancy), 0);

  assert.equal(proposedOccupancyRate(proposedConfirmedZeroOccupancy), 0);
  assert.equal(proposedOccupancyRate(proposedPopulatedOccupancy), 0.75);

  // zero units cannot establish 0% occupancy on the accepted dashboard contract
  assert.equal(zeroDashboardKpis.unitsTotal, 0);
  assert.equal(zeroDashboardKpis.occupancyRate, null);
  assert.equal(zeroDashboardKpis.revenue30dCents, 0); // recorded zero money remains distinct
});

test("loaded MRR is known nonnegative monthly contract rent with currency and partial coverage; consistent with occupancy activeLeases", () => {
  const m = proposedLoadedMrr;
  assert.equal(m.activeLeaseCount, proposedPopulatedOccupancy.activeLeases);
  assert.notEqual(m.activeLeaseCount, proposedPopulatedOccupancy.occupiedEligibleUnits);
  assert.ok(m.knownMonthlyRentCents !== null && m.knownMonthlyRentCents > 0);
  assert.equal(m.currency, "USD");
  assert.ok(m.unknownLeaseCount > 0);
  // revenue30d is a different window; not silently equated to monthly MRR
  assert.notEqual(populatedDashboardKpis.revenue30dCents, m.knownMonthlyRentCents);
});

test("deterministic lease rows support MRR: known subtotal, unknown rents, recorded zero, excluded ended", () => {
  const active = proposedLeaseRows.filter((r) => r.status === "active");
  const ended = proposedLeaseRows.filter((r) => r.status === "ended");
  assert.equal(active.length, proposedLoadedMrr.activeLeaseCount);
  assert.ok(ended.length > 0);

  const known = active.filter((r) => r.monthlyRentCents !== null);
  const unknown = active.filter((r) => r.monthlyRentCents === null);
  const zeros = active.filter((r) => r.monthlyRentCents === 0);
  assert.equal(unknown.length, proposedLoadedMrr.unknownLeaseCount);
  assert.ok(zeros.length > 0);
  assert.ok(known.every((r) => r.currency === "USD"));

  const subtotal = known.reduce((sum, r) => sum + (r.monthlyRentCents ?? 0), 0);
  assert.equal(subtotal, proposedLoadedMrr.knownMonthlyRentCents);
  // Ended leases are excluded from the active subtotal.
  assert.ok(ended.every((r) => r.monthlyRentCents !== null));
});

test("wholly unknown MRR is distinct from confirmed zero", () => {
  assert.equal(proposedUnknownMrr.knownMonthlyRentCents, null);
  assert.equal(proposedUnknownMrr.currency, null);
  assert.equal(proposedZeroMrr.knownMonthlyRentCents, 0);
  assert.equal(proposedZeroMrr.currency, "USD");
  assert.notEqual(proposedUnknownMrr.knownMonthlyRentCents, proposedZeroMrr.knownMonthlyRentCents);
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

test("unknown versus zero is preserved on dashboard KPIs; partial is distinct from disconnected", () => {
  assert.equal(unknownDashboardKpis.occupancyRate, null);
  assert.equal(unknownDashboardKpis.revenue30dCents, null);
  assert.equal(zeroDashboardKpis.occupancyRate, null);
  assert.equal(zeroDashboardKpis.revenue30dCents, 0);
  assert.equal(partialDataDashboardKpis.revenue30dCents, 500_000);
  assert.equal(disconnectedDashboardKpis.revenue30dCents, null);
  assert.equal(disconnectedDashboardKpis.propertiesTotal, null);
});

test("denied outcome via accepted dashboard boundary withholds prior cached values", () => {
  const deniedError = { status: 403 };
  const status = deriveDashboardStatus({
    isLoading: false,
    isError: true,
    error: deniedError,
    data: populatedDashboardKpis,
  });
  assert.equal(status.mode, "failed");
  assert.equal(status.failure, "denied");
  assert.equal(status.coverage, "none");
  assert.deepEqual(status.missing, []);
  // Prior cached populated figures are not used.
  assert.notEqual(status.mode, "ready");
});

test("typed L5 LedgerProjection generated by projectLedger is valid; arithmetic matches; missing reconciliation/approval blocks eligibility", () => {
  assert.equal(isValidProjection(knownLedgerProjection), true);
  assert.equal(knownLedgerProjection.status, "known");
  assert.equal(knownLedgerProjection.awardId, jointAward.id);
  assert.equal(knownLedgerProjection.principal?.cents, 150_000);
  assert.equal(knownLedgerProjection.chargedCents, 150_000);
  assert.equal(knownLedgerProjection.satisfiedCents, 0);
  assert.equal(knownLedgerProjection.netCents, 150_000);
  assert.equal(knownLedgerProjection.outstandingCents, 150_000);
  assert.equal(knownLedgerProjection.lastSeq, 0);
  assert.match(knownLedgerProjection.ledgerDigest, /^[0-9a-f]{16}$/);

  const elig = evaluateCollectionEligibility(knownLedgerProjection, null);
  assert.equal(elig.eligible, false);
  assert.ok(elig.blockers.includes("RECONCILIATION_NOT_CURRENT"));
  assert.ok(elig.blockers.includes("APPROVAL_MISSING"));

  assert.equal(readyProjectionOutcome.kind, "ready");
  if (readyProjectionOutcome.kind === "ready") {
    assert.equal(readyProjectionOutcome.projection.matter.id, "matter-synth-001");
    assert.equal(readyProjectionOutcome.summary.verifiedMonetaryAwards, 1);
    assert.equal(readyProjectionOutcome.summary.unknownAwards, 0);
  }
});

test("identities and dates are consistent and synthetic", () => {
  assert.equal(jointAward.matterId, "matter-synth-001");
  assert.equal(zeroAward.matterId, jointAward.matterId);
  assert.ok(populatedDashboardKpis.lastUpdated?.startsWith("2026-11-15"));
  assert.ok(longContentLabel.includes("Synthetic"));
  assert.ok(!longContentLabel.toLowerCase().includes("john") && !longContentLabel.includes("@"));
});
