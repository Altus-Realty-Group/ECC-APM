import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import {
  CLEAN_CHECK_SQL, ContextSeamError, RESET_SQL, ROLE_CHECK_SQL, SET_CONTEXT_SQL, withLeasedContext,
  type ConnectionLeaser, type LeasedConnection, type SqlRunner,
} from "../../../shared/authz/dbContext.ts";

const PERSON = "10000000-0000-4000-8000-000000000001";
const ROLE = "ecc_legal_runtime";
const T0 = 1_000_000;

/**
 * SIMULATION (labelled): a small pool of connections that models PostgreSQL's documented behaviour for transaction-local versus
 * session-level settings, DISCARD ALL, SET ROLE and open transactions, plus fault injection. It makes the lease/cleanup rules
 * CI-visible and records every release decision. The real-PostgreSQL proof of the same seam is tests/authz-db (npm run test:authz-db).
 */
class SimConn {
  session = new Map<string, string>();
  local = new Map<string, string>();
  inTx = false;
  roleChanged = false;
  log: string[] = [];
  constructor(public id: string, public role = { name: ROLE, bypass: false }) {}
  setting(k: string) { return this.local.get(k) ?? this.session.get(k) ?? null; }
}
type Faults = { failOn?: Map<string, Error>; resetIsNoop?: boolean; applyBeforeFailing?: boolean };
class SimPool {
  conns: SimConn[] = [];
  free: SimConn[] = [];
  waiters: ((c: SimConn) => void)[] = [];
  releases: { id: string; discard: boolean }[] = [];
  created = 0;
  leases = 0;
  constructor(size: number, private faults: Faults = {}, private role = { name: ROLE, bypass: false }) { for (let i = 0; i < size; i++) this.add(); }
  private add() { const c = new SimConn(`conn-${++this.created}`, this.role); this.conns.push(c); this.free.push(c); }
  leaser(): ConnectionLeaser {
    return { lease: async () => {
      this.leases++;
      const conn = this.free.shift() ?? await new Promise<SimConn>((resolve) => this.waiters.push(resolve));
      return this.wrap(conn);
    } };
  }
  wrap(conn: SimConn): LeasedConnection {
    const faults = this.faults;
    return {
      leaseId: conn.id,
      query: async (text, values = []) => {
        conn.log.push(text);
        const fault = faults.failOn?.get(text);
        // "applied" faults model a statement whose effect happened but whose acknowledgement failed: the leftover state is then CLEAN,
        // so only the seam's own rule (not the later reset/verification) can decide to discard the connection.
        if (fault && !faults.applyBeforeFailing) throw fault;
        if (fault && (text === "ROLLBACK" || text === "COMMIT")) { conn.inTx = false; conn.local = new Map(); throw fault; }
        if (text === "BEGIN") { conn.inTx = true; return { rows: [] }; }
        if (text === "COMMIT" || text === "ROLLBACK") { conn.inTx = false; conn.local = new Map(); return { rows: [] }; }
        if (text === CLEAN_CHECK_SQL) return { rows: [{ scope_refs: conn.setting("ecc.scope_refs"), actor: conn.setting("ecc.actor"), restricted_evidence: conn.setting("ecc.restricted_evidence"), role_unchanged: !conn.roleChanged, idle: !conn.inTx }] };
        if (text === ROLE_CHECK_SQL) return { rows: [{ role_name: conn.role.name, bypass: conn.role.bypass }] };
        if (text === SET_CONTEXT_SQL) { assert.ok(conn.inTx, "context must be set inside a transaction"); conn.local.set("ecc.scope_refs", String(values[0])); conn.local.set("ecc.actor", String(values[1])); conn.local.set("ecc.restricted_evidence", String(values[2])); return { rows: [{}] }; }
        if (text === RESET_SQL) { if (conn.inTx) throw new Error("DISCARD ALL cannot run inside a transaction block"); if (!faults.resetIsNoop) { conn.session = new Map(); conn.roleChanged = false; } return { rows: [] }; }
        if (text === "SELECT scope, v FROM matters") { const allowed = (conn.setting("ecc.scope_refs") ?? "").split(",").filter(Boolean); return { rows: ["scope-a", "scope-b", "scope-c"].filter((s) => allowed.includes(s)).map((s) => ({ scope: s })) }; }
        if (text.startsWith("SESSION_SET ")) { const [k, v] = text.slice(12).split("="); conn.session.set(k, v); return { rows: [] }; }
        if (text === "SESSION_SET_ROLE") { conn.roleChanged = true; return { rows: [] }; }
        if (text === "BOOM") throw new Error("boom");
        throw new Error("unexpected statement " + text);
      },
      release: (discard) => {
        this.releases.push({ id: conn.id, discard });
        if (discard) { this.conns = this.conns.filter((c) => c !== conn); this.add(); }
        else this.free.push(conn);
        const next = this.waiters.shift();
        if (next && this.free.length) next(this.free.shift()!);
      },
    };
  }
}
const ctx = (scopeRefs: string[], validUntilMs = T0 + 10_000) => ({ actor: PERSON, scopeRefs, validUntilMs });
const opts = (now: () => number = () => T0) => ({ expectedRole: ROLE, now });
const rows = async (run: SqlRunner) => (await run.query("SELECT scope, v FROM matters")).rows.map((r) => r.scope);
const code = (c: string) => (e: unknown) => e instanceof ContextSeamError && e.code === c;

