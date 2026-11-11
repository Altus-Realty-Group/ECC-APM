import type { LegalDashboardState, LegalMatter } from "./types";

/** Explicitly unbound. No live producer is accepted. */
export type LegalAdapter = {
  load: (signal?: AbortSignal) => Promise<LegalDashboardState>;
  getMatter: (id: string) => Promise<LegalMatter | null>;
};

export function unboundLegalAdapter(): LegalAdapter {
  return {
    async load() {
      return { kind: "unavailable", reason: "Legal matter producer is not bound. No operating cases are available." };
    },
    async getMatter() { return null; },
  };
}

/** Isolated synthetic fixture. Not operating data. */
export function fixtureLegalAdapter(state: LegalDashboardState): LegalAdapter {
  const matters = state.kind === "ready" ? state.matters : [];
  return {
    async load() { return state; },
    async getMatter(id: string) { return matters.find(m => m.id === id) ?? null; },
  };
}

export const SYNTHETIC_MATTERS: LegalMatter[] = [
  { id: "m-001", caption: "EXAMPLE v. SAMPLE", matterType: "eviction", lifecycle: "intake", verification: "none-known", readiness: "missing-evidence", evidenceConfidence: "filename-hint", court: null, creditor: null, propertyIds: ["p-1"], partyIds: ["t-1"], awardId: null, awardCents: null, awardVerified: false, nextAction: "Assemble evidence", sourceAsOf: null },
  { id: "m-002", caption: "EXAMPLE v. DEMO", matterType: "collection", lifecycle: "attorney-review", verification: "alleged", readiness: "legal-review", evidenceConfidence: "content-reviewed", court: "EXAMPLE Court", creditor: "EXAMPLE LLC", propertyIds: ["p-2"], partyIds: ["t-2", "t-3"], awardId: null, awardCents: null, awardVerified: false, nextAction: "Attorney review", sourceAsOf: null },
];
