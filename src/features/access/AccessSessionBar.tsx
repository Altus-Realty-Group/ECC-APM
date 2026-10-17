import React, { useState } from "react";
import { useAccessState } from "@/lib/accessState";
import { clearAccessAcrossTabs } from "./accessLifecycle";

export default function AccessSessionBar() {
  const access = useAccessState();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signOut() {
    if (pending) return;
    setPending(true); setFailed(false);
    // Prevent refetch and click-time exports before clearing caches or sending logout.
    clearAccessAcrossTabs();
    try {
      const response = await fetch("/api/access/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope: "application" }) });
      if (!response.ok || (await response.json()).signedOut !== true) setFailed(true);
    } catch { setFailed(true); }
    finally { setPending(false); }
  }
  if (access.mode === "unknown" && !pending && !failed) return null;
  return <section className="ecc-state" aria-label="Altus access" role={access.mode === "read-only" || failed ? "status" : undefined}>
    <div>{access.mode === "read-only" ? <strong>DEV BYPASS · READ ONLY</strong> : pending ? <span>Signing out...</span> : failed
      ? <span>Records were cleared here. Central sign-out could not be confirmed. Sign in again to continue.</span> : <span>Altus access confirmed</span>}</div>
    {failed ? <a className="ecc-btn ecc-touch" href="/api/access/sign-in">Sign in with Altus</a>
      : <button type="button" className="ecc-btn ecc-touch" disabled={pending} onClick={() => { void signOut(); }}>Sign out</button>}
  </section>;
}
