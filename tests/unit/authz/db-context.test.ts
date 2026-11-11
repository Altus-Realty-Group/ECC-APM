import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { ContextSeamError, ROLE_CHECK_SQL, SET_CONTEXT_SQL, withTransactionContext, type SqlRunner } from "../../../shared/authz/dbContext.ts";

const PERSON = "10000000-0000-4000-8000-000000000001";

/**
 * SIMULATION (labelled): one reused pooled connection that models PostgreSQL's documented set_config semantics:
 * is_local=true lasts until COMMIT/ROLLBACK; is_local=false lasts for the session. The real-PostgreSQL proof of the same seam
 * is tests/authz-db (npm run test:authz-db); this simulation only makes the rules CI-visible and records every statement.
 */
function pooledConnection(role: { name: string; bypass: boolean }) {
  const log: string[] = [];
  const session = new Map<string, string>();
  let local = new Map<string, string>();
  let inTx = false;
  const rows = [{ scope: "scope-a", v: 1 }, { scope: "scope-b", v: 2 }];
  const setting = (k: string) => local.get(k) ?? session.get(k) ?? "";
  const runner: SqlRunner = {
    async query(text, values = []) {
      log.push(text);
      if (text === "BEGIN") { inTx = true; return { rows: [] }; }
      if (text === "COMMIT" || text === "ROLLBACK") { inTx = false; local = new Map(); return { rows: [] }; }
      if (text === ROLE_CHECK_SQL) return { rows: [{ role_name: role.name, bypass: role.bypass }] };
      if (text === SET_CONTEXT_SQL) { assert.ok(inTx, "context must be set inside a transaction"); local.set("ecc.scope_refs", String(values[0])); local.set("ecc.actor", String(values[1])); return { rows: [{}] }; }
      if (text === "SELECT scope, v FROM matters") { const allowed = setting("ecc.scope_refs").split(",").filter(Boolean); return { rows: rows.filter((r) => allowed.includes(r.scope)) }; }
      if (text === "BOOM") throw new Error("boom");
      throw new Error("unexpected statement " + text);
    },
  };
  return { runner, log, session, current: () => ({ scopes: setting("ecc.scope_refs"), actor: setting("ecc.actor") }) };
}
const ROLE = "ecc_legal_runtime";
const ctx = (scopeRefs: string[]) => ({ actor: PERSON, scopeRefs });

test("[simulation] context applies inside the transaction and is gone after commit on a reused connection", async () => {
  const c = pooledConnection({ name: ROLE, bypass: false });
  const seen = await withTransactionContext(c.runner, ctx(["scope-a"]), ROLE, async (run) => (await run.query("SELECT scope, v FROM matters")).rows);
  assert.deepEqual(seen.map((r) => r.scope), ["scope-a"]);
  assert.deepEqual(c.current(), { scopes: "", actor: "" });
  const next = await withTransactionContext(c.runner, ctx(["scope-b"]), ROLE, async (run) => (await run.query("SELECT scope, v FROM matters")).rows);
  assert.deepEqual(next.map((r) => r.scope), ["scope-b"], "second request on the same connection sees only its own scope");
  assert.equal((await c.runner.query("SELECT scope, v FROM matters")).rows.length, 0, "no context outside a seam transaction => nothing");
});

test("[simulation] a failing read rolls back and leaves no context for the next user of the connection", async () => {
  const c = pooledConnection({ name: ROLE, bypass: false });
  await assert.rejects(withTransactionContext(c.runner, ctx(["scope-a"]), ROLE, async (run) => { await run.query("BOOM"); }), /boom/);
  assert.equal(c.log.at(-1), "ROLLBACK");
  assert.deepEqual(c.current(), { scopes: "", actor: "" });
});

test("[simulation] a bypass-capable role is refused before any context is set", async () => {
  const c = pooledConnection({ name: "service_role_like", bypass: true });
  await assert.rejects(withTransactionContext(c.runner, ctx(["scope-a"]), "service_role_like", async () => "unreachable"), (e: unknown) => e instanceof ContextSeamError && e.code === "BYPASS_ROLE");
  assert.ok(!c.log.includes(SET_CONTEXT_SQL));
  assert.equal(c.log.at(-1), "ROLLBACK");
});

test("[simulation] the wrong role, an unverifiable role and unsafe context never reach the read", async () => {
  const wrong = pooledConnection({ name: "someone_else", bypass: false });
  await assert.rejects(withTransactionContext(wrong.runner, ctx(["scope-a"]), ROLE, async () => 1), (e: unknown) => e instanceof ContextSeamError && e.code === "WRONG_ROLE");
  const unverified: SqlRunner = { async query(text) { return text === ROLE_CHECK_SQL ? { rows: [{ role_name: ROLE, bypass: null }] } : { rows: [] }; } };
  await assert.rejects(withTransactionContext(unverified, ctx(["scope-a"]), ROLE, async () => 1), (e: unknown) => e instanceof ContextSeamError && e.code === "ROLE_UNVERIFIED");
  for (const bad of [["scope-a,scope-b"], ["scope a"], [""], [], ["x\u0000y"], ["a".repeat(129)]]) {
    const c = pooledConnection({ name: ROLE, bypass: false });
    await assert.rejects(withTransactionContext(c.runner, ctx(bad), ROLE, async () => 1), (e: unknown) => e instanceof ContextSeamError && e.code === "INVALID_CONTEXT");
    assert.equal(c.log.length, 0, "invalid context is refused before any statement");
  }
  const c = pooledConnection({ name: ROLE, bypass: false });
  await assert.rejects(withTransactionContext(c.runner, { actor: "not-a-uuid", scopeRefs: ["scope-a"] }, ROLE, async () => 1), ContextSeamError);
});

test("the seam only ever issues transaction-local set_config (never session-level)", () => {
  assert.match(SET_CONTEXT_SQL, /set_config\('ecc\.scope_refs', \$1, true\)/);
  assert.match(SET_CONTEXT_SQL, /set_config\('ecc\.actor', \$2, true\)/);
  assert.doesNotMatch(SET_CONTEXT_SQL, /,\s*false\)/);
  const src = readFileSync(new URL("../../../shared/authz/dbContext.ts", import.meta.url), "utf8").replace(/\/\/[^\n]*/g, "");
  assert.doesNotMatch(src, /set_config\([^)]*false\)/i);
});

test("authorization source has no service-role client, transport, environment or cookie dependency", () => {
  const dir = new URL("../../../shared/authz/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const code = readFileSync(new URL(f, dir), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(code, /SERVICE_ROLE|service_role|createClient|server\/db|supabase-js|@supabase/i, f);
    assert.doesNotMatch(code, /process\.env|from\s+["']express["']|from\s+["']node:(http|https|crypto|fs|net)["']|\bfetch\s*\(|document\.cookie|Set-Cookie/i, f);
  }
});
