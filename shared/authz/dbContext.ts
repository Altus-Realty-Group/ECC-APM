// A1 database seam. Custom settings FILTER a trusted, server-supplied context; they do not authenticate anyone or verify grants.
// This seam only (a) refuses a connection role that bypasses row-level security and (b) sets the context transaction-locally,
// so nothing survives on a pooled connection. Session-level set_config(..., false) is forbidden.
import { SCOPE_REF } from "./scopeBinding";
import { UUID } from "./session";
import type { ReadContext } from "./protectedRead";

export type SqlResult = { rows: Record<string, unknown>[] };
export interface SqlRunner { query(text: string, values?: readonly unknown[]): Promise<SqlResult> }

export class ContextSeamError extends Error {
  constructor(public readonly code: "INVALID_CONTEXT" | "BYPASS_ROLE" | "WRONG_ROLE" | "ROLE_UNVERIFIED", message: string) {
    super(message);
    this.name = "ContextSeamError";
  }
}

export const SET_CONTEXT_SQL = "SELECT set_config('ecc.scope_refs', $1, true), set_config('ecc.actor', $2, true)";
export const ROLE_CHECK_SQL =
  "SELECT current_user::text AS role_name, (SELECT (rolsuper OR rolbypassrls) FROM pg_roles WHERE rolname = current_user) AS bypass";

/** Reject anything that could add scopes through the comma-separated list or smuggle control characters. */
export function assertContext(ctx: Pick<ReadContext, "actor" | "scopeRefs">): void {
  if (!UUID.test(ctx.actor)) throw new ContextSeamError("INVALID_CONTEXT", "actor must be a person UUID");
  if (ctx.scopeRefs.length === 0) throw new ContextSeamError("INVALID_CONTEXT", "at least one scope is required");
  for (const s of ctx.scopeRefs) if (!SCOPE_REF.test(s)) throw new ContextSeamError("INVALID_CONTEXT", "invalid scope_ref");
}

/**
 * Run `fn` inside one transaction whose authorization context lives only until COMMIT/ROLLBACK.
 * `expectedRole` pins the connection role (e.g. the dedicated non-bypass runtime role).
 */
export async function withTransactionContext<T>(
  runner: SqlRunner, ctx: Pick<ReadContext, "actor" | "scopeRefs">, expectedRole: string, fn: (run: SqlRunner) => Promise<T>,
): Promise<T> {
  assertContext(ctx);
  await runner.query("BEGIN");
  try {
    const role = (await runner.query(ROLE_CHECK_SQL)).rows[0];
    if (!role || typeof role.role_name !== "string" || typeof role.bypass !== "boolean") throw new ContextSeamError("ROLE_UNVERIFIED", "connection role could not be verified");
    if (role.bypass) throw new ContextSeamError("BYPASS_ROLE", "connection role bypasses row-level security");
    if (role.role_name !== expectedRole) throw new ContextSeamError("WRONG_ROLE", "connection role is not the expected runtime role");
    await runner.query(SET_CONTEXT_SQL, [ctx.scopeRefs.join(","), ctx.actor]);
    const result = await fn(runner);
    await runner.query("COMMIT");
    return result;
  } catch (err) {
    try { await runner.query("ROLLBACK"); } catch { /* the original failure is what matters */ }
    throw err;
  }
}
