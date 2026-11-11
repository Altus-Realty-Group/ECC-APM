import React, { useId, useRef, useState } from "react";
import { Link } from "wouter";
import StateNotice from "@/components/ui/StateNotice";
import type { LegalMatter } from "../types";
import "./legal.css";

const TABS = ["overview", "timeline", "documents", "judgment", "tasks", "correspondence", "court", "packet", "audit"] as const;
type Tab = (typeof TABS)[number];
type Props = { matter: LegalMatter | null; invalid?: boolean; stale?: boolean };
const readable = (s: string) => s.replace(/-/g, " ");

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
  const recordedAmount = matter.awardCents === null ? "Not reported"
    : `${matter.awardCents.toLocaleString("en-US")} cents (currency not supplied)`;
  return <div className="ecc-legal">
    <Link href="/ops/legal/case-manager" className="ecc-btn ecc-touch">Back to legal matters</Link>
    {stale ? <StateNotice kind="stale" title="Legal matter may be out of date." /> : null}
    <header className="ecc-legal-header">
      <p className="ecc-legal-eyebrow">Matter / {matter.id}</p>
      <h1>{matter.caption}</h1>
      <p>{readable(matter.matterType)} · {readable(matter.lifecycle)}</p>
    </header>
    <dl className="ecc-legal-facts">
      <div><dt>Judgment verification</dt><dd>{matter.awardVerified ? "Verified award" : "Not verified"} · {readable(matter.verification)}</dd></div>
      <div><dt>Collection readiness</dt><dd>{readable(matter.readiness)}</dd></div>
      <div><dt>Evidence confidence</dt><dd>{readable(matter.evidenceConfidence)}</dd></div>
      <div><dt>Next action</dt><dd>{matter.nextAction ?? "Not reported"}</dd></div>
    </dl>
    <div className="ecc-legal-tabs" role="tablist" aria-label="Matter sections">
      {TABS.map((id, index) => <button key={id} ref={el => { buttons.current[index] = el; }}
        type="button" role="tab" id={`${prefix}-${id}`} aria-controls={`${prefix}-panel`}
        aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className="ecc-btn ecc-touch"
        onKeyDown={event => move(event, index)} onClick={() => setTab(id)}>{id[0].toUpperCase() + id.slice(1)}</button>)}
    </div>
    <section className="ecc-legal-panel" role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-${tab}`} tabIndex={0}>
      {tab === "overview" ? <><h2>Matter overview</h2><dl className="ecc-legal-facts">
        <div><dt>Court</dt><dd>{matter.court ?? "Not reported"}</dd></div>
        <div><dt>Creditor</dt><dd>{matter.creditor ?? "Not reported"}</dd></div>
        <div><dt>Source as of</dt><dd>{matter.sourceAsOf ?? "Not reported"}</dd></div>
      </dl></> : tab === "judgment" ? <><h2>Judgment review</h2>
        <p>Recorded award amount: {recordedAmount}.</p>
        <p>{matter.awardVerified ? "Award verification is reported. Collection balance is not supplied." : "Unverified claims are not receivables."}</p>
        <p className="ecc-legal-note">An award identity is counted once, regardless of the number of obligors. No collection balance is calculated here.</p>
      </> : <><h2>{tab[0].toUpperCase() + tab.slice(1)}</h2>
        <StateNotice kind="partial" title="This section is not available yet." detail="No accepted source supplies these records. Nothing has been inferred." /></>}
    </section>
  </div>;
}