test("[simulation] context applies inside the transaction and is gone for the next user of the SAME leased connection", async () => {
  const pool = new SimPool(1);
  assert.deepEqual(await withLeasedContext(pool.leaser(), ctx(["scope-a"]), opts(), rows), ["scope-a"]);
  assert.deepEqual(await withLeasedContext(pool.leaser(), ctx(["scope-b"]), opts(), rows), ["scope-b"]);
  assert.deepEqual(pool.releases, [{ id: "conn-1", discard: false }, { id: "conn-1", discard: false }], "same connection reused, never discarded when clean");
  assert.equal(pool.conns[0].setting("ecc.scope_refs"), null);
  assert.equal(pool.conns[0].inTx, false);
});

test("[simulation] restricted evidence is pinned to default-deny inside every transaction", async () => {
  const pool = new SimPool(1);
  const seen = await withLeasedContext(pool.leaser(), ctx(["scope-a"]), opts(), async () => pool.conns[0].setting("ecc.restricted_evidence"));
  assert.equal(seen, "off");
});

test("[simulation] inherited session context, a changed role or an open transaction is refused, never run, and the connection is DISCARDED", async () => {
  const variants: [string, (c: SimConn) => void][] = [
    ["inherited scope list", (c) => c.session.set("ecc.scope_refs", "scope-b")],
    ["inherited actor", (c) => c.session.set("ecc.actor", PERSON)],
    ["inherited restricted-evidence entitlement", (c) => c.session.set("ecc.restricted_evidence", "on")],
    ["inherited SET ROLE", (c) => { c.roleChanged = true; }],
    ["open transaction left by a previous holder", (c) => { c.inTx = true; }],
  ];
  for (const [name, taint] of variants) {
    const pool = new SimPool(1);
    taint(pool.conns[0]);
    let ran = false;
    await assert.rejects(withLeasedContext(pool.leaser(), ctx(["scope-a"]), opts(), async () => { ran = true; }), code("CONTAMINATED_LEASE"), name);
    assert.equal(ran, false, name);
    assert.deepEqual(pool.releases, [{ id: "conn-1", discard: true }], name);
    // The pool replaced it with a clean connection and the next request works.
    assert.deepEqual(await withLeasedContext(pool.leaser(), ctx(["scope-c"]), opts(), rows), ["scope-c"], name);
    assert.equal(pool.releases.at(-1)!.id, "conn-2", name);
  }
});

