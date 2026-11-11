// A1 conformance: the behaviours ANY protected-read binding (reference evaluator or a future real producer wiring) must show.
// All identifiers are synthetic. A binding supplies `decide`; the suite supplies states and the required outcome.
import type { BindingRegistry } from "./scopeBinding";
import { buildBindingRegistry } from "./scopeBinding";

export const PERSON = "10000000-0000-4000-8000-000000000001";
export const OTHER_PERSON = "10000000-0000-4000-8000-000000000002";
export const ACCOUNT = "20000000-0000-4000-8000-000000000001";
export const OTHER_ACCOUNT = "20000000-0000-4000-8000-000000000002";
export const COMPANY_A = "30000000-0000-4000-8000-00000000000a";
export const COMPANY_B = "30000000-0000-4000-8000-00000000000b";
export const APP = "ecc-apm";
export const NOW = Date.parse("2026-11-11T12:00:00Z");
export const SESSION_ID = "synthetic-session-1";

export type ConformanceInput = {
  presentedSessionId: string | null;
  /** The central current-session envelope, or "throw" for an outage. */
  sessionBody: unknown | "throw";
  /** The grant producer envelope, or "throw" for an outage. */
  grantsBody: unknown | "throw";
  requestedScope: string | null;
  registry: BindingRegistry;
  nowMs: number;
  environment: "production" | "preview";
};
export type ConformanceDecision = { allowed: boolean; scopeRefs?: readonly string[] };
export type ConformanceCase = { name: string; input: ConformanceInput; expect: { allowed: boolean; scopeRefs?: readonly string[] } };

const iso = (ms: number) => new Date(ms).toISOString();
const meta = { contractVersion: "1.0.0", requestId: "synthetic", source: "control-plane" };
export const sessionEnvelope = (patch: Record<string, unknown> = {}) => ({
  data: { applicationSessionId: SESSION_ID, personId: PERSON, accountId: ACCOUNT, applicationId: APP, expiresAt: iso(NOW + 3600_000), allowed: true,
    reasonCode: "ACCESS_ALLOWED", decisionMode: "canonical", billingMode: "canonical", banner: null, capabilities: [], ...patch }, error: null, meta,
});
export const grant = (patch: Record<string, unknown> = {}) => ({
  grantId: "40000000-0000-4000-8000-000000000001", personId: PERSON, accountId: ACCOUNT, applicationId: APP, resourceType: "company",
  companyId: COMPANY_A, effectiveAt: iso(NOW - 86400_000), expiresAt: iso(NOW + 86400_000), revokedAt: null, revision: 1, ...patch,
});
export const grantsEnvelope = (...grants: unknown[]) => ({ data: { grants }, error: null, meta });
export const REGISTRY = buildBindingRegistry([
  { scopeRef: "scope-a", companyId: COMPANY_A, status: "verified", reviewRef: "synthetic-review-1" },
  { scopeRef: "scope-b", companyId: COMPANY_B, status: "verified", reviewRef: "synthetic-review-1" },
  { scopeRef: "scope-draft", companyId: COMPANY_A, status: "proposed", reviewRef: "synthetic-review-2" },
]);
const base = (over: Partial<ConformanceInput> = {}): ConformanceInput => ({
  presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: grantsEnvelope(grant()), requestedScope: null,
  registry: REGISTRY, nowMs: NOW, environment: "production", ...over,
});
const allow = (...scopeRefs: string[]) => ({ allowed: true, scopeRefs });
const DENY = { allowed: false } as const;

