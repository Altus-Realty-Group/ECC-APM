import React, { useState } from "react";
import { Link } from "wouter";
import StateNotice from "@/components/ui/StateNotice";

import type { LegalAdapter } from "../adapter";
import type { LegalMatter } from "../types";
import { useLegalRead } from "../legalQuery";
import "./legal.css";

function LegalNotice(props: React.ComponentProps<typeof StateNotice>) {
  return <div className="ecc-legal"><header className="ecc-legal-header"><p className="ecc-legal-eyebrow">ECC / Legal operations</p>
    <h1>Legal command</h1><p>Review matters, assemble evidence and keep the next action visible.</p></header>
    <div className="ecc-legal-panel"><StateNotice {...props} /></div></div>;
}

type Props = { adapter: LegalAdapter; sessionKey?: string };

export default function LegalCommandView({ adapter, sessionKey = "default" }: Props) {
  const { state, retry, contextKey } = useLegalRead(adapter, "register", signal => adapter.load(signal), sessionKey);
  if (state.kind === "loading") return <LegalNotice kind="loading" title="Loading legal matters…" />;
  if (state.kind === "unavailable") return <LegalNotice kind="empty" title="Legal workspace is not available." detail={state.reason} />;
  if (state.kind === "denied") return <LegalNotice kind="denied" title="You don't have access to legal matters." />;
  if (state.kind === "error") return <LegalNotice kind="error" title={state.message} onRetry={retry} />;
  if (state.kind === "cleared") return <LegalNotice kind="stale" title="Legal records were cleared after an access change." onRetry={retry} />;
  if (state.kind === "empty" || state.matters.length === 0) return <LegalNotice kind="empty" title="No legal matters are available." />;

  return <LegalRegister key={contextKey} matters={state.matters} stale={state.stale} />;
}

function LegalRegister({ matters, stale }: { matters: LegalMatter[]; stale?: boolean }) {
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState<"all" | "intake" | "attorney-review" | "missing-evidence">("all");
  const needle = q.trim().toLowerCase();
  const byQueue = matters.filter((m) => {
    if (queue === "intake") return m.lifecycle === "intake";
    if (queue === "attorney-review") return m.lifecycle === "attorney-review";
    if (queue === "missing-evidence") return m.readiness === "missing-evidence";
    return true;
  });
  const visible = byQueue.filter((m) => !needle || [m.caption, m.matterType, m.lifecycle].join(" ").toLowerCase().includes(needle));
  const verifiedAwards = new Set(matters.filter((m) => m.awardVerified && m.awardId).map((m) => m.awardId)).size;
  const unreportedAmounts = matters.filter((m) => m.awardCents === null).length;

  return (
    <div className="ecc-legal">
      {stale ? <StateNotice kind="stale" title="Legal list may be out of date." /> : null}
      <header className="ecc-legal-header">
        <p className="ecc-legal-eyebrow">ECC / Legal operations</p>
        <h1>Legal command</h1>
        <p>Review matters, assemble evidence and keep the next action visible.</p>
        <div className="ecc-legal-metrics" aria-label="Loaded legal record summary">
          <div><span>Loaded matters</span><strong>{matters.length}</strong></div>
          <div><span>Verified award identities</span><strong>{verifiedAwards}</strong></div>
          <div><span>Matters with unreported amounts</span><strong>{unreportedAmounts}</strong></div>
        </div>
        <p className="ecc-legal-note">Counts cover loaded records only. Unverified claims are not receivables. Unknown is not zero.</p>
      </header>
      <div className="ecc-legal-queues" role="group" aria-label="Review queues">
        <button type="button" className="ecc-btn ecc-touch" aria-pressed={queue === "all"} onClick={() => setQueue("all")}>All loaded</button>
        <button type="button" className="ecc-btn ecc-touch" aria-pressed={queue === "intake"} onClick={() => setQueue("intake")}>Intake</button>
        <button type="button" className="ecc-btn ecc-touch" aria-pressed={queue === "attorney-review"} onClick={() => setQueue("attorney-review")}>Attorney review</button>
        <button type="button" className="ecc-btn ecc-touch" aria-pressed={queue === "missing-evidence"} onClick={() => setQueue("missing-evidence")}>Missing evidence</button>
      </div>
      <label className="ecc-legal-search">Search matters
        <input aria-label="Search legal matters" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caption, type or lifecycle" />
      </label>
      <p className="ecc-legal-note">{visible.length} matching of {matters.length} loaded matters.</p>
      <ul className="ecc-legal-list">
        {visible.map((m) => (
          <li key={m.id}>
            <Link href={`/ops/legal/matters/${encodeURIComponent(m.id)}`} className="ecc-btn ecc-touch ecc-legal-row">
              <span><strong>{m.caption}</strong><span className="ecc-legal-row-detail">{m.matterType} · {m.court ?? "Court not reported"}</span>
                <span className="ecc-legal-row-detail">Next: {m.nextAction ?? "Not reported"}</span></span>
              <span className="ecc-legal-badge">{m.lifecycle.replace(/-/g, " ")}</span>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p className="ecc-legal-note">No matters match the search or queue.</p> : null}
    </div>
  );
}
