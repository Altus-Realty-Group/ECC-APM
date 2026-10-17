// Narrow portfolio truth helpers. Source shapes from server/mappings.ts (LeaseOut/TenantOut/OwnerOut).
// Zero is preserved. Null/missing is not coerced. Negative/non-finite rent rejected.
// Metrics are loaded-result statistics only.

export function knownRentDollars(lease: {
  rent?: unknown;
  rent_cents?: unknown;
}): number | null {
  // Prefer documented LeaseOut.rent (dollars). Fall back only if rent_cents is explicitly present and finite.
  const candidates: unknown[] = [lease.rent];
  if (lease.rent_cents !== undefined) candidates.push(typeof lease.rent_cents === "number" ? lease.rent_cents / 100 : null);
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  }
  return null;
}

export type RentSummary = {
  total: number | null;
  partial: boolean;
  knownCount: number;
  activeCount: number;
  loadedOnly: true;
};

/** Aggregate only known non-negative rents on explicitly active loaded rows. Partial = missing among those. */
export function summarizeActiveRent(
  rows: Array<{ status?: string | null; rent: number | null }>
): RentSummary {
  const active = rows.filter((r) => String(r.status ?? "").toLowerCase() === "active");
  const known = active.filter((r) => r.rent !== null && Number.isFinite(r.rent) && (r.rent as number) >= 0);
  if (known.length === 0) {
    return {
      total: null,
      partial: active.length > 0,
      knownCount: 0,
      activeCount: active.length,
      loadedOnly: true,
    };
  }
  const total = known.reduce((sum, r) => sum + (r.rent as number), 0);
  return {
    total,
    partial: known.length < active.length,
    knownCount: known.length,
    activeCount: active.length,
    loadedOnly: true,
  };
}

/** Status is reported only when the source provides it. Never invent "Current". */
export function reportedStatus(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/** Safe card path only for non-blank IDs that can form a route. Invalid IDs stay readable but unlinked. */
export function safeCardHref(kind: "lease" | "tenant" | "owner", id: unknown): string | undefined {
  if (id === null || id === undefined) return undefined;
  const s = String(id).trim();
  if (!s || s === "—" || s === "null" || s === "undefined") return undefined;
  return `/card/${kind}/${encodeURIComponent(s)}`;
}

export function joinTenants(tenants: unknown): string {
  if (Array.isArray(tenants)) {
    const names = tenants.map((t) => String(t ?? "").trim()).filter(Boolean);
    return names.length ? names.join(", ") : "";
  }
  if (typeof tenants === "string") return tenants.trim();
  return "";
}
