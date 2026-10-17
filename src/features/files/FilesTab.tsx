import React, { useEffect, useMemo, useState } from "react";
import { sessionFetchJSON, useSessionEpoch } from "@/lib/sessionScope";
import { errorKind } from "@/lib/dataState";
import StateNotice from "@/components/ui/StateNotice";
import { parseFileList, type ListedFile } from "./fileReader";

type Props = { doorloop: boolean; dropbox: boolean; entity: "properties" | "units" | "leases" | "tenants" | "owners"; refId: string | number };
type Result = { key: string; state: "ready"; files: ListedFile[] } | { key: string; state: "error" | "denied" };

export default function FilesTab({ doorloop, dropbox, entity, refId }: Props) {
  const [tab, setTab] = useState<"dl" | "dbx">(doorloop ? "dl" : "dbx");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const epoch = useSessionEpoch();
  const enabled = tab === "dl" ? doorloop : dropbox;
  const key = JSON.stringify([entity, refId, tab, epoch, attempt, enabled]);
  useEffect(() => { setQuery(""); }, [entity, refId, tab, epoch]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ table: entity, ref_id: String(refId) });
    const source = tab === "dl" ? "doorloop" : "dropbox";
    void sessionFetchJSON<unknown>(`/api/files/${source}/list?${params}`, { signal: controller.signal })
      .then(payload => parseFileList(payload, tab === "dl" ? "DL" : "DBX"))
      .then(files => { if (!controller.signal.aborted) setResult({ key, state: "ready", files }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, state: errorKind(error) }); });
    return () => controller.abort();
  }, [key]);
  const current = result?.key === key ? result : null;
  const files = useMemo(() => current?.state === "ready"
    ? current.files.filter(f => f.name.toLowerCase().includes(query.trim().toLowerCase())) : [], [current, query]);

  return (
    <section className="card" aria-label="Record files">
      <div className="card-head"><h2 className="ecc-section-title">Files</h2>
        <div className="ecc-tabs" role="group" aria-label="File source">
          <button type="button" className="ecc-tab ecc-touch" aria-pressed={tab === "dl"} disabled={!doorloop} onClick={() => setTab("dl")}>DoorLoop</button>
          <button type="button" className="ecc-tab ecc-touch" aria-pressed={tab === "dbx"} disabled={!dropbox} onClick={() => setTab("dbx")}>Dropbox</button>
        </div>
      </div>
      {!enabled ? <StateNotice kind="partial" title="This file source is not connected." detail="No file list has been confirmed." />
        : !current ? <StateNotice kind="loading" title="Loading files..." />
        : current.state !== "ready" ? <StateNotice kind={current.state} title={current.state === "denied" ? "You don't have access to these files." : "Files could not be loaded."}
            detail="No file list is shown. Try again." onRetry={() => setAttempt(n => n + 1)} />
        : <>
          <div className="filter"><label>Search files<input className="input ecc-touch" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
          {files.length === 0 ? <StateNotice kind="empty" title={query.trim() ? "No files match this search." : "No files were returned for this record."} />
            : files.map((file, i) => <div className="ecc-file-row" key={file.id ?? `${file.name}-${i}`}>
                <div><div>{file.name}</div><small>{file.source}{file.modified ? ` · ${new Date(file.modified).toLocaleDateString()}` : ""}</small></div>
                {file.url ? <a className="ecc-touch" href={file.url} target="_blank" rel="noopener noreferrer">Open</a> : <span>No link reported</span>}
              </div>)}
        </>}
    </section>
  );
}
