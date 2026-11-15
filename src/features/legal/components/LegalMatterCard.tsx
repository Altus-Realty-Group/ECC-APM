import React, { useId, useRef, useState } from "react";
import { Link } from "wouter";
import StateNotice from "@/components/ui/StateNotice";
import type { LegalMatter } from "../types";
import "./legal.css";
import { matterTitle, readable, queues } from "../viewModel";

const TABS = ["overview", "timeline", "documents", "judgment", "tasks", "correspondence", "court", "packet", "audit"] as const;
type Tab = (typeof TABS)[number];
type Props = { matter: LegalMatter | null; invalid?: boolean; stale?: boolean };


export default function LegalMatterCard({ matter, invalid, stale }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const prefix = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  if (invalid || !matter) return <div className="ecc-legal">
    <h1>Legal matter</h1><p>That matter link is not valid.</p>
    <Link href="/ops/legal/case-manager" className="ecc-btn ecc-touch">Back to legal matters</Link>
  </div>;
  const move = (event: React.KeyboardEvent, index: number) => {
    const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1
      : event.key === "ArrowRight" ? (index + 1) % TABS.length
      : event.key === "ArrowLeft" ? (index + TABS.length - 1) % TABS.length : null;
    if (next === null) return;
    event.preventDefault(); setTab(TABS[next]); buttons.current[next]?.focus();
  };
  const workflow = matter, root = matter.matter, requirements = queues(workflow);
  const amountText = (a: LegalMatter["awards"][number]) => a.amount === null ? "Unknown amount"
    : `${a.amount.currency} ${Math.floor(a.amount.cents / 100).toLocaleString("en-US")}.${String(a.amount.cents % 100).padStart(2, "0")}`;
  return <div className="ecc-legal">
    <Link href="/ops/legal/case-manager" className="ecc-btn ecc-touch">Back to legal matters</Link>
    {stale ? <StateNotice kind="stale" title="Legal matter may be out of date." /> : null}
    <header className="ecc-legal-header">
      <p className="ecc-legal-eyebrow">Matter / {root.id}</p>
      <h1>{matterTitle(workflow)}</h1>
      <p>{readable(root.caseType)} · {readable(root.lifecycle)}</p>
    </header>
    <dl className="ecc-legal-facts">
      <div><dt>Awards</dt><dd>{workflow.awards.length} distinct award identities</dd></div>
      <div><dt>Open requirements</dt><dd>{requirements.counts.open} open · {requirements.counts.assigned} assigned · {requirements.counts.unassigned} unassigned</dd></div>
    </dl>
    <div className="ecc-legal-tabs" role="tablist" aria-label="Matter sections">
      {TABS.map((id, index) => <button key={id} ref={el => { buttons.current[index] = el; }}
        type="button" role="tab" id={`${prefix}-${id}`} aria-controls={`${prefix}-panel`}
        aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className="ecc-btn ecc-touch"
        onKeyDown={event => move(event, index)} onClick={() => setTab(id)}>{id[0].toUpperCase() + id.slice(1)}</button>)}
    </div>
    <section className="ecc-legal-panel" role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-${tab}`} tabIndex={0}>
      {tab === "overview" ? <><h2>Matter overview</h2><dl className="ecc-legal-facts">
        <div><dt>Court reference</dt><dd>{root.courtRef ?? "Not reported"}</dd></div>
        <div><dt>Docket number</dt><dd>{root.docketNumber ?? "Not reported"}</dd></div>
        <div><dt>Record revision</dt><dd>{root.revision}</dd></div>
      </dl></> : tab === "judgment" ? <><h2>Judgment review</h2>
        {workflow.awards.length === 0 ? <p>No awards reported.</p> : workflow.awards.map(a => <article className="ecc-legal-award" key={a.id}>
          <h3>{readable(a.kind)} · {a.id}</h3><p>Recorded award amount: {amountText(a)}</p>
          <dl className="ecc-legal-facts"><div><dt>Judgment verification</dt><dd>{readable(a.judgmentVerification)}</dd></div>
            <div><dt>Collection readiness</dt><dd>{readable(a.collectionReadiness)}</dd></div>
            <div><dt>Obligors</dt><dd>{a.obligors.length} linked parties · award counted once</dd></div></dl>
        </article>)}
        <p className="ecc-legal-note">Unverified claims are not receivables. Readiness is not collection approval. Reconciled balances and eligibility are unavailable until an accepted ledger source is connected.</p>
      </> : tab === "tasks" ? <><h2>Open requirements</h2>
        {requirements.open.length === 0 ? <p>No open requirements reported.</p> : <ul>{requirements.open.map(r => <li key={r.id}><strong>{r.description}</strong><p>Assigned actor: {r.assignedActor ?? "Unassigned"} · Source date: {r.sourceDate ?? "Unknown"}</p></li>)}</ul>}
      </> : tab === "court" || tab === "timeline" ? <><h2>Court events</h2>
        <p className="ecc-legal-note">Dates are source dates. No deadline is calculated.</p>
        {workflow.courtEvents.length === 0 ? <p>No court events reported.</p> : <ul>{workflow.courtEvents.map(e => <li key={e.id}><strong>{e.date ?? "Date unknown"}</strong><p>Source: {e.source ?? "Not reported"} · Responsible actor: {e.responsibleActor ?? "Unassigned"}</p></li>)}</ul>}
      </> : tab === "documents" ? <><h2>Public evidence references</h2>
        {workflow.evidence.length === 0 ? <p>No public evidence references reported.</p> : <ul>{workflow.evidence.map(e => <li key={e.id}>{e.filename ?? "Unnamed evidence"} · Confidence: {e.confidence}</li>)}</ul>}
        <p className="ecc-legal-note">Document delivery is unavailable until matter-to-document authorization and verified versions are connected.</p>
      </> : <><h2>{tab[0].toUpperCase() + tab.slice(1)}</h2>
        <StateNotice kind="partial" title="This section is not available yet." detail="No accepted source supplies these records. Nothing has been inferred." /></>}

    </section>
  </div>;
}
