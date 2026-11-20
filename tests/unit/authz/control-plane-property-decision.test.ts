import assert from "node:assert/strict";
import { test } from "node:test";
import { makeControlPlanePropertyDecision, makeControlPlaneProtectedPropertyReader } from "../../../server/lib/authz/controlPlanePropertyDecision";

const settings = {
  origin: "https://control.example.invalid",
  clientId: "ecc-test",
  clientAssertion: "synthetic-test-assertion",
};
const input = {
  applicationSessionId: "test-session",
  companyId: "44444444-4444-4444-8444-444444444444",
  resourceType: "ecc.property",
  resourceId: "fixture-connection:property-one",
  action: "read",
} as const;

test("posts one exact request to the fixed authority endpoint on each call", async () => {
  let calls = 0;
  const decide = makeControlPlanePropertyDecision(settings, async (url, init) => {
    calls++;
    assert.equal(String(url), settings.origin + "/api/control/v1/resource-grants/evaluate");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal instanceof AbortSignal);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-Control-Client-Id"), settings.clientId);
    assert.equal(headers.get("X-Control-Client-Assertion"), settings.clientAssertion);
    assert.equal(headers.get("cookie"), null);
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json({ decision: "allow" });
  });
  const withExtra = { ...input, privateField: "excluded" };
  assert.deepEqual(await decide(withExtra), { status: 200, body: { decision: "allow" } });
  await decide(input);
  assert.equal(calls, 2);
});

test("denial bodies, malformed success and transport errors never return a decision", async () => {
  const responses = [
    Response.json({ private: "fixture" }, { status: 403 }),
    new Response("fixture HTML", { headers: { "content-type": "text/html" } }),
    new Response("{", { headers: { "content-type": "application/json" } }),
  ];
  const decide = makeControlPlanePropertyDecision(settings, async () => {
    const response = responses.shift();
    if (!response) throw new Error(settings.clientAssertion);
    return response;
  });
  assert.deepEqual(await decide(input), { status: 403, body: null });
  for (let i = 0; i < 3; i++) assert.deepEqual(await decide(input), { status: 503, body: null });
});

test("rejects non-HTTPS, credential-bearing, and route-bearing origins before requests", () => {
  for (const origin of ["http://control.example.invalid", "https://user@control.example.invalid", settings.origin + "/other", settings.origin + "?x=1"]) {
    assert.throws(() => makeControlPlanePropertyDecision({ ...settings, origin }), /configured HTTPS origin/);
  }
  assert.throws(() => makeControlPlanePropertyDecision({ ...settings, clientAssertion: "" }), /not configured/);
});

test("composed reader asks Control Plane and never reads a card on revocation", async () => {
  const now = Date.parse("2026-11-19T12:00:00Z");
  let calls = 0;
  const read = makeControlPlaneProtectedPropertyReader(settings, {
    policy: { applicationId: "ecc", environment: "test" },
    now: () => now,
    resolveSession: async () => ({
      error: null,
      meta: { contractVersion: "1.0.0", source: "control-plane" },
      data: {
        applicationSessionId: input.applicationSessionId, allowed: true, applicationId: "ecc",
        personId: "11111111-1111-4111-8111-111111111111",
        accountId: "22222222-2222-4222-8222-222222222222",
        decisionMode: "canonical", billingMode: "canonical", banner: null,
        expiresAt: "2026-11-19T12:01:00Z",
      },
    }),
    resolveVerifiedBinding: async () => ({
      propertyId: 7, companyId: input.companyId, connectionRef: "fixture-connection",
      nativeProviderPropertyId: "property-one", workingEntityId: "55555555-5555-4555-8555-555555555555",
    }),
    readCard: async () => { throw new Error("revoked grant reached the reader"); },
  }, async (_url, init) => {
    calls++;
    assert.deepEqual(JSON.parse(String(init?.body)), input);
    return Response.json({ code: "RESOURCE_NOT_AUTHORIZED" }, { status: 403 });
  });
  assert.deepEqual(await read(input.applicationSessionId, 7), { outcome: "denied" });
  assert.equal(calls, 1);
});
