import { useQuery, useMutation } from '@tanstack/react-query';
import { Entities, Owners } from "./ecc-api";
import { sessionFetchJSON, useSessionEpoch } from "./sessionScope";
import { ContractError } from "./dataState";

/** Existing entity envelopes and owner-search results; malformed success is never empty. */
export function dataHubRows(value: unknown): Record<string, unknown>[] {
  const envelope = value && typeof value === "object" ? value as Record<string, unknown> : null;
  const rows = Array.isArray(value) ? value : envelope
    ? ("data" in envelope ? envelope.data : envelope.results) : undefined;
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new ContractError("Invalid record collection");
  }
  return rows;
}

/* --------- Collection hooks (for portfolio pages) --------- */
export function useAllProperties() {
  return useQuery({ 
    queryKey:["properties-all"], 
    queryFn:()=>Entities.properties({select:'*'})
  });
}
export function useAllUnits() {
  return useQuery({ 
    queryKey:["units-all"], 
    queryFn:()=>Entities.units({select:'*'})
  });
}
export function useAllLeases() {
  return useQuery({ 
    queryKey:["leases-all"], 
    queryFn:()=>Entities.leases({select:'*'})
  });
}
export function useAllTenants() {
  return useQuery({ 
    queryKey:["tenants-all"], 
    queryFn:()=>Entities.tenants({select:'*'})
  });
}
export function useAllOwners() {
  return useQuery({ 
    queryKey:["owners-all"], 
    queryFn:()=>Entities.owners({select:'*'})
  });
}

/* --------- DataHub hooks --------- */
export function useDataHubEntities(entity: "owners" | "tenants" | "leases" | "units" | "properties", params: { order?: string, limit?: number, select?: string }) {
  const epoch = useSessionEpoch();
  return useQuery({
    queryKey: ["datahub", epoch, entity, params],
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) if (value != null) query.set(key, String(value));
      return dataHubRows(await sessionFetchJSON(`/api/entities/${entity}?${query}`, { signal }));
    }
  });
}

export function useDataHubOwnersSearch(searchQ: string) {
  const epoch = useSessionEpoch();
  return useQuery({
    queryKey: ["datahub", epoch, "owners-search", searchQ],
    queryFn: async ({ signal }) => dataHubRows(await sessionFetchJSON(`/api/owners/search?q=${encodeURIComponent(searchQ)}`, { signal })),
    enabled: !!searchQ
  });
}

export function useDataHubOwnerTransferContext(sourceOwnerId: string) {
  return useQuery({
    queryKey: ["datahub", "owner-transfer-context", sourceOwnerId],
    queryFn: () => Owners.transferContext(sourceOwnerId),
    enabled: !!sourceOwnerId
  });
}

export function useDataHubOwnerTransferMutations() {
  const initiateMutation = useMutation({
    mutationFn: () => Owners.initiateTransfer(),
  });

  const approveMutation = useMutation({
    mutationFn: (transferId: string) => Owners.approve(transferId),
  });

  const authorizeMutation = useMutation({
    mutationFn: (transferId: string) => Owners.authorize(transferId),
  });

  const executeMutation = useMutation({
    mutationFn: (transferId: string) => Owners.execute(transferId),
  });

  return {
    initiate: initiateMutation,
    approve: approveMutation,
    authorize: authorizeMutation,
    execute: executeMutation,
  };
}