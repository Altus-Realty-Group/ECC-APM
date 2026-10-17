import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";

// ECC-C4: the generic POST /api/rpc/:functionName dispatcher and the diag/ids, debug_leases and simple_lease_test
// diagnostics are gone. Isolation: the real getServerClient() is pointed at a loopback fake PostgREST that records every
// request it receives, so "never touched a privileged client" is asserted as "the upstream saw zero requests". Nothing
// here contacts a real database, vendor or operating data.

type Upstream = { method: string; url: string; body: string };
let upstream: Upstream[] = [];
let tables: Record<string, unknown[]> = {};
let fake: Server;
let api: Server;
let base = "";
let routerStack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> = [];

before(async () => {
  fake = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      upstream.push({ method: req.method ?? "", url: req.url ?? "", body });
      const m = /^\/rest\/v1\/([a-z_]+)/.exec(req.url ?? "");
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(m && m[1] !== "rpc" ? (tables[m[1]] ?? []) : {}));
    });
  });
  await new Promise<void>((r) => fake.listen(0, "127.0.0.1", () => r()));
  // db.ts reads its environment at import time, so set the isolated values first and import afterwards.
  process.env.SUPABASE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-value";
  const { rpc } = await import("../../server/routes/rpc");
  routerStack = (rpc as unknown as { stack: typeof routerStack }).stack;
  const app = express();
  app.use(express.json());
  app.use("/api/rpc", rpc);
  app.use("/api", (_req, res) => res.status(404).json({ ok: false, message: "Not found" })); // mirrors server/index.ts
  api = await new Promise<Server>((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  base = `http://127.0.0.1:${(api.address() as AddressInfo).port}/api/rpc`;
});
after(() => { api.close(); fake.close(); });
const reset = () => { upstream = []; tables = {}; };
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`${base}${path}`, { method, headers: body === undefined ? {} : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, text: await r.text() };
};
const NOT_FOUND = JSON.stringify({ ok: false, message: "Not found" });

test("production ends in the generic /api 404 that this suite mirrors, after the rpc mount", () => {
  const src = readFileSync(fileURLToPath(new URL("../../server/index.ts", import.meta.url)), "utf8");
  const mount = src.indexOf('app.use("/api/rpc", rpcRouter)');
  const fallback = src.indexOf('app.use("/api", (_req, res) => res.status(404).json({ ok: false, message: "Not found" }))');
  assert.ok(mount > 0 && fallback > mount, "server/index.ts must keep the generic /api 404 after the rpc mount");
});

test("the router registers exactly the five card reads and nothing else", () => {
  const routes = routerStack.filter((l) => l.route).map((l) => `${Object.keys(l.route!.methods).sort().join(",").toUpperCase()} ${l.route!.path}`).sort();
  assert.deepEqual(routes, [
    "GET /get_lease_card", "GET /get_owner_card", "GET /get_property_card", "GET /get_tenant_card", "GET /get_unit_card",
  ]);
});

test("arbitrary function names and bodies on every write-capable method never reach the database", async () => {
  const names = ["exec_sql", "pg_sleep", "get_property_card", "set_config", "__proto__", "constructor", "delete_all", "a%2Fb", "..%2Fowners"];
  const bodies: unknown[] = [{}, { sql: "select 1" }, { id: 1, "'; drop table owners; --": 1 }, [1, 2, 3], { big: "x".repeat(50_000) }];
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    for (const name of names) {
      for (const body of bodies) {
        reset();
        const r = await call(method, `/${name}`, body);
        assert.equal(r.status, 404, `${method} ${name}`);
        assert.equal(r.text, NOT_FOUND, `${method} ${name}`);
        assert.equal(upstream.length, 0, `${method} ${name} reached the upstream`);
      }
    }
  }
});

test("a POST aimed at a card route name is not a card read and does not call the database", async () => {
  for (const name of ["get_property_card", "get_unit_card", "get_lease_card", "get_owner_card", "get_tenant_card"]) {
    reset();
    const r = await call("POST", `/${name}?id=1`, { id: 1 });
    assert.equal(r.status, 404, name);
    assert.equal(upstream.length, 0, name);
  }
});

