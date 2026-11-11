// A1 protected-read decision. Orchestrates: presented session -> central admission -> resource grants -> explicit scope bindings.
// Every request resolves authority afresh (no allow is cached). Missing/unverified authority denies. No service-role path exists here.
import { admitSession, type AdmissionDenial, type AdmissionPolicy, type AdmittedSession } from "./session";
import { grantApplies, parseResourceGrants, type ResourceGrant } from "./resourceGrant";
import { SCOPE_REF, scopesForCompanies, type BindingRegistry } from "./scopeBinding";

/** Calls the central current-session check and returns the parsed JSON envelope. Throw on any failure (treated as denial). */
export type SessionResolver = (sessionId: string) => Promise<unknown>;
/** Returns the producer's grant envelope for the admitted session. Throw on any failure (treated as denial). */
export type GrantProducer = (session: AdmittedSession) => Promise<unknown>;

/** Default until an accepted producer exists: no resource authority, so nothing is readable. */
export const noGrantProducer: GrantProducer = async () => { throw new Error("no accepted resource-grant producer"); };

export type ReadDenial =
  | AdmissionDenial | "DEV_BYPASS_NOT_RESOURCE_AUTHORITY" | "NO_RESOURCE_GRANTS" | "NO_BOUND_SCOPE" | "SCOPE_NOT_AUTHORIZED" | "REQUEST_INVALID";

/** What a protected read may use. `actor` and `scopeRefs` feed the transaction-local database context. */
export type ReadContext = {
  actor: string;
  scopeRefs: readonly string[];
  /** Detects person/account/grant/scope drift between request and response. Contains no session credential. */
  binding: string;
  sessionExpiresAtMs: number;
};

export type ReadAuthority = { allowed: true; context: ReadContext } | { allowed: false; reason: ReadDenial };

export type ReadDeps = {
  policy: AdmissionPolicy;
  resolveSession: SessionResolver;
  produceGrants: GrantProducer;
  registry: BindingRegistry;
  now: () => number;
};

const denied = (reason: ReadDenial): ReadAuthority => ({ allowed: false, reason });

export function bindingFingerprint(s: { personId: string; accountId: string }, grants: readonly ResourceGrant[], scopeRefs: readonly string[]): string {
  const g = grants.map((x) => `${x.grantId}@${x.revision}`).sort().join(",");
  return `${s.personId}|${s.accountId}|${g}|${[...scopeRefs].sort().join(",")}`;
}

/**
 * Decide what the presented session may read. `requestedScope` is advisory narrowing only: it can select one of the already
 * authorized scopes, and a scope that is not authorized denies. It never adds authority.
 */
export async function resolveReadAuthority(deps: ReadDeps, presentedSessionId: string | null, requestedScope: string | null = null): Promise<ReadAuthority> {
  if (requestedScope !== null && !SCOPE_REF.test(requestedScope)) return denied("REQUEST_INVALID");
  const nowMs = deps.now();
  let sessionBody: unknown;
  try {
    if (!presentedSessionId) return denied("SESSION_REQUIRED");
    sessionBody = await deps.resolveSession(presentedSessionId);
  } catch { return denied("AUTHORITY_UNAVAILABLE"); }
  const admission = admitSession(sessionBody, presentedSessionId, deps.policy, nowMs);
  if ("reason" in admission) return denied(admission.reason);
  const session = admission.session;
  // Review-mode sessions prove UI review access only; they are never resource authority for sensitive records.
  if (session.decisionMode === "developer_bypass") return denied("DEV_BYPASS_NOT_RESOURCE_AUTHORITY");

  let grantBody: unknown;
  try { grantBody = await deps.produceGrants(session); } catch { return denied("AUTHORITY_UNAVAILABLE"); }
  const usable = parseResourceGrants(grantBody).grants.filter((g) => grantApplies(g, session, nowMs));
  if (usable.length === 0) return denied("NO_RESOURCE_GRANTS");
  const scopes = scopesForCompanies(deps.registry, new Set(usable.map((g) => g.companyId)));
  if (scopes.length === 0) return denied("NO_BOUND_SCOPE");
  const selected = requestedScope === null ? scopes : scopes.filter((s) => s === requestedScope);
  if (selected.length === 0) return denied("SCOPE_NOT_AUTHORIZED");
  return {
    allowed: true,
    context: { actor: session.personId, scopeRefs: selected, binding: bindingFingerprint(session, usable, selected), sessionExpiresAtMs: session.expiresAtMs },
  };
}

/** A response is delivered only if it was produced under the binding that is still current. */
export function acceptResponse(requestBinding: string, currentBinding: string | null): boolean {
  return currentBinding !== null && requestBinding === currentBinding;
}
