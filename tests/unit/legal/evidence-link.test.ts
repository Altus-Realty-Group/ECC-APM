import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LegalContractError } from "../../../shared/legal/contracts.ts";
import {
  assertAuthority, bindingKey, deriveBindingState, findBindingConflict, journalDimensionIsEvidenceSubject, journalEventFor, manifestVersionIds,
  parseAttachRequest, parseEvidenceRef, parseUuid, parseWithdrawRequest, planAttach, planWithdraw, storageRefIsIdentity, type EvidenceRef,
} from "../../../shared/legal/evidenceLink.ts";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ok = { matter: true, document: true };
const ref = (over: Record<string, unknown> = {}): EvidenceRef => parseEvidenceRef({
  id: U(1), matterId: U(10), requirementId: U(20), documentVersionId: null, withdrawnAt: null, revision: 1, restricted: false, storageRef: "opaque-1", ...over,
});

test("legacy refs are unbound whatever their storageRef looks like; a storageRef is never an identity", () => {
  const legacy = ref({ storageRef: U(99) });                    // looks exactly like a version id
  assert.equal(deriveBindingState(legacy), "unbound");
  assert.equal(legacy.documentVersionId, null);
  assert.equal(storageRefIsIdentity(U(99)), false);
  assert.equal(deriveBindingState(ref({ restricted: true, storageRef: "folder/legal/ExhibitA.pdf" })), "unbound");
});
test("binding state is derived: unbound, active, withdrawn; a withdrawal without a version is impossible", () => {
  assert.equal(deriveBindingState(ref({ documentVersionId: U(5) })), "active");
  assert.equal(deriveBindingState(ref({ documentVersionId: U(5), withdrawnAt: "2026-11-15T10:00:00Z" })), "withdrawn");
  assert.throws(() => ref({ withdrawnAt: "2026-11-15T10:00:00Z" }), LegalContractError);
  assert.throws(() => deriveBindingState({ documentVersionId: null, withdrawnAt: "2026-11-15T10:00:00Z" }), LegalContractError);
});
test("identifiers must be canonical uuids; filenames, paths and URLs are rejected as versions", () => {
  for (const bad of ["", "42", "ExhibitA.pdf", "/a/b.pdf", "https://x/y", U(5) + "x", null, undefined, 5])
    assert.throws(() => parseAttachRequest({ evidenceId: U(1), documentVersionId: bad, expectedRevision: 1 }), LegalContractError);
  assert.equal(parseUuid(U(5).toUpperCase(), "x"), U(5));
});
test("requests accept only the registered version key: no extra identity fields, no caller withdrawal time", () => {
  assert.deepEqual(parseAttachRequest({ evidenceId: U(1), documentVersionId: U(5), expectedRevision: 3 }), { evidenceId: U(1), documentVersionId: U(5), expectedRevision: 3 });
  for (const extra of ["documentId", "sha256", "filename", "path", "url", "storageRef", "documentVersion"])
    assert.throws(() => parseAttachRequest({ evidenceId: U(1), documentVersionId: U(5), expectedRevision: 3, [extra]: "x" }), LegalContractError);
  assert.throws(() => parseWithdrawRequest({ evidenceId: U(1), expectedRevision: 3, withdrawnAt: "2020-01-01T00:00:00Z" }), LegalContractError);
});
test("expected revision is required, a positive safe integer", () => {
  for (const r of [undefined, null, 0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1, NaN])
    assert.throws(() => parseWithdrawRequest({ evidenceId: U(1), expectedRevision: r }), LegalContractError);
});
test("authority is an explicit gate: both decisions must be exactly true, nothing is inferred", () => {
  for (const a of [undefined, null, {}, { matter: true }, { document: true }, { matter: true, document: false }, { matter: "yes", document: true }, { matter: 1, document: 1 }])
    assert.throws(() => planAttach(ref(), parseAttachRequest({ evidenceId: U(1), documentVersionId: U(5), expectedRevision: 1 }), a), /unavailable/);
  assert.doesNotThrow(() => assertAuthority(ok));
});
test("attach plan: clean attach moves the revision once; stale revision is refused", () => {
  const req = parseAttachRequest({ evidenceId: U(1), documentVersionId: U(5), expectedRevision: 1 });
  assert.deepEqual(planAttach(ref(), req, ok), { kind: "attach", nextRevision: 2 });
  assert.throws(() => planAttach(ref({ revision: 2 }), req, ok), /stale revision/);
  assert.throws(() => planAttach(ref({ id: U(2) }), req, ok), LegalContractError);
});
test("exact replay is a no-op (lost reply, retry); a different version, a stale replay and a withdrawn row are conflicts", () => {
  const req = parseAttachRequest({ evidenceId: U(1), documentVersionId: U(5), expectedRevision: 1 });
  assert.deepEqual(planAttach(ref({ documentVersionId: U(5), revision: 2 }), req, ok), { kind: "replay" });
  assert.equal(journalEventFor({ kind: "replay" }, U(1)), null);
  assert.throws(() => planAttach(ref({ documentVersionId: U(6), revision: 2 }), req, ok), /already bound/);
  assert.throws(() => planAttach(ref({ documentVersionId: U(5), revision: 3 }), req, ok), /already bound/);
  assert.throws(() => planAttach(ref({ documentVersionId: U(5), withdrawnAt: "2026-11-15T10:00:00Z", revision: 3 }), req, ok), /already bound/);
});
test("withdraw plan: only an active binding; replay at expected + 1 is a no-op; no restore", () => {
  const req = parseWithdrawRequest({ evidenceId: U(1), expectedRevision: 2 });
  assert.deepEqual(planWithdraw(ref({ documentVersionId: U(5), revision: 2 }), req, ok), { kind: "withdraw", nextRevision: 3 });
  assert.deepEqual(planWithdraw(ref({ documentVersionId: U(5), withdrawnAt: "2026-11-15T10:00:00Z", revision: 3 }), req, ok), { kind: "replay" });
  assert.throws(() => planWithdraw(ref(), req, ok), /not an active binding/);
  assert.throws(() => planWithdraw(ref({ documentVersionId: U(5), revision: 4 }), req, ok), /stale revision/);
  assert.throws(() => planWithdraw(ref({ documentVersionId: U(5), withdrawnAt: "2026-11-15T10:00:00Z", revision: 9 }), req, ok), /not an active binding/);
});
test("binding key treats an unassigned requirement as a real key part (NULLS NOT DISTINCT)", () => {
  const a = bindingKey({ matterId: U(10), requirementId: null, documentVersionId: U(5) });
  assert.equal(a, bindingKey({ matterId: U(10), requirementId: null, documentVersionId: U(5) }));
  assert.notEqual(a, bindingKey({ matterId: U(10), requirementId: U(20), documentVersionId: U(5) }));
  assert.notEqual(a, bindingKey({ matterId: U(11), requirementId: null, documentVersionId: U(5) }));
});
test("duplicate matter/requirement/version bindings conflict, including null requirements and withdrawn rows; distinct requirements and matters do not", () => {
  const held = ref({ id: U(2), requirementId: null, documentVersionId: U(5) });
  const withdrawn = ref({ id: U(3), requirementId: U(20), documentVersionId: U(6), withdrawnAt: "2026-11-15T10:00:00Z" });
  assert.equal(findBindingConflict([held, withdrawn], { evidenceId: U(1), matterId: U(10), requirementId: null, documentVersionId: U(5) })?.id, U(2));
  assert.equal(findBindingConflict([held, withdrawn], { evidenceId: U(1), matterId: U(10), requirementId: U(20), documentVersionId: U(6) })?.id, U(3));
  assert.equal(findBindingConflict([held], { evidenceId: U(1), matterId: U(10), requirementId: U(21), documentVersionId: U(5) }), null);
  assert.equal(findBindingConflict([held], { evidenceId: U(1), matterId: U(11), requirementId: null, documentVersionId: U(5) }), null);
  assert.equal(findBindingConflict([held], { evidenceId: U(2), matterId: U(10), requirementId: null, documentVersionId: U(5) }), null);   // itself
});
test("one version may support several requirements; the packet manifest deduplicates by version and excludes unbound and withdrawn", () => {
  const refs = [ref({ id: U(1), requirementId: U(20), documentVersionId: U(5) }), ref({ id: U(2), requirementId: U(21), documentVersionId: U(5) }),
    ref({ id: U(3), documentVersionId: U(6), withdrawnAt: "2026-11-15T10:00:00Z" }), ref({ id: U(4) })];
  assert.deepEqual(manifestVersionIds(refs), [U(5)]);
});
test("journal events are content-free and use the masked evidence-subject dimension", () => {
  const a = journalEventFor({ kind: "attach", nextRevision: 2 }, U(1))!;
  assert.deepEqual(a, { eventType: "evidence_attached", dimension: "evidence_attachment", fromStatus: "unbound", toStatus: "attached", subjectId: U(1) });
  const w = journalEventFor({ kind: "withdraw", nextRevision: 3 }, U(1))!;
  assert.deepEqual(w, { eventType: "evidence_withdrawn", dimension: "evidence_attachment", fromStatus: "attached", toStatus: "withdrawn", subjectId: U(1) });
  assert.doesNotMatch(JSON.stringify([a, w]), new RegExp(U(5)));
  assert.equal(journalDimensionIsEvidenceSubject("evidence_attachment"), true);
  assert.equal(journalDimensionIsEvidenceSubject("evidence_confidence"), true);
  for (const d of ["other", "lifecycle", null]) assert.equal(journalDimensionIsEvidenceSubject(d), false);
});

