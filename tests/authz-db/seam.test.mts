// Real-PostgreSQL proof of the A1 database seam (exclusive lease, clean-lease check, transaction-local context, reset and discard),
// over the real `pg` driver. Labelled isolated/synthetic: a private temporary cluster, no real data, no credentials.
import assert from "node:assert/strict";
import { test, after } from "node:test";
import pg from "pg";
import { ContextSeamError, withLeasedContext, type ConnectionLeaser, type LeasedConnection, type SqlRunner } from "../../shared/authz/dbContext.ts";

const socket = process.env.AUTHZ_DB_SOCKET;
if (!socket) throw new Error("AUTHZ_DB_SOCKET is required (run via tests/authz-db/run.sh)");
const PERSON = "10000000-0000-4000-8000-000000000001";
const ROLE = "synthetic_runtime";
const FUTURE = Date.now() + 3_600_000;
const mkPool = (user: string, max: number) => new pg.Pool({ host: socket, user, database: "postgres", max });
const pools: pg.Pool[] = [];
const track = (p: pg.Pool) => (pools.push(p), p);
const admin = track(mkPool("postgres", 2));
after(async () => { await Promise.all(pools.map((p) => p.end())); });

type Hooks = { failOn?: Map<string, Error>; swallow?: Set<string>; onRelease?: (discard: boolean, pid: number) => void; /** runs after the REAL statement succeeded, e.g. to advance the clock */ after?: Map<string, () => void> };
/** Adapt a pg.Pool into the seam's exclusive lease. Optional hooks inject faults AROUND the real connection. */
function leaser(pool: pg.Pool, hooks: Hooks = {}): ConnectionLeaser {
  return { lease: async (): Promise<LeasedConnection> => {
    const client = await pool.connect();
    const pid = (client as unknown as { processID: number }).processID;
    return {
      leaseId: String(pid),
      query: async (text, values) => {
        const fault = hooks.failOn?.get(text);
        if (fault) throw fault;
        if (hooks.swallow?.has(text)) return { rows: [] };
        const rows = (await client.query(text, values ? [...values] : undefined)).rows;
        hooks.after?.get(text)?.();
        return { rows };
      },
      release: (discard) => { hooks.onRelease?.(discard, pid); client.release(discard ? (new Error("discarded") as unknown as true) : undefined); },
    };
  } };
}
const labels = async (run: SqlRunner) => (await run.query("SELECT label FROM synthetic_matters ORDER BY label")).rows.map((r) => r.label as string);
const evidence = async (run: SqlRunner) => (await run.query("SELECT label FROM synthetic_evidence ORDER BY label")).rows.map((r) => r.label as string);
const seam = <T>(l: ConnectionLeaser, scopes: string[], fn: (run: SqlRunner) => Promise<T>, now: () => number = Date.now, validUntilMs = FUTURE) =>
  withLeasedContext(l, { actor: PERSON, scopeRefs: scopes, validUntilMs }, { expectedRole: ROLE, now }, fn);
const pidOf = async (l: ConnectionLeaser) => seam(l, ["scope-a"], async (r) => Number((await r.query("SELECT pg_backend_pid() AS p")).rows[0].p));
const code = (c: string) => (e: unknown) => e instanceof ContextSeamError && e.code === c;
const alive = async (pid: number) => (await admin.query("SELECT 1 FROM pg_stat_activity WHERE pid = $1", [pid])).rowCount === 1;
async function gone(pid: number) { for (let i = 0; i < 40; i++) { if (!(await alive(pid))) return true; await new Promise((r) => setTimeout(r, 25)); } return false; }

