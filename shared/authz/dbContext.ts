// A1 database seam. Custom settings FILTER a trusted, server-supplied context; they do not authenticate anyone or verify grants.
// This seam (a) requires an EXCLUSIVELY LEASED connection (never a shared pool handle: BEGIN and the next statement could run on
// different connections), (b) refuses a connection that arrives with inherited session context, an open transaction, a changed role
// or a restricted-evidence setting, (c) refuses a bypass-capable role, (d) sets the context transaction-locally and pins restricted
// evidence to default-deny, (e) resets the session afterwards and verifies it, and (f) DISCARDS the connection instead of returning
// it to the pool if any rollback/reset/verification step fails. Session-level set_config(..., false) is forbidden.
import { SCOPE_REF } from "./scopeBinding";
import { UUID } from "./session";
import type { ReadContext } from "./protectedRead";

export type SqlResult = { rows: Record<string, unknown>[] };
export interface SqlRunner { query(text: string, values?: readonly unknown[]): Promise<SqlResult> }

/** One connection held exclusively by the caller until `release`. `discard=true` must destroy it rather than return it to a pool. */
export interface LeasedConnection extends SqlRunner {
  /** Unique per lease; the seam refuses to run two live leases that share an id (a pool handing one connection out twice). */
  readonly leaseId: string;
  release(discard: boolean): Promise<void> | void;
}
export interface ConnectionLeaser { lease(): Promise<LeasedConnection> }

export type SeamErrorCode =
  | "INVALID_CONTEXT" | "BYPASS_ROLE" | "WRONG_ROLE" | "ROLE_UNVERIFIED" | "CONTAMINATED_LEASE" | "LEASE_NOT_EXCLUSIVE"
  | "CONTEXT_EXPIRED" | "CLOCK_INVALID";

export class ContextSeamError extends Error {
  constructor(public readonly code: SeamErrorCode, message: string) {
    super(message);
    this.name = "ContextSeamError";
  }
}

export const SET_CONTEXT_SQL =
  "SELECT set_config('ecc.scope_refs', $1, true), set_config('ecc.actor', $2, true), set_config('ecc.restricted_evidence', $3, true)";
/** Restricted evidence is never entitled by A1: pinned to 'off' (default-deny) in every transaction. */
export const RESTRICTED_EVIDENCE_PIN = "off";
export const ROLE_CHECK_SQL =
  "SELECT current_user::text AS role_name, (SELECT (rolsuper OR rolbypassrls) FROM pg_roles WHERE rolname = current_user) AS bypass";
/** A clean lease: no inherited ecc.* session context, session role unchanged, and no open transaction (autocommit timestamps agree). */
export const CLEAN_CHECK_SQL =
  "SELECT current_setting('ecc.scope_refs', true) AS scope_refs, current_setting('ecc.actor', true) AS actor, "
  + "current_setting('ecc.restricted_evidence', true) AS restricted_evidence, (session_user::text = current_user::text) AS role_unchanged, "
  + "(transaction_timestamp() = statement_timestamp()) AS idle";
export const RESET_SQL = "DISCARD ALL";

const blank = (v: unknown) => v === null || v === undefined || v === "";
export function isCleanRow(row: Record<string, unknown> | undefined): boolean {
  return !!row && blank(row.scope_refs) && blank(row.actor) && blank(row.restricted_evidence) && row.role_unchanged === true && row.idle === true;
}

/** Reject anything that could add scopes through the comma-separated list or smuggle control characters. */
export function assertContext(ctx: Pick<ReadContext, "actor" | "scopeRefs">): void {
  if (!UUID.test(ctx.actor)) throw new ContextSeamError("INVALID_CONTEXT", "actor must be a person UUID");
  if (ctx.scopeRefs.length === 0) throw new ContextSeamError("INVALID_CONTEXT", "at least one scope is required");
  for (const s of ctx.scopeRefs) if (!SCOPE_REF.test(s)) throw new ContextSeamError("INVALID_CONTEXT", "invalid scope_ref");
}

const liveLeases = new Set<string>();

export type LeasedContextOptions = { expectedRole: string; now: () => number };

/**
 * Lease a connection, run `fn` inside one transaction whose authorization context lives only until COMMIT/ROLLBACK, then reset and
 * verify the session. `fn` receives a runner that stops working the moment the transaction ends, so no later async work can reuse it.
 * The result is returned only if the context's authority (`validUntilMs`) still held when the work finished; otherwise the
 * transaction is rolled back and nothing is returned.
 */
export async function withLeasedContext<T>(
  leaser: ConnectionLeaser, ctx: Pick<ReadContext, "actor" | "scopeRefs" | "validUntilMs">, opts: LeasedContextOptions, fn: (run: SqlRunner) => Promise<T>,
): Promise<T> {
  assertContext(ctx);
  let last = Number.NEGATIVE_INFINITY;
  const tick = () => {
    const t = opts.now();
    if (typeof t !== "number" || !Number.isFinite(t) || t < last) throw new ContextSeamError("CLOCK_INVALID", "clock is not finite or moved backwards");
    last = t;
    return t;
  };
  const assertLive = () => { if (tick() >= ctx.validUntilMs) throw new ContextSeamError("CONTEXT_EXPIRED", "authority behind this context has ended"); };
  assertLive();

  const conn = await leaser.lease();
  if (liveLeases.has(conn.leaseId)) throw new ContextSeamError("LEASE_NOT_EXCLUSIVE", "connection is already leased"); // not ours to release
  liveLeases.add(conn.leaseId);
  let discard = false;
  let open = false;
  const guarded: SqlRunner = {
    query: (text, values) => {
      if (!open) return Promise.reject(new ContextSeamError("LEASE_NOT_EXCLUSIVE", "the leased transaction has ended"));
      return conn.query(text, values);
    },
  };
  try {
    if (!isCleanRow((await conn.query(CLEAN_CHECK_SQL)).rows[0])) { discard = true; throw new ContextSeamError("CONTAMINATED_LEASE", "connection arrived with inherited session state"); }
    await conn.query("BEGIN");
    open = true;
    const role = (await conn.query(ROLE_CHECK_SQL)).rows[0];
    if (!role || typeof role.role_name !== "string" || typeof role.bypass !== "boolean") throw new ContextSeamError("ROLE_UNVERIFIED", "connection role could not be verified");
    if (role.bypass) throw new ContextSeamError("BYPASS_ROLE", "connection role bypasses row-level security");
    if (role.role_name !== opts.expectedRole) throw new ContextSeamError("WRONG_ROLE", "connection role is not the expected runtime role");
    await conn.query(SET_CONTEXT_SQL, [ctx.scopeRefs.join(","), ctx.actor, RESTRICTED_EVIDENCE_PIN]);
    assertLive();
    const result = await fn(guarded);
    assertLive();
    open = false;
    try { await conn.query("COMMIT"); } catch (e) { discard = true; throw e; }
    return result;
  } catch (err) {
    open = false;
    try { await conn.query("ROLLBACK"); } catch { discard = true; }
    throw err;
  } finally {
    open = false;
    if (!discard) {
      try {
        await conn.query(RESET_SQL);
        if (!isCleanRow((await conn.query(CLEAN_CHECK_SQL)).rows[0])) discard = true;
      } catch { discard = true; }
    }
    liveLeases.delete(conn.leaseId);
    try { await conn.release(discard); } catch { /* the original outcome is what matters; a failed release cannot be retried safely */ }
  }
}
