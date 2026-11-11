// Real-PostgreSQL proof of the A1 database seam, over the real `pg` driver and a reused pooled connection.
// Labelled isolated/synthetic: a private temporary cluster, no real data, no credentials.
import assert from "node:assert/strict";
import { test, after } from "node:test";
import pg from "pg";
import { ContextSeamError, withTransactionContext, type SqlRunner } from "../../shared/authz/dbContext.ts";

const socket = process.env.AUTHZ_DB_SOCKET;
if (!socket) throw new Error("AUTHZ_DB_SOCKET is required (run via tests/authz-db/run.sh)");
const PERSON = "10000000-0000-4000-8000-000000000001";
const mkPool = (user: string, max: number) => new pg.Pool({ host: socket, user, database: "postgres", max });
const runtime = mkPool("synthetic_runtime", 1);     // ONE connection, reused by every request below
const wide = mkPool("synthetic_runtime", 4);
const admin = mkPool("postgres", 1);
after(async () => { await Promise.all([runtime.end(), wide.end(), admin.end()]); });

/** Adapt one checked-out pooled client to the seam's SqlRunner. */
async function withClient<T>(pool: pg.Pool, fn: (run: SqlRunner, client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { return await fn({ query: async (text, values) => ({ rows: (await client.query(text, values ? [...values] : undefined)).rows }) }, client); }
  finally { client.release(); }
}
const labels = async (run: SqlRunner) => (await run.query("SELECT label FROM synthetic_matters ORDER BY label")).rows.map((r) => r.label as string);
const ROLE = "synthetic_runtime";

test("context applies inside the transaction and is gone on the next use of the SAME pooled connection", async () => {
  const a = await withClient(runtime, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: ["scope-a"] }, ROLE, labels));
  assert.deepEqual(a, ["a1", "a2"]);
  const outside = await withClient(runtime, async (run) => labels(run));
  assert.deepEqual(outside, [], "no context outside a seam transaction: fail closed");
  const b = await withClient(runtime, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: ["scope-b"] }, ROLE, labels));
  assert.deepEqual(b, ["b1"], "second request on the reused connection sees only its own scope");
  const pid = async () => withClient(runtime, async (run) => (await run.query("SELECT pg_backend_pid() AS p")).rows[0].p);
  assert.equal(await pid(), await pid(), "the pool really reused one backend connection");
});

test("multi-scope context returns exactly the authorized scopes", async () => {
  const rows = await withClient(runtime, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: ["scope-a", "scope-b"] }, ROLE, labels));
  assert.deepEqual(rows, ["a1", "a2", "b1"]);
});

test("a failed read rolls back and leaves no context for the next user of the connection", async () => {
  await assert.rejects(withClient(runtime, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: ["scope-a"] }, ROLE, async (r) => { await r.query("SELECT 1/0"); })), /division by zero/);
  assert.deepEqual(await withClient(runtime, async (run) => labels(run)), []);
});

test("DOCUMENTED HAZARD: session-level set_config persists on a pooled connection (why the seam never uses it)", async () => {
  await withClient(runtime, async (run) => { await run.query("SELECT set_config('ecc.scope_refs','scope-a',false)"); });
  const leaked = await withClient(runtime, async (run) => labels(run));
  assert.deepEqual(leaked, ["a1", "a2"], "session-level context leaked to the next request: this is the forbidden pattern");
  await withClient(runtime, async (run) => { await run.query("RESET ecc.scope_refs"); });
  assert.deepEqual(await withClient(runtime, async (run) => labels(run)), []);
});

test("DOCUMENTED LIMITATION: the runtime role can set its own context, so settings filter a trusted context and do not authenticate grants", async () => {
  const self = await withClient(runtime, async (run) => { await run.query("BEGIN"); await run.query("SELECT set_config('ecc.scope_refs','scope-c',true)"); const r = await labels(run); await run.query("ROLLBACK"); return r; });
  assert.deepEqual(self, ["c1"], "authorization must come from the verified read decision upstream, not from the database setting");
});

test("a bypass-capable (superuser) connection is refused and nothing is read", async () => {
  await assert.rejects(withClient(admin, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: ["scope-a"] }, "postgres", labels)),
    (e: unknown) => e instanceof ContextSeamError && e.code === "BYPASS_ROLE");
});

test("the wrong (non-bypass) role is refused", async () => {
  await assert.rejects(withClient(runtime, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: ["scope-a"] }, "ecc_legal_runtime", labels)),
    (e: unknown) => e instanceof ContextSeamError && e.code === "WRONG_ROLE");
});

test("a comma-list scope cannot smuggle a second scope", async () => {
  await assert.rejects(withClient(runtime, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: ["scope-a,scope-b"] }, ROLE, labels)),
    (e: unknown) => e instanceof ContextSeamError && e.code === "INVALID_CONTEXT");
});

test("interleaved concurrent requests on a multi-connection pool never see each other's scope", async () => {
  const jobs = Array.from({ length: 24 }, (_, i) => {
    const scope = ["scope-a", "scope-b", "scope-c"][i % 3];
    const expected = { "scope-a": ["a1", "a2"], "scope-b": ["b1"], "scope-c": ["c1"] }[scope]!;
    return withClient(wide, (run) => withTransactionContext(run, { actor: PERSON, scopeRefs: [scope] }, ROLE, async (r) => {
      await r.query("SELECT pg_sleep(0.01)");
      return { got: await labels(r), expected };
    }));
  });
  for (const r of await Promise.all(jobs)) assert.deepEqual(r.got, r.expected);
});
