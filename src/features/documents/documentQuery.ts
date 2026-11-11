import { useQuery } from "@tanstack/react-query";
import { errorKind } from "@/lib/dataState";
import { HttpError } from "@/lib/http";
import { getSessionEpoch, StaleSessionError, useSessionEpoch } from "@/lib/sessionScope";
import type { DocumentAdapter } from "./documentAdapter";
import { parseDocumentRead, type DocumentContext } from "./documentModel";

const adapters = new WeakMap<DocumentAdapter, number>();
let next = 0;
export function documentAdapterKey(adapter: DocumentAdapter): number {
  if (!adapters.has(adapter)) adapters.set(adapter, ++next);
  return adapters.get(adapter)!;
}
export function documentQueryOptions(adapter: DocumentAdapter, context: DocumentContext, epoch: number) {
  return {
    queryKey: ["documents", epoch, documentAdapterKey(adapter), context.kind, context.id],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const raw = await adapter.read(context, signal);
      if (epoch !== getSessionEpoch()) throw new StaleSessionError();
      const result = parseDocumentRead(raw, context);
      if (result.kind === "denied") throw new HttpError("HTTP 403", 403);
      return result;
    },
    retry: false as const, staleTime: 0, gcTime: 0,
  };
}
export function useDocuments(adapter: DocumentAdapter, context: DocumentContext) {
  const epoch = useSessionEpoch();
  const query = useQuery(documentQueryOptions(adapter, context, epoch));
  const state = query.isError ? { kind: errorKind(query.error) === "denied" ? "denied" as const : "error" as const }
    : query.isFetching ? { kind: "loading" as const }
    : query.data ?? { kind: "cleared" as const };
  return { state, retry: () => { void query.refetch(); }, contextKey: `${epoch}:${documentAdapterKey(adapter)}:${context.kind}:${context.id}` };
}
