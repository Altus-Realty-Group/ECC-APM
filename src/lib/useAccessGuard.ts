import { useEffect } from "react";
import { errorKind } from "@/lib/dataState";
import { useSessionEpoch } from "@/lib/sessionScope";

/**
 * Hide cached data once access has been denied. TanStack keeps `data` after a failed refetch; for
 * access-controlled records that retained data must not be rendered, summarized or selectable.
 */
export function accessGuard<T>(q: { data: T | undefined; isError: boolean; error: unknown }): { data: T | undefined; denied: boolean } {
  const denied = q.isError && errorKind(q.error) === "denied";
  return { data: denied ? undefined : q.data, denied };
}

/** Run `reset` (e.g. clear selected row ids) when access is denied or the session boundary moves. */
export function useResetOnAccessLoss(denied: boolean, reset: () => void): number {
  const epoch = useSessionEpoch();
  useEffect(() => {
    if (denied) reset();
  }, [denied]);
  useEffect(() => {
    reset();
  }, [epoch]);
  return epoch;
}
