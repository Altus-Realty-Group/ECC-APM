// Identity scoping for cached, access-controlled data.
//
// This frontend has no authentication transport of its own, and none is invented here. What it can do
// honestly is:
//  1. treat any 401/403 as authoritative: purge every cached query result so previously authorized
//     figures, details and rows cannot outlive the denial;
//  2. expose ONE supported boundary signal (SESSION_BOUNDARY_EVENT) that whatever owns sign-in/out or
//     account switching can dispatch; it bumps the session epoch, cancels in-flight requests and purges
//     the cache;
//  3. reject any response that was requested under an earlier epoch (late prior-identity responses).
import { useSyncExternalStore } from "react";
import type { Query, QueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/http";

/** Dispatch on `window` when the signed-in identity/session changes or ends. */
export const SESSION_BOUNDARY_EVENT = "ecc:session-boundary";

let epoch = 0;
const listeners = new Set<() => void>();

export const getSessionEpoch = () => epoch;

export function subscribeSessionEpoch(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders when the session boundary moves; use as a React `key` to drop component-local state. */
export function useSessionEpoch(): number {
  return useSyncExternalStore(subscribeSessionEpoch, getSessionEpoch, getSessionEpoch);
}

/** A response belonging to a session that has since ended. Never shown, never cached. */
export class StaleSessionError extends Error {
  constructor() {
    super("Response belongs to a previous session");
    this.name = "StaleSessionError";
  }
}

/**
 * fetchJSON that refuses to deliver (or surface an error for) a request started under an earlier epoch.
 * Without this, a slow response for the previous account could land after the boundary.
 */
export async function sessionFetchJSON<T>(input: RequestInfo, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const startedUnder = epoch;
  try {
    const result = await fetchJSON<T>(input, init);
    if (startedUnder !== epoch) throw new StaleSessionError();
    return result;
  } catch (err) {
    if (startedUnder !== epoch) throw new StaleSessionError();
    throw err;
  }
}

/** Reset every cached query result except `keep` (the query that just reported the denial). */
export function purgeSensitiveCache(client: QueryClient, keep?: Query<any, any, any, any>): void {
  for (const q of client.getQueryCache().getAll()) {
    if (q === keep) continue;
    q.reset();
  }
  if (keep) keep.setState({ data: undefined, dataUpdatedAt: 0 });
}

/** End of session / account change: new epoch, cancel in-flight work, purge everything. */
export function handleSessionBoundary(client: QueryClient): void {
  epoch += 1;
  void client.cancelQueries();
  purgeSensitiveCache(client);
  listeners.forEach((l) => l());
  // Mounted pages reload under the new session; nothing from the old one is reused.
  void client.refetchQueries({ type: "active" });
}

/** Wire the supported boundary event to a client. Returns a cleanup function. */
export function installSessionBoundary(client: QueryClient, target: Pick<Window, "addEventListener" | "removeEventListener"> = window): () => void {
  const onBoundary = () => handleSessionBoundary(client);
  target.addEventListener(SESSION_BOUNDARY_EVENT, onBoundary);
  return () => target.removeEventListener(SESSION_BOUNDARY_EVENT, onBoundary);
}

/** Test seam only. */
export function __resetSessionEpochForTests(): void {
  epoch = 0;
  listeners.clear();
}