test("context applies inside the transaction and is gone on the next use of the SAME backend connection", async () => {
  const pool = track(mkPool(ROLE, 1));
  const l = leaser(pool);
  assert.deepEqual(await seam(l, ["scope-a"], labels), ["a1", "a2"]);
  assert.deepEqual((await pool.query("SELECT label FROM synthetic_matters")).rows, [], "outside the seam: no context, fail closed");
  assert.deepEqual(await seam(l, ["scope-b"], labels), ["b1"]);
  assert.equal(await pidOf(l), await pidOf(l), "the pool really reused one backend connection");
  assert.deepEqual(await seam(l, ["scope-a", "scope-b"], labels), ["a1", "a2", "b1"]);
});

test("restricted evidence is pinned to default-deny inside the transaction", async () => {
  const pool = track(mkPool(ROLE, 1));
  const l = leaser(pool);
  assert.deepEqual(await seam(l, ["scope-a"], evidence), ["open-a"], "the restricted row is not visible without an entitlement");
  const pinned = await seam(l, ["scope-a"], async (r) => (await r.query("SELECT current_setting('ecc.restricted_evidence') AS v")).rows[0].v);
  assert.equal(pinned, "off");
});

test("a connection that arrives with inherited context is refused, never used, and DESTROYED", async () => {
  const taints: [string, (c: pg.PoolClient) => Promise<void>][] = [
    ["inherited scope list", async (c) => { await c.query("SELECT set_config('ecc.scope_refs','scope-b',false)"); }],
    ["inherited actor", async (c) => { await c.query("SELECT set_config('ecc.actor','someone',false)"); }],
    ["inherited restricted-evidence entitlement", async (c) => { await c.query("SELECT set_config('ecc.restricted_evidence','on',false)"); }],
    ["inherited SET ROLE", async (c) => { await c.query("SET ROLE synthetic_other"); }],
    ["open transaction left by a previous holder", async (c) => { await c.query("BEGIN"); }],
  ];
  for (const [name, taint] of taints) {
    const pool = track(mkPool(ROLE, 1));
    const l = leaser(pool);
    const first = await pool.connect();
    const dirtyPid = (first as unknown as { processID: number }).processID;
    await taint(first);
    first.release();                                     // handed back dirty, exactly the hazard being modelled
    let ran = false;
    await assert.rejects(seam(l, ["scope-a"], async () => { ran = true; }), code("CONTAMINATED_LEASE"), name);
    assert.equal(ran, false, name);
    assert.ok(await gone(dirtyPid), `${name}: the dirty backend must be destroyed, not returned to the pool`);
    const healthy = await seam(l, ["scope-a"], async (r) => ({ rows: await labels(r), ev: await evidence(r), pid: Number((await r.query("SELECT pg_backend_pid() AS p")).rows[0].p) }));
    assert.deepEqual(healthy.rows, ["a1", "a2"], name);
    assert.deepEqual(healthy.ev, ["open-a"], `${name}: restricted rows stay hidden after recovery`);
    assert.notEqual(healthy.pid, dirtyPid, name);
  }
});

test("session-level settings written by the work are cleared by the reset and the connection is reused clean", async () => {
  const pool = track(mkPool(ROLE, 1));
  const l = leaser(pool);
  const events: boolean[] = [];
  const hooked = leaser(pool, { onRelease: (d) => events.push(d) });
  const pid = await seam(hooked, ["scope-a"], async (r) => {
    await r.query("SELECT set_config('ecc.scope_refs','scope-b',false)");
    await r.query("SELECT set_config('ecc.restricted_evidence','on',false)");
    return Number((await r.query("SELECT pg_backend_pid() AS p")).rows[0].p);
  });
  assert.deepEqual(events, [false], "reset succeeded and verified clean, so the connection is returned, not discarded");
  assert.deepEqual(await seam(l, ["scope-c"], async (r) => ({ rows: await labels(r), pid: Number((await r.query("SELECT pg_backend_pid() AS p")).rows[0].p) })), { rows: ["c1"], pid });
  assert.deepEqual((await pool.query("SELECT label FROM synthetic_matters")).rows, [], "nothing leaked outside the seam");
});

