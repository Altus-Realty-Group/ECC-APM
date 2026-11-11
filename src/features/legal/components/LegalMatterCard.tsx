import React, { useState } from "react";
import { Link } from "wouter";
import type { LegalMatter } from "../types";
import "./legal.css";

const TABS = ["overview", "timeline", "documents", "judgment", "tasks", "correspondence", "court", "packet", "audit"] as const;

type Props = { matter: LegalMatter | null; invalid?: boolean };

export default function LegalMatterCard({ matter, invalid }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  if (invalid || !matter) {
    return (
      <div className="ecc-legal">
        <h1>Legal matter</h1>
        <p>That matter link is not valid.</p>
        <Link href="/ops/legal/case-manager" className="ecc-btn ecc-touch">Back to legal matters</Link>
      </div>
    );
  }
  return (
    <div className="ecc-legal">
      <Link href="/ops/legal/case-manager" className="ecc-btn ecc-touch">Back to legal matters</Link>
      <h1>{matter.caption}</h1>
      <p className="ecc-legal-note">{matter.matterType} · {matter.lifecycle} · {matter.verification}</p>
      <p className="ecc-legal-note">Award: {matter.awardVerified ? "verified" : "Not verified / Not reported"}. Joint awards counted once.</p>
      <div role="tablist" aria-label="Matter sections">
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} className="ecc-btn ecc-touch" onClick={() => setTab(id)}>{id}</button>
        ))}
      </div>
      <section role="tabpanel">
        {tab === "overview" && <p>Next action: {matter.nextAction ?? "Not reported"}</p>}
        {tab === "judgment" && <p>Verified award balance is not reported. Unverified claims are not receivables.</p>}
        {tab !== "overview" && tab !== "judgment" && <p>This section is not available until a legal producer is bound.</p>}
      </section>
    </div>
  );
}
