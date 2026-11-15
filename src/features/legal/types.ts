import type { WorkflowProjection } from "../../../shared/legal/workflow/projections";
export type LegalMatter = WorkflowProjection;
type Notice = { kind: "loading" } | { kind: "unavailable"; reason: string } | { kind: "denied" }
  | { kind: "missing" } | { kind: "stale" } | { kind: "conflict" } | { kind: "error"; message: string };
export type LegalDashboardState = Notice | { kind: "empty" } | { kind: "ready"; matters: LegalMatter[]; stale?: boolean };
export type LegalMatterState = Notice | { kind: "ready"; matter: LegalMatter; stale?: boolean };
