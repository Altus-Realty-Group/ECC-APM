import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import StateNotice from "@/components/ui/StateNotice";
import { ContractError } from "@/lib/dataState";
import { HttpError } from "@/lib/http";
import { getSessionEpoch, StaleSessionError } from "@/lib/sessionScope";
import { UNBOUND_DOCUMENT_ADAPTER, type DocumentAdapter } from "./documentAdapter";
import { documentAdapterKey, useDocuments } from "./documentQuery";
import { OWNER_SECTIONS, sectionsFor, validContext, type DocumentContext, type DocumentRead, type RecordDocument } from "./documentModel";
import "./documents.css";

function DownloadButton({ document, context, adapter }: { document: RecordDocument; context: DocumentContext; adapter: DocumentAdapter }) {
  const client = useQueryClient();
  const [status, setStatus] = useState("idle");
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const epoch = getSessionEpoch();
  async function download() {
    setStatus("loading");
    try {
      const result = await client.fetchQuery({
        queryKey: ["document-download", epoch, documentAdapterKey(adapter), context.kind, context.id, document.id, document.versionId],
        gcTime: 0, staleTime: 0, retry: false,
        queryFn: async ({ signal }) => {
          const raw = await adapter.download(context, document.id, document.versionId, signal) as any;
          if (epoch !== getSessionEpoch()) throw new StaleSessionError();
          if (raw?.kind === "denied") throw new HttpError("HTTP 403", 403);
          if (raw?.kind !== "ready") return null;
          if (raw.documentId !== document.id || raw.versionId !== document.versionId || !(raw.file instanceof Blob))
            throw new ContractError("Document download could not be trusted");
          return raw.file as Blob;
        },
      });
      if (!live.current || epoch !== getSessionEpoch()) return;
      if (!result) { setStatus("unavailable"); return; }
      const href = URL.createObjectURL(result);
      const link = window.document.createElement("a");
      link.href = href; link.download = document.name; link.click();
      setTimeout(() => URL.revokeObjectURL(href), 0);
      setStatus("idle");
    } catch {
      if (live.current && epoch === getSessionEpoch()) setStatus("error");
    }
  }
  const verified = document.delivery === "verified";
  return <div className="ecc-docs__download">
    <button type="button" className="ecc-btn ecc-touch" disabled={!verified || status === "loading"} onClick={download}>
      {status === "loading" ? "Preparing..." : "Download"}
    </button>
    {status === "unavailable" || status === "error" ? <small role="status">Download unavailable. Try again.</small> : null}
  </div>;
}

function DocumentContents({ state, context, adapter, retry }: {
  state: DocumentRead | { kind: "loading" | "error" | "cleared" }; context: DocumentContext; adapter: DocumentAdapter; retry: () => void;
}) {
  const [section, setSection] = useState("all");
  const [search, setSearch] = useState("");
  const owner = context.kind === "owner";
  const sections = sectionsFor(context.kind);
  const documents = state.kind === "ready" ? state.documents : [];
  const filtered = documents.filter(d => (section === "all" || (section === "linked" ? d.association === "linked-owner" : d.section === section && d.association === "direct"))
    && d.name.toLowerCase().includes(search.trim().toLowerCase()));
  const notices = {
    loading: ["loading", "Loading documents..."],
    unavailable: ["partial", "Document storage is not connected yet."],
    denied: ["denied", "You don't have access to these documents."],
    missing: ["empty", "This document record was not found."],
    stale: ["stale", "Documents need a fresh verification."],
    conflict: ["error", "Document records need reconciliation."],
    error: ["error", "Documents could not be loaded."],
    cleared: ["stale", "Documents were cleared after an access change."],
  } as const;
  return <section className="ecc-docs" aria-label={owner ? "Ownership documents" : "Property documents"}>
    <header className="ecc-docs__header"><div>
      <h2>{owner ? "Ownership Documents" : "Property Documents"}</h2>
      <p>{owner ? "Contracts, ownership records, statements and correspondence." : "The same five folders used in Assets Under Management."}</p>
    </div></header>
    <div className="ecc-docs__layout">
      <nav className="ecc-docs__folders" aria-label="Document folders">
        {[{ id: "all", label: "All documents" }, ...sections, ...(!owner ? [{ id: "linked", label: "Linked ownership documents" }] : [])].map(folder =>
          <button key={folder.id} type="button" aria-pressed={section === folder.id} className="ecc-touch"
            onClick={() => setSection(folder.id)}>{folder.label}</button>)}
      </nav>
      <div className="ecc-docs__content">
        {state.kind !== "ready" ? <StateNotice kind={notices[state.kind][0]} title={notices[state.kind][1]}
          detail={state.kind === "unavailable" ? "Folders may be ready in Dropbox. Their authorized file reader still needs to be connected." : undefined}
          onRetry={state.kind === "error" || state.kind === "stale" || state.kind === "cleared" ? retry : undefined} /> : <>
          <div className="ecc-docs__tools"><label>Search documents<input className="input ecc-touch" type="search" value={search}
            onChange={e => setSearch(e.target.value)} /></label><button className="ecc-btn ecc-touch" onClick={retry}>Refresh</button></div>
          <p className="ecc-docs__count">{filtered.length} {filtered.length === 1 ? "document" : "documents"} shown</p>
          {filtered.length === 0 ? <StateNotice kind="empty" title={search ? "No documents match this search." : "No documents were returned for this folder."} /> :
            <ul className="ecc-docs__list">{filtered.map(document => <li key={`${document.id}:${document.versionId}:${document.delivery}`}>
              <div className="ecc-docs__name"><strong>{document.name}</strong><small>
                {[...sections, ...OWNER_SECTIONS].find(s => s.id === document.section)?.label}
                {document.association === "linked-owner" ? " - Linked from ownership" : ""}
              </small><span>{document.delivery === "verified" ? "Delivery verified" : document.delivery === "pending" ? "Delivery pending" : document.delivery === "failed" ? "Delivery failed" : "Verification required"}</span></div>
              <DownloadButton document={document} context={context} adapter={adapter} />
            </li>)}</ul>}
        </>}
      </div>
    </div>
  </section>;
}

function BoundDocuments({ context, adapter }: { context: DocumentContext; adapter: DocumentAdapter }) {
  const { state, retry, contextKey } = useDocuments(adapter, context);
  return <DocumentContents key={contextKey} state={state} context={context} adapter={adapter} retry={retry} />;
}
export default function RecordDocuments({ context, adapter = UNBOUND_DOCUMENT_ADAPTER }: { context: DocumentContext; adapter?: DocumentAdapter }) {
  if (!validContext(context)) return <StateNotice kind="error" title="This document link is not valid." />;
  return <BoundDocuments context={context} adapter={adapter} />;
}
