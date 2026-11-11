// Synthetic isolated browser proof, never imported by the operating app.
import "../../../src/styles/index.css";
import "../../../src/styles/workspace.css";
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "../../../src/components/Sidebar";
import WorkspaceBar from "../../../src/components/layout/WorkspaceBar";
import CardShell from "../../../src/components/cardkit/CardShell";
import OwnerFiles from "../../../src/pages/card/owner/Files";
import PropertyFiles from "../../../src/pages/card/property/Files";
import { createQueryClient } from "../../../src/lib/queryClient";
import { handleSessionBoundary } from "../../../src/lib/sessionScope";
import { HttpError } from "../../../src/lib/http";
import type { DocumentAdapter } from "../../../src/features/documents/documentAdapter";
const client = createQueryClient();
const agreement = { id: "synthetic-agreement", versionId: "v1", section: "management-contracts", association: "direct", delivery: "verified",
  name: "SYNTHETIC management agreement " + "LongFilename".repeat(9) + ".pdf" };
function Fixture() {
  const [mode, setMode] = useState("ready");
  const [record, setRecord] = useState<"owner" | "property">("owner");
  const adapter = useMemo<DocumentAdapter>(() => ({
    read: async context => {
      if (mode === "loading") return new Promise(() => {});
      if (mode === "error") throw new Error("Synthetic reader failure");
      if (!["ready", "empty"].includes(mode)) return { kind: mode };
      return { kind: "ready", context, documents: mode === "empty" ? [] : context.kind === "owner" ? [agreement,
        { ...agreement, id: "synthetic-statement", name: "SYNTHETIC owner statement.pdf", section: "statements-reports", delivery: "pending" }]
        : [{ ...agreement, association: "linked-owner" }, { ...agreement, id: "synthetic-lease", name: "SYNTHETIC lease.pdf", section: "tenant-documents" }] };
    },
    download: async (_context, documentId, versionId) => ({ kind: "ready", documentId, versionId,
      file: new Blob(["SYNTHETIC DOWNLOAD ONLY"], { type: "application/pdf" }) }),
  }), [mode]);
  return <QueryClientProvider client={client}>
    <aside aria-label="Synthetic proof controls" style={{ padding: 12, color: "white" }}>
      <strong>SYNTHETIC FIXTURE / NO LIVE DATA</strong>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["ready", "empty", "unavailable", "denied", "missing", "stale", "conflict", "loading", "error"].map(value =>
          <button key={value} style={{ minHeight: 44 }} data-mode={value} onClick={() => setMode(value)}>{value}</button>)}
        <button style={{ minHeight: 44 }} data-mode="owner" onClick={() => setRecord("owner")}>Owner fixture</button>
        <button style={{ minHeight: 44 }} data-mode="property" onClick={() => setRecord("property")}>Property fixture</button>
        <button style={{ minHeight: 44 }} data-mode="session" onClick={() => handleSessionBoundary(client)}>Session boundary</button>
        <button style={{ minHeight: 44 }} data-mode="other-denial" onClick={() => {
          void client.fetchQuery({ queryKey: ["synthetic-denial"], retry: false, queryFn: async () => { throw new HttpError("denied", 403); } }).catch(() => {});
        }}>Other-domain denial</button>
      </div>
    </aside>
    <div id="ecc-app"><div className="ecc-shell"><Sidebar /><main id="main" className="ecc-main" tabIndex={-1}>
      <WorkspaceBar /><div className="ecc-workspace-content">
        <CardShell key={record} title={record === "owner" ? "SYNTHETIC ownership card" : "SYNTHETIC property card"}
          tabs={[{ id: "files", title: "Files", element: record === "owner" ? <OwnerFiles data={{ owner: { id: 17 } }} adapter={adapter} />
            : <PropertyFiles data={{ property: { id: 42 } }} adapter={adapter} /> }]} />
      </div></main></div></div>
  </QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
