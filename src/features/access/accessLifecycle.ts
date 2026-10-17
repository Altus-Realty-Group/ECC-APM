import { suspendAccessReads } from "@/lib/accessState";
import { SESSION_BOUNDARY_EVENT } from "@/lib/sessionScope";

export const ACCESS_CLEAR_KEY = "ecc.session.cleared";
type Notice = { type: "clear"; id: string };
type Bus = { postMessage: (value: Notice) => void; close: () => void; onmessage: ((event: { data: unknown }) => void) | null };
let broadcast: ((notice: Notice) => void) | null = null;

/** Token-free cross-tab invalidation; receiving a notice can only remove access. */
export function installAccessLifecycle(target: Window = window, makeBus: (() => Bus) | undefined = typeof BroadcastChannel === "undefined" ? undefined : () => new BroadcastChannel("ecc-access")) {
  let last = "";
  const receive = (notice: unknown) => {
    if (!notice || typeof notice !== "object") return;
    const value = notice as Partial<Notice>;
    if (value.type !== "clear" || typeof value.id !== "string" || value.id.length > 100 || value.id === last) return;
    last = value.id;
    suspendAccessReads();
    target.dispatchEvent(new Event(SESSION_BOUNDARY_EVENT));
  };
  let bus: Bus | undefined;
  try { bus = makeBus?.(); if (bus) bus.onmessage = event => receive(event.data); } catch { /* storage fallback below */ }
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACCESS_CLEAR_KEY && event.newValue) receive({ type: "clear", id: event.newValue });
  };
  target.addEventListener("storage", onStorage);
  const send = (notice: Notice) => {
    receive(notice);
    try { bus?.postMessage(notice); } catch { /* storage fallback */ }
    try { target.localStorage.setItem(ACCESS_CLEAR_KEY, notice.id); } catch { /* in-memory channel may still be active */ }
  };
  broadcast = send;
  return () => { target.removeEventListener("storage", onStorage); bus?.close(); if (broadcast === send) broadcast = null; };
}

export function clearAccessAcrossTabs() {
  const notice: Notice = { type: "clear", id: crypto.randomUUID() };
  if (broadcast) broadcast(notice);
  else { suspendAccessReads(); window.dispatchEvent(new Event(SESSION_BOUNDARY_EVENT)); }
}
