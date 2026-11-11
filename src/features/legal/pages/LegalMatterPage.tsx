import React from "react";
import { Link, useParams } from "wouter";
import StateNotice from "@/components/ui/StateNotice";
import { LEGAL_ADAPTER, type LegalAdapter } from "../adapter";
import { useLegalRead } from "../legalQuery";
import LegalMatterCard from "../components/LegalMatterCard";
import "../components/legal.css";

export function LegalMatterView({ id, adapter }: { id: string; adapter: LegalAdapter }) {
  const { state, retry, contextKey } = useLegalRead(adapter, `matter:${id}`, signal => adapter.getMatter(id, signal));
  if (state.kind === "ready") return <LegalMatterCard key={`${contextKey}:${id}`} matter={state.matter} stale={state.stale} />;
  return <div className="ecc-legal">
    <Link href="/ops/legal/case-manager" className="ecc-btn ecc-touch">Back to legal matters</Link>
    <h1>Legal matter</h1>
    {state.kind === "loading" ? <StateNotice kind="loading" title="Loading legal matter…" />
      : state.kind === "unavailable" ? <StateNotice kind="partial" title="Legal workspace is not available." detail={state.reason} />
      : state.kind === "denied" ? <StateNotice kind="denied" title="You don't have access to this legal matter." />
      : state.kind === "missing" ? <StateNotice kind="empty" title="Matter not found." detail="Check the link or return to the register." />
      : state.kind === "cleared" ? <StateNotice kind="stale" title="Legal records were cleared after an access change." onRetry={retry} />
      : <StateNotice kind="error" title={state.message} onRetry={retry} />}
  </div>;
}

export function LegalMatterRoute({ adapter }: { adapter: LegalAdapter }) {
  // Wouter owns path identity. Query-string ids never override the matched matter.
  const { id } = useParams<{ id: string }>();
  if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return <LegalMatterCard matter={null} invalid />;
  return <LegalMatterView key={id} id={id} adapter={adapter} />;
}

export default function LegalMatterPage() {
  return <LegalMatterRoute adapter={LEGAL_ADAPTER} />;
}
