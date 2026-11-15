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

// ---- Unit / lease field delivery (ECC-R02) -----------------------------------------------------------------------------
// The server producer (server/routes/rpc.ts get_unit_card / get_lease_card) names some fields differently from the
// canonical card shape that pages read: unit `label` (canonical `unit_label`), lease `rentCents` (canonical `rent_cents`)
// and lease `start` / `end` (canonical `start_date` / `end_date`). Each pair below is an explicit, versioned alias for
// exactly one canonical field. Either spelling may arrive alone; if both are present they must agree (explicit unknown versus a
// known value conflicts, see `reconcile`), otherwise the whole card is a contract error (never a silent winner). Unknown keys are still stripped: there is no passthrough and no raw spread.
// Messages name fields only and never echo a value.
/**
 * Presence-aware reconciliation of two spellings of one field. Each spelling is in exactly one state:
 * ABSENT (key missing or undefined), UNKNOWN (explicit null, or "" which is the producer's spelling of no value) or KNOWN.
 * - ABSENT + anything: the supplied spelling stands (an absent alias may fall back).
 * - UNKNOWN + UNKNOWN: unknown. KNOWN + equal KNOWN: that value (a recorded 0 is KNOWN).
 * - UNKNOWN vs KNOWN, in either order, or two different KNOWN values: contract error. An explicit "no value" is never
 *   silently overridden by the other spelling, and a known value is never silently dropped.
 * Returns null for unknown, absent-on-both-sides and conflict (the conflict also records an issue).
 */
function reconcile<T>(ctx: z.core.$RefinementCtx<any>, field: string, canonical: T | null | "" | undefined, alias: T | null | "" | undefined): T | null {
  const unknown = (v: unknown) => v === null || v === "";
  if (canonical === undefined) return unknown(alias) || alias === undefined ? null : (alias as T);
  if (alias === undefined) return unknown(canonical) ? null : (canonical as T);
  if (unknown(canonical) && unknown(alias)) return null;
  if (!unknown(canonical) && !unknown(alias) && canonical === alias) return canonical as T;
  ctx.issues.push({ code: "custom", message: `${field}: accepted spellings disagree`, input: undefined });
  return null;
}

/** Exact calendar date `YYYY-MM-DD` (leap years honoured). No time, offset or locale text: a business date is never shifted by a time zone. */
export function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(2000, mo - 1, d));
  probe.setUTCFullYear(y); // Date.UTC maps years 0..99 to 19xx, so set the year separately
  return mo >= 1 && mo <= 12 && probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

// Money is integer cents, never negative. Absent or null is UNKNOWN (null); a recorded 0 stays 0.
const wireCents = z.number().int().min(0).nullable().optional();
// Dates: a calendar date, or "" / null / absent which all mean unknown (null).
const wireDate = z.union([z.literal(""), z.string().refine(isCalendarDate, "not a calendar date (YYYY-MM-DD)"), z.null()]).optional();

const UnitIdentity = z
  .object({
    id: z.number(),
    unit_label: z.string().optional(),
    label: z.string().optional(), // producer spelling
    status: z.string().optional().default("UNKNOWN"),
  })
  .transform((u, ctx) => ({
    id: u.id,
    unit_label: reconcile(ctx, "unit label", u.unit_label, u.label) ?? "",
    status: u.status,
  }));

const LeaseRef = z
  .object({
    id: z.number(),
    status: z.string().default("UNKNOWN"),
    rent_cents: wireCents,
    rentCents: wireCents, // producer spelling
  })
  .transform((l, ctx) => ({
    id: l.id,
    status: l.status,
    rent_cents: reconcile(ctx, "rent cents", l.rent_cents, l.rentCents),
  }));

export const UnitCard = z.object({
  unit: UnitIdentity,
  property: z.object({ id: z.number() }).nullable().default(null),
  lease: LeaseRef.nullable().default(null),
});

const LeaseTerms = z
  .object({
    id: z.number(),
    status: z.string().default("UNKNOWN"),
    rent_cents: wireCents,
    rentCents: wireCents, // producer spelling
    start_date: wireDate,
    start: wireDate, // producer spelling
    end_date: wireDate,
    end: wireDate, // producer spelling
  })
  .transform((l, ctx) => ({
    id: l.id,
    status: l.status,
    rent_cents: reconcile(ctx, "rent cents", l.rent_cents, l.rentCents),
    start_date: reconcile(ctx, "lease start", l.start_date, l.start),
    end_date: reconcile(ctx, "lease end", l.end_date, l.end),
  }));

export const LeaseCard = z.object({
  lease: LeaseTerms,
  unit: z.object({ id: z.number(), label: z.string().default("") }).nullable().default(null),
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