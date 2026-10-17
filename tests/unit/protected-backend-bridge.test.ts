import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { bridgeConfig, allowedRead, protectedBackendMiddleware, workspaceConnections } from "../../scripts/protected-backend-bridge.mjs";

const person = "10000000-0000-4000-8000-000000000001", account = "20000000-0000-4000-8000-000000000001";
const env = { ECC_BACKEND_ORIGIN: "https://records.example.test", ECC_CONTROL_PLANE_ORIGIN: "https://control.example.test", ECC_PUBLIC_ORIGIN: "https://ecc.example.test",
  ECC_APPLICATION_ID: "ecc-apm", ECC_CONTROL_CLIENT_ID: "ecc-preview", ECC_CONTROL_CLIENT_ASSERTION: "isolated-server-assertion", ECC_OWNER_PERSON_ID: person,
  ECC_OWNER_ACCOUNT_ID: account, ECC_ENVIRONMENT: "preview", ECC_SESSION_SEAL_KEY: "ab".repeat(32) };
const instant = Date.parse("2026-10-17T15:00:00Z");
const identity = (patch = {}) => ({ applicationSessionId: "isolated-session", personId: person, accountId: account, applicationId: "ecc-apm", expiresAt: "2026-10-17T16:00:00Z", allowed: true, decisionMode: "canonical", billingMode: "canonical", banner: null, ...patch });
const envelope = (data: unknown) => ({ data, error: null, meta: { contractVersion: "1.0.0", source: "control-plane" } });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
async function withServer(options: Record<string, unknown>, action: (base: string) => Promise<void>) {
  const middleware = protectedBackendMiddleware(options);
  const server = createServer((req, res) => void middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  try { await action(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
const auth = { cookie: "__Host-ecc-session=isolated-session" };

test('operational navigation is server-configured, session-gated and never sent to the business backend', async () => {
  const configured = { ...env, ECC_FIELD_APP_ORIGIN: 'https://field.example.com', ECC_CONSTRUCTION_MANAGER_ORIGIN: 'https://construction.example.com', ECC_DEAL_ROOM_ORIGIN: 'https://deal.example.com' };
  const expected = { applications: [
    { key: 'field-app', navigationUrl: 'https://field.example.com/properties' },
    { key: 'construction-manager', navigationUrl: 'https://construction.example.com/projects' },
    { key: 'deal-room', navigationUrl: 'https://deal.example.com/' },
    { key: 'property-intelligence', navigationUrl: null },
  ] };
  assert.deepEqual(workspaceConnections(configured), expected);
  for (const target of [undefined, 'http://field.example.com', 'https://field.example.com/path', 'https://u:p@field.example.com', 'https://localhost', 'https://127.0.0.1', 'https://field.internal', 'https://field.example.test', 'https://field.invalid', 'https://field.example.com.', 'https://field.example.com:8443']) {
    assert.equal(workspaceConnections({ ECC_FIELD_APP_ORIGIN: target }).applications[0].navigationUrl, null);
  }
  let calls = 0;
  await withServer({ env: configured, now: () => instant, fetcher: async (url: string) => { calls++; assert.match(url, /\/session\/current$/); return json(envelope(identity())); } }, async base => {
    assert.equal((await fetch(base + '/api/workspace/connections')).status, 401); assert.equal(calls, 0);
    const response = await fetch(base + '/api/workspace/connections', { headers: auth });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.deepEqual(await response.json(), expected);
    assert.equal((await fetch(base + '/api/workspace/connections?origin=https://other.example.test', { headers: auth })).status, 404);
    assert.equal((await fetch(base + '/api/workspace/connections', { headers: auth, method: 'POST' })).status, 405);
    assert.equal(calls, 2);
  });
});

test("bridge requires every explicit server binding; no insecure target or local role fallback", () => {
  assert.ok(bridgeConfig(env));
  for (const key of Object.keys(env)) assert.equal(bridgeConfig({ ...env, [key]: "" }), null, key);
  for (const value of ["http://example.test", "https://user:pass@example.test", "https://example.test/api", "https://example.test/?token=x"]) {
    assert.equal(bridgeConfig({ ...env, ECC_BACKEND_ORIGIN: value }), null);
  }
  assert.equal(bridgeConfig({ ...env, ECC_BACKEND_ORIGIN: env.ECC_PUBLIC_ORIGIN }), null);
});

test("unbound and unauthenticated reads never reach any upstream", async () => {
  let calls = 0;
  const fetcher = () => { calls++; throw new Error("Forbidden"); };
  await withServer({ env: {}, fetcher }, async base => {
    const response = await fetch(base + "/api/portfolio/properties");
    assert.equal(response.status, 503); assert.equal((await response.json()).error, "BACKEND_NOT_CONNECTED");
  });
  await withServer({ env, fetcher }, async base => {
    assert.equal((await fetch(base + "/api/portfolio/properties")).status, 401);
    assert.equal((await fetch(base + "/api/portfolio/properties", { headers: { cookie: auth.cookie + "; " + auth.cookie } })).status, 401);
    assert.equal((await fetch(base + "/api/portfolio/properties", { method: "POST", body: "{}" })).status, 405);
  });
  assert.equal(calls, 0);
});

test("only exact reviewed portfolio, dashboard and valid numeric card reads can be forwarded", () => {
  for (const path of ["/api/portfolio/properties", "/api/portfolio/owners", "/api/dashboard/kpi/summary", "/api/rpc/get_lease_card?id=7"]) assert.equal(allowedRead(new URL(path, env.ECC_PUBLIC_ORIGIN)), true);
  for (const path of ["/api/entities/secrets", "/api/rpc/diag/ids", "/api/rpc/exec_sql", "/bff/owners/executetransfer", "/api/portfolio/raw", "/api/portfolio/owners?accountId=other", "/api/dashboard/kpi/summary?debug=true", "/api/rpc/get_owner_card?id=7&accountId=other", "/api/rpc/get_lease_card?id=0", "/api/rpc/get_lease_card?id=abc", "/api/rpc/get_lease_card?id=1&id=2"]) assert.equal(allowedRead(new URL(path, env.ECC_PUBLIC_ORIGIN)), false);
});

test("every read requires current attested owner/person/account/app; no cached allow survives revocation", async () => {
  let currentCalls = 0, dataCalls = 0, active = true;
  await withServer({ env, now: () => instant, fetcher: async (url: string, init: RequestInit) => {
    assert.equal(init.redirect, "error"); assert.ok(init.signal);
    if (url.startsWith(env.ECC_CONTROL_PLANE_ORIGIN)) {
      currentCalls++;
      const headers = init.headers as Record<string, string>;
      assert.equal(headers["X-Control-Client-Assertion"], env.ECC_CONTROL_CLIENT_ASSERTION);
      return json(envelope(identity({ allowed: active })));
    }
    dataCalls++;
    assert.deepEqual(init.headers, { Accept: "application/json" });
    return json({ data: [{ id: 7, name: "Isolated source record" }], meta: { totalCount: 1 } });
  } }, async base => {
    const first = await fetch(base + "/api/portfolio/properties", { headers: auth });
    assert.equal(first.status, 200); assert.equal((await first.json()).data[0].name, "Isolated source record");
    assert.equal(first.headers.get("cache-control"), "no-store");
    active = false;
    const denied = await fetch(base + "/api/portfolio/properties", { headers: auth });
    assert.equal(denied.status, 403); assert.match(denied.headers.get("set-cookie") ?? "", /Max-Age=0/);
  });
  assert.equal(currentCalls, 2); assert.equal(dataCalls, 1);
});

test("malformed/expired/wrong owner and review-mode scope reject before business reads", async () => {
  for (const patch of [{ allowed: "true" }, { personId: account }, { accountId: person }, { applicationId: "another-app" }, { applicationSessionId: 7 },
    { expiresAt: "2026-10-16T00:00:00Z" }, { decisionMode: "local-admin" }, { decisionMode: "developer_bypass", capabilities: ["write"] }]) {
    let dataCalls = 0;
    await withServer({ env, now: () => instant, fetcher: async (url: string) => {
      if (url.startsWith(env.ECC_CONTROL_PLANE_ORIGIN)) return json(envelope(identity(patch)));
      dataCalls++; return json([]);
    } }, async base => assert.equal((await fetch(base + "/api/portfolio/leases", { headers: auth })).status, 403));
    assert.equal(dataCalls, 0);
  }
});

test("person-scoped review reads work only in preview/test/development and never mutate", async () => {
  for (const environment of ["preview", "staging", "production"]) {
    let reads = 0;
    await withServer({ env: { ...env, ECC_ENVIRONMENT: environment }, now: () => instant, fetcher: async (url: string) => {
      if (url.startsWith(env.ECC_CONTROL_PLANE_ORIGIN)) return json(envelope(identity({ decisionMode: "developer_bypass", capabilities: ["ui.review.read"], billingMode: "not_applicable_developer", banner: "DEV BYPASS · READ ONLY" })));
      reads++; return json([]);
    } }, async base => {
      assert.equal((await fetch(base + "/api/portfolio/units", { headers: auth })).status, environment === "preview" ? 200 : 403);
      assert.equal((await fetch(base + "/api/portfolio/units", { method: "DELETE", headers: auth })).status, 405);
    });
    assert.equal(reads, environment === "preview" ? 1 : 0);
  }
});

test("upstream failure, malformed success, HTML and timeout never become empty or expose raw errors", async () => {
  for (const result of [() => json({ error: "secret_table raw upstream" }, 500), () => json({ ok: false, items: [] }), () => new Response("<html>upstream</html>"), () => { throw new Error("secret internal detail"); }]) {
    await withServer({ env, now: () => instant, fetcher: async (url: string) => url.startsWith(env.ECC_CONTROL_PLANE_ORIGIN) ? json(envelope(identity())) : result() }, async base => {
      const response = await fetch(base + "/api/portfolio/properties", { headers: auth });
      assert.ok(response.status >= 500);
      assert.doesNotMatch(await response.text(), /secret|raw upstream|internal detail|html/);
    });
  }
});

test("sign-in delegates to Control Plane PKCE and callback verifies state, exchange, current authorization and secure cookie", async () => {
  let challenge = "", verifier = "", exchanges = 0;
  await withServer({ env, now: () => instant, fetcher: async (url: string, init: RequestInit) => {
    if (url.endsWith("/exchange")) {
      exchanges++; const body = JSON.parse(String(init.body)); verifier = body.codeVerifier;
      assert.equal(body.redirectUri, env.ECC_PUBLIC_ORIGIN + "/api/access/callback");
      assert.equal(createHash("sha256").update(verifier).digest("base64url"), challenge);
      return json(envelope(identity()));
    }
    return json(envelope(identity()));
  } }, async base => {
    const start = await fetch(base + "/api/access/sign-in", { redirect: "manual" });
    assert.equal(start.status, 302);
    const target = new URL(start.headers.get("location")!);
    assert.equal(target.origin, env.ECC_CONTROL_PLANE_ORIGIN); assert.equal(target.searchParams.get("codeChallengeMethod"), "S256");
    assert.equal(target.searchParams.get("applicationId"), "ecc-apm"); assert.ok(target.searchParams.get("nonce"));
    challenge = target.searchParams.get("codeChallenge")!;
    const cookie = start.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
    assert.doesNotMatch(cookie, /isolated-server-assertion|codeVerifier/);
    const bad = await fetch(base + "/api/access/callback?code=isolated-code&state=wrong", { headers: { cookie: cookie.split(";")[0] }, redirect: "manual" });
    assert.equal(bad.status, 403); assert.equal(exchanges, 0);
    const callback = await fetch(base + "/api/access/callback?code=isolated-code&state=" + target.searchParams.get("state"), { headers: { cookie: cookie.split(";")[0] }, redirect: "manual" });
    assert.equal(callback.status, 302); assert.equal(callback.headers.get("location"), env.ECC_PUBLIC_ORIGIN + "/dashboard");
    assert.match(callback.headers.get("set-cookie")!, /__Host-ecc-session=isolated-session/); assert.equal(exchanges, 1);
  });
});

test("tampered and expired login contexts cannot exchange a code", async () => {
  let clock = instant, calls = 0;
  await withServer({ env, now: () => clock, fetcher: () => { calls++; throw new Error(); } }, async base => {
    const start = await fetch(base + "/api/access/sign-in", { redirect: "manual" });
    const state = new URL(start.headers.get("location")!).searchParams.get("state");
    const stored = start.headers.get("set-cookie")!.split(";")[0];
    const tampered = await fetch(base + "/api/access/callback?code=x&state=" + state, { headers: { cookie: stored + "A" }, redirect: "manual" });
    assert.equal(tampered.status, 503);
    clock += 301000;
    const expired = await fetch(base + "/api/access/callback?code=x&state=" + state, { headers: { cookie: stored }, redirect: "manual" });
    assert.equal(expired.status, 403);
  });
  assert.equal(calls, 0);
});

test("sign-out permits only same-origin explicit application revocation and always clears local cookie", async () => {
  let calls = 0;
  await withServer({ env, now: () => instant, fetcher: async (url: string, init: RequestInit) => {
    calls++;
    if (url.endsWith("/logout")) { assert.equal(init.method, "POST"); assert.deepEqual(JSON.parse(String(init.body)), { scope: "application" }); return json(envelope({ scope: "application", revoked: true })); }
    return json(envelope(identity()));
  } }, async base => {
    const request = (origin: string, body = { scope: "application" }) => fetch(base + "/api/access/sign-out", { method: "POST", headers: { ...auth, origin, "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal((await request("https://attacker.example.test")).status, 403); assert.equal(calls, 0);
    assert.equal((await request(env.ECC_PUBLIC_ORIGIN, { scope: "global" })).status, 400); assert.equal(calls, 0);
    const result = await request(env.ECC_PUBLIC_ORIGIN);
    assert.equal(result.status, 200); assert.deepEqual(await result.json(), { signedOut: true, scope: "application" });
    assert.match(result.headers.get("set-cookie")!, /__Host-ecc-session=;.*Max-Age=0/);
    assert.match(result.headers.get("set-cookie")!, /__Host-ecc-login=;.*Max-Age=0/); assert.equal(calls, 2);
  });
});

test("review disclosure is attested and malformed billing/banner is refused", async () => {
  for (const banner of ["DEV BYPASS · READ ONLY", null, "approved"]) {
    await withServer({ env, now: () => instant, fetcher: async (url: string) => url.startsWith(env.ECC_CONTROL_PLANE_ORIGIN)
      ? json(envelope(identity({ decisionMode: "developer_bypass", capabilities: ["ui.review.read"], billingMode: "not_applicable_developer", banner }))) : json([]) }, async base => {
      const response = await fetch(base + "/api/portfolio/owners", { headers: auth });
      assert.equal(response.status, banner === "DEV BYPASS · READ ONLY" ? 200 : 403);
      if (response.ok) assert.equal(response.headers.get("X-ECC-Review-Mode"), "read-only");
    });
  }
});

test("central verification outage is a denial that clears cached access, never a successful stale read", async () => {
  let dataCalls = 0;
  await withServer({ env, now: () => instant, fetcher: async (url: string) => {
    if (url.startsWith(env.ECC_CONTROL_PLANE_ORIGIN)) throw new Error("central timeout");
    dataCalls++; return json([]);
  } }, async base => {
    const response = await fetch(base + "/api/portfolio/properties", { headers: auth });
    assert.equal(response.status, 403);
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/);
    assert.doesNotMatch(await response.text(), /timeout/);
  });
  assert.equal(dataCalls, 0);
});
