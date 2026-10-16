import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createEntitiesRouter } from "../../server/routes/entities";
import { ENTITY_POLICY, MAX_ROWS } from "../../server/lib/readBoundary";
import type { VerifiedReadScope } from "../../server/lib/readBoundary";

// Isolated fixtures only: a fake client that records every call and never touches a database.
type Call = { table: string; select?: string; ops: Array<[string, ...unknown[]]>; limit?: number };
let calls: Call[] = [];
let clientsCreated = 0;
let result: { data: unknown; error: { message: string } | null } = { data: [], error: null };

function fakeClient() {
  clientsCreated++;
  return {
    from(table: string) {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const chain: any = {
        select(s: string) { call.select = s; return chain; },
        in(...a: unknown[]) { call.ops.push(["in", ...a]); return chain; },
        eq(...a: unknown[]) { call.ops.push(["eq", ...a]); return chain; },
        lt(...a: unknown[]) { call.ops.push(["lt", ...a]); return chain; },
        lte(...a: unknown[]) { call.ops.push(["lte", ...a]); return chain; },
        gt(...a: unknown[]) { call.ops.push(["gt", ...a]); return chain; },
        gte(...a: unknown[]) { call.ops.push(["gte", ...a]); return chain; },
        limit(n: number) { call.limit = n; return Promise.resolve(result); },
      };
      return chain;
    },
  };
}

let scope: VerifiedReadScope | null = null;
let resolverThrows = false;
let server: Server;
let base = "";
const savedEnv = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SERVICE_ROLE_KEY };

