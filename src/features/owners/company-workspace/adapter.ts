import type { CompanyMembership, CompanyWorkspaceState } from "./types";

/**
 * Explicitly unbound adapter. No producer is accepted yet.
 * Returns truthful unavailable states. Never hardcodes operating companies.
 */
export type CompanyWorkspaceAdapter = {
  load: (signal?: AbortSignal) => Promise<CompanyWorkspaceState>;
};

export function unboundCompanyWorkspaceAdapter(): CompanyWorkspaceAdapter {
  return {
    async load() {
      return {
        kind: "unavailable",
        reason: "Company membership producer is not bound. No operating companies are available.",
      };
    },
  };
}

/** Isolated fixture helper for tests only. Not used in operating UI. */
export function fixtureAdapter(state: CompanyWorkspaceState): CompanyWorkspaceAdapter {
  return { async load() { return state; } };
}

export function selectCompany(
  memberships: CompanyMembership[],
  companyId: string
): { selected: CompanyMembership | null; denied: boolean } {
  const found = memberships.find((m) => m.companyId === companyId);
  if (!found) return { selected: null, denied: true };
  if (found.role === "denied") return { selected: found, denied: true };
  return { selected: found, denied: false };
}
