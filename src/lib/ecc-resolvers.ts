import { useQuery } from "@tanstack/react-query";
import { PropertyCard, UnitCard, LeaseCard, TenantCard, OwnerCard } from "@/shared/card-contracts";
import { sessionFetchJSON } from "@/lib/sessionScope";
import { ContractError } from "@/lib/dataState";
import type { ZodType } from "zod";

// Fail-fast: any invalid contract throws a ContractError and surfaces to UI as an error state.
function parseContract<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new ContractError(`Response does not match the card contract: ${r.error.message.slice(0, 300)}`);
  return r.data;
}
export function usePropertyCard(id: number) {
  return useQuery({
    queryKey: ["card","property", id],
    queryFn: ({ signal }) => sessionFetchJSON(`/api/rpc/get_property_card?id=${id}`, { signal }).then(data => parseContract(PropertyCard, data)),
  });
}
export function useUnitCard(id: number) {
  return useQuery({
    queryKey: ["card","unit", id],
    queryFn: ({ signal }) => sessionFetchJSON(`/api/rpc/get_unit_card?id=${id}`, { signal }).then(data => parseContract(UnitCard, data)),
  });
}
export function useLeaseCard(id: number) {
  return useQuery({
    queryKey: ["card","lease", id],
    queryFn: ({ signal }) => sessionFetchJSON(`/api/rpc/get_lease_card?id=${id}`, { signal }).then(data => parseContract(LeaseCard, data)),
  });
}
export function useTenantCard(id: number) {
  return useQuery({
    queryKey: ["card","tenant", id],
    queryFn: ({ signal }) => sessionFetchJSON(`/api/rpc/get_tenant_card?id=${id}`, { signal }).then(data => parseContract(TenantCard, data)),
  });
}
export function useOwnerCard(id: number) {
  return useQuery({
    queryKey: ["card","owner", id],
    queryFn: ({ signal }) => sessionFetchJSON(`/api/rpc/get_owner_card?id=${id}`, { signal }).then(data => parseContract(OwnerCard, data)),
  });
}

/* --------- Collection hooks (for portfolio pages) --------- */
/**
 * Collections arrive as a raw array (documented contract) or a { data: [...] } envelope
 * (what some handlers emit). Accept both; anything else is a contract error, not an empty list.
 */
export function toRows(raw: unknown): any[] {
  const inner = raw && typeof raw === "object" ? (raw as { data?: unknown }).data : undefined;
  const rows = Array.isArray(raw) ? raw : inner;
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new ContractError("Unexpected collection response shape");
  }
  return rows;
}

export function useAllProperties() {
  return useQuery({
    queryKey: ["portfolio","properties"],
    queryFn: ({ signal }) => sessionFetchJSON("/api/portfolio/properties", { signal }).then(toRows),
  });
}
export function useAllUnits() {
  return useQuery({
    queryKey: ["portfolio","units"],
    queryFn: ({ signal }) => sessionFetchJSON("/api/portfolio/units", { signal }).then(toRows)
  });
}
export function useAllLeases() {
  return useQuery({
    queryKey: ["portfolio","leases"],
    queryFn: ({ signal }) => sessionFetchJSON("/api/portfolio/leases", { signal }).then(toRows)
  });
}
export function useAllTenants() {
  return useQuery({
    queryKey: ["portfolio","tenants"],
    queryFn: ({ signal }) => sessionFetchJSON("/api/portfolio/tenants", { signal }).then(toRows)
  });
}
export function useAllOwners() {
  return useQuery({
    queryKey: ["portfolio","owners"],
    queryFn: ({ signal }) => sessionFetchJSON("/api/portfolio/owners", { signal }).then(toRows)
  });
}