// src/shared/card-contracts.ts
import { z } from "zod";

export const Address = z.object({
  line1: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  zip: z.string().default(""),
});

export const PropertyCard = z.object({
  property: z.object({
    id: z.number(),
    name: z.string().optional().default(""),
    type: z.string().default("UNKNOWN"),
    address: Address,
  }),
  kpis: z.object({
    // Missing is unknown (null), not a confirmed zero. Wire shape is a superset: number | null | absent.
    // Counts are non-negative integers; cents are non-negative integers; occupancyPct is a percent
    // (server: round(activeLeases / units * 100), which is NOT capped at 100, so no upper bound here).
    units: z.number().int().min(0).nullable().default(null),
    activeLeases: z.number().int().min(0).nullable().default(null),
    occupancyPct: z.number().min(0).nullable().default(null),
    avgRentCents: z.number().int().min(0).nullable().default(null),
  }),
});
export type PropertyCardData = z.infer<typeof PropertyCard>;

export const UnitCard = z.object({
  unit: z.object({
    id: z.number(),
    unit_label: z.string().optional().default(""),
    status: z.string().optional().default("UNKNOWN"),
  }),
  property: z.object({ id: z.number() }).nullable().default(null),
  lease: z.object({ id: z.number(), status: z.string().default("UNKNOWN") }).nullable().default(null),
});

export const LeaseCard = z.object({
  lease: z.object({
    id: z.number(),
    status: z.string().default("UNKNOWN"),
    rent_cents: z.number().nullable().default(null),
  }),
  unit: z.object({ id: z.number() }).nullable().default(null),
  tenant: z.object({ id: z.number(), display_name: z.string().default("") }).nullable().default(null),
  property: z.object({ id: z.number() }).nullable().default(null),
});

export const OwnerCard = z.object({
  owner: z.object({
    id: z.number(),
    display_name: z.string().default(""),
  }),
  properties: z.array(z.object({ id: z.number(), name: z.string().default("") })).default([]),
});

export const TenantCard = z.object({
  tenant: z.object({
    id: z.number(),
    display_name: z.string().default(""),
  }),
  leases: z.array(z.object({ id: z.number(), status: z.string().default("UNKNOWN") })).default([]),
  activeLease: z.object({ id: z.number(), status: z.string().default("UNKNOWN") }).nullable().default(null),
});