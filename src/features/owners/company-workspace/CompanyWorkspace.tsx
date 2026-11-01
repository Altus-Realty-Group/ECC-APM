import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StateNotice from "@/components/ui/StateNotice";
import { getSessionEpoch, useSessionEpoch } from "@/lib/sessionScope";
import type { CompanyMembership, CompanyWorkspaceState, WorkspaceContext } from "./types";
import type { CompanyWorkspaceAdapter } from "./adapter";
import { selectCompany } from "./adapter";
import "./company-workspace.css";

type Props = {
  adapter: CompanyWorkspaceAdapter;
  /** Management customer. Distinct from personal session and owning company. */
  customerId?: string | null;
};

type Snapshot = {
  adapter: CompanyWorkspaceAdapter;
  context: WorkspaceContext;
  state: CompanyWorkspaceState;
  selectedId: string | null;
};

export default function CompanyWorkspace({ adapter, customerId = null }: Props) {
  const sessionEpoch = useSessionEpoch();
  const context = useMemo<WorkspaceContext>(() => ({ sessionEpoch, customerId }), [sessionEpoch, customerId]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const epoch = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  // Suppress old data during render, before the replacement effect can run.
  const currentSnapshot = snapshot?.adapter === adapter && snapshot.context === context ? snapshot : null;
  const state: CompanyWorkspaceState = currentSnapshot?.state ?? { kind: "loading" };
  const selectedId = currentSnapshot?.selectedId ?? null;

  const load = useCallback(() => {
    controllerRef.current?.abort();
    const current = ++epoch.current;
    if (getSessionEpoch() !== context.sessionEpoch) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setSnapshot({ adapter, context, state: { kind: "loading" }, selectedId: null });
    const isCurrent = () => current === epoch.current && !controller.signal.aborted && getSessionEpoch() === context.sessionEpoch;
    // Also contain a synchronous throw from a future adapter implementation.
    void Promise.resolve().then(() => {
      if (!isCurrent()) return null;
      return adapter.load(context, controller.signal);
    }).then((next) => {
      if (!next || !isCurrent()) return;
      let nextSelectedId: string | null = null;
      if (next.kind === "ready") {
        const visible = next.memberships.filter((m) => m.role !== "denied");
        const { selected, denied } = selectCompany(visible, next.selectedId ?? "");
        nextSelectedId = denied ? null : selected?.companyId ?? null;
      }
      setSnapshot({ adapter, context, state: next, selectedId: nextSelectedId });
    }).catch(() => {
      if (!isCurrent()) return;
      setSnapshot({ adapter, context, state: { kind: "error", message: "Company workspace could not be loaded." }, selectedId: null });
    });
  }, [adapter, context]);

  useEffect(() => {
    load();
    return () => {
      controllerRef.current?.abort();
      epoch.current++;
    };
  }, [load]);

  const onSelect = (id: string) => {
    if (state.kind !== "ready" || getSessionEpoch() !== context.sessionEpoch) return;
    const { denied } = selectCompany(state.memberships, id);
    setSnapshot((previous) => previous?.adapter === adapter && previous.context === context
      ? { ...previous, selectedId: denied ? null : id }
      : previous);
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
  if (state.kind === "empty" || !state.memberships.some((m) => m.role !== "denied")) {
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
        {state.memberships.filter((m) => m.role !== "denied").map((m) => (
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
