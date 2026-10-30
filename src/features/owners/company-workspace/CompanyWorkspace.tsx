import React, { useEffect, useRef, useState } from "react";
import StateNotice from "@/components/ui/StateNotice";
import type { CompanyMembership, CompanyWorkspaceState } from "./types";
import type { CompanyWorkspaceAdapter } from "./adapter";
import { selectCompany } from "./adapter";
import "./company-workspace.css";

type Props = {
  adapter: CompanyWorkspaceAdapter;
};

export default function CompanyWorkspace({ adapter }: Props) {
  const [state, setState] = useState<CompanyWorkspaceState>({ kind: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const epoch = useRef(0);

  const load = () => {
    const current = ++epoch.current;
    const controller = new AbortController();
    setState({ kind: "loading" });
    setSelectedId(null);
    void adapter.load(controller.signal).then((next) => {
      if (current !== epoch.current) return;
      setState(next);
      if (next.kind === "ready") {
        const { selected, denied } = selectCompany(next.memberships, next.selectedId ?? "");
        setSelectedId(denied ? null : selected?.companyId ?? null);
      }
    }).catch(() => {
      if (current !== epoch.current) return;
      setState({ kind: "error", message: "Company workspace could not be loaded." });
    });
    return controller;
  };

  useEffect(() => {
    const controller = load();
    return () => { controller.abort(); epoch.current++; };
  }, [adapter]);

  const onSelect = (id: string) => {
    if (state.kind !== "ready") return;
    const { denied } = selectCompany(state.memberships, id);
    if (denied) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
  };

  if (state.kind === "loading") {
    return <div className="ecc-company-workspace"><StateNotice kind="loading" title="Loading companies…" /></div>;
  }
  if (state.kind === "unavailable") {
    return (
      <div className="ecc-company-workspace">
        <StateNotice kind="empty" title="Company workspace is not available." detail={state.reason} />
      </div>
    );
  }
  if (state.kind === "denied") {
    return (
      <div className="ecc-company-workspace">
        <StateNotice kind="denied" title="You don't have access to any company workspace." />
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="ecc-company-workspace">
        <StateNotice kind="error" title={state.message} onRetry={load} />
      </div>
    );
  }
  if (state.kind === "empty" || state.memberships.length === 0) {
    return (
      <div className="ecc-company-workspace">
        <StateNotice kind="empty" title="No companies are available." />
      </div>
    );
  }

  const selected = selectedId ? selectCompany(state.memberships, selectedId).selected : null;

  return (
    <div className="ecc-company-workspace">
      {state.stale ? <StateNotice kind="stale" title="Company list may be out of date." /> : null}
      {state.partial ? <StateNotice kind="partial" title="Some company details are incomplete." /> : null}
      <h1 className="ecc-company-title">Your companies</h1>
      <ul className="ecc-company-list" role="list">
        {state.memberships.map((m) => (
          <li key={m.companyId}>
            <button
              type="button"
              className="ecc-btn ecc-touch ecc-company-row"
              aria-pressed={selectedId === m.companyId}
              disabled={m.role === "denied"}
              onClick={() => onSelect(m.companyId)}
            >
              <span>{m.companyName}</span>
              <span className="ecc-company-role">{m.role}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <section className="ecc-company-context" aria-labelledby="company-context-title">
          <h2 id="company-context-title">{selected.companyName}</h2>
          <p>Role: {selected.role}</p>
          <p>Member administration: {selected.canManageMembers ? "granted" : "not granted"}</p>
          <p>Financial approval: {selected.canApproveFinancial ? "granted" : "not granted"}</p>
          <p>Banking: {selected.canChangeBanking ? "granted" : "not granted"}</p>
          {selected.role === "primary" && !selected.canManageMembers ? (
            <p className="ecc-company-note">Primary contact alone does not grant member administration, financial approval, or banking power.</p>
          ) : null}
        </section>
      ) : (
        <p className="ecc-company-note">Select a company you can access.</p>
      )}
    </div>
  );
}