before(async () => {
  process.env.SUPABASE_URL = "https://isolated.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-value";
  const app = express();
  app.use("/api/entities", createEntitiesRouter({
    resolveActor: () => { if (resolverThrows) throw new Error("identity layer exploded: secret-detail"); return scope; },
    getClient: fakeClient as never,
  }));
  server = await new Promise<Server>((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.close();
  process.env.SUPABASE_URL = savedEnv.u; process.env.SUPABASE_SERVICE_ROLE_KEY = savedEnv.k;
  if (savedEnv.u === undefined) delete process.env.SUPABASE_URL;
  if (savedEnv.k === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
const reset = (s: VerifiedReadScope | null = { propertyIds: [7, 8], ownerIds: [3] }) => {
  calls = []; clientsCreated = 0; scope = s; resolverThrows = false; result = { data: [], error: null };
};
const get = async (path: string) => { const r = await fetch(`${base}/api/entities/${path}`); return { status: r.status, text: await r.text() }; };
const body = (t: string) => JSON.parse(t);

test("unauthenticated or unbound requests are denied before any database client exists", async () => {
  for (const path of ["properties", "properties/7", "units", "owners", "tenants", "pg_user", "properties?select=*"]) {
    reset(null);
    const r = await get(path);
    assert.equal(r.status, 401, path);
    assert.deepEqual(body(r.text), { error: "unauthenticated" });
    assert.equal(clientsCreated, 0, path);
    assert.equal(calls.length, 0, path);
  }
});

test("production default (no resolver bound) denies everything", async () => {
  const app = express();
  let created = 0;
  app.use("/e", createEntitiesRouter({ getClient: (() => { created++; return fakeClient(); }) as never }));
  const s = await new Promise<Server>((r) => { const x = app.listen(0, "127.0.0.1", () => r(x)); });
  const res = await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}/e/properties`);
  s.close();
  assert.equal(res.status, 401);
  assert.equal(created, 0);
});

test("a failing identity layer is a generic 503 with no detail and no database call", async () => {
  reset(); resolverThrows = true;
  const r = await get("properties");
  assert.equal(r.status, 503);
  assert.doesNotMatch(r.text, /exploded|secret-detail/);
  assert.equal(clientsCreated, 0);
});

test("a verified actor with no usable scope for the entity is denied before the database", async () => {
  for (const s of [{}, { propertyIds: [] }, { propertyIds: [0, -1, 1.5, NaN] }, { ownerIds: [3] }] as VerifiedReadScope[]) {
    reset(s);
    const r = await get("units");
    assert.equal(r.status, 403, JSON.stringify(s));
    assert.deepEqual(body(r.text), { error: "not permitted" });
    assert.equal(clientsCreated, 0);
  }
});

test("tables outside the policy cannot be read, including prototype and system names", async () => {
  for (const t of ["users", "auth.users", "pg_catalog.pg_user", "audit_events", "owner_transfers", "workorders", "geocode_cache", "__proto__", "constructor", "toString", "hasOwnProperty"]) {
    reset();
    const r = await get(encodeURIComponent(t));
    assert.equal(r.status, 404, t);
    assert.deepEqual(body(r.text), { error: "not found" });
    assert.equal(clientsCreated, 0, t);
  }
});

test("entities with no verified scope path are unavailable, not guessed", async () => {
  reset();
  const r = await get("tenants");
  assert.equal(r.status, 403);
  assert.equal(clientsCreated, 0);
});

test("only allow-listed columns are selected; wildcard means the allow-list, never *", async () => {
  for (const q of ["properties", "properties?select=*"]) {
    reset();
    assert.equal((await get(q)).status, 200);
    const sel = calls[0].select!;
    assert.notEqual(sel, "*");
    assert.deepEqual(sel.split(","), [...ENTITY_POLICY.properties.fields]);
  }
  reset();
  assert.equal((await get("properties?select=id,name")).status, 200);
  assert.equal(calls[0].select, "id,name");
  for (const bad of ["properties?select=owner_id", "properties?select=id,doorloop_id", "owners?select=email", "owners?select=phone,id", "leases?select=balance_due", "units?select=*,leases(*)", "properties?select=id;drop"]) {
    reset();
    const r = await get(bad);
    assert.equal(r.status, 403, bad);
    assert.equal(clientsCreated, 0, bad);
    assert.doesNotMatch(r.text, /owner_id|doorloop|email|phone|balance/);
  }
});

test("filters on columns outside the allow-list are refused, so hidden values cannot be probed", async () => {
  for (const bad of ["owners?email=eq.a%40b.c", "properties?doorloop_id=eq.1", "leases?balance_due=gt.0", "units?created_at=gt.2020"]) {
    reset();
    const r = await get(bad);
    assert.equal(r.status, 403, bad);
    assert.equal(clientsCreated, 0);
  }
});

test("malformed filters fail closed instead of being silently dropped", async () => {
  for (const bad of ["properties?name=ilike.%25a%25", "properties?name=like.a", "properties?name=bogus", "properties?name=eq.", "properties?name=eq.a&name=eq.b", "properties?limit=0", "properties?limit=abc"]) {
    reset();
    const r = await get(bad);
    assert.equal(r.status, 400, bad);
    assert.equal(clientsCreated, 0, bad);
  }
});

test("legitimate scoped reads work and are limited to the actor's scope", async () => {
  reset({ propertyIds: [7, 8] });
  result = { data: [{ id: 7, name: "Alder" }], error: null };
  const r = await get("properties?select=id,name&name=eq.Alder");
  assert.equal(r.status, 200);
  assert.deepEqual(body(r.text), { data: [{ id: 7, name: "Alder" }], meta: { totalCount: 1 } });
  assert.deepEqual(calls[0].ops, [["in", "id", [7, 8]], ["eq", "name", "Alder"]]);
  assert.equal(calls[0].limit, MAX_ROWS);

  reset({ propertyIds: [7, 8] });
  await get("units?property_id=eq.8&rent=gte.1000.50");
  assert.deepEqual(calls[0].ops, [["in", "property_id", [7, 8]], ["eq", "property_id", "8"], ["gte", "rent", "1000.50"]]);

  reset({ ownerIds: [3, 3, 4] });
  await get("owners");
  assert.deepEqual(calls[0].ops, [["in", "id", [3, 4]]]);
});

test("rows are capped, and a client limit can only lower the cap", async () => {
  reset(); await get("leases?limit=10"); assert.equal(calls[0].limit, 10);
  reset(); await get("leases?limit=999999"); assert.equal(calls[0].limit, MAX_ROWS);
});

test("cross-scope requests are denied or indistinguishable from missing", async () => {
  reset({ propertyIds: [7] });
  const explicit = await get("units?property_id=eq.99");
  assert.equal(explicit.status, 403);
  assert.equal(clientsCreated, 0);

  reset({ propertyIds: [7] });                 // an id outside scope reaches the database only through the scope filter
  result = { data: [], error: null };
  const outside = await get("properties/99");
  assert.equal(outside.status, 404);
  assert.deepEqual(calls[0].ops[0], ["in", "id", [7]]);
  reset({ propertyIds: [7] });
  const missing = await get("properties/not-a-number");
  assert.equal(missing.status, 404);
  assert.equal(clientsCreated, 0);
  assert.equal(outside.text, missing.text);    // same body: existence is not disclosed

  reset({ propertyIds: [7] });                 // a wider range filter is still intersected with scope
  await get("properties?id=gt.0");
  assert.deepEqual(calls[0].ops[0], ["in", "id", [7]]);
});

test("single-record read returns exactly one in-scope record", async () => {
  reset({ propertyIds: [7] });
  result = { data: [{ id: 7, name: "Alder" }], error: null };
  const ok = await get("properties/7");
  assert.equal(ok.status, 200);
  assert.deepEqual(body(ok.text).data, [{ id: 7, name: "Alder" }]);
  assert.deepEqual(calls[0].ops, [["in", "id", [7]], ["eq", "id", "7"]]);
  for (const bad of ["0", "-1", "1.5", "7abc", "007x"]) { reset({ propertyIds: [7] }); assert.equal((await get(`properties/${bad}`)).status, 404, bad); assert.equal(clientsCreated, 0); }
});

test("database errors and thrown failures disclose nothing", async () => {
  reset();
  result = { data: null, error: { message: 'relation "secret_table" does not exist at host db.internal password=hunter2' } };
  const r = await get("properties");
  assert.equal(r.status, 500);
  assert.deepEqual(body(r.text), { error: "read failed" });
  assert.doesNotMatch(r.text, /secret_table|db\.internal|hunter2/);
});

test("denials never echo the request: no table, column, value or id appears in any denial body", async () => {
  const probes = ["canary_table", "properties?canary_col=eq.canary_val", "properties?select=canary_col", "properties/canary_id"];
  for (const p of probes) {
    for (const s of [null, { propertyIds: [7] }] as Array<VerifiedReadScope | null>) {
      reset(s);
      const r = await get(p);
      assert.ok(r.status >= 400, p);
      assert.doesNotMatch(r.text, /canary/);
    }
  }
});

test("unverified callers learn nothing about server configuration", async () => {
  const saved = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  try {
    reset(null);
    const denied = await get("properties");
    assert.equal(denied.status, 401);
    assert.doesNotMatch(denied.text, /SUPABASE|missing_env/);
    reset();
    const verified = await get("properties");
    assert.equal(verified.status, 503);          // a verified caller may be told the server is misconfigured
    assert.equal(clientsCreated, 0);
  } finally { process.env.SUPABASE_URL = saved; }
});
