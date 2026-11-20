import assert from "node:assert/strict";
import { test } from "node:test";
import { readProtectedProperty, type PropertyReadDependencies } from "../../../shared/authz/propertyRead";

const start = Date.parse("2026-11-18T12:00:00Z");
const sessionId = "33333333-3333-4333-8333-333333333333";
const actor = "11111111-1111-4111-8111-111111111111";
const binding = {
  propertyId: 7,
  companyId: "44444444-4444-4444-8444-444444444444",
  nativeProviderPropertyId: "prop-synthetic-0001",
  workingEntityId: "55555555-5555-4555-8555-555555555555",
  connectionRef: "fixture-connection",
};
const resourceId = "fixture-connection:prop-synthetic-0001";
const session = {
  applicationId: "ecc", applicationSessionId: sessionId, allowed: true,
  personId: actor, accountId: "22222222-2222-4222-8222-222222222222", expiresAt: "2026-11-18T12:02:00Z",
  decisionMode: "canonical", billingMode: "canonical", banner: null,
};
const allow = {
  action: "read", assuranceLevel: "aal1", companyId: binding.companyId,
  contractVersion: "control.resource.grant.v1", decision: "allow",
  decisionExpiresAt: "2026-11-18T12:01:00Z", decisionMaxSeconds: 60, environment: "development",
  grantId: "66666666-6666-4666-8666-666666666666", issuer: "altus-control-plane",
  resourceId, resourceType: "ecc.property",
  revocation: "checked_at_decision_not_recalled", sourceInstance: "ecc-dev", subject: actor,
};
const card = { property: { id: 7, address: {}, name: "Fixture property" }, kpis: { units: 0 }, privateField: "not projected" };

function fixture() {
  const reads: unknown[] = [];
  const decisions: unknown[] = [];
  let now = start;
  const deps: PropertyReadDependencies = {
    policy: { applicationId: "ecc", environment: "development" }, clientId: "ecc-dev",
    now: () => now,
    resolveSession: async () => ({ error: null, data: session, meta: { source: "control-plane", contractVersion: "1.0.0" } }),
    resolveVerifiedBinding: async () => binding,
    decide: async (request) => { decisions.push(request); return { status: 200, body: allow }; },
    readCard: async (scope) => { reads.push(scope); return card; },
  };
  return { deps, reads, decisions, setTime: (time: number) => { now = time; } };
}

test("requires a fresh exact authority for each card and returns only the existing card projection", async () => {
  const { deps, reads, decisions } = fixture();
  for (let n = 0; n < 2; n++) {
    const result = await readProtectedProperty(deps, sessionId, 7);
    assert.equal(result.outcome, "ready");
    if (result.outcome !== "ready") throw new Error("fixture denied");
    assert.equal(result.card.property.id, 7);
    assert.equal(result.card.kpis.units, 0);
    assert.equal("privateField" in result.card, false);
  }
  assert.deepEqual(decisions, Array(2).fill({
    applicationSessionId: sessionId, companyId: binding.companyId,
    resourceType: "ecc.property", resourceId, action: "read",
  }));
  assert.deepEqual(reads, Array(2).fill({ ...binding, actor, validUntilMs: start + 60_000 }));
});

test("mismatched grant scopes, contract fields and expiry never reach the reader", async () => {
  for (const patch of [
    { subject: binding.companyId }, { companyId: actor }, { resourceId: "different" },
    { sourceInstance: "other-client" }, { environment: "preview" }, { action: "write" },
    { issuer: "other" }, { decisionExpiresAt: "2026-11-18T12:01:01Z" },
    { decisionExpiresAt: "2026-11-18T12:00:00Z" }, { decisionMaxSeconds: 61 },
    { decision: "deny" }, { unrelated: true },
  ]) {
    const { deps, reads } = fixture();
    deps.decide = async () => ({ status: 200, body: { ...allow, ...patch } });
    assert.deepEqual(await readProtectedProperty(deps, sessionId, 7), { outcome: "denied" }, JSON.stringify(patch));
    assert.deepEqual(reads, []);
  }
});

test("missing session, wrong property binding and grant refusal share a denial without reading data", async () => {
  const { deps, decisions, reads } = fixture();
  assert.equal((await readProtectedProperty(deps, null, 7)).outcome, "denied");
  assert.equal((await readProtectedProperty(deps, sessionId, 8)).outcome, "denied");
  assert.deepEqual(decisions, []);
  deps.decide = async () => ({ status: 403, body: { code: "RESOURCE_NOT_AUTHORIZED" } });
  assert.equal((await readProtectedProperty(deps, sessionId, 7)).outcome, "denied");
  deps.decide = async () => ({ status: 503, body: null });
  assert.equal((await readProtectedProperty(deps, sessionId, 7)).outcome, "unavailable");
  assert.deepEqual(reads, []);
});

test("expiry during read discards the result and a mismatched card cannot escape", async () => {
  const { deps, setTime } = fixture();
  deps.readCard = async () => { setTime(start + 60_000); return card; };
  assert.deepEqual(await readProtectedProperty(deps, sessionId, 7), { outcome: "denied" });
  setTime(start);
  deps.readCard = async () => ({ ...card, property: { ...card.property, id: 8 } });
  assert.deepEqual(await readProtectedProperty(deps, sessionId, 7), { outcome: "unavailable" });
});

test("rejects ambiguous provider identifiers before asking for a decision", async () => {
  for (const patch of [{ connectionRef: "fixture:other" }, { nativeProviderPropertyId: "other:property" }]) {
    const { deps, decisions, reads } = fixture();
    deps.resolveVerifiedBinding = async () => ({ ...binding, ...patch });
    assert.deepEqual(await readProtectedProperty(deps, sessionId, 7), { outcome: "denied" });
    assert.deepEqual(decisions, []);
    assert.deepEqual(reads, []);
  }
});
