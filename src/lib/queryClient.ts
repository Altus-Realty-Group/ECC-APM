import { QueryCache, QueryClient } from "@tanstack/react-query";
import { errorKind, isContractError } from "@/lib/dataState";
import { purgeSensitiveCache, StaleSessionError } from "@/lib/sessionScope";

/**
 * Factory so tests can build an identical client. A 401/403 from any query purges every cached result:
 * access-controlled data must not outlive a denial.
 */
export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (errorKind(error) === "denied") purgeSensitiveCache(client, query);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        // One retry for transient failures only. Denials, contract violations and stale-session
        // responses cannot be fixed by retrying.
        retry: (failureCount: number, error: unknown) =>
          errorKind(error) === "denied" || isContractError(error) || error instanceof StaleSessionError
            ? false
            : failureCount < 1,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        // No placeholderData carry-over: showing entity A's cached data while entity B (or another
        // identity) loads is not acceptable for access-controlled data.
        throwOnError: false,
        networkMode: "online",
      },
    },
  });
  return client;
}

export const queryClient = createQueryClient();

// AbortError filtering is handled in main.tsx via global event listeners
// and in fetchJSON via never-resolving promise returns

/**
 * Generic API request helper for mutations
 */
export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}