test("a failing read rolls back and leaves no context or data behind", async () => {
  const pool = track(mkPool(ROLE, 1));
  const l = leaser(pool);
  await assert.rejects(seam(l, ["scope-a"], async (r) => { await r.query("INSERT INTO synthetic_scratch VALUES ('failed')"); await r.query("SELECT 1/0"); }), /division by zero/);
  assert.equal((await admin.query("SELECT 1 FROM synthetic_scratch WHERE x = 'failed'")).rowCount, 0, "the write was rolled back");
  assert.deepEqual((await pool.query("SELECT label FROM synthetic_matters")).rows, []);
});

test("rollback, reset and verification failures DESTROY the connection instead of returning it to the pool", async () => {
  const cases: [string, Hooks, (r: SqlRunner) => Promise<unknown>][] = [
    ["ROLLBACK fails", { failOn: new Map([["ROLLBACK", new Error("rollback failed")]]) }, async (r) => { await r.query("SELECT 1/0"); }],
    ["DISCARD ALL fails", { failOn: new Map([["DISCARD ALL", new Error("reset failed")]]) }, async () => 1],
    ["DISCARD ALL is swallowed and the leftover is detected", { swallow: new Set(["DISCARD ALL"]) }, async (r) => { await r.query("SELECT set_config('ecc.scope_refs','scope-b',false)"); }],
  ];
  for (const [name, hooks, work] of cases) {
    const pool = track(mkPool(ROLE, 1));
    const seen: { discard: boolean; pid: number }[] = [];
    const l = leaser(pool, { ...hooks, onRelease: (discard, pid) => seen.push({ discard, pid }) });
    await seam(l, ["scope-a"], work).catch(() => undefined);
    assert.equal(seen.length, 1, name);
    assert.equal(seen[0].discard, true, name);
    assert.ok(await gone(seen[0].pid), `${name}: the backend must be destroyed`);
    assert.deepEqual(await seam(leaser(pool), ["scope-b"], labels), ["b1"], `${name}: a fresh connection serves the next request`);
  }
});

test("authority that ends DURING the work rolls the real transaction back and returns nothing", async () => {
  const pool = track(mkPool(ROLE, 1));
  let now = Date.now();
  const start = now;
  await assert.rejects(seam(leaser(pool), ["scope-a"], async (r) => {
    await r.query("INSERT INTO synthetic_scratch VALUES ('expired')");
    now = start + 10_000;                                           // the clock passes validUntil while the work runs
    return labels(r);
  }, () => now, start + 5_000), code("CONTEXT_EXPIRED"));
  assert.equal((await admin.query("SELECT 1 FROM synthetic_scratch WHERE x = 'expired'")).rowCount, 0, "nothing committed after authority ended");
  await assert.rejects(seam(leaser(pool), ["scope-a"], labels, () => start + 5_000, start + 5_000), code("CONTEXT_EXPIRED"), "already-expired context never leases");
});

test("a bypass-capable (superuser) connection is refused and nothing is read", async () => {
  const su = track(mkPool("postgres", 1));
  await assert.rejects(withLeasedContext(leaser(su), { actor: PERSON, scopeRefs: ["scope-a"], validUntilMs: FUTURE }, { expectedRole: "postgres", now: Date.now }, labels), code("BYPASS_ROLE"));
});

test("the wrong (non-bypass) role is refused and a comma-list scope cannot smuggle a second scope", async () => {
  const pool = track(mkPool(ROLE, 1));
  await assert.rejects(withLeasedContext(leaser(pool), { actor: PERSON, scopeRefs: ["scope-a"], validUntilMs: FUTURE }, { expectedRole: "ecc_legal_runtime", now: Date.now }, labels), code("WRONG_ROLE"));
  await assert.rejects(seam(leaser(pool), ["scope-a,scope-b"], labels), code("INVALID_CONTEXT"));
  assert.deepEqual(await seam(leaser(pool), ["scope-a"], labels), ["a1", "a2"], "the connection is still usable after a refused request");
});

