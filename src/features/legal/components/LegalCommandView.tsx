import React, { useState } from "react";
import { Link } from "wouter";
import StateNotice from "@/components/ui/StateNotice";

import type { LegalAdapter } from "../adapter";
import type { LegalMatter } from "../types";
import { useLegalRead } from "../legalQuery";
import "./legal.css";
import { matterTitle, readable, queues } from "../viewModel";

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
  if (state.kind === "conflict") return <LegalNotice kind="error" title="Legal records conflict. Review is required." />;
  if (state.kind === "stale") return <LegalNotice kind="stale" title="Legal records are out of date. Reload before review." onRetry={retry} />;
  if (state.kind === "missing") return <LegalNotice kind="empty" title="Legal register was not found." />;
  if (state.kind === "empty" || state.matters.length === 0) return <LegalNotice kind="empty" title="No legal matters are available." />;

  return <LegalRegister key={contextKey} matters={state.matters} stale={state.stale} />;
}

function LegalRegister({ matters, stale }: { matters: LegalMatter[]; stale?: boolean }) {
  const [q, setQ] = useState("");
  const [queue, setQueue] = useState<"all" | "open" | "assigned" | "unassigned">("all");
  const needle = q.trim().toLowerCase();
  const visible = matters.filter(p => queue === "all" || queues(p)[queue].length > 0)
    .filter(p => !needle || [matterTitle(p), p.matter.caseType, p.matter.lifecycle, p.matter.courtRef].join(" ").toLowerCase().includes(needle));
  const awards = matters.flatMap(p => p.awards);
  const verifiedAwards = awards.filter(a => a.judgmentVerification === "verified" && a.amount !== null).length;
  const unreportedAmounts = awards.filter(a => a.amount === null).length;

  return (
    <div className="ecc-legal">
      {stale ? <StateNotice kind="stale" title="Legal list may be out of date." /> : null}
      <header className="ecc-legal-header">
        <p className="ecc-legal-eyebrow">ECC / Legal operations</p>
        <h1>Legal command</h1>
        <p>Review matters, assemble evidence and keep the next action visible.</p>
        <div className="ecc-legal-metrics" aria-label="Loaded legal record summary">
          <div><span>Loaded matters</span><strong>{matters.length}</strong></div>
          <div><span>Verified monetary awards</span><strong>{verifiedAwards}</strong></div>
          <div><span>Awards with unknown amounts</span><strong>{unreportedAmounts}</strong></div>
        </div>
        <p className="ecc-legal-note">Counts cover loaded records only. Unverified claims are not receivables. Unknown is not zero.</p>
      </header>
      <div className="ecc-legal-queues" role="group" aria-label="Review queues">
        {([ ["all", "All loaded"], ["open", "Open requirements"], ["assigned", "Assigned"], ["unassigned", "Unassigned"] ] as const).map(([id, label]) =>
          <button key={id} type="button" className="ecc-btn ecc-touch" aria-pressed={queue === id} onClick={() => setQueue(id)}>{label}</button>)}
      </div>
      <label className="ecc-legal-search">Search matters
        <input aria-label="Search legal matters" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Docket, type, court or lifecycle" />
      </label>
      <p className="ecc-legal-note">{visible.length} matching of {matters.length} loaded matters.</p>
      <ul className="ecc-legal-list">
        {visible.map((m) => (
          <li key={m.matter.id}>
            <Link href={`/ops/legal/matters/${encodeURIComponent(m.matter.id)}`} className="ecc-btn ecc-touch ecc-legal-row">
              <span><strong>{matterTitle(m)}</strong><span className="ecc-legal-row-detail">{readable(m.matter.caseType)} · {m.matter.courtRef ?? "Court not reported"}</span>
                <span className="ecc-legal-row-detail">{queues(m).counts.open} open requirements · {queues(m).counts.unassigned} unassigned</span></span>
              <span className="ecc-legal-badge">{readable(m.matter.lifecycle)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p className="ecc-legal-note">No matters match the search or queue.</p> : null}
    </div>
  );
}
