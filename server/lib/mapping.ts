// server/lib/mapping.ts
export type AddrSrc = {
  // Canonical columns (preferred)
  address_street1?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  // Legacy aliases (fallback only when canonical absent)
  street_1?: string | null;
  address1?: string | null;
  address_line1?: string | null;
  line1?: string | null;
  property_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  zipcode?: string | null;
};

function available(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null; // malformed: do not coerce
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Canonical-first address mapping.
 * A present canonical field is never replaced by a conflicting legacy alias.
 * Explicit null/empty canonical is treated as unavailable; legacy is used only when the canonical key is absent.
 */
export function mapAddress(src: AddrSrc | null | undefined) {
  if (!src || typeof src !== "object") {
    return { street1: null, city: null, state: null, zip: null };
  }
  const s = src as Record<string, unknown>;

  const street1 =
    "address_street1" in s
      ? available(s.address_street1)
      : available(s.street_1 ?? s.address1 ?? s.address_line1 ?? s.line1 ?? s.property_address);

  const city =
    "address_city" in s ? available(s.address_city) : available(s.city);

  const state =
    "address_state" in s ? available(s.address_state) : available(s.state);

  const zip =
    "address_zip" in s ? available(s.address_zip) : available(s.zip ?? s.zipcode);

  return { street1, city, state, zip };
}

export function pickId<T extends { id?: any; doorloop_id?: any }>(row: T) {
  return row?.id ?? null;
}

// Build a dual-key predicate for Supabase .or()
export function orByPropIdOrDoorLoop(propertyId?: number | null, doorloopId?: number | string | null) {
  const pid = propertyId != null ? `property_id.eq.${propertyId}` : '';
  const did = doorloopId != null ? `doorloop_property_id.eq.${doorloopId}` : '';
  const parts = [pid, did].filter(Boolean);
  if (!parts.length) return 'id.lt.0'; // impossible, returns empty set
  return parts.join(',');
}

export function normalizeStatus(s?: string | null) {
  if (!s) return null;
  const k = String(s).toLowerCase().trim();
  if (["active","current","occupied"].includes(k)) return "active";
  if (["pending","future"].includes(k)) return "pending";
  if (["ended","terminated","closed","past","inactive","cancelled","canceled"].includes(k)) return "ended";
  return k;
}
