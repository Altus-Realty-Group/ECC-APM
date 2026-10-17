const BASE = import.meta.env.VITE_API_BASE || "";
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let json: any = null; 
  try { 
    json = JSON.parse(text); 
  } catch {}
  
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} :: ${text.slice(0,200)}`);
  }
  
  return json ?? {};
}

export async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, { headers: { "Accept":"application/json" }, ...init });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Safe fetch with default */
export async function tryJSON<T>(path: string, fallback: T): Promise<T> {
  try { return await getJSON<T>(path); } catch { return fallback; }
}

/** Collections */
export type Property = { id: string|number; name?: string; address1?: string; city?: string; state?: string; zip?: string; status?: string; };
export type Unit = { id: string|number; name?: string; bedrooms?: number; bathrooms?: number; sqft?: number; marketRent?: number; status?: string; propertyId?: string|number };
export type Lease = { id: string|number; unitId?: string|number; tenantName?: string; startDate?: string; endDate?: string; status?: string; };
export type Tenant = { id: string|number; name?: string; email?: string; phone?: string; status?: string; };
export type Owner = { id: string|number; name?: string; email?: string; phone?: string; holdings?: number; };

export const PortfolioAPI = {
  properties: () => getJSON<Property[]>("/portfolio/properties"),
  units:       () => getJSON<Unit[]>("/portfolio/units"),
  leases:      () => getJSON<Lease[]>("/portfolio/leases"),
  tenants:     () => getJSON<Tenant[]>("/portfolio/tenants"),
  owners:      () => getJSON<Owner[]>("/portfolio/owners"),
};

export type BadgeCounts = { workOrdersOpen?: number; collectionsOpen?: number; inventoryLow?: number; };

export async function fetchBadgeCounts(): Promise<BadgeCounts> {
  // A missing/failed reader is unknown, not a confirmed zero.
  const paths = ["/ops/work/work-orders/count", "/ops/accounting/collections/open-count", "/ops/work/inventory/low-count"];
  const counts = await Promise.all(paths.map(async (path) => {
    try {
      const count: unknown = await getJSON<unknown>(path);
      return typeof count === "number" && Number.isSafeInteger(count) && count >= 0 ? count : undefined;
    } catch { return undefined; }
  }));
  return { workOrdersOpen: counts[0], collectionsOpen: counts[1], inventoryLow: counts[2] };
}

/** Entity fetcher with fallback for both path param and query param patterns */
export async function fetchEntity(entityPlural: string, id: string) {
  const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
  
  // Azure Functions structure: /api/entities/{type}/{id?}
  const tryUrls = [
    `${base}/entities/${entityPlural}/${id}`,
    `${base}/entities/${entityPlural}?id=${encodeURIComponent(id)}`
  ];
  
  let lastErr: any;
  for (const url of tryUrls) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const json = await r.json();
        
        // Azure Functions returns entity directly, not wrapped in {item: data}
        // Handle both formats for compatibility
        if (json?.item) {
          return json.item; // Current Express format
        }
        return json; // Azure Functions format
      }
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Failed to fetch entity");
}
