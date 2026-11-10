import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const stripComments = (t: string) => t.replace(/--[^\n]*/g, "");
const sql = stripComments(readFileSync(new URL("../../../docs/legal/schema/001_native_legal_foundation.proposal.sql", import.meta.url), "utf8"));
const rawSql = readFileSync(new URL("../../../docs/legal/schema/001_native_legal_foundation.proposal.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../../../docs/legal/schema/001_native_legal_foundation.rollback.proposal.sql", import.meta.url), "utf8");

test("proposal is labelled not applied and is additive", () => {
  assert.match(rawSql, /PROPOSAL ONLY/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM|INSERT INTO legacy|UPDATE legacy/i);
});
test("no money default of zero anywhere", () => {
  assert.doesNotMatch(sql, /amount_cents[^,\n]*DEFAULT\s+0/i);
  assert.doesNotMatch(sql, /_cents[^,\n]*DEFAULT\s+0/i);
});
test("obligor table has no amount column", () => {
  const block = /CREATE TABLE IF NOT EXISTS legal_award_obligors \(([\s\S]*?)\n\);/.exec(sql)?.[1] ?? "";
  assert.ok(block.length > 0);
  assert.doesNotMatch(block, /cent|amount/i);
});
test("anon/authenticated are revoked and runtime role is non-bypass", () => {
  assert.match(sql, /REVOKE ALL ON %I FROM anon/);
  assert.match(sql, /REVOKE ALL ON %I FROM authenticated/);
  assert.match(sql, /NOBYPASSRLS/);
  assert.doesNotMatch(sql, /GRANT[^;]*\b(anon|authenticated)\b/i);
});
test("journal grants exclude UPDATE and DELETE", () => {
  assert.match(sql, /GRANT SELECT, INSERT ON legal_award_obligors, legal_case_events TO ecc_legal_runtime/);
});
test("rollback refuses to drop populated tables", () => {
  assert.match(rollback, /rollback refused/);
});
