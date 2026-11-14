// Isolated synthetic proof entry. Never imported by the operating application.
import "../../../src/styles/index.css";
import "../../../src/styles/workspace.css";
import Sidebar from "../../../src/components/Sidebar";
import WorkspaceBar from "../../../src/components/layout/WorkspaceBar";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Switch } from "wouter";
import { createQueryClient } from "../../../src/lib/queryClient";
import { handleSessionBoundary } from "../../../src/lib/sessionScope";
import LegalCommandView from "../../../src/features/legal/components/LegalCommandView";
import { LegalMatterRoute } from "../../../src/features/legal/pages/LegalMatterPage";
import { fixtureLegalAdapter, SYNTHETIC_MATTERS } from "../../../src/features/legal/adapter";
import type { LegalDashboardState } from "../../../src/features/legal/types";
const client = createQueryClient();
const longCaption = "SYNTHETIC LONG CAPTION " + "UnbrokenFixtureCaption".repeat(12);
const zero = { ...SYNTHETIC_MATTERS[1], matter: { ...SYNTHETIC_MATTERS[1].matter, id: "zero" },
  requirements: [], awards: [{ ...SYNTHETIC_MATTERS[1].awards[0], id: "award-zero", matterId: "zero", amount: { cents: 0, currency: "USD" }, judgmentVerification: "verified" as const }] };
const matters = [
  { ...SYNTHETIC_MATTERS[0], matter: { ...SYNTHETIC_MATTERS[0].matter, docketNumber: longCaption },
    evidence: [{ id: "public-order", matterId: "m-001", filename: "Public synthetic order", url: null, confidence: "low" as const, restricted: false },
      { id: "private-order", matterId: "m-001", filename: "PRIVATE SYNTHETIC EVIDENCE", url: null, confidence: "high" as const, restricted: true }],
    courtEvents: [{ id: "source-event", matterId: "m-001", date: null, source: "Synthetic docket source", responsibleActor: null }] },
  zero,
  { ...zero, matter: { ...zero.matter, id: "joint", docketNumber: "SYNTHETIC JOINT PROJECTION" }, awards: [{ ...zero.awards[0], id: "award-joint", matterId: "joint", amount: null,
    obligors: [{ partyId: "p1", liability: "joint" as const }, { partyId: "p2", liability: "joint" as const }] }] },
];
function Fixture() {
  const [mode, setMode] = useState("ready");
  const adapter = useMemo(() => {
    const state: LegalDashboardState = mode === "ready" || mode === "stale" ? { kind: "ready", matters, stale: mode === "stale" }
      : mode === "error" ? { kind: "error", message: "Synthetic load failure" }
      : mode === "unavailable" ? { kind: "unavailable", reason: "No accepted producer" }
      : mode === "conflict" ? { kind: "conflict" }
      : mode === "loading" ? { kind: "loading" } : mode === "denied" ? { kind: "denied" } : { kind: "empty" };
    return fixtureLegalAdapter(state);
  }, [mode]);
  return <QueryClientProvider client={client}><aside aria-label="Synthetic proof controls" style={{ color: "white", padding: 12 }}>
    <strong>SYNTHETIC FIXTURE / NO LIVE DATA</strong><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {["ready", "stale", "empty", "unavailable", "error", "denied", "loading", "conflict"].map(value => <button key={value}
      style={{ minHeight: 44 }} onClick={() => setMode(value)} data-mode={value}>{value}</button>)}
    <button style={{ minHeight: 44 }} onClick={() => handleSessionBoundary(client)} data-mode="session">Session boundary</button>
    <button style={{ minHeight: 44 }} data-mode="other-denial" onClick={() => {
      void client.fetchQuery({ queryKey: ["synthetic-other-domain"], retry: false,
        queryFn: async () => { throw Object.assign(new Error("HTTP 403"), { status: 403 }); } }).catch(() => {});
    }}>Other-domain denial</button></div>
    <Link href="/ops/legal/case-manager">Register fixture</Link>
  </aside><div id="ecc-app"><div className="ecc-shell"><Sidebar /><main className="ecc-main" id="main" tabIndex={-1}>
    <WorkspaceBar /><div className="ecc-workspace-content"><Switch>
    <Route path="/ops/legal/matters/:id">{() => <LegalMatterRoute adapter={adapter} />}</Route>
    <Route><LegalCommandView adapter={adapter} /></Route>
  </Switch></div></main></div></div></QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