// ---- static alignment of the contract with the SQL proposal (the executable proof is tests/legal-evidence-link-db)
const sql = readFileSync(new URL("../../../docs/legal/schema/003_legal_evidence_linkage.proposal.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../../../docs/legal/schema/003_legal_evidence_linkage.rollback.proposal.sql", import.meta.url), "utf8");
const code = (t: string) => t.replace(/--[^\n]*/g, "");
test("003 SQL is labelled a proposal, adds no table/role/grant/policy-for-access, and never parses storage_ref", () => {
  assert.match(sql, /PROPOSAL ONLY/);
  assert.match(sql, /DOES NOT ESTABLISH DOCUMENT AUTHORIZATION/);
  assert.doesNotMatch(code(sql), /CREATE TABLE|CREATE ROLE|GRANT\b|CREATE VIEW|DROP TABLE|TRUNCATE|DELETE FROM/i);
  assert.doesNotMatch(code(sql), /storage_ref\s*(~|LIKE|SIMILAR|::uuid|SUBSTR|REGEXP)/i);
  assert.match(code(sql), /NULLS NOT DISTINCT/);
});
test("003 SQL qualifies every relation it touches", () => {
  const body = code(sql).replace(/\$f\$[\s\S]*?\$f\$/g, "").replace(/'(?:[^']|'')*'/g, "''");   // format() strings are checked by the PG16 shadow scenarios
  const bare = /\b(?:ALTER TABLE|LOCK TABLE|REFERENCES|(?<!DISTINCT\s)FROM|INSERT INTO|DROP POLICY \w+ ON|CREATE POLICY \w+ ON|(?:BEFORE|AFTER) (?:INSERT|UPDATE) ON|CREATE UNIQUE INDEX \w+ ON)\s+(?!public\.|pg_catalog\.|pg_temp|NEW\b|OLD\b|ONLY\b)([a-z_]+)/gi;
  for (const m of body.matchAll(bare)) assert.fail(`unqualified relation near: ${m[0]}`);
});
test("003 rollback refuses bound/withdrawn evidence and journal custody, and never deletes rows", () => {
  assert.match(rollback, /rollback refused: .* evidence reference\(s\) are bound or withdrawn/);
  assert.match(rollback, /journal custody/);
  assert.doesNotMatch(code(rollback), /DELETE FROM|TRUNCATE|DROP TABLE/i);
});
