import { consumeProjection, type ProjectionOutcome, type Requirement } from "./projections";

/** Pure requirement queues. Not an accepted producer. */

export type RequirementQueue =
  | { kind: "ready"; open: Requirement[]; assigned: Requirement[]; unassigned: Requirement[]; byActor: Record<string, Requirement[]>; counts: { open: number; assigned: number; unassigned: number } }
  | { kind: "unavailable"; reason: string }
  | { kind: "missing" }
  | { kind: "denied" }
  | { kind: "stale"; asOf: string | null }
  | { kind: "conflict"; reason: string };

/** Accept unknown input through the existing consumeProjection boundary. */
export function requirementQueues(input: unknown): RequirementQueue {
  const outcome = consumeProjection(input);
  if (outcome.kind !== "ready") return outcome as RequirementQueue;

  const open = outcome.projection.requirements
    .filter((r) => r.status === "open")
    .slice()
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  const assigned = open.filter((r) => r.assignedActor !== null);
  const unassigned = open.filter((r) => r.assignedActor === null);

  const byActor: Record<string, Requirement[]> = Object.create(null);
  for (const r of assigned) {
    const key = r.assignedActor as string;
    if (!Object.prototype.hasOwnProperty.call(byActor, key)) byActor[key] = [];
    byActor[key].push(r);
  }
  for (const key of Object.keys(byActor)) byActor[key].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  return {
    kind: "ready",
    open,
    assigned,
    unassigned,
    byActor,
    counts: { open: open.length, assigned: assigned.length, unassigned: unassigned.length },
  };
}
