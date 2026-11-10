import type { LegalDashboardState } from "./types";

/** Explicitly unbound. No live producer is accepted. */
export type LegalAdapter = {
  load: (signal?: AbortSignal) => Promise<LegalDashboardState>;
};

export function unboundLegalAdapter(): LegalAdapter {
  return {
    async load() {
      return { kind: "unavailable", reason: "Legal matter producer is not bound. No operating cases are available." };
    },
  };
}

/** Isolated synthetic fixture. Not operating data. */
export function fixtureLegalAdapter(state: LegalDashboardState): LegalAdapter {
  return { async load() { return state; } };
}

export const SYNTHETIC_MATTERS = [
  { id: "m-001", caption: "EXAMPLE v. SAMPLE", matterType: "eviction", lifecycle: "intake" as const, verification: "none-known" as const, readiness: "missing-evidence" as const, court: null, creditor: null, propertyIds: ["p-1"], partyIds: ["t-1"], awardCents: null, awardVerified: false, nextAction: "Assemble evidence", sourceAsOf: null },
  { id: "m-002", caption: "EXAMPLE v. DEMO", matterType: "collection", lifecycle: "attorney-review" as const, verification: "alleged" as const, readiness: "legal-review" as const, court: "EXAMPLE Court", creditor: "EXAMPLE LLC", propertyIds: ["p-2"], partyIds: ["t-2", "t-3"], awardCents: null, awardVerified: false, nextAction: "Attorney review", sourceAsOf: null },
];