test("[simulation] session-level settings written by the work are reset afterwards and the connection is reused clean", async () => {
  const pool = new SimPool(1);
  await withLeasedContext(pool.leaser(), ctx(["scope-a"]), opts(), async (run) => { await run.query("SESSION_SET ecc.scope_refs=scope-b"); await run.query("SESSION_SET ecc.restricted_evidence=on"); });
  assert.equal(pool.conns[0].session.size, 0, "DISCARD ALL cleared the session-level writes");
  assert.deepEqual(pool.releases, [{ id: "conn-1", discard: false }]);
  assert.deepEqual(await withLeasedContext(pool.leaser(), ctx(["scope-c"]), opts(), rows), ["scope-c"]);
});

test("[simulation] a failing read rolls back, resets and leaves nothing for the next holder", async () => {
  const pool = new SimPool(1);
  await assert.rejects(withLeasedContext(pool.leaser(), ctx(["scope-a"]), opts(), async (run) => { await run.query("BOOM"); }), /boom/);
  const log = pool.conns[0].log;
  assert.ok(log.indexOf("ROLLBACK") > -1 && log.indexOf(RESET_SQL) > log.indexOf("ROLLBACK"));
  assert.deepEqual(pool.releases, [{ id: "conn-1", discard: false }]);
  assert.equal(pool.conns[0].setting("ecc.scope_refs"), null);
});

test("[simulation] rollback, commit or reset failure DISCARDS the connection instead of returning it to the pool", async () => {
  const cases: [string, Faults, (run: SqlRunner) => Promise<unknown>][] = [
    ["ROLLBACK fails after a failed read", { failOn: new Map([["ROLLBACK", new Error("rollback failed")]]) }, async (r) => { await r.query("BOOM"); }],
    ["ROLLBACK fails but left clean state (only the seam's own rule can catch this)", { failOn: new Map([["ROLLBACK", new Error("rollback ack failed")]]), applyBeforeFailing: true }, async (r) => { await r.query("BOOM"); }],
    ["COMMIT fails", { failOn: new Map([["COMMIT", new Error("commit failed")]]) }, async () => 1],
    ["COMMIT fails but left clean state (only the seam's own rule can catch this)", { failOn: new Map([["COMMIT", new Error("commit ack failed")]]), applyBeforeFailing: true }, async () => 1],
    ["DISCARD ALL fails", { failOn: new Map([[RESET_SQL, new Error("reset failed")]]) }, async () => 1],
    ["DISCARD ALL silently does nothing, so verification still sees the leftover", { resetIsNoop: true }, async (r) => { await r.query("SESSION_SET ecc.scope_refs=scope-b"); }],
    ["post-reset verification query fails", {}, async () => 1],
  ];
  for (const [name, faults, work] of cases) {
    const pool = new SimPool(1, name.startsWith("post-reset") ? { failOn: undefined } : faults);
    if (name.startsWith("post-reset")) {
      // fail the SECOND clean check only (the first one passed at lease time)
      let checks = 0; const base = pool.wrap.bind(pool);
      pool.wrap = (c) => { const w = base(c); return { ...w, query: async (t, v) => { if (t === CLEAN_CHECK_SQL && ++checks === 2) throw new Error("verify failed"); return w.query(t, v); } }; };
    }
    await withLeasedContext(pool.leaser(), ctx(["scope-a"]), opts(), work).catch(() => undefined);
    assert.deepEqual(pool.releases, [{ id: "conn-1", discard: true }], name);
    assert.equal(pool.conns[0].id, "conn-2", `${name}: a fresh connection replaced it`);
  }
});

