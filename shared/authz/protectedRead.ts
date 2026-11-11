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
  | AdmissionDenial | "DEV_BYPASS_NOT_RESOURCE_AUTHORITY" | "NO_RESOURCE_GRANTS" | "NO_BOUND_SCOPE" | "SCOPE_NOT_AUTHORIZED" | "REQUEST_INVALID"
  | "CLOCK_INVALID" | "AUTHORITY_EXPIRED";

/** What a protected read may use. `actor` and `scopeRefs` feed the transaction-local database context. */
export type ReadContext = {
  actor: string;
  scopeRefs: readonly string[];
  /** Detects person/account/grant/scope drift between request and response. Contains no session credential. */
  binding: string;
  sessionExpiresAtMs: number;
  /**
   * The instant (exclusive) at which any authority behind this context ends: the earliest of the session expiry and the expiry of every
   * grant that contributes a scope. The database seam refuses to start, and discards the result, at or after this time.
   */
  validUntilMs: number;
};

export type ReadAuthority = { allowed: true; context: ReadContext } | { allowed: false; reason: ReadDenial };

/** The governed registry may be loaded asynchronously from its (not yet accepted) source. Throw on failure: that denies. */
export type BindingRegistrySource = BindingRegistry | (() => Promise<BindingRegistry>);

export type ReadDeps = {
  policy: AdmissionPolicy;
  resolveSession: SessionResolver;
  produceGrants: GrantProducer;
  registry: BindingRegistrySource;
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
 *
 * Time: `deps.now()` is read before the central check, again after each asynchronous read (issuer, grant producer, binding source), and once more
 * immediately before allowing. Every validity test uses the LATEST reading, so expiry during the reads denies. A clock that is not
 * finite or moves backwards is a denial (CLOCK_INVALID), never a reason to trust an earlier reading.
 */
export async function resolveReadAuthority(deps: ReadDeps, presentedSessionId: string | null, requestedScope: string | null = null): Promise<ReadAuthority> {
  if (requestedScope !== null && !SCOPE_REF.test(requestedScope)) return denied("REQUEST_INVALID");
  let last = Number.NEGATIVE_INFINITY;
  const tick = (): number | null => {
    const t = deps.now();
    if (typeof t !== "number" || !Number.isFinite(t) || t < last) return null;
    last = t;
    return t;
  };
  if (tick() === null) return denied("CLOCK_INVALID");

  let sessionBody: unknown;
  try {
    if (!presentedSessionId) return denied("SESSION_REQUIRED");
    sessionBody = await deps.resolveSession(presentedSessionId);
  } catch { return denied("AUTHORITY_UNAVAILABLE"); }
  const afterSession = tick();
  if (afterSession === null) return denied("CLOCK_INVALID");
  const admission = admitSession(sessionBody, presentedSessionId, deps.policy, afterSession);
  if ("reason" in admission) return denied(admission.reason);
  const session = admission.session;
  // Review-mode sessions prove UI review access only; they are never resource authority for sensitive records.
  if (session.decisionMode === "developer_bypass") return denied("DEV_BYPASS_NOT_RESOURCE_AUTHORITY");

  let grantBody: unknown;
  try { grantBody = await deps.produceGrants(session); } catch { return denied("AUTHORITY_UNAVAILABLE"); }
  if (tick() === null) return denied("CLOCK_INVALID");
  const parsedGrants = parseResourceGrants(grantBody).grants;

  let registry: BindingRegistry;
  try { registry = typeof deps.registry === "function" ? await deps.registry() : deps.registry; } catch { return denied("AUTHORITY_UNAVAILABLE"); }
  if (tick() === null) return denied("CLOCK_INVALID");

  // Final evaluation at a fresh reading taken immediately before the decision is returned (all remaining work is synchronous).
  const nowMs = tick();
  if (nowMs === null) return denied("CLOCK_INVALID");
  if (session.expiresAtMs <= nowMs) return denied("AUTHORITY_EXPIRED");
  const usable = parsedGrants.filter((g) => grantApplies(g, session, nowMs));
  if (usable.length === 0) return denied("NO_RESOURCE_GRANTS");
  const scopes = scopesForCompanies(registry, new Set(usable.map((g) => g.companyId)));
  if (scopes.length === 0) return denied("NO_BOUND_SCOPE");
  const selected = requestedScope === null ? scopes : scopes.filter((s) => s === requestedScope);
  if (selected.length === 0) return denied("SCOPE_NOT_AUTHORIZED");
  // Only grants that actually contribute a selected scope bound the context's lifetime.
  const contributing = usable.filter((g) => selected.some((sc) => registry.byScope.get(sc)?.companyId === g.companyId));
  const validUntilMs = Math.min(session.expiresAtMs, ...contributing.map((g) => g.expiresAtMs ?? Number.POSITIVE_INFINITY));
  return {
    allowed: true,
    context: { actor: session.personId, scopeRefs: selected, binding: bindingFingerprint(session, contributing, selected), sessionExpiresAtMs: session.expiresAtMs, validUntilMs },
  };
}

/** A response is delivered only if it was produced under the binding that is still current. */
export function acceptResponse(requestBinding: string, currentBinding: string | null): boolean {
  return currentBinding !== null && requestBinding === currentBinding;
}