test("the three diagnostics are gone: no response, no database call, in any form", async () => {
  for (const path of ["/diag/ids", "/debug_leases", "/simple_lease_test", "/diag", "/diag/ids/", "/debug_leases?x=1", "/simple_lease_test/extra"]) {
    for (const method of ["GET", "POST", "HEAD"]) {
      reset();
      const r = await call(method, path);
      assert.equal(r.status, 404, `${method} ${path}`);
      if (method !== "HEAD") assert.equal(r.text, NOT_FOUND, `${method} ${path}`);
      assert.equal(upstream.length, 0, `${method} ${path} reached the upstream`);
    }
  }
});

test("unknown paths are the same fixed non-success body and name nothing", async () => {
  for (const path of ["/", "/nope", "/get_user_card?id=1", "/get_property_card/extra", "/%00", "/get_property_card%2F"]) {
    reset();
    const r = await call("GET", path);
    assert.equal(r.status, 404, path);
    assert.equal(r.text, NOT_FOUND, path);
    assert.doesNotMatch(r.text, /supabase|rpc|table|function|key|url|env|route/i);
    assert.equal(upstream.length, 0, path);
  }
});

test("without any Supabase configuration the removed and unknown paths are identical and disclose no configuration", () => {
  // Fresh process so db.ts imports with the variables absent; if any removed path still reached getServerClient()
  // the supabase-js constructor would throw and the message would surface here.
  const script = `
    import express from "express";
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.SUPABASE_KEY;
    delete process.env.SUPABASE_SERVICE_KEY; delete process.env.SUPABASE_SECRET; delete process.env.SUPABASE_REST_URL;
    const { rpc } = await import("./server/routes/rpc.ts");
    const app = express(); app.use(express.json()); app.use("/api/rpc", rpc);
    app.use("/api", (_req, res) => res.status(404).json({ ok: false, message: "Not found" }));
    const s = await new Promise(r => { const x = app.listen(0, "127.0.0.1", () => r(x)); });
    const b = "http://127.0.0.1:" + s.address().port + "/api/rpc";
    const out = [];
    for (const [m, p] of [["POST","/exec_sql"],["POST","/anything"],["GET","/diag/ids"],["GET","/debug_leases"],["GET","/simple_lease_test"],["GET","/nope"]]) {
      const r = await fetch(b + p, { method: m, headers: {"content-type":"application/json"}, body: m === "POST" ? "{}" : undefined });
      out.push([m, p, r.status, await r.text()]);
    }
    s.close(); console.log(JSON.stringify(out));
  `;
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const run = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" } });
  assert.equal(run.status, 0, run.stderr);
  const out = JSON.parse(run.stdout.trim().split("\n").pop()!) as Array<[string, string, number, string]>;
  assert.equal(out.length, 6);
  for (const [m, p, status, text] of out) {
    assert.equal(status, 404, `${m} ${p}`);
    assert.equal(text, NOT_FOUND, `${m} ${p}`);
    assert.doesNotMatch(text, /supabase|required|SUPABASE|key/i);
  }
});

test("the five card reads keep their paths, parameters and response shapes (isolated fixture rows only)", async () => {
  for (const name of ["get_property_card", "get_unit_card", "get_lease_card", "get_owner_card", "get_tenant_card"]) {
    reset();
    const r = await call("GET", `/${name}`);
    assert.equal(r.status, 400, name);
    assert.deepEqual(JSON.parse(r.text), { error: "missing id" }, name);
  }
  for (const [name, label] of [["get_property_card", "property"], ["get_unit_card", "unit"], ["get_lease_card", "lease"], ["get_owner_card", "owner"], ["get_tenant_card", "tenant"]]) {
    reset();
    const r = await call("GET", `/${name}?id=7`);
    assert.equal(r.status, 404, name);
    assert.deepEqual(JSON.parse(r.text), { error: `${label} not found` }, name);
    assert.ok(upstream.length > 0 && upstream.every((u) => u.method === "GET" && u.url.startsWith("/rest/v1/") && !u.url.startsWith("/rest/v1/rpc/")), name);
  }
  reset();
  tables = {
    properties: [{ id: 7, name: "Fixture property", type: "MULTI" }],
    units: [{ id: 1 }, { id: 2 }],
    leases: [{ status: "ACTIVE", rent_cents: 100000, property_id: 7, unit_id: 1 }],
  };
  const ok = JSON.parse((await call("GET", "/get_property_card?id=7")).text);
  assert.equal(ok.property.id, 7);
  assert.equal(ok.property.name, "Fixture property");
  assert.deepEqual(ok.kpis, { units: 2, activeLeases: 1, occupancyPct: 50, avgRentCents: 100000 });
  assert.ok(upstream.every((u) => !u.url.includes("/rpc/")));
});
