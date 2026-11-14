import { consumeProjection, type WorkflowProjection } from "../../../shared/legal/workflow/projections";
import { requirementQueues } from "../../../shared/legal/workflow/requirementQueues";
import type { LegalDashboardState, LegalMatterState } from "./types";
export const matterTitle = (p: WorkflowProjection) => p.matter.docketNumber ?? `Matter ${p.matter.id}`;
export const readable = (s: string) => s.replace(/_/g, " ");
/** Validate and sanitize before any register search, count, cache or detail rendering. */
export function normalizeLegalState<T extends LegalDashboardState | LegalMatterState>(state: T): T {
  if (state.kind === "error") return { kind: "error", message: "Legal records could not be loaded." } as T;
  if (state.kind === "unavailable") return { kind: "unavailable", reason: "No accepted legal source is connected." } as T;
  if (state.kind !== "ready") {
    if (["loading", "denied", "missing", "stale", "conflict", "empty"].includes(state.kind)) return { kind: state.kind } as T;
    return { kind: "conflict" } as T;
  }
  const rows = "matters" in state ? state.matters : [state.matter];
  const clean: WorkflowProjection[] = [], matters = new Set<string>(), awards = new Set<string>();
  if (!Array.isArray(rows)) return { kind: "conflict" } as T;
  for (const row of rows) {
    const result = consumeProjection(row);
    if (result.kind !== "ready" || matters.has(result.projection.matter.id)) return { kind: "conflict" } as T;
    matters.add(result.projection.matter.id);
    for (const a of result.projection.awards) {
      if (awards.has(a.id)) return { kind: "conflict" } as T;
      awards.add(a.id);
    }
    clean.push(result.projection);
  }
  return ("matters" in state ? { kind: "ready", matters: clean, stale: state.stale === true } : { kind: "ready", matter: clean[0], stale: state.stale === true }) as T;
}
export function queues(p: WorkflowProjection) {
  const result = requirementQueues(p);
  if (result.kind !== "ready") throw new Error("Invalid workflow projection");
  return result;
}
