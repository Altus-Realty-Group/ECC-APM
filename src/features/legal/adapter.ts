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
      if (state.kind === "unavailable" || state.kind === "denied" || state.kind === "error" || state.kind === "loading") return state;
      const matter = matters.find(m => m.id === id);
      return matter ? { kind: "ready", matter, stale: state.kind === "ready" && state.stale } : { kind: "missing" };
    },
  };
}

export const SYNTHETIC_MATTERS: LegalMatter[] = [
  { id: "m-001", caption: "EXAMPLE v. SAMPLE", matterType: "eviction", lifecycle: "intake", verification: "none-known", readiness: "missing-evidence", evidenceConfidence: "filename-hint", court: null, creditor: null, propertyIds: ["p-1"], partyIds: ["t-1"], awardId: null, awardCents: null, awardVerified: false, nextAction: "Assemble evidence", sourceAsOf: null },
  { id: "m-002", caption: "EXAMPLE v. DEMO", matterType: "collection", lifecycle: "attorney-review", verification: "alleged", readiness: "legal-review", evidenceConfidence: "content-reviewed", court: "EXAMPLE Court", creditor: "EXAMPLE LLC", propertyIds: ["p-2"], partyIds: ["t-2", "t-3"], awardId: null, awardCents: null, awardVerified: false, nextAction: "Attorney review", sourceAsOf: null },
];

// Stable production seam. It never imports a fixture or sends a request.
export const LEGAL_ADAPTER = unboundLegalAdapter();
