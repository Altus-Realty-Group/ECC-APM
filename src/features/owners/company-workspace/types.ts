/** Frontend display model only. Not an accepted backend API. */

export type CompanyRole = "primary" | "viewer" | "denied";

export type CompanyMembership = {
  /** Owning company. Not a cross-customer key. */
  companyId: string;
  companyName: string;
  role: CompanyRole;
  /** Explicit grants. Primary contact alone does not confer these. */
  canManageMembers: boolean;
  canApproveFinancial: boolean;
  canChangeBanking: boolean;
};

/** Caller context. Personal session and management customer are distinct. */
export type WorkspaceContext = {
  sessionEpoch: number;
  /** Management customer. Not a personal account or owning company. */
  customerId: string | null;
};

export type CompanyWorkspaceState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "unavailable"; reason: string }
  | { kind: "denied" }
  | { kind: "error"; message: string }
  | { kind: "ready"; memberships: CompanyMembership[]; selectedId: string | null; stale?: boolean; partial?: boolean };