test("PARALLEL leases hold distinct backends, never overlap on one, and never see each other's scope", async () => {
  const pool = track(mkPool(ROLE, 4));
  const l = leaser(pool);
  const intervals: { pid: number; start: number; end: number }[] = [];
  const jobs = Array.from({ length: 24 }, (_, i) => {
    const scope = ["scope-a", "scope-b", "scope-c"][i % 3];
    const expected = { "scope-a": ["a1", "a2"], "scope-b": ["b1"], "scope-c": ["c1"] }[scope]!;
    return seam(l, [scope], async (r) => {
      const start = performance.now();
      const pid = Number((await r.query("SELECT pg_backend_pid() AS p")).rows[0].p);
      await r.query("SELECT pg_sleep(0.02)");
      const got = await labels(r);
      intervals.push({ pid, start, end: performance.now() });
      return { got, expected };
    });
  });
  for (const r of await Promise.all(jobs)) assert.deepEqual(r.got, r.expected);
  for (const a of intervals) for (const b of intervals) if (a !== b && a.pid === b.pid) assert.ok(a.end <= b.start || b.end <= a.start, "two holders overlapped on one backend connection");
  assert.ok(new Set(intervals.map((i) => i.pid)).size >= 2, "the work genuinely ran on several backends");
});

test("with ONE connection, concurrent requests are serialized, never interleaved", async () => {
  const pool = track(mkPool(ROLE, 1));
  const l = leaser(pool);
  const order: string[] = [];
  const work = (scope: string) => seam(l, [scope], async (r) => { order.push(`start ${scope}`); await r.query("SELECT pg_sleep(0.02)"); const g = await labels(r); order.push(`end ${scope}`); return g; });
  const [a, b, c] = await Promise.all([work("scope-a"), work("scope-b"), work("scope-c")]);
  assert.deepEqual([a, b, c], [["a1", "a2"], ["b1"], ["c1"]]);
  for (let i = 0; i < order.length; i += 2) assert.equal(order[i].replace("start ", ""), order[i + 1].replace("end ", ""), "a request finished before the next began");
});

test("a pool that hands the SAME connection to two holders is detected; the second is refused without touching it", { timeout: 15_000 }, async () => {
  const pool = track(mkPool(ROLE, 1));
  const client = await pool.connect();
  const pid = (client as unknown as { processID: number }).processID;
  let releases = 0;
  const bad: ConnectionLeaser = { lease: async () => ({ leaseId: String(pid), query: async (t, v) => ({ rows: (await client.query(t, v ? [...v] : undefined)).rows }), release: () => { releases++; } }) };
  let entered!: () => void; const first = new Promise<void>((r) => { entered = r; });
  let finish!: () => void; const hold = new Promise<void>((r) => { finish = r; });
  const a = seam(bad, ["scope-a"], async (r) => { entered(); await hold; return labels(r); });
  await first;
  await assert.rejects(seam(bad, ["scope-b"], labels), code("LEASE_NOT_EXCLUSIVE"));
  assert.equal(releases, 0, "the refused holder must not release the first holder's connection");
  finish();
  assert.deepEqual(await a, ["a1", "a2"]);
  assert.equal(releases, 1);
  client.release();
});

test("DOCUMENTED HAZARD: a session-level setting persists on a reused connection, which is why the seam detects and refuses it", async () => {
  const pool = track(mkPool(ROLE, 1));
  const c = await pool.connect();
  await c.query("SELECT set_config('ecc.scope_refs','scope-a',false)");
  c.release();
  assert.deepEqual((await pool.query("SELECT label FROM synthetic_matters ORDER BY label")).rows.map((r) => r.label), ["a1", "a2"], "leaked to the next user of the pooled connection");
  await assert.rejects(seam(leaser(pool), ["scope-b"], labels), code("CONTAMINATED_LEASE"));
});