export const CONFORMANCE_CASES: readonly ConformanceCase[] = [
  { name: "allowed: admitted person with a company grant and a verified binding reads that scope", input: base(), expect: allow("scope-a") },
  { name: "allowed: two company grants authorize both bound scopes", input: base({ grantsBody: grantsEnvelope(grant(), grant({ grantId: "40000000-0000-4000-8000-000000000002", companyId: COMPANY_B })) }), expect: allow("scope-a", "scope-b") },
  { name: "allowed: requested scope narrows to one authorized scope", input: base({ requestedScope: "scope-a", grantsBody: grantsEnvelope(grant(), grant({ grantId: "40000000-0000-4000-8000-000000000002", companyId: COMPANY_B })) }), expect: allow("scope-a") },
  { name: "wrong company: requested scope of an ungranted company is denied", input: base({ requestedScope: "scope-b" }), expect: DENY },
  { name: "wrong resource: requested scope with no binding is denied", input: base({ requestedScope: "scope-unknown" }), expect: DENY },
  { name: "route/name inference: a display name or comma list never widens a request", input: base({ requestedScope: "Example Realty Group" }), expect: DENY },
  { name: "injection: a comma list in the requested scope is invalid", input: base({ requestedScope: "scope-a,scope-b" }), expect: DENY },
  { name: "missing grants: admitted session with no grants reads nothing", input: base({ grantsBody: grantsEnvelope() }), expect: DENY },
  { name: "accountId-only: matching account but no company grant reads nothing", input: base({ grantsBody: grantsEnvelope(grant({ companyId: COMPANY_B, personId: OTHER_PERSON })) }), expect: DENY },
  { name: "grant for another person is ignored", input: base({ grantsBody: grantsEnvelope(grant({ personId: OTHER_PERSON })) }), expect: DENY },
  { name: "grant for another account is ignored", input: base({ grantsBody: grantsEnvelope(grant({ accountId: OTHER_ACCOUNT })) }), expect: DENY },
  { name: "grant for another application is ignored", input: base({ grantsBody: grantsEnvelope(grant({ applicationId: "other-app" })) }), expect: DENY },
  { name: "expired grant is ignored", input: base({ grantsBody: grantsEnvelope(grant({ expiresAt: iso(NOW) })) }), expect: DENY },
  { name: "not-yet-effective grant is ignored", input: base({ grantsBody: grantsEnvelope(grant({ effectiveAt: iso(NOW + 1000) })) }), expect: DENY },
  { name: "revoked grant is ignored", input: base({ grantsBody: grantsEnvelope(grant({ revokedAt: iso(NOW - 1000) })) }), expect: DENY },
  { name: "malformed grant is dropped; a valid sibling still authorizes only its own scope", input: base({ grantsBody: grantsEnvelope({ nonsense: true }, grant()) }), expect: allow("scope-a") },
  { name: "unverified binding never authorizes", input: base({ grantsBody: grantsEnvelope(grant()), requestedScope: "scope-draft" }), expect: DENY },
  { name: "empty registry denies even with valid grants", input: base({ registry: buildBindingRegistry([]) }), expect: DENY },
  { name: "no session presented", input: base({ presentedSessionId: null }), expect: DENY },
  { name: "wrong application session", input: base({ sessionBody: sessionEnvelope({ applicationId: "other-app" }) }), expect: DENY },
  { name: "revoked session (central says not allowed)", input: base({ sessionBody: sessionEnvelope({ allowed: false, reasonCode: "SESSION_REVOKED" }) }), expect: DENY },
  { name: "expired session", input: base({ sessionBody: sessionEnvelope({ expiresAt: iso(NOW) }) }), expect: DENY },
  { name: "session id in the response differs from the one presented", input: base({ sessionBody: sessionEnvelope({ applicationSessionId: "someone-elses-session" }) }), expect: DENY },
  { name: "malformed identity in the session response", input: base({ sessionBody: sessionEnvelope({ personId: "not-a-uuid" }) }), expect: DENY },
  { name: "developer review session is not resource authority", input: base({ environment: "preview", sessionBody: sessionEnvelope({ decisionMode: "developer_bypass", billingMode: "not_applicable_developer", banner: "DEV BYPASS · READ ONLY", capabilities: ["ui.review.read"] }) }), expect: DENY },
  { name: "central outage denies", input: base({ sessionBody: "throw" }), expect: DENY },
  { name: "grant producer outage denies", input: base({ grantsBody: "throw" }), expect: DENY },
];

export async function runConformance(decide: (input: ConformanceInput) => Promise<ConformanceDecision>): Promise<{ passed: number; failures: string[] }> {
  const failures: string[] = [];
  for (const c of CONFORMANCE_CASES) {
    let got: ConformanceDecision;
    try { got = await decide(c.input); } catch { got = { allowed: false }; }
    const scopesOk = !c.expect.scopeRefs || JSON.stringify([...(got.scopeRefs ?? [])].sort()) === JSON.stringify([...c.expect.scopeRefs].sort());
    if (got.allowed !== c.expect.allowed || (c.expect.allowed && !scopesOk)) failures.push(c.name);
  }
  return { passed: CONFORMANCE_CASES.length - failures.length, failures };
}
