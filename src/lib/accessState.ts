import { useSyncExternalStore } from "react";
type AccessState = { mode: "unknown" | "canonical" | "read-only"; suspended: boolean };
let state: AccessState = { mode: "unknown", suspended: false };
const listeners = new Set<() => void>();
export const getAccessState = () => state;
export function subscribeAccess(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
function update(next: AccessState) {
  if (next.mode === state.mode && next.suspended === state.suspended) return;
  state = next; listeners.forEach(listener => listener());
}
export function recordAccessMode(value: string | null) {
  if (!state.suspended && (value === "canonical" || value === "read-only")) update({ ...state, mode: value });
}
export function suspendAccessReads() { update({ mode: "unknown", suspended: true }); }
export function clearAccessMode() { update({ ...state, mode: "unknown" }); }
export function useAccessState() { return useSyncExternalStore(subscribeAccess, getAccessState, getAccessState); }
export function __resetAccessForTests() { state = { mode: "unknown", suspended: false }; }
