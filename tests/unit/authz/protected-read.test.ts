import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFORMANCE_CASES, runConformance, sessionEnvelope, grantsEnvelope, grant, REGISTRY, NOW, SESSION_ID, PERSON, ACCOUNT, APP, type ConformanceInput } from "../../../shared/authz/conformance.ts";
import { acceptResponse, noGrantProducer, resolveReadAuthority, type ReadDeps } from "../../../shared/authz/protectedRead.ts";
import { admitSession } from "../../../shared/authz/session.ts";
import { EMPTY_REGISTRY, buildBindingRegistry } from "../../../shared/authz/scopeBinding.ts";
import { parseResourceGrants } from "../../../shared/authz/resourceGrant.ts";

const depsFor = (input: ConformanceInput, counters = { session: 0, grants: 0 }): ReadDeps => ({
  policy: { applicationId: APP, environment: input.environment },
  resolveSession: async () => { counters.session++; if (input.sessionBody === "throw") throw new Error("outage"); return input.sessionBody; },
  produceGrants: async () => { counters.grants++; if (input.grantsBody === "throw") throw new Error("outage"); return input.grantsBody; },
  registry: input.registry, now: () => input.nowMs,
});

// The reference evaluator: this is the decision every future binding must reproduce.
export const reference = async (input: ConformanceInput) => {
  const r = await resolveReadAuthority(depsFor(input), input.presentedSessionId, input.requestedScope);
  return r.allowed ? { allowed: true, scopeRefs: r.context.scopeRefs } : { allowed: false };
};

test("reference evaluator satisfies every conformance case", async () => {
  const r = await runConformance(reference);
  assert.deepEqual(r.failures, []);
  assert.equal(r.passed, CONFORMANCE_CASES.length);
  assert.ok(CONFORMANCE_CASES.length >= 25);
});

// Mutation checks: each deliberately wrong binding must be caught by at least one case (the suite is not vacuous).
const mutants: Record<string, (i: ConformanceInput) => Promise<{ allowed: boolean; scopeRefs?: readonly string[] }>> = {
  "allows when the grant producer is unavailable (permissive fallback)": async (i) => (i.grantsBody === "throw" ? { allowed: true, scopeRefs: ["scope-a"] } : reference(i)),
  "allows when central outage (fail-open)": async (i) => (i.sessionBody === "throw" ? { allowed: true, scopeRefs: ["scope-a"] } : reference(i)),
  "infers company access from accountId": async (i) => {
    const s = i.sessionBody as { data?: { allowed?: boolean; accountId?: string } };
    return s?.data?.allowed === true && s.data.accountId ? { allowed: true, scopeRefs: ["scope-a", "scope-b"] } : { allowed: false };
  },
  "widens by the requested route scope": async (i) => (i.requestedScope && REGISTRY.byScope.has(i.requestedScope) ? { allowed: true, scopeRefs: [i.requestedScope] } : reference(i)),
  "ignores grant expiry": async (i) => reference({ ...i, grantsBody: JSON.parse(JSON.stringify(i.grantsBody === "throw" ? {} : i.grantsBody), (k, v) => (k === "expiresAt" ? null : v)) }),
  "ignores grant revocation": async (i) => reference({ ...i, grantsBody: JSON.parse(JSON.stringify(i.grantsBody === "throw" ? {} : i.grantsBody), (k, v) => (k === "revokedAt" ? null : v)) }),
  "ignores application on the session": async (i) => reference({ ...i, sessionBody: JSON.parse(JSON.stringify(i.sessionBody === "throw" ? {} : i.sessionBody), (k, v) => (k === "applicationId" ? APP : v)) }),
  "treats developer review as resource authority": async (i) => {
    const s = i.sessionBody as { data?: { decisionMode?: string } };
    return s?.data?.decisionMode === "developer_bypass" ? { allowed: true, scopeRefs: ["scope-a"] } : reference(i);
  },
  "uses unverified bindings": async (i) => (i.requestedScope === "scope-draft" ? { allowed: true, scopeRefs: ["scope-draft"] } : reference(i)),
};
for (const [name, mutant] of Object.entries(mutants)) {
  test(`conformance catches mutant: ${name}`, async () => {
    const r = await runConformance(mutant);
    assert.ok(r.failures.length > 0, `mutant "${name}" passed every case`);
  });
}

test("default producer and default registry deny everything", async () => {
  const input: ConformanceInput = { presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: "throw", requestedScope: null, registry: EMPTY_REGISTRY, nowMs: NOW, environment: "production" };
  const deps = { ...depsFor(input), produceGrants: noGrantProducer };
  const r = await resolveReadAuthority(deps, SESSION_ID);
  assert.deepEqual(r, { allowed: false, reason: "AUTHORITY_UNAVAILABLE" });
});

test("authority is resolved afresh on every request; a revocation between requests denies the second", async () => {
  const counters = { session: 0, grants: 0 };
  let revoked = false;
  const input: ConformanceInput = { presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: grantsEnvelope(grant()), requestedScope: null, registry: REGISTRY, nowMs: NOW, environment: "production" };
  const deps: ReadDeps = { ...depsFor(input, counters), resolveSession: async () => { counters.session++; return revoked ? sessionEnvelope({ allowed: false }) : sessionEnvelope(); } };
  assert.equal((await resolveReadAuthority(deps, SESSION_ID)).allowed, true);
  revoked = true;
  assert.equal((await resolveReadAuthority(deps, SESSION_ID)).allowed, false);
  assert.equal(counters.session, 2);
});

