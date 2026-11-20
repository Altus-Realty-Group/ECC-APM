import assert from "node:assert/strict";
import { once } from "node:events";
import { type AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import { createProtectedPropertyCardRouter } from "../../../server/routes/protectedPropertyCard";
import { makeControlPlaneProtectedPropertyReader } from "../../../server/lib/authz/controlPlanePropertyDecision";

test("same-origin property card requires a server session and a fresh exact grant", async (t) => {
  const subject = "11111111-1111-4111-8111-111111111111";
  const companyId = "44444444-4444-4444-8444-444444444444";
  const workingEntityId = "55555555-5555-4555-8555-555555555555";
  const applicationSessionId = "test-session";
  const resourceId = "fixture-connection:property-one";
  let session: string | null = null;
  let decisionCalls = 0;
  let reads = 0;
  let mode: "allowed" | "wrong-company" | "revoked" | "unavailable" = "allowed";

  const readProperty = makeControlPlaneProtectedPropertyReader({
    origin: "https://control.example.invalid", clientId: "ecc-test", clientAssertion: "synthetic-test-assertion",
  }, {
    policy: { applicationId: "ecc", environment: "test" },
    now: () => Date.parse("2026-11-19T12:00:00Z"),
    resolveSession: async () => ({
      error: null, meta: { contractVersion: "1.0.0", source: "control-plane" },
      data: {
        applicationSessionId, allowed: true, applicationId: "ecc", personId: subject,
        accountId: "22222222-2222-4222-8222-222222222222", expiresAt: "2026-11-19T12:01:00Z",
        decisionMode: "canonical", billingMode: "canonical", banner: null,
      },
    }),
    resolveVerifiedBinding: async id => id === 7 ? ({
      propertyId: 7, companyId, workingEntityId,
      connectionRef: "fixture-connection", nativeProviderPropertyId: "property-one",
    }) : null,
    readCard: async scope => {
      reads++;
      assert.equal(scope.companyId, companyId);
      assert.equal(scope.workingEntityId, workingEntityId);
      assert.equal(scope.actor, subject);
      return { property: { id: 7, name: "Fixture property", address: {} }, kpis: { units: 0 }, privateField: "not projected" };
    },
  }, async (_url, init) => {
    decisionCalls++;
    assert.deepEqual(JSON.parse(String(init?.body)), {
      applicationSessionId, companyId, resourceType: "ecc.property", resourceId, action: "read",
    });
    if (mode === "revoked") return Response.json({ code: "RESOURCE_NOT_AUTHORIZED" }, { status: 403 });
    if (mode === "unavailable") return Response.json({ detail: "private backend detail" }, { status: 503 });
    return Response.json({
      action: "read", assuranceLevel: "aal1", companyId: mode === "wrong-company" ? subject : companyId,
      contractVersion: "control.resource.grant.v1", decision: "allow", decisionExpiresAt: "2026-11-19T12:00:30Z",
      decisionMaxSeconds: 30, environment: "test", grantId: "test-grant", issuer: "altus-control-plane", resourceId,
      resourceType: "ecc.property", revocation: "checked_at_decision_not_recalled", sourceInstance: "ecc-test", subject,
    });
  });

  const app = express();
  app.use("/api/rpc", createProtectedPropertyCardRouter({ resolveSessionId: () => session, readProperty }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/rpc/get_property_card`;
  const call = async (query: string, method = "GET") => {
    const result = await fetch(base + query, { method, headers: { "X-Session-Id": applicationSessionId } });
    assert.match(result.headers.get("cache-control") ?? "", /no-store/);
    return { status: result.status, body: await result.json() };
  };

  assert.deepEqual(await call("?id=7"), { status: 401, body: { error: "unauthenticated" } });
  session = applicationSessionId;
  for (const query of ["?id=7&id=7", "?id=7&companyId=other", "?id=9007199254740992", "?id=7.0", "?id=7%0A", "?id=+7", "?id=07", ""]) {
    assert.deepEqual(await call(query), { status: 400, body: { error: "invalid property id" } });
  }
  assert.deepEqual(await call("?id=7", "POST"), { status: 405, body: { error: "method not allowed" } });
  assert.equal(decisionCalls, 0);
  const ready = await call("?id=7");
  assert.equal(ready.status, 200);
  assert.equal(ready.body.property.id, 7);
  assert.equal(ready.body.kpis.units, 0);
  assert.equal("privateField" in ready.body, false);

  for (const deniedMode of ["wrong-company", "revoked"] as const) {
    mode = deniedMode;
    assert.deepEqual(await call("?id=7"), { status: 403, body: { error: "not permitted" } });
  }
  assert.deepEqual(await call("?id=8"), { status: 403, body: { error: "not permitted" } });
  mode = "unavailable";
  assert.deepEqual(await call("?id=7"), { status: 503, body: { error: "unavailable" } });
  assert.equal(decisionCalls, 4);
  assert.equal(reads, 1);
});
