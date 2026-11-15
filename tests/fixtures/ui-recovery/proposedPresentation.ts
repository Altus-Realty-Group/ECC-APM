/**
 * PROPOSED PRESENTATION FIXTURE — NOT AN ACCEPTED BACKEND CONTRACT.
 * Synthetic only. For visual review of occupancy, MRR and long-content challenges.
 * Must never be bound into production readers or adapters.
 */

export type ProposedOccupancyBreakdown = {
  eligibleUnits: number;
  occupiedEligibleUnits: number;
  unknownUnits: number;
  excludedUnits: number;
  /** Independent of occupiedEligibleUnits. Never derived from occupied units. */
  activeLeases: number;
};

export const proposedPopulatedOccupancy: ProposedOccupancyBreakdown = {
  eligibleUnits: 48,
  occupiedEligibleUnits: 36,
  unknownUnits: 2,
  excludedUnits: 1,
  activeLeases: 6,
};

export const proposedZeroOccupancy: ProposedOccupancyBreakdown = {
  eligibleUnits: 0,
  occupiedEligibleUnits: 0,
  unknownUnits: 0,
  excludedUnits: 0,
  activeLeases: 0,
};

export const proposedUnknownOccupancy: ProposedOccupancyBreakdown = {
  eligibleUnits: 10,
  occupiedEligibleUnits: 0,
  unknownUnits: 10,
  excludedUnits: 0,
  activeLeases: 0,
};

/**
 * Deterministic lease rows for MRR/coverage assertions.
 * Known subtotal, unknown rents, recorded zero, and excluded ended leases are distinguished.
 * Currency is explicit when amount is known.
 */
export type ProposedLeaseRow = {
  id: string;
  status: "active" | "ended";
  monthlyRentCents: number | null;
  currency: string | null;
};

export const proposedLeaseRows: readonly ProposedLeaseRow[] = [
  { id: "lease-synth-1", status: "active", monthlyRentCents: 1_200_000, currency: "USD" },
  { id: "lease-synth-2", status: "active", monthlyRentCents: 1_500_000, currency: "USD" },
  { id: "lease-synth-3", status: "active", monthlyRentCents: 1_800_000, currency: "USD" },
  { id: "lease-synth-4", status: "active", monthlyRentCents: null, currency: null },
  { id: "lease-synth-5", status: "active", monthlyRentCents: null, currency: null },
  { id: "lease-synth-6", status: "active", monthlyRentCents: 0, currency: "USD" },
  { id: "lease-synth-ended", status: "ended", monthlyRentCents: 500_000, currency: "USD" },
];

export type ProposedMrr = {
  scope: string;
  activeLeaseCount: number;
  /** null = wholly unknown; 0 = confirmed zero. */
  knownMonthlyRentCents: number | null;
  currency: string | null;
  unknownLeaseCount: number;
};

export const proposedLoadedMrr: ProposedMrr = {
  scope: "portfolio-synth",
  activeLeaseCount: 6,
  knownMonthlyRentCents: 4_500_000,
  currency: "USD",
  unknownLeaseCount: 2,
};

export const proposedZeroMrr: ProposedMrr = {
  scope: "portfolio-synth",
  activeLeaseCount: 1,
  knownMonthlyRentCents: 0,
  currency: "USD",
  unknownLeaseCount: 0,
};

export const proposedUnknownMrr: ProposedMrr = {
  scope: "portfolio-synth",
  activeLeaseCount: 3,
  knownMonthlyRentCents: null,
  currency: null,
  unknownLeaseCount: 3,
};

/** Long synthetic content for layout stress. No real names, addresses or records. */
export const longContentLabel =
  "Synthetic long property label for visual review only — not a real address or record — repeated for stress testing layout density without personal data. Synthetic long property label for visual review only.";

export const longContentDocket = "2026-CV-SYNTHETIC-LONG-DOCKET-NUMBER-FOR-LAYOUT-REVIEW-ONLY-001";