test("[simulation] a bypass-capable or wrong role is refused before any context is set", async () => {
  const bypass = new SimPool(1, {}, { name: "service_role_like", bypass: true });
  await assert.rejects(withLeasedContext(bypass.leaser(), ctx(["scope-a"]), { expectedRole: "service_role_like", now: () => T0 }, async () => "unreachable"), code("BYPASS_ROLE"));
  assert.ok(!bypass.conns[0].log.includes(SET_CONTEXT_SQL));
  const wrong = new SimPool(1, {}, { name: "someone_else", bypass: false });
  await assert.rejects(withLeasedContext(wrong.leaser(), ctx(["scope-a"]), opts(), async () => 1), code("WRONG_ROLE"));
  const unverifiable: ConnectionLeaser = { lease: async () => ({ leaseId: "u1", release: () => undefined, query: async (t: string) => ({ rows: t === CLEAN_CHECK_SQL ? [{ scope_refs: null, actor: null, restricted_evidence: null, role_unchanged: true, idle: true }] : t === ROLE_CHECK_SQL ? [{ role_name: ROLE, bypass: null }] : [] }) }) };
  await assert.rejects(withLeasedContext(unverifiable, ctx(["scope-a"]), opts(), async () => 1), code("ROLE_UNVERIFIED"));
});

test("[simulation] unsafe or already-expired context never leases a connection", async () => {
  for (const bad of [["scope-a,scope-b"], ["scope a"], [""], [], ["x\u0000y"], ["a".repeat(129)]]) {
    const pool = new SimPool(1);
    await assert.rejects(withLeasedContext(pool.leaser(), ctx(bad), opts(), async () => 1), code("INVALID_CONTEXT"));
    assert.equal(pool.leases, 0);
  }
  const pool = new SimPool(1);
  await assert.rejects(withLeasedContext(pool.leaser(), { actor: "not-a-uuid", scopeRefs: ["scope-a"], validUntilMs: T0 + 1 }, opts(), async () => 1), code("INVALID_CONTEXT"));
  await assert.rejects(withLeasedContext(pool.leaser(), ctx(["scope-a"], T0), opts(), async () => 1), code("CONTEXT_EXPIRED"));
  assert.equal(pool.leases, 0, "expired authority is refused before any connection is taken");
});

test("[simulation] authority that ends DURING the work rolls the transaction back and returns nothing", async () => {
  for (const [name, advanceAt] of [["expires while the work runs", "during"], ["expires exactly when the work finishes", "after"]] as const) {
    const pool = new SimPool(1);
    let now = T0;
    const result = withLeasedContext(pool.leaser(), ctx(["scope-a"], T0 + 1000), opts(() => now), async (run) => {
      const r = await rows(run);
      now = advanceAt === "during" ? T0 + 5000 : T0 + 1000;
      return r;
    });
    await assert.rejects(result, code("CONTEXT_EXPIRED"), name);
    assert.ok(pool.conns[0].log.includes("ROLLBACK") && !pool.conns[0].log.includes("COMMIT"), name);
    assert.equal(pool.conns[0].setting("ecc.scope_refs"), null, name);
  }
  const regress = new SimPool(1);
  let n = 0;
  await assert.rejects(withLeasedContext(regress.leaser(), ctx(["scope-a"]), opts(() => [T0 + 5, T0][Math.min(n++, 1)]), async () => 1), code("CLOCK_INVALID"));
});

test("[simulation] the runner handed to the work stops working when the transaction ends", async () => {
  const pool = new SimPool(1);
  let leaked!: SqlRunner;
  await withLeasedContext(pool.leaser(), ctx(["scope-a"]), opts(), async (run) => { leaked = run; });
  await assert.rejects(leaked.query("SELECT scope, v FROM matters"), code("LEASE_NOT_EXCLUSIVE"));
});

