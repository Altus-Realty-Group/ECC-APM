import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LegalContractError } from "../../../shared/legal/contracts.ts";
import {
  assertAuthority, bindingKey, deriveBindingState, findBindingConflict, journalDimensionIsEvidenceSubject, journalEventFor, manifestVersionIds,
  parseAttachRequest, parseEvidenceRef, parseUuid, parseWithdrawRequest, planAttach, planWithdraw, storageRefIsIdentity, successorRevision,
  MAX_REQUEST_REVISION, MAX_ROW_REVISION, type EvidenceRef,
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

const full = (over: Record<string, unknown> = {}) => ({ id: U(1), matterId: U(10), requirementId: U(20), documentVersionId: U(5), withdrawnAt: null, revision: 2, restricted: false, storageRef: "x", ...over });
const omit = (k: string) => { const o: Record<string, unknown> = full(); delete o[k]; return o; };

test("R1: requirementId, documentVersionId and withdrawnAt must be PRESENT; omitted or undefined never implies unassigned, unbound or active", () => {
  for (const k of ["requirementId", "documentVersionId", "withdrawnAt"]) {
    assert.throws(() => parseEvidenceRef(omit(k)), /must be present/, `${k} omitted`);
    assert.throws(() => parseEvidenceRef(full({ [k]: undefined })), /must be present/, `${k} undefined`);
  }
  // the exact failure mode: a bound row whose withdrawnAt was dropped must not become an active binding in the manifest
  assert.throws(() => manifestVersionIds([parseEvidenceRef(omit("withdrawnAt"))]));
  // inherited properties do not count as present
  assert.throws(() => parseEvidenceRef(Object.assign(Object.create({ withdrawnAt: null }), omit("withdrawnAt"))), /must be present/);
});
test("R1: explicit nulls are the legacy shape and still parse as unbound; explicit values keep their meaning", () => {
  const legacy = parseEvidenceRef(full({ requirementId: null, documentVersionId: null, withdrawnAt: null, revision: 1 }));
  assert.equal(deriveBindingState(legacy), "unbound");
  assert.equal(legacy.requirementId, null);
  assert.equal(deriveBindingState(parseEvidenceRef(full())), "active");
});

test("R2: impossible calendar dates and malformed instants are rejected, never normalized to a neighbouring day", () => {
  const bad = ["2026-02-30T12:00:00Z", "2026-04-31T00:00:00Z", "2025-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2026-13-01T00:00:00Z", "2026-00-10T00:00:00Z", "2026-11-00T00:00:00Z",
    "2026-11-15T24:00:00Z", "2026-11-15T23:60:00Z", "2026-11-15T23:59:60Z", "0000-01-01T00:00:00Z", "2026-11-15T10:00:00", "2026-11-15", "2026-11-15 10:00:00Z", "2026-11-15T10:00:00z",
    "2026-11-15T10:00:00+0530", "2026-11-15T10:00:00+24:00", "2026-11-15T10:00:00+05:60", "2026-11-15T10:00:00Zjunk", "", " 2026-11-15T10:00:00Z", "2026-11-15T10:00:00.Z", "2026-11-15T10:00:00.1234567Z"];
  for (const w of bad) assert.throws(() => parseEvidenceRef(full({ withdrawnAt: w })), LegalContractError, JSON.stringify(w));
  for (const w of [0, 1.5, true, {}, [], 1731668400000]) assert.throws(() => parseEvidenceRef(full({ withdrawnAt: w })), LegalContractError);
});
test("R2: leap years and valid timezone forms are accepted and converted exactly to UTC", () => {
  const ok = (w: string) => parseEvidenceRef(full({ withdrawnAt: w })).withdrawnAt;
  assert.equal(ok("2024-02-29T10:00:00Z"), "2024-02-29T10:00:00.000Z");
  assert.equal(ok("2000-02-29T00:00:00Z"), "2000-02-29T00:00:00.000Z");     // divisible by 400
  assert.equal(ok("2026-12-31T23:59:59Z"), "2026-12-31T23:59:59.000Z");
  assert.equal(ok("2026-11-15T10:00:00+05:30"), "2026-11-15T04:30:00.000Z");
  assert.equal(ok("2026-11-15T10:00:00-08:00"), "2026-11-15T18:00:00.000Z");
  assert.equal(ok("2026-11-15T10:00:00+00:00"), "2026-11-15T10:00:00.000Z");
  assert.equal(ok("2026-03-01T00:30:00+01:00"), "2026-02-28T23:30:00.000Z");  // offset crosses a day boundary legitimately
  assert.equal(ok("2026-11-15T10:00:00.123456Z"), "2026-11-15T10:00:00.123Z");
  assert.equal(ok("2026-11-15T10:00:00.5Z"), "2026-11-15T10:00:00.500Z");
  assert.equal(ok("9999-12-31T23:59:59Z"), "9999-12-31T23:59:59.000Z");
  assert.throws(() => parseEvidenceRef(full({ withdrawnAt: "9999-12-31T23:59:59-01:00" })), /outside the supported range/);
});

const sameVersion = { evidenceId: U(1), documentVersionId: U(5) };
test("R3: row revisions stop at the PostgreSQL integer maximum; JavaScript-safe larger values are rejected", () => {
  assert.equal(parseEvidenceRef(full({ revision: MAX_ROW_REVISION })).revision, 2147483647);
  for (const r of [2147483648, 4294967296, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1, 0, -1, 1.5])
    assert.throws(() => parseEvidenceRef(full({ revision: r })), LegalContractError);
});
test("R3: a request cannot expect a revision that has no successor; the successor is checked addition", () => {
  assert.equal(parseAttachRequest({ ...sameVersion, expectedRevision: MAX_REQUEST_REVISION }).expectedRevision, 2147483646);
  for (const r of [2147483647, 2147483648, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => parseAttachRequest({ ...sameVersion, expectedRevision: r }), LegalContractError);
    assert.throws(() => parseWithdrawRequest({ evidenceId: U(1), expectedRevision: r }), LegalContractError);
  }
  assert.equal(successorRevision(2147483646), 2147483647);
  for (const r of [2147483647, 2147483648, Number.MAX_SAFE_INTEGER, 0, NaN]) assert.throws(() => successorRevision(r), /no representable successor/);
});
test("R3: transitions at the upper boundary succeed once and then replay exactly; no plan can exceed the column range", () => {
  const unbound = ref({ revision: MAX_REQUEST_REVISION });
  const req = parseAttachRequest({ ...sameVersion, expectedRevision: MAX_REQUEST_REVISION });
  assert.deepEqual(planAttach(unbound, req, ok), { kind: "attach", nextRevision: 2147483647 });
  assert.deepEqual(planAttach(ref({ documentVersionId: U(5), revision: MAX_ROW_REVISION }), req, ok), { kind: "replay" });          // valid replay at the upper boundary
  const w = parseWithdrawRequest({ evidenceId: U(1), expectedRevision: MAX_REQUEST_REVISION });
  assert.deepEqual(planWithdraw(ref({ documentVersionId: U(5), revision: MAX_REQUEST_REVISION }), w, ok), { kind: "withdraw", nextRevision: 2147483647 });
  assert.deepEqual(planWithdraw(ref({ documentVersionId: U(5), withdrawnAt: "2026-11-15T10:00:00Z", revision: MAX_ROW_REVISION }), w, ok), { kind: "replay" });
  // a row that already sits at the maximum cannot be advanced by any request
  assert.throws(() => planAttach(ref({ revision: MAX_ROW_REVISION }), req, ok), /stale revision/);
  for (const exp of [1, 2, 1000, 2147483645, 2147483646]) {
    const plan = planAttach(ref({ revision: exp }), parseAttachRequest({ ...sameVersion, expectedRevision: exp }), ok);
    assert.ok(plan.kind === "attach" && plan.nextRevision <= MAX_ROW_REVISION && Number.isSafeInteger(plan.nextRevision));
  }
});

// ---- static alignment of the contract with the SQL proposal (the executable proof is tests/legal-evidence-link-db)
const sql = readFileSync(new URL("../../../docs/legal/schema/003_legal_evidence_linkage.proposal.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../../../docs/legal/schema/003_legal_evidence_linkage.rollback.proposal.sql", import.meta.url), "utf8");
const code = (t: string) => t.replace(/--[^\n]*/g, "");
// the scripts build their EXPECTED definitions on transient temp tables named zz_exp_* (created ON COMMIT DROP and dropped explicitly); nothing permanent is created
const permanent = (t: string) => code(t).replace(/CREATE TEMP TABLE zz_exp_[a-z_]+/g, "").replace(/DROP TABLE pg_temp\.zz_exp_[a-z_]+;/g, "")
  .replace(/CREATE (UNIQUE INDEX|TRIGGER|POLICY) exp_[a-z_]+ ON pg_temp\.zz_exp_[a-z_]+/g, "");
test("003 SQL is labelled a proposal, adds no table/role/grant/policy-for-access, and never parses storage_ref", () => {
  assert.match(sql, /PROPOSAL ONLY/);
  assert.match(sql, /DOES NOT ESTABLISH DOCUMENT AUTHORIZATION/);
  assert.doesNotMatch(permanent(sql), /CREATE (TEMP )?TABLE|CREATE ROLE|GRANT\b|CREATE VIEW|DROP TABLE|TRUNCATE|DELETE FROM/i);
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
  assert.doesNotMatch(permanent(rollback), /DELETE FROM|TRUNCATE|DROP TABLE|CREATE (TEMP )?TABLE/i);
});
test("003 apply verifies ALL of 002, the ENABLED revision trigger and the EXACT 001 journal policy and CHECK before changing anything (v2)", () => {
  const body = code(sql);
  const before = body.slice(0, body.indexOf("ALTER TABLE public.legal_evidence_refs ADD COLUMN"));
  for (const col of ["property_id", "unit_id", "tenant_id", "lease_id"]) assert.match(before, new RegExp(`'legal_cases','${col}'`));
  assert.match(before, /'legal_matter_properties','unit_id'/);
  assert.match(before, /'legal_matter_properties','lease_id'/);
  assert.match(before, /t\.tgtype = 19 AND t\.tgenabled = 'O'/);
  assert.match(before, /pg_get_expr\(l\.polqual/);
  assert.match(before, /pg_get_expr\(l\.polwithcheck/);
  assert.doesNotMatch(before, /qual ~|\bLIKE\b/i);   // no substring matching of policy text
  assert.match(sql, /p_expected_revision > 2147483646/);
});
test("003 rollback validates the complete introduced shape before removing or restoring anything (v2)", () => {
  const body = code(rollback);
  const check = body.slice(0, body.indexOf("-- remove (all guarded above)"));
  for (const needle of ["confdeltype = 'r' AND c.confupdtype = 'a'", "pg_get_constraintdef(l.oid)", "indnullsnotdistinct", "pg_get_expr(l.indpred", "pg_get_triggerdef(l.oid)", "pg_get_expr(l.polwithcheck", "pg_get_expr(l.polqual"])
    assert.ok(check.includes(needle), `missing: ${needle}`);
});
