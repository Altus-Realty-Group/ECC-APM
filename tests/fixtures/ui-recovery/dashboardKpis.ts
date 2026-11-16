/**
 * SYNTHETIC REVIEW FIXTURE — NOT OPERATING DATA.
 * Reuses the accepted frontend DashboardKpis contract exactly.
 * Never imported by production adapters or operating readers.
 */
import type { DashboardKpis } from "../../../src/features/dashboard/kpiAdapter.ts";

export const populatedDashboardKpis: DashboardKpis = {
  propertiesTotal: 12,
  unitsTotal: 48,
  occupancyRate: 0.75,
  revenue30dCents: 12_500_000,
  series: [
    { date: "2026-10-01", occupancy: 0.72 },
    { date: "2026-10-15", occupancy: 0.74 },
    { date: "2026-11-01", occupancy: 0.75 },
  ],
  lastUpdated: "2026-11-15T16:00:00.000Z",
  lastUpdatedProblem: null,
};

/** Zero counts and money; occupancyRate is null because zero units cannot establish 0% occupancy. */
export const zeroDashboardKpis: DashboardKpis = {
  propertiesTotal: 0,
  unitsTotal: 0,
  occupancyRate: null,
  revenue30dCents: 0,
  series: [],
  lastUpdated: "2026-11-15T16:00:00.000Z",
  lastUpdatedProblem: null,
};

export const unknownDashboardKpis: DashboardKpis = {
  propertiesTotal: null,
  unitsTotal: null,
  occupancyRate: null,
  revenue30dCents: null,
  series: [],
  lastUpdated: null,
  lastUpdatedProblem: null,
};

/** Partial known values; not a disconnected/error outcome. */
export const partialDataDashboardKpis: DashboardKpis = {
  propertiesTotal: 5,
  unitsTotal: null,
  occupancyRate: null,
  revenue30dCents: 500_000,
  series: [],
  lastUpdated: null,
  lastUpdatedProblem: null,
};

/** Disconnected/error: no known operating values. */
export const disconnectedDashboardKpis: DashboardKpis = {
  propertiesTotal: null,
  unitsTotal: null,
  occupancyRate: null,
  revenue30dCents: null,
  series: [],
  lastUpdated: null,
  lastUpdatedProblem: null,
};

/** Long synthetic labels are not part of the KPI type; see proposedPresentation for stress strings. */
export const longContentDashboardKpis: DashboardKpis = {
  propertiesTotal: 1,
  unitsTotal: 1,
  occupancyRate: 1,
  revenue30dCents: 100,
  series: [{ date: "2026-11-15", occupancy: 1 }],
  lastUpdated: "2026-11-15T16:00:00.000Z",
  lastUpdatedProblem: null,
};