test("a grant revoked between requests denies the next request", async () => {
  let grants: unknown = grantsEnvelope(grant());
  const input: ConformanceInput = { presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: null, requestedScope: null, registry: REGISTRY, nowMs: NOW, environment: "production" };
  const deps: ReadDeps = { ...depsFor(input), produceGrants: async () => grants };
  assert.equal((await resolveReadAuthority(deps, SESSION_ID)).allowed, true);
  grants = grantsEnvelope(grant({ revokedAt: new Date(NOW - 1).toISOString() }));
  assert.deepEqual(await resolveReadAuthority(deps, SESSION_ID), { allowed: false, reason: "NO_RESOURCE_GRANTS" });
});

test("stale responses: a response is accepted only under the binding still current", async () => {
  const input: ConformanceInput = { presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: grantsEnvelope(grant()), requestedScope: null, registry: REGISTRY, nowMs: NOW, environment: "production" };
  const first = await resolveReadAuthority(depsFor(input), SESSION_ID);
  const second = await resolveReadAuthority(depsFor({ ...input, grantsBody: grantsEnvelope(grant({ revision: 2 })) }), SESSION_ID);
  assert.ok(first.allowed && second.allowed);
  if (first.allowed && second.allowed) {
    assert.equal(acceptResponse(first.context.binding, first.context.binding), true);
    assert.equal(acceptResponse(first.context.binding, second.context.binding), false, "grant revision drift");
    assert.equal(acceptResponse(first.context.binding, null), false, "authority lost");
    assert.doesNotMatch(first.context.binding, new RegExp(SESSION_ID), "binding must not contain the session credential");
  }
});

test("a different person on the same pooled server gets a different binding and actor", async () => {
  const other = "10000000-0000-4000-8000-000000000002";
  const a = await resolveReadAuthority(depsFor({ presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: grantsEnvelope(grant()), requestedScope: null, registry: REGISTRY, nowMs: NOW, environment: "production" }), SESSION_ID);
  const b = await resolveReadAuthority(depsFor({ presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope({ personId: other }), grantsBody: grantsEnvelope(grant({ personId: other })), requestedScope: null, registry: REGISTRY, nowMs: NOW, environment: "production" }), SESSION_ID);
  assert.ok(a.allowed && b.allowed);
  if (a.allowed && b.allowed) { assert.notEqual(a.context.actor, b.context.actor); assert.notEqual(a.context.binding, b.context.binding); }
});

test("admission: production never accepts developer review mode; review envs require the exact capability", () => {
  const dev = sessionEnvelope({ decisionMode: "developer_bypass", billingMode: "not_applicable_developer", banner: "DEV BYPASS · READ ONLY", capabilities: ["ui.review.read"] });
  assert.equal(admitSession(dev, SESSION_ID, { applicationId: APP, environment: "production" }, NOW).admitted, false);
  assert.equal(admitSession(dev, SESSION_ID, { applicationId: APP, environment: "preview" }, NOW).admitted, true);
  const wide = sessionEnvelope({ decisionMode: "developer_bypass", billingMode: "not_applicable_developer", banner: "DEV BYPASS · READ ONLY", capabilities: ["ui.review.read", "app.development.write"] });
  assert.equal(admitSession(wide, SESSION_ID, { applicationId: APP, environment: "preview" }, NOW).admitted, false);
});

test("admission: pinned person/account, strict envelope and truthy-string handling", () => {
  const p = { applicationId: APP, environment: "production" as const, pin: { personId: PERSON, accountId: ACCOUNT } };
  assert.equal(admitSession(sessionEnvelope(), SESSION_ID, p, NOW).admitted, true);
  assert.equal(admitSession(sessionEnvelope({ personId: "10000000-0000-4000-8000-000000000009" }), SESSION_ID, p, NOW).admitted, false);
  for (const bad of ["true", 1, {}, "yes"]) assert.equal(admitSession(sessionEnvelope({ allowed: bad }), SESSION_ID, p, NOW).admitted, false);
  assert.equal(admitSession({ ...sessionEnvelope(), error: { code: "X" } }, SESSION_ID, p, NOW).admitted, false);
  assert.equal(admitSession({ ...sessionEnvelope(), meta: { contractVersion: "2.0.0", source: "control-plane" } }, SESSION_ID, p, NOW).admitted, false);
  assert.equal(admitSession(sessionEnvelope(), "bad session id with spaces", p, NOW).admitted, false);
});

test("binding registry: duplicate scope_ref to two companies is rejected entirely; bad entries never authorize", () => {
  const r = buildBindingRegistry([
    { scopeRef: "s1", companyId: "30000000-0000-4000-8000-00000000000a", status: "verified", reviewRef: "r" },
    { scopeRef: "s1", companyId: "30000000-0000-4000-8000-00000000000b", status: "verified", reviewRef: "r" },
    { scopeRef: "bad,ref", companyId: "30000000-0000-4000-8000-00000000000a", status: "verified", reviewRef: "r" },
    { scopeRef: "s2", companyId: "not-a-uuid", status: "verified", reviewRef: "r" },
    { scopeRef: "s3", companyId: "30000000-0000-4000-8000-00000000000a", status: "verified", reviewRef: "  " },
  ]);
  assert.equal(r.byScope.size, 0);
  assert.ok(r.rejected.length >= 4);
});

test("resource grants: strict parse drops doubtful grants and never invents one", () => {
  assert.deepEqual(parseResourceGrants(null), { grants: [], rejected: 0 });
  assert.deepEqual(parseResourceGrants({ data: { grants: "x" }, error: null, meta: { source: "control-plane" } }).grants, []);
  const mixed = parseResourceGrants(grantsEnvelope(grant(), grant({ resourceType: "property" }), grant({ companyId: "name" }), grant({ revision: 0 }), grant({ expiresAt: "soon" })));
  assert.equal(mixed.grants.length, 1);
  assert.equal(mixed.rejected, 4);
});
