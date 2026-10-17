// Narrow portfolio truth helpers. Database/API first; no invented values.
// Zero is preserved. Null/missing is not coerced to zero or a default status.

export function knownRentDollars(lease: {
  rent?: unknown;
  rent_cents?: unknown;
}): number | null {
  if (typeof lease.rent === "number" && Number.isFinite(lease.rent)) return lease.rent;
  if (typeof lease.rent_cents === "number" && Number.isFinite(lease.rent_cents)) {
    return lease.rent_cents / 100;
  }
  return null;
}

export type RentSummary = {
  total: number | null;
  partial: boolean;
  knownCount: number;
  activeCount: number;
};

/** Aggregate only known rents on active leases. Partial means some active rents are missing. */
export function summarizeActiveRent(
  rows: Array<{ status?: string | null; rent: number | null }>
): RentSummary {
  const active = rows.filter((r) => String(r.status ?? "").toLowerCase() === "active");
  const known = active.filter((r) => r.rent !== null && Number.isFinite(r.rent));
  if (known.length === 0) {
    return {
      total: null,
      partial: active.length > 0,
      knownCount: 0,
      activeCount: active.length,
    };
  }
  const total = known.reduce((sum, r) => sum + (r.rent as number), 0);
  return {
    total,
    partial: known.length < active.length,
    knownCount: known.length,
    activeCount: active.length,
  };
}

/** Status is reported only when the source provides it. Never invent "Current". */
export function reportedStatus(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}
