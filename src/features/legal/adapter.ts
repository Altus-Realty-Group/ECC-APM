import type { LegalDashboardState, LegalMatter, LegalMatterState } from "./types";

/** Explicitly unbound. No live producer is accepted. */
export type LegalAdapter = {
  load: (signal?: AbortSignal) => Promise<LegalDashboardState>;
  getMatter: (id: string, signal?: AbortSignal) => Promise<LegalMatterState>;
};

export function unboundLegalAdapter(): LegalAdapter {
  return {
    async load() {
      return { kind: "unavailable", reason: "Legal records are not connected yet. No operating matters are available." };
    },
    async getMatter() { return { kind: "unavailable", reason: "Legal records are not connected yet. No operating matters are available." }; },
  };
}

/** Isolated synthetic fixture. Not operating data. */
export function fixtureLegalAdapter(state: LegalDashboardState): LegalAdapter {
  const matters = state.kind === "ready" ? state.matters : [];
  return {
    async load() { return state; },
    async getMatter(id: string) {
      if (state.kind === "unavailable" || state.kind === "denied" || state.kind === "error" || state.kind === "loading" || state.kind === "conflict" || state.kind === "stale" || state.kind === "missing") return state;
      const matter = matters.find(m => m.matter.id === id);
      return matter ? { kind: "ready", matter, stale: state.kind === "ready" && state.stale } : { kind: "missing" };
    },
  };
}

export const SYNTHETIC_MATTERS: LegalMatter[] = [
  { matter: { id: "m-001", scopeRef: "synthetic", caseType: "eviction", lifecycle: "draft", courtRef: null, docketNumber: "EXAMPLE v. SAMPLE", revision: 1 },
    awards: [{ id: "a-001", matterId: "m-001", kind: "rent", amount: null, judgmentVerification: "unverified", collectionReadiness: "not_ready", revision: 1, obligors: [] }],
    evidence: [], courtEvents: [], requirements: [{ id: "r-001", matterId: "m-001", description: "Assemble evidence", assignedActor: null, sourceDate: null, status: "open" }] },
  { matter: { id: "m-002", scopeRef: "synthetic", caseType: "collections", lifecycle: "pre_filing", courtRef: "EXAMPLE Court", docketNumber: "EXAMPLE v. DEMO", revision: 1 },
    awards: [{ id: "a-002", matterId: "m-002", kind: "damages", amount: null, judgmentVerification: "unverified", collectionReadiness: "not_ready", revision: 1, obligors: [] }],
    evidence: [], courtEvents: [], requirements: [{ id: "r-002", matterId: "m-002", description: "Review supplied order", assignedActor: "synthetic-reviewer", sourceDate: null, status: "open" }] },
];

// Stable production seam. It never imports a fixture or sends a request.
export const LEGAL_ADAPTER = unboundLegalAdapter();
