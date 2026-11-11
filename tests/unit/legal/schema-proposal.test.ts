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

test("SQL and contract money rules are aligned", () => {
  assert.match(sql, /CHECK \(\(amount_cents IS NULL\) = \(currency IS NULL\)\)/);
  assert.match(sql, /amount_cents <= 9007199254740991/);
});
test("matter integrity is enforced by composite foreign keys and immutability triggers", () => {
  assert.match(sql, /FOREIGN KEY \(award_id, matter_id\) REFERENCES legal_awards\(id, matter_id\)/);
  assert.match(sql, /FOREIGN KEY \(party_id, matter_id\) REFERENCES legal_parties\(id, matter_id\)/);
  assert.match(sql, /FOREIGN KEY \(requirement_id, matter_id\) REFERENCES legal_evidence_requirements\(id, matter_id\)/);
  assert.match(sql, /legal_matter_id_immutable/);
});
test("evidence confidence is guarded and journalled", () => {
  assert.match(sql, /legal_evidence_guard/);
  assert.match(sql, /'evidence_confidence_changed'/);
});
test("rollback states its partial nature", () => {
  assert.match(rollback, /NOT AN EXACT RESTORE/);
  assert.match(rollback, /RESIDUAL STATE/);
});

test("proposal refuses a preexisting runtime role instead of adopting it", () => {
  assert.match(sql, /refusing to adopt a preexisting role/);
  assert.doesNotMatch(sql, /IF NOT EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'ecc_legal_runtime'\)/);
});
test("rollback never uses DROP OWNED and fails closed on role custody", () => {
  const rb = rollback.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(rb, /DROP\s+OWNED/i);
  assert.match(rb, /rollback refused: ecc_legal_runtime owns/);
  assert.match(rb, /DROP ROLE ecc_legal_runtime;/);
});