test("[simulation] parallel requests on a multi-connection pool never share a connection or mix scopes", async () => {
  const pool = new SimPool(3);
  let maxHeld = 0;
  const jobs = Array.from({ length: 24 }, (_, i) => {
    const scope = ["scope-a", "scope-b", "scope-c"][i % 3];
    return withLeasedContext(pool.leaser(), ctx([scope]), opts(), async (run) => {
      await new Promise((r) => setImmediate(r));
      const inTx = pool.conns.filter((x) => x.inTx);
      maxHeld = Math.max(maxHeld, inTx.length);
      assert.ok(inTx.every((x) => /^scope-[abc]$/.test(x.setting("ecc.scope_refs") ?? "")), "each connection carries exactly one request's scope");
      const got = await rows(run);
      assert.deepEqual(got, [scope]);
      return got;
    });
  });
  assert.equal((await Promise.all(jobs)).length, 24);
  assert.ok(maxHeld >= 2 && maxHeld <= 3, `expected real parallelism bounded by the pool, saw ${maxHeld}`);
  assert.ok(pool.releases.every((r) => !r.discard));
  assert.ok(pool.conns.every((c) => !c.inTx && c.session.size === 0 && c.local.size === 0));
});

test("[simulation] with ONE connection, concurrent requests are serialized and never interleave", async () => {
  const pool = new SimPool(1);
  const order: string[] = [];
  const work = (scope: string) => withLeasedContext(pool.leaser(), ctx([scope]), opts(), async (run) => {
    order.push(`start ${scope}`);
    await new Promise((r) => setImmediate(r));
    const got = await rows(run);
    order.push(`end ${scope}`);
    return got;
  });
  const [a, b, c] = await Promise.all([work("scope-a"), work("scope-b"), work("scope-c")]);
  assert.deepEqual([a, b, c], [["scope-a"], ["scope-b"], ["scope-c"]]);
  assert.deepEqual(order, ["start scope-a", "end scope-a", "start scope-b", "end scope-b", "start scope-c", "end scope-c"]);
});

test("[simulation] a pool that hands one connection to two holders is detected; the second is refused and does not release it", async () => {
  const pool = new SimPool(1);
  const conn = pool.conns[0];
  const bad: ConnectionLeaser = { lease: async () => pool.wrap(conn) };
  let enteredFirst!: () => void; const first = new Promise<void>((r) => { enteredFirst = r; });
  let finishFirst!: () => void; const hold = new Promise<void>((r) => { finishFirst = r; });
  const a = withLeasedContext(bad, ctx(["scope-a"]), opts(), async (run) => { enteredFirst(); await hold; return rows(run); });
  await first;
  await assert.rejects(withLeasedContext(bad, ctx(["scope-b"]), opts(), rows), code("LEASE_NOT_EXCLUSIVE"));
  assert.equal(pool.releases.length, 0, "the refused second holder must not release the first holder's connection");
  finishFirst();
  assert.deepEqual(await a, ["scope-a"]);
  assert.deepEqual(pool.releases, [{ id: "conn-1", discard: false }]);
});

test("the seam only ever issues transaction-local set_config and resets with DISCARD ALL", () => {
  assert.match(SET_CONTEXT_SQL, /set_config\('ecc\.scope_refs', \$1, true\)/);
  assert.match(SET_CONTEXT_SQL, /set_config\('ecc\.actor', \$2, true\)/);
  assert.match(SET_CONTEXT_SQL, /set_config\('ecc\.restricted_evidence', \$3, true\)/);
  assert.doesNotMatch(SET_CONTEXT_SQL, /,\s*false\)/);
  assert.equal(RESET_SQL, "DISCARD ALL");
  const src = readFileSync(new URL("../../../shared/authz/dbContext.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, /set_config\([^)]*false\)/i);
  assert.doesNotMatch(src, /\bpool\b|\.connect\(/i, "the seam accepts a lease, never a shared pool handle");
});

test("authorization source has no service-role client, transport, environment or cookie dependency", () => {
  const dir = new URL("../../../shared/authz/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const code = readFileSync(new URL(f, dir), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(code, /SERVICE_ROLE|service_role|createClient|server\/db|supabase-js|@supabase/i, f);
    assert.doesNotMatch(code, /process\.env|from\s+["']express["']|from\s+["']node:(http|https|crypto|fs|net)["']|\bfetch\s*\(|document\.cookie|Set-Cookie/i, f);
  }
});
