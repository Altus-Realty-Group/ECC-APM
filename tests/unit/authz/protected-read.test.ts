import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFORMANCE_CASES, inputClock, runConformance, sessionEnvelope, grantsEnvelope, grant, REGISTRY, NOW, SESSION_ID, PERSON, ACCOUNT, APP, type ConformanceInput } from "../../../shared/authz/conformance.ts";
import { acceptResponse, noGrantProducer, resolveReadAuthority, type ReadDeps } from "../../../shared/authz/protectedRead.ts";
import { admitSession } from "../../../shared/authz/session.ts";
import { EMPTY_REGISTRY, buildBindingRegistry } from "../../../shared/authz/scopeBinding.ts";
import { parseResourceGrants } from "../../../shared/authz/resourceGrant.ts";

const depsFor = (input: ConformanceInput, counters = { session: 0, grants: 0 }): ReadDeps => ({
  policy: { applicationId: APP, environment: input.environment },
  resolveSession: async () => { counters.session++; if (input.sessionBody === "throw") throw new Error("outage"); return input.sessionBody; },
  produceGrants: async () => { counters.grants++; if (input.grantsBody === "throw") throw new Error("outage"); return input.grantsBody; },
  registry: input.registryOutage ? async () => { throw new Error("binding source down"); } : input.registry, now: inputClock(input),
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
  assert.ok(CONFORMANCE_CASES.length >= 50);
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
  "reads the clock once, before the asynchronous reads": async (i) => {
    const first = inputClock(i)();
    const d = depsFor(i); d.now = () => first;
    const r = await resolveReadAuthority(d, i.presentedSessionId, i.requestedScope);
    return r.allowed ? { allowed: true, scopeRefs: r.context.scopeRefs } : { allowed: false };
  },
  "treats a missing expiresAt as non-expiring": async (i) => {
    const b = (i.grantsBody === "throw" ? i.grantsBody : structuredClone(i.grantsBody)) as { data?: { grants?: Record<string, unknown>[] } };
    if (b && b !== ("throw" as unknown) && Array.isArray(b.data?.grants)) b.data!.grants = b.data!.grants!.map((g) => (g && typeof g === "object" && !("expiresAt" in g) ? { ...g, expiresAt: null } : g));
    return reference({ ...i, grantsBody: b });
  },
  "accepts any grant contract version": async (i) => reference({ ...i, grantsBody: i.grantsBody === "throw" ? i.grantsBody : { ...(i.grantsBody as object), meta: { contractVersion: "1.0.0", source: "control-plane" } } }),
  "picks the first binding record when a scope has several": async (i) => {
    const first = [...i.registry.byScope.values()];
    return reference({ ...i, registry: { ...i.registry, invalidScopes: new Set<string>(), byScope: new Map(first.map((b) => [b.scopeRef, { ...b, status: "verified" as const }])) } });
  },
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
  assert.ok(r.invalidScopes.has("s1") && r.invalidScopes.has("s3"), "conflicting or malformed records invalidate the scope");
  assert.ok(r.rejected.length >= 4);
});

test("resource grants: strict parse drops doubtful grants and never invents one", () => {
  assert.deepEqual(parseResourceGrants(null), { grants: [], rejected: 0 });
  assert.deepEqual(parseResourceGrants({ data: { grants: "x" }, error: null, meta: { source: "control-plane" } }).grants, []);
  const mixed = parseResourceGrants(grantsEnvelope(grant(), grant({ resourceType: "property" }), grant({ companyId: "name" }), grant({ revision: 0 }), grant({ expiresAt: "soon" })));
  assert.equal(mixed.grants.length, 1);
  assert.equal(mixed.rejected, 4);
  // A missing instant key is malformed (never non-expiring); an explicit null is the producer's declared "none".
  const g = grant(); const noExp: Record<string, unknown> = { ...g }; delete noExp.expiresAt;
  assert.equal(parseResourceGrants(grantsEnvelope(noExp)).grants.length, 0);
  assert.equal(parseResourceGrants(grantsEnvelope(grant({ expiresAt: null }))).grants[0].expiresAtMs, null);
});

test("binding registry is order-independent for every permutation of conflicting records", () => {
  const A = "30000000-0000-4000-8000-00000000000a", B = "30000000-0000-4000-8000-00000000000b";
  const recs = [
    { scopeRef: "s", companyId: A, status: "verified", reviewRef: "r" },
    { scopeRef: "s", companyId: A, status: "retired", reviewRef: "r" },
    { scopeRef: "s", companyId: B, status: "verified", reviewRef: "r" },
    { scopeRef: "ok", companyId: A, status: "verified", reviewRef: "r" },
  ];
  const perms = (xs: unknown[]): unknown[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
  const shape = (r: ReturnType<typeof buildBindingRegistry>) => JSON.stringify({ ok: [...r.byScope.keys()].sort(), bad: [...r.invalidScopes].sort(), rej: r.rejected });
  const all = perms(recs).map((p) => shape(buildBindingRegistry(p)));
  assert.equal(new Set(all).size, 1, "result must not depend on entry order");
  assert.equal(all[0], shape(buildBindingRegistry(recs)));
  assert.deepEqual(JSON.parse(all[0]).ok, ["ok"]);
  assert.deepEqual(JSON.parse(all[0]).bad, ["s"]);
  // An identical duplicate is also invalid: a registry source with repeated rows must be fixed, not guessed at.
  assert.equal(buildBindingRegistry([recs[0], recs[0]]).byScope.size, 0);
});

test("the issuer response and the grant read are followed by fresh clock readings (clock-advance proof)", async () => {
  let reads = 0;
  const input: ConformanceInput = { presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: grantsEnvelope(grant()), requestedScope: null, registry: REGISTRY, nowMs: NOW, environment: "production" };
  const deps: ReadDeps = { ...depsFor(input), now: () => { reads++; return NOW; } };
  assert.equal((await resolveReadAuthority(deps, SESSION_ID)).allowed, true);
  assert.ok(reads >= 5, `expected a reading before, after the issuer read, after the grant read, after the binding read and one before allow; got ${reads}`);
});

test("context validity is the earliest of session expiry and contributing grant expiries", async () => {
  const input: ConformanceInput = { presentedSessionId: SESSION_ID, sessionBody: sessionEnvelope(), grantsBody: grantsEnvelope(grant({ expiresAt: new Date(NOW + 900_000).toISOString() }), grant({ grantId: "40000000-0000-4000-8000-000000000002", companyId: "30000000-0000-4000-8000-00000000000b", expiresAt: new Date(NOW + 60_000).toISOString() })), requestedScope: "scope-a", registry: REGISTRY, nowMs: NOW, environment: "production" };
  const r = await resolveReadAuthority(depsFor(input), SESSION_ID, "scope-a");
  assert.ok(r.allowed);
  if (r.allowed) assert.equal(r.context.validUntilMs, NOW + 900_000, "the other company's earlier expiry does not bound a scope-a read");
});
