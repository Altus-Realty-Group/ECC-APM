import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import StateNotice from "@/components/ui/StateNotice";
import type { LegalAdapter } from "../adapter";
import type { LegalDashboardState, LegalMatter } from "../types";

type Props = { adapter: LegalAdapter };

export default function LegalCommandView({ adapter }: Props) {
  const [state, setState] = useState<LegalDashboardState>({ kind: "loading" });
  const [q, setQ] = useState("");
  const epoch = useRef(0);

  const load = () => {
    const current = ++epoch.current;
    setState({ kind: "loading" });
    void adapter.load().then((next) => {
      if (current !== epoch.current) return;
      setState(next);
    }).catch(() => {
      if (current !== epoch.current) return;
      setState({ kind: "error", message: "Legal matters could not be loaded." });
    });
  };

  useEffect(() => { load(); return () => { epoch.current++; }; }, [adapter]);

  if (state.kind === "loading") return <div className="ecc-legal"><StateNotice kind="loading" title="Loading legal matters…" /></div>;
  if (state.kind === "unavailable") return <div className="ecc-legal"><StateNotice kind="empty" title="Legal workspace is not available." detail={state.reason} /></div>;
  if (state.kind === "denied") return <div className="ecc-legal"><StateNotice kind="denied" title="You don't have access to legal matters." /></div>;
  if (state.kind === "error") return <div className="ecc-legal"><StateNotice kind="error" title={state.message} onRetry={load} /></div>;
  if (state.kind === "empty" || state.matters.length === 0) return <div className="ecc-legal"><StateNotice kind="empty" title="No legal matters are available." /></div>;

  const needle = q.trim().toLowerCase();
  const visible = state.matters.filter((m) => !needle || [m.caption, m.matterType, m.lifecycle].join(" ").toLowerCase().includes(needle));
  const verified = state.matters.filter((m) => m.awardVerified).length;

  return (
    <div className="ecc-legal">
      {state.stale ? <StateNotice kind="stale" title="Legal list may be out of date." /> : null}
      <header className="ecc-legal-header">
        <h1>Legal command</h1>
        <p className="ecc-legal-note">Verified awards: {verified}. Unverified claims are not receivables. Joint awards are counted once.</p>
      </header>
      <label className="ecc-legal-search">Search matters
        <input aria-label="Search legal matters" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caption, type or lifecycle" />
      </label>
      <p className="ecc-legal-note">{visible.length} matching of {state.matters.length} loaded matters.</p>
      <ul className="ecc-legal-list">
        {visible.map((m) => (
          <li key={m.id}>
            <Link href={`/ops/legal/matters/${m.id}`} className="ecc-btn ecc-touch ecc-legal-row">
              <span>{m.caption}</span>
              <span>{m.lifecycle}</span>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p className="ecc-legal-note">No matters match the search.</p> : null}
    </div>
  );
}
