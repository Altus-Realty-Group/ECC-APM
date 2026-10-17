import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createEntitiesRouter } from "../../server/routes/entities";
import { ENTITY_POLICY, MAX_ROWS } from "../../server/lib/readBoundary";
import type { VerifiedReadScope } from "../../server/lib/readBoundary";

// Isolated fixtures only: a fake client that records every call and never touches a database.
type Call = { table: string; select?: string; selectOpts?: unknown; ops: Array<[string, ...unknown[]]>; orders: Array<[string, boolean]>; limit?: number; offset?: number };
let calls: Call[] = [];
let clientsCreated = 0;
let result: { data: unknown; error: { message: string } | null; count?: unknown } = { data: [], error: null, count: 0 };

function fakeClient() {
  clientsCreated++;
  return {
    from(table: string) {
      const call: Call = { table, ops: [], orders: [] };
      calls.push(call);
      const chain: any = {
        select(s: string, opts?: unknown) { call.select = s; call.selectOpts = opts; return chain; },
        in(...a: unknown[]) { call.ops.push(["in", ...a]); return chain; },
        eq(...a: unknown[]) { call.ops.push(["eq", ...a]); return chain; },
        lt(...a: unknown[]) { call.ops.push(["lt", ...a]); return chain; },
        lte(...a: unknown[]) { call.ops.push(["lte", ...a]); return chain; },
        gt(...a: unknown[]) { call.ops.push(["gt", ...a]); return chain; },
        gte(...a: unknown[]) { call.ops.push(["gte", ...a]); return chain; },
        order(col: string, o: { ascending: boolean }) { call.orders.push([col, o.ascending]); return chain; },
        range(from: number, to: number) { call.offset = from; call.limit = to - from + 1; return Promise.resolve(result); },
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
  calls = []; clientsCreated = 0; scope = s; resolverThrows = false; result = { data: [], error: null, count: 0 };
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
  result = { data: [{ id: 7, name: "Alder" }], error: null, count: 1 };
  const r = await get("properties?select=id,name&name=eq.Alder");
  assert.equal(r.status, 200);
  assert.deepEqual(body(r.text), { data: [{ id: 7, name: "Alder" }], meta: { returned: 1, totalCount: 1, limit: MAX_ROWS, offset: 0, truncated: false, nextOffset: null } });
  assert.deepEqual(calls[0].ops, [["in", "id", [7, 8]], ["eq", "name", "Alder"]]);
  assert.deepEqual(calls[0].selectOpts, { count: "exact" });
  assert.equal(calls[0].limit, MAX_ROWS);

  reset({ propertyIds: [7, 8] });
  await get("units?property_id=eq.8&market_rent=gte.1000.50");
  assert.deepEqual(calls[0].ops, [["in", "property_id", [7, 8]], ["eq", "property_id", "8"], ["gte", "market_rent", "1000.50"]]);

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
  result = { data: [], error: null, count: 0 };
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
  result = { data: [{ id: 7, name: "Alder" }], error: null, count: 1 };
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

// ---- R9-C corrections: real caller shapes, ordering, malformed successes, completeness ----

test("Data Hub's actual requests (order=id.desc & limit) are accepted for every entity and ordered deterministically", async () => {
  for (const entity of ["owners", "leases", "units", "properties"]) {
    reset({ propertyIds: [7], ownerIds: [3] });
    const r = await get(`${entity}?order=id.desc&limit=25`);
    assert.equal(r.status, 200, entity);
    assert.deepEqual(calls[0].orders, [["id", false]], entity);
    assert.equal(calls[0].limit, 25);
  }
  reset({ propertyIds: [7] });
  assert.equal((await get("properties")).status, 200);
  assert.deepEqual(calls[0].orders, [["id", true]]);          // default is stable, never database order
});

test("a non-id order is accepted only on allow-listed columns and always ends in an id tiebreak", async () => {
  reset({ propertyIds: [7] });
  assert.equal((await get("properties?order=name.asc")).status, 200);
  assert.deepEqual(calls[0].orders, [["name", true], ["id", true]]);
  for (const bad of ["properties?order=id", "properties?order=id.sideways", "properties?order=id.asc,name.desc", "properties?order=.asc", "properties?order=id.asc&order=name.asc"]) {
    reset({ propertyIds: [7] });
    assert.equal((await get(bad)).status, 400, bad);
    assert.equal(clientsCreated, 0, bad);
  }
  for (const hidden of ["properties?order=owner_id.asc", "owners?order=email.desc", "leases?order=balance_due.desc", "properties?order=doorloop_id.asc"]) {
    reset({ propertyIds: [7], ownerIds: [3] });
    const r = await get(hidden);
    assert.equal(r.status, 403, hidden);
    assert.equal(clientsCreated, 0, hidden);
    assert.doesNotMatch(r.text, /owner_id|email|balance|doorloop/);
  }
});

test("Data Hub refuses vendor/unsupported columns while accepting the verified live rent_cents projection", async () => {
  // Live catalog verifies rent_cents and no rent/start/end columns. Vendor IDs and unnecessary
  // primary_tenant_id remain excluded; known column presence alone never grants read permission.
  reset({ propertyIds: [7] });
  const hist = await get("leases?order=id.desc&limit=25&select=doorloop_id,property_id,unit_id,primary_tenant_id,rent_cents,status,start_date,end_date");
  assert.equal(hist.status, 403);
  assert.deepEqual(body(hist.text), { error: "not permitted" });
  assert.doesNotMatch(hist.text, /doorloop|primary_tenant|rent_cents/);
  assert.equal(clientsCreated, 0);
  for (const col of ["doorloop_id", "primary_tenant_id", "rent", "start", "end"]) assert.ok(!ENTITY_POLICY.leases.fields.includes(col), col);

  reset({ propertyIds: [7] });
  const ok = await get("leases?order=id.desc&limit=25&select=id,property_id,unit_id,tenant_id,status,start_date,end_date,rent_cents");
  assert.equal(ok.status, 200);
  assert.equal(calls[0].select, "id,property_id,unit_id,tenant_id,status,start_date,end_date,rent_cents");
});

test("no allow-listed column can collide with a reserved request key", () => {
  for (const p of Object.values(ENTITY_POLICY)) for (const f of p.fields) assert.ok(!["select", "limit", "offset", "order"].includes(f), f);
});

test("malformed database successes are a generic failed read, never a successful empty list", async () => {
  const bad: Array<[string, { data: unknown; count?: unknown }]> = [
    ["null data", { data: null, count: 0 }],
    ["undefined data", { data: undefined, count: 0 }],
    ["object data", { data: { id: 7 }, count: 1 }],
    ["string data", { data: "[]", count: 0 }],
    ["row is null", { data: [null], count: 1 }],
    ["row is a scalar", { data: [7], count: 1 }],
    ["row is an array", { data: [[7]], count: 1 }],
    ["row carries an unselected column", { data: [{ id: 7, name: "A", email: "x@y.z" }], count: 1 }],
    ["count missing", { data: [{ id: 7 }] }],
    ["count null", { data: [{ id: 7 }], count: null }],
    ["count is a string", { data: [{ id: 7 }], count: "1" }],
    ["count negative", { data: [], count: -1 }],
    ["count fractional", { data: [{ id: 7 }], count: 1.5 }],
    ["short page the count contradicts", { data: [{ id: 7 }], count: 3 }],
    ["more rows than the count", { data: [{ id: 7 }, { id: 8 }], count: 1 }],
  ];
  for (const [label, r] of bad) {
    for (const path of ["properties?select=id,name", "properties/7?select=id,name"]) {
      reset({ propertyIds: [7, 8] });
      result = { data: r.data, error: null, count: r.count };
      const res = await get(path);
      assert.equal(res.status, 500, `${label} ${path}`);
      assert.deepEqual(body(res.text), { error: "read failed" }, `${label} ${path}`);
    }
  }
  reset({ propertyIds: [7] });                       // more rows than the applied limit
  result = { data: [{ id: 1 }, { id: 2 }, { id: 3 }], error: null, count: 9 };
  assert.equal((await get("properties?select=id&limit=2")).status, 500);
});

test("a genuinely empty read is still a successful, complete, empty page", async () => {
  reset({ propertyIds: [7] });
  result = { data: [], error: null, count: 0 };
  const r = await get("properties");
  assert.equal(r.status, 200);
  assert.deepEqual(body(r.text), { data: [], meta: { returned: 0, totalCount: 0, limit: MAX_ROWS, offset: 0, truncated: false, nextOffset: null } });
});

test("returned length is never reported as the total: capped and client-limited reads say they are truncated", async () => {
  const rows = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: from + i }));
  // Cap: 1200 rows match, one page holds MAX_ROWS, and a client asking for more is told the page it actually got.
  reset({ propertyIds: [7] });
  result = { data: rows(1, MAX_ROWS), error: null, count: 1200 };
  const capped = body((await get("properties?select=id&limit=100000")).text);
  assert.equal(calls[0].limit, MAX_ROWS);
  assert.deepEqual(capped.meta, { returned: MAX_ROWS, totalCount: 1200, limit: MAX_ROWS, offset: 0, truncated: true, nextOffset: MAX_ROWS });
  assert.notEqual(capped.meta.totalCount, capped.data.length);

  // Client limit below the total.
  reset({ propertyIds: [7] });
  result = { data: rows(1, 10), error: null, count: 37 };
  const small = body((await get("properties?select=id&limit=10")).text);
  assert.deepEqual(small.meta, { returned: 10, totalCount: 37, limit: 10, offset: 0, truncated: true, nextOffset: 10 });

  // Continuing from nextOffset reaches a complete read.
  reset({ propertyIds: [7] });
  result = { data: rows(31, 7), error: null, count: 37 };
  const last = body((await get("properties?select=id&limit=10&offset=30")).text);
  assert.equal(calls[0].offset, 30);
  assert.deepEqual(last.meta, { returned: 7, totalCount: 37, limit: 10, offset: 30, truncated: false, nextOffset: null });

  // Exactly one full page is complete, not truncated.
  reset({ propertyIds: [7] });
  result = { data: rows(1, 10), error: null, count: 10 };
  assert.equal(body((await get("properties?select=id&limit=10")).text).meta.truncated, false);
});

test("offset and limit accept only plain non-negative integers", async () => {
  for (const bad of ["offset=-1", "offset=1.5", "offset=abc", "offset=1e3", "offset=", "limit=1e2", "limit=+5", "limit=-3"]) {
    reset({ propertyIds: [7] });
    assert.equal((await get(`properties?${bad}`)).status, 400, bad);
    assert.equal(clientsCreated, 0, bad);
  }
  reset({ propertyIds: [7] });
  assert.equal((await get("properties?offset=0")).status, 200);
});

test("a single-record read ignores paging and reports one complete record", async () => {
  reset({ propertyIds: [7] });
  result = { data: [{ id: 7, name: "Alder" }], error: null, count: 1 };
  const r = await get("properties/7?select=id,name&limit=500&offset=40");
  assert.equal(r.status, 200);
  assert.equal(calls[0].limit, 1);
  assert.equal(calls[0].offset, 0);
  assert.deepEqual(body(r.text).meta, { returned: 1, totalCount: 1, limit: 1, offset: 0, truncated: false, nextOffset: null });
});

test("scope is still intersected on every ordered, paged read", async () => {
  reset({ propertyIds: [7, 8] });
  result = { data: [], error: null, count: 0 };
  await get("units?order=id.desc&limit=5&offset=10&property_id=gt.0");
  assert.deepEqual(calls[0].ops[0], ["in", "property_id", [7, 8]]);
  reset({ propertyIds: [7] });
  assert.equal((await get("units?order=id.desc&property_id=eq.99")).status, 403);
  assert.equal(clientsCreated, 0);
});


test("live catalog reconciliation excludes nonexistent aliases and unsafe provider fields", () => {
  for (const col of ["property_address", "address", "street_address", "full_address"]) assert.ok(!ENTITY_POLICY.properties.fields.includes(col), col);
  for (const col of ["unit_name", "condition", "unit_condition", "rent", "marketRent"]) assert.ok(!ENTITY_POLICY.units.fields.includes(col), col);
  assert.ok(ENTITY_POLICY.properties.fields.includes("address_street1"));
  assert.ok(ENTITY_POLICY.leases.fields.includes("rent_cents"));
  assert.ok(!ENTITY_POLICY.leases.fields.includes("rent"));
  for (const policy of Object.values(ENTITY_POLICY)) for (const col of ["raw_payload", "bank_account_info_json", "federal_tax_info_json", "ssn", "email", "date_of_birth"]) assert.ok(!policy.fields.includes(col), col);
});