test("DOCUMENTED LIMITATION: inside the transaction the role can set its own context, so settings filter a trusted context and do not authenticate grants", async () => {
  const pool = track(mkPool(ROLE, 1));
  const self = await seam(leaser(pool), ["scope-a"], async (r) => { await r.query("SELECT set_config('ecc.scope_refs','scope-c',true)"); return labels(r); });
  assert.deepEqual(self, ["c1"], "authorization must come from the verified read decision upstream, not from the database setting");
});

test("REPRODUCED on real PostgreSQL: authority that expires DURING COMMIT withholds the result and the write is durable (not undone)", async () => {
  const pool = track(mkPool(ROLE, 1));
  let now = 100;
  const seen: { discard: boolean; pid: number }[] = [];
  const l = leaser(pool, { after: new Map([["COMMIT", () => { now = 1001; }]]), onRelease: (discard, pid) => seen.push({ discard, pid }) });
  let err: unknown;
  const out = await seam(l, ["scope-a"], async (r) => { await r.query("INSERT INTO synthetic_scratch VALUES ('commit-expiry')"); return "WORK-RESULT"; }, () => now, 1000).catch((e) => { err = e; return "NOT-RETURNED"; });
  assert.equal(out, "NOT-RETURNED");
  assert.ok(err instanceof ContextSeamError && err.code === "CONTEXT_EXPIRED" && err.committed === true);
  assert.equal((await admin.query("SELECT 1 FROM synthetic_scratch WHERE x = 'commit-expiry'")).rowCount, 1, "COMMIT happened: the row is durable and the seam does not claim otherwise");
  assert.deepEqual(seen.map((x) => x.discard), [false], "cleanup still ran and the verified-clean connection was returned");
  assert.deepEqual((await pool.query("SELECT label FROM synthetic_matters")).rows, [], "no context survived");
});

test("authority that expires during the reset or the verification withholds the result on real PostgreSQL", async () => {
  for (const [name, trigger, nth] of [["during DISCARD ALL", "DISCARD ALL", 1], ["during the post-reset verification", "SELECT current_setting('ecc.scope_refs', true) AS scope_refs, current_setting('ecc.actor', true) AS actor, current_setting('ecc.restricted_evidence', true) AS restricted_evidence, (session_user::text = current_user::text) AS role_unchanged, (transaction_timestamp() = statement_timestamp()) AS idle", 2]] as const) {
    const pool = track(mkPool(ROLE, 1));
    let now = 100; let count = 0;
    const l = leaser(pool, { after: new Map([[trigger, () => { if (++count === nth) now = 1001; }]]) });
    let err: unknown;
    const out = await seam(l, ["scope-a"], async (r) => { await r.query(`INSERT INTO synthetic_scratch VALUES ('${name}')`); return "WORK-RESULT"; }, () => now, 1000).catch((e) => { err = e; return "NOT-RETURNED"; });
    assert.equal(out, "NOT-RETURNED", name);
    assert.ok(err instanceof ContextSeamError && err.code === "CONTEXT_EXPIRED" && err.committed === true, name);
    assert.equal((await admin.query("SELECT 1 FROM synthetic_scratch WHERE x = $1", [name])).rowCount, 1, `${name}: committed before the reset`);
    assert.deepEqual(await seam(leaser(pool), ["scope-b"], labels), ["b1"], `${name}: the same pool serves the next request cleanly`);
  }
});

test("REPRODUCED: NaN, Infinity, undefined, null, string and non-positive expiry never take a connection from the pool", async () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, undefined, null, "1000", 0, -1] as unknown[]) {
    const pool = track(mkPool(ROLE, 1));
    let ran = false;
    await assert.rejects(withLeasedContext(leaser(pool), { actor: PERSON, scopeRefs: ["scope-a"], validUntilMs: bad as number }, { expectedRole: ROLE, now: Date.now }, async () => { ran = true; }), code("INVALID_CONTEXT"), String(bad));
    assert.equal(ran, false, String(bad));
    assert.equal(pool.totalCount, 0, `${String(bad)}: no connection was ever opened`);
  }
});
