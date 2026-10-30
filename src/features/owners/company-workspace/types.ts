/** Frontend display model only. Not an accepted backend API. */

export type CompanyRole = "primary" | "viewer" | "denied";

export type CompanyMembership = {
  companyId: string;
  companyName: string;
  role: CompanyRole;
  /** Explicit grants. Primary contact alone does not confer these. */
  canManageMembers: boolean;
  canApproveFinancial: boolean;
  canChangeBanking: boolean;
};

export type CompanyWorkspaceState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "unavailable"; reason: string }
  | { kind: "denied" }
  | { kind: "error"; message: string }
  | { kind: "ready"; memberships: CompanyMembership[]; selectedId: string | null; stale?: boolean; partial?: boolean };
