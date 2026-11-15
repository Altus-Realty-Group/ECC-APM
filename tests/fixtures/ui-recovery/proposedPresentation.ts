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
  /** Deliberately independent of occupiedEligibleUnits to challenge silent equivalence. */
  activeLeases: number;
};

export const proposedPopulatedOccupancy: ProposedOccupancyBreakdown = {
  eligibleUnits: 48,
  occupiedEligibleUnits: 36,
  unknownUnits: 2,
  excludedUnits: 1,
  activeLeases: 40,
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

export type ProposedMrr = {
  scope: string;
  activeLeaseCount: number;
  knownMonthlyRentCents: number;
  currency: string;
  unknownLeaseCount: number;
};

export const proposedLoadedMrr: ProposedMrr = {
  scope: "portfolio-synth",
  activeLeaseCount: 36,
  knownMonthlyRentCents: 4_500_000,
  currency: "USD",
  unknownLeaseCount: 4,
};

export const proposedZeroMrr: ProposedMrr = {
  scope: "portfolio-synth",
  activeLeaseCount: 0,
  knownMonthlyRentCents: 0,
  currency: "USD",
  unknownLeaseCount: 0,
};

export const proposedUnknownMrr: ProposedMrr = {
  scope: "portfolio-synth",
  activeLeaseCount: 5,
  knownMonthlyRentCents: 0,
  currency: "USD",
  unknownLeaseCount: 5,
};

/** Long synthetic content for layout stress. No real names, addresses or records. */
export const longContentLabel =
  "Synthetic long property label for visual review only — not a real address or record — repeated for stress testing layout density without personal data. Synthetic long property label for visual review only.";

export const longContentDocket = "2026-CV-SYNTHETIC-LONG-DOCKET-NUMBER-FOR-LAYOUT-REVIEW-ONLY-001";
