// L5 append planning. Pure: decides what appending ONE entry would do; it never stores anything (persistence is a separate dependency).
import { LedgerError, canonicalEntry, parseLedgerEntry } from "./entries";
import { projectLedger } from "./project";
import type { ConflictCode, LedgerAwardContext, LedgerEntry, LedgerProjection } from "./model";

export type AppendPlan =
  | { outcome: "append"; entry: LedgerEntry; projection: LedgerProjection }
  | { outcome: "noop"; entry: LedgerEntry; projection: LedgerProjection }          // exact replay of an entry already in the ledger
  | { outcome: "reject"; conflict: ConflictCode; projection: LedgerProjection };    // fail closed: nothing may be written

/**
 * Plan appending `rawNew` to `existing`. The existing ledger must itself be sound (a conflicted ledger accepts nothing).
 * Exact replay (same entryId, identical content) is a no-op; the same entryId with different content is rejected.
 * New entries must carry the next sequence number: the ledger is append-only, never edited or reordered.
 */
export function planAppend(ctx: LedgerAwardContext, existing: readonly unknown[], rawNew: unknown): AppendPlan {
  const before = projectLedger(ctx, existing);
  if (before.status === "conflict") return { outcome: "reject", conflict: before.conflict as ConflictCode, projection: before };
  let entry: LedgerEntry;
  try { entry = parseLedgerEntry(rawNew); }
  catch (e) { return { outcome: "reject", conflict: e instanceof LedgerError ? e.code : "INVALID_ENTRY", projection: before }; }

  const prior = (existing as unknown[]).map((r) => parseLedgerEntry(r)).find((p) => p.entryId === entry.entryId);
  if (prior) {
    return canonicalEntry(prior) === canonicalEntry(entry)
      ? { outcome: "noop", entry: prior, projection: before }
      : { outcome: "reject", conflict: "DUPLICATE_ENTRY_CONFLICT", projection: before };
  }
  if (entry.seq <= before.lastSeq) return { outcome: "reject", conflict: "DUPLICATE_SEQUENCE", projection: before };
  if (entry.seq !== before.lastSeq + 1) return { outcome: "reject", conflict: "SEQUENCE_GAP", projection: before };

  const after = projectLedger(ctx, [...existing, rawNew]);
  if (after.status === "conflict") return { outcome: "reject", conflict: after.conflict as ConflictCode, projection: before };
  return { outcome: "append", entry, projection: after };
}
