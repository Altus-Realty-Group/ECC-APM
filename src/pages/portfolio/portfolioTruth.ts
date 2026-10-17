// Narrow portfolio truth helpers. Source shapes from server/mappings.ts (LeaseOut/TenantOut/OwnerOut).
// Zero is preserved. Null/missing is not coerced. Negative/non-finite rent rejected.
// Metrics are loaded-result statistics only.
// Card links follow the existing positive-safe-integer policy (RelatedRecord / operationsContracts).

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
  unclassifiedCount: number;
  loadedOnly: true;
};

// Existing source classification: server/lib/mapping.ts normalizeStatus maps these
// values to ended. Keep other non-active values uncertain; do not invent activity
// from a reported string or broaden the explicitly-active rent calculation.
const ENDED_LEASE_STATUSES = new Set([
  "ended", "terminated", "closed", "past", "inactive", "cancelled", "canceled",
]);

/**
 * Aggregate only known non-negative rents on explicitly active loaded rows.
 * Missing or unclassified status makes the result uncertain/partial.
 * Do not assume unclassified leases are active or inactive.
 */
export function summarizeActiveRent(
  rows: Array<{ status?: unknown; rent: number | null }>
): RentSummary {
  const classified = rows.map((row) => ({
    row,
    status: reportedStatus(row.status)?.toLowerCase() ?? "",
  }));
  const active = classified.filter(({ status }) => status === "active").map(({ row }) => row);
  const unclassified = classified.filter(({ status }) =>
    status !== "active" && !ENDED_LEASE_STATUSES.has(status)
  );
  const known = active.filter((r) => r.rent !== null && Number.isFinite(r.rent) && (r.rent as number) >= 0);
  const partial =
    known.length < active.length || unclassified.length > 0;

  if (known.length === 0) {
    return {
      total: null,
      partial,
      knownCount: 0,
      activeCount: active.length,
      unclassifiedCount: unclassified.length,
      loadedOnly: true,
    };
  }
  const total = known.reduce((sum, r) => sum + (r.rent as number), 0);
  return {
    total,
    partial,
    knownCount: known.length,
    activeCount: active.length,
    unclassifiedCount: unclassified.length,
    loadedOnly: true,
  };
}

/** Status is reported only when the source provides it. Never invent "Current". */
export function reportedStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length > 0 ? s : null;
}

/**
 * Safe card path only for positive safe integers.
 * Matches RelatedRecord.relatedRecordPath and operationsContracts parseIdValue policy.
 * Invalid IDs (0, negative, non-integer, non-numeric) stay readable but unlinked.
 */
export function safeCardHref(kind: "lease" | "tenant" | "owner", id: unknown): string | undefined {
  if (id === null || id === undefined) return undefined;
  let n: number;
  if (typeof id === "number") {
    n = id;
  } else if (typeof id === "string") {
    const s = id.trim();
    if (!/^\d+$/.test(s)) return undefined;
    n = Number(s);
  } else {
    return undefined;
  }
  if (!Number.isSafeInteger(n) || n <= 0) return undefined;
  return `/card/${kind}/${n}`;
}

export function joinTenants(tenants: unknown): string {
  if (Array.isArray(tenants)) {
    const names = tenants.map((t) => String(t ?? "").trim()).filter(Boolean);
    return names.length ? names.join(", ") : "";
  }
  if (typeof tenants === "string") return tenants.trim();
  return "";
}
