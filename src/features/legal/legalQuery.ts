import { useQuery } from "@tanstack/react-query";
import { errorKind } from "@/lib/dataState";
import { HttpError } from "@/lib/http";
import { getSessionEpoch, StaleSessionError, useSessionEpoch } from "@/lib/sessionScope";
import { normalizeLegalState } from "./viewModel";
import type { LegalDashboardState, LegalMatterState } from "./types";
import type { LegalAdapter } from "./adapter";

const adapters = new WeakMap<LegalAdapter, number>();
let nextAdapter = 0;
export function legalAdapterKey(adapter: LegalAdapter): number {
  if (!adapters.has(adapter)) adapters.set(adapter, ++nextAdapter);
  return adapters.get(adapter)!;
}

// Uses the app's existing QueryCache: a denial from any domain purges legal rows too.
export function legalQueryOptions<T extends LegalDashboardState | LegalMatterState>(adapter: LegalAdapter, resource: string,
  epoch: number, context: string, read: (signal: AbortSignal) => Promise<T>) {
  return {
    queryKey: ["legal", epoch, context, legalAdapterKey(adapter), resource],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const result = await read(signal);
      if (epoch !== getSessionEpoch()) throw new StaleSessionError();
      if (result.kind === "denied") throw new HttpError("HTTP 403", 403);
      const clean = normalizeLegalState(result);
      if (clean.kind === "ready" && "matter" in clean && resource.startsWith("matter:") && clean.matter.matter.id !== resource.slice(7)) return { kind: "conflict" as const };
      return clean;
    },
    retry: false as const, staleTime: 0, gcTime: 0,
  };
}

export function useLegalRead<T extends LegalDashboardState | LegalMatterState>(adapter: LegalAdapter, resource: string,
  read: (signal: AbortSignal) => Promise<T>, context = "default") {
  const epoch = useSessionEpoch();
  const query = useQuery(legalQueryOptions(adapter, resource, epoch, context, read));
  const state = query.isError
    ? errorKind(query.error) === "denied" ? { kind: "denied" as const } : { kind: "error" as const, message: "Legal records could not be loaded." }
    : query.isFetching ? { kind: "loading" as const }
    : query.data ?? { kind: "cleared" as const };
  return { state, retry: () => { void query.refetch(); }, contextKey: `${epoch}:${context}:${legalAdapterKey(adapter)}` };
}
