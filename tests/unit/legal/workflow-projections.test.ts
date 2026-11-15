import { test } from "node:test";
import assert from "node:assert/strict";
import { consumeProjection, validateProjection, publicEvidence, openRequirements, unassignedOpenRequirements, unknownAwardCount, verifiedAwardCount } from "../../../shared/legal/workflow/projections";
import type { WorkflowProjection } from "../../../shared/legal/workflow/projections";

const matter = { id: "m1", scopeRef: "s1", caseType: "eviction" as const, lifecycle: "draft" as const, courtRef: null, docketNumber: null, revision: 1 };

test("rejects wrong-matter child", () => {
  const p: WorkflowProjection = { matter, evidence: [{ id: "e1", matterId: "other", filename: null, url: null, restricted: false, confidence: "high" }], requirements: [], courtEvents: [], awards: [] };
  assert.equal(validateProjection(p).kind, "conflict");
});

test("rejects duplicate ids", () => {
  const p: WorkflowProjection = { matter, evidence: [{ id: "e1", matterId: "m1", filename: null, url: null, restricted: false, confidence: "high" }, { id: "e1", matterId: "m1", filename: null, url: null, restricted: true, confidence: "low" }], requirements: [], courtEvents: [], awards: [] };
  assert.equal(validateProjection(p).kind, "conflict");
});

test("default-deny evidence excludes restricted and absent flag", () => {
  const evidence = [
    { id: "e1", matterId: "m1", filename: "public.pdf", url: "http://x", restricted: false, confidence: "high" as const },
    { id: "e2", matterId: "m1", filename: "secret.pdf", url: "http://secret", restricted: true, confidence: "low" as const },
    { id: "e3", matterId: "m1", filename: "unknown.pdf", url: "http://u", restricted: undefined as any, confidence: "unreviewed" as const },
  ];
  const out = publicEvidence(evidence);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "e1");
  assert.doesNotMatch(JSON.stringify(out), /secret|unknown/);
});

test("open requirements include assigned; unassigned is a subset", () => {
  const reqs = [
    { id: "r1", matterId: "m1", description: "Request to attorney", assignedActor: null, sourceDate: null, status: "open" as const },
    { id: "r2", matterId: "m1", description: "Filed", assignedActor: "user-1", sourceDate: "2026-11-01", status: "open" as const },
  ];
  assert.equal(openRequirements(reqs).length, 2);
  assert.equal(unassignedOpenRequirements(reqs).length, 1);
  assert.equal(unassignedOpenRequirements(reqs)[0].id, "r1");
});

test("unknown awards are deduplicated by identity", () => {
  const awards = [
    { id: "a1", matterId: "m1", kind: "rent" as const, amount: null, judgmentVerification: "unverified" as const, collectionReadiness: "not_ready" as const, revision: 1, obligors: [] },
    { id: "a1", matterId: "m1", kind: "rent" as const, amount: null, judgmentVerification: "unverified" as const, collectionReadiness: "not_ready" as const, revision: 1, obligors: [] },
    { id: "a2", matterId: "m1", kind: "fees" as const, amount: { cents: 100, currency: "USD" }, judgmentVerification: "verified" as const, collectionReadiness: "ready" as const, revision: 1, obligors: [] },
  ];
  assert.equal(unknownAwardCount(awards), 1);
  assert.equal(verifiedAwardCount(awards), 1);
});

test("rejects impossible calendar day and leap-year edge", () => {
  const bad = { matter, evidence: [], requirements: [], courtEvents: [{ id: "c1", matterId: "m1", date: "2026-02-30", source: null, responsibleActor: null }], awards: [] };
  assert.equal(validateProjection(bad).kind, "conflict");
  const leap = { matter, evidence: [], requirements: [], courtEvents: [{ id: "c2", matterId: "m1", date: "2024-02-29", source: null, responsibleActor: null }], awards: [] };
  assert.equal(validateProjection(leap).kind, "ready");
  const nonLeap = { matter, evidence: [], requirements: [], courtEvents: [{ id: "c3", matterId: "m1", date: "2026-02-29", source: null, responsibleActor: null }], awards: [] };
  assert.equal(validateProjection(nonLeap).kind, "conflict");
});

test("rejects invalid lifecycle and null input", () => {
  const badLife = { ...matter, lifecycle: "NOT_A_LIFECYCLE" as any };
  assert.equal(validateProjection({ matter: badLife, evidence: [], requirements: [], courtEvents: [], awards: [] }).kind, "conflict");
  assert.equal(validateProjection(null).kind, "conflict");
});

test("conflict reasons do not echo restricted ids", () => {
  const restricted = { id: "SECRET-ID", matterId: "other", filename: "secret.pdf", url: "http://secret", restricted: true, confidence: "low" as const };
  const out = validateProjection({ matter, evidence: [restricted], requirements: [], courtEvents: [], awards: [] });
  assert.equal(out.kind, "conflict");
  if (out.kind === "conflict") assert.doesNotMatch(out.reason, /SECRET|secret/);
});

test("outcomes are returned for unavailable missing denied stale conflict", () => {
  const outcomes = [
    { kind: "unavailable" as const, reason: "producer not bound" },
    { kind: "missing" as const },
    { kind: "denied" as const },
    { kind: "stale" as const, asOf: null },
    { kind: "conflict" as const, reason: "duplicate id" },
  ];
  for (const o of outcomes) {
    const result = consumeProjection({ ...o, privateId: "SYNTHETIC-SECRET", filename: "SYNTHETIC-private.pdf" });
    assert.equal(result.kind, o.kind);
    assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC/);
  }
});

test("rejects missing collections and null rows", () => {
  assert.equal(validateProjection({ matter, evidence: null }).kind, "conflict");
  assert.equal(validateProjection({ matter, evidence: [null], requirements: [], courtEvents: [], awards: [] }).kind, "conflict");
  assert.equal(validateProjection({ matter, requirements: 42, evidence: [], courtEvents: [], awards: [] }).kind, "conflict");
});

test("rejects invalid caseType and negative revision", () => {
  const badType = { ...matter, caseType: "NOT_A_TYPE" };
  assert.equal(validateProjection({ matter: badType, evidence: [], requirements: [], courtEvents: [], awards: [] }).kind, "conflict");
  const badRev = { ...matter, revision: -1 };
  assert.equal(validateProjection({ matter: badRev, evidence: [], requirements: [], courtEvents: [], awards: [] }).kind, "conflict");
});

test("rejects malformed requirement and negative award cents", () => {
  const badReq = { id: "r1", matterId: "m1", description: "", assignedActor: 1, sourceDate: "bad", status: "nope" };
  assert.equal(validateProjection({ matter, evidence: [], requirements: [badReq], courtEvents: [], awards: [] }).kind, "conflict");
  const badAward = { id: "a1", matterId: "m1", kind: "rent", amountCents: -1, currency: "USD", judgmentVerification: "verified", collectionReadiness: "ready", revision: 1, obligors: [] };
  assert.equal(validateProjection({ matter, evidence: [], requirements: [], courtEvents: [], awards: [badAward] }).kind, "conflict");
});

test("rejects court event without id", () => {
  assert.equal(validateProjection({ matter, evidence: [], requirements: [], courtEvents: [{ matterId: "m1", date: null }], awards: [] }).kind, "conflict");
});

const base = () => ({ matter: { ...matter }, evidence: [], requirements: [], courtEvents: [], awards: [] });
const publicRow = { id: "e-public", matterId: "m1", filename: "public.pdf", url: "https://example.invalid/public", confidence: "high", restricted: false };
const award = { id: "a-money", matterId: "m1", kind: "rent", amount: { cents: 125, currency: "USD" }, judgmentVerification: "verified", collectionReadiness: "not_ready", revision: 1, obligors: [] };

test("normalization never converts absent, malformed or restricted evidence flags to public", () => {
  for (const flag of [undefined, null, 0, 1, "false", "true", true, {}]) {
    const input = { ...base(), evidence: [{ ...publicRow, id: "SYNTHETIC-PRIVATE-ID", filename: "SYNTHETIC-PRIVATE-FILE.pdf", url: "https://private.invalid", restricted: flag }] };
    const result = consumeProjection(input);
    assert.equal(result.kind, "ready");
    if (result.kind !== "ready") continue;
    assert.equal(result.summary.publicEvidence, 0);
    assert.deepEqual(result.projection.evidence, []);
    assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC-PRIVATE|private.invalid/);
  }
  const result = consumeProjection({ ...base(), evidence: [publicRow] });
  assert.ok(result.kind === "ready" && result.summary.publicEvidence === 1);
  const inherited = Object.assign(Object.create({ restricted: false }), { ...publicRow, filename: "SYNTHETIC-PRIVATE", restricted: undefined });
  delete inherited.restricted;
  const inheritedResult = consumeProjection({ ...base(), evidence: [inherited] });
  assert.ok(inheritedResult.kind === "ready" && inheritedResult.summary.publicEvidence === 0);
  assert.doesNotMatch(JSON.stringify(inheritedResult), /SYNTHETIC-PRIVATE/);
});

test("the boundary validates every malformed collection/row without throwing or identifying it", () => {
  for (const field of ["evidence", "requirements", "courtEvents", "awards"]) {
    for (const value of [undefined, null, 42, {}, "private", [null], [undefined], [42], [[]], [{}]]) {
      const result = consumeProjection({ ...base(), [field]: value });
      assert.equal(result.kind, "conflict", field);
      assert.doesNotMatch(JSON.stringify(result), /private/);
    }
  }
});

test("nullable fields and dates cannot coerce objects, arrays or blank strings", () => {
  const event = { id: "c1", matterId: "m1", date: null, source: null, responsibleActor: null };
  const req = { id: "r1", matterId: "m1", description: "Source requirement", assignedActor: null, sourceDate: null, status: "open" };
  for (const field of ["date", "source", "responsibleActor"]) for (const v of [undefined, 42, {}, [], " "]) {
    assert.equal(consumeProjection({ ...base(), courtEvents: [{ ...event, [field]: v }] }).kind, "conflict");
  }
  for (const field of ["assignedActor", "sourceDate"]) for (const v of [undefined, 42, {}, [], " "]) {
    assert.equal(consumeProjection({ ...base(), requirements: [{ ...req, [field]: v }] }).kind, "conflict");
  }
  assert.equal(consumeProjection({ ...base(), courtEvents: [{ ...event, date: ["2024-02-29"] }] }).kind, "conflict");
  for (const field of ["filename", "url"]) for (const v of [42, {}, [], " "]) {
    assert.equal(consumeProjection({ ...base(), evidence: [{ ...publicRow, [field]: v }] }).kind, "conflict");
  }
  for (const url of ["javascript:alert(1)", "data:text/html,private", "https://user:password@example.invalid/"]) {
    assert.equal(consumeProjection({ ...base(), evidence: [{ ...publicRow, url }] }).kind, "conflict");
  }
  assert.throws(() => publicEvidence([{ ...publicRow, confidence: "high", url: "SYNTHETIC-PRIVATE-NOT-A-URL" }]),
    (error: unknown) => error instanceof Error && !String(error).includes("SYNTHETIC-PRIVATE"));
});

test("wire and normalized money preserve known amounts, explicit zero and unknown", () => {
  for (const amount of [null, { cents: 0, currency: "USD" }, { cents: 125, currency: "USD" }]) {
    const normalized = consumeProjection({ ...base(), awards: [{ ...award, amount }] });
    const { amount: removed, ...wireBase } = award;
    const wire = consumeProjection({ ...base(), awards: [{ ...wireBase, amountCents: amount?.cents ?? null, currency: amount?.currency ?? null }] });
    assert.equal(normalized.kind, "ready"); assert.deepEqual(wire, normalized);
    if (normalized.kind === "ready") assert.deepEqual(normalized.projection.awards[0].amount, amount);
  }
});

test("malformed or conflicting monetary representations never become unknown or silently win", () => {
  for (const amount of [{}, false, 42, [], "125", { cents: null, currency: null }, { cents: -1, currency: "USD" }, { cents: 1.1, currency: "USD" }, { cents: 1, currency: "usd" }]) {
    assert.equal(consumeProjection({ ...base(), awards: [{ ...award, amount }] }).kind, "conflict");
  }
  for (const wire of [{ amountCents: 0, currency: "USD" }, { amountCents: null, currency: null }, { amountCents: 125, currency: "EUR" }]) {
    assert.equal(consumeProjection({ ...base(), awards: [{ ...award, ...wire }] }).kind, "conflict");
  }
  assert.equal(consumeProjection({ ...base(), awards: [{ ...award, amount: null, amountCents: 125, currency: "USD" }] }).kind, "conflict");
});

test("single consumption path computes summaries only from sanitized validated records", () => {
  const input = { ...base(), evidence: [publicRow, { ...publicRow, id: "private", restricted: true }], awards: [award, { ...award, id: "a-unknown", amount: null }],
    requirements: [{ id: "r1", matterId: "m1", description: "Request to attorney", assignedActor: null, sourceDate: null, status: "open" },
      { id: "r2", matterId: "m1", description: "Assigned open item", assignedActor: "actor-1", sourceDate: "2024-02-29", status: "open" }] };
  const result = consumeProjection({ kind: "ready", projection: input, unexpected: "private" });
  assert.equal(result.kind, "ready");
  if (result.kind !== "ready") return;
  assert.deepEqual(result.summary, { publicEvidence: 1, openRequirements: 2, unassignedOpenRequirements: 1, unknownAwards: 1, verifiedMonetaryAwards: 1 });
  assert.equal(result.projection.evidence.length, 1);
  assert.equal(consumeProjection({ ...input, awards: [award, { ...award, amount: null }] }).kind, "conflict");
  assert.throws(() => unknownAwardCount([award, { ...award, amount: null }] as any));
  assert.throws(() => verifiedAwardCount([{ ...award, amount: { cents: -1, currency: "USD" } }] as any));
});

test("all outcomes execute the real boundary and strip source fields", () => {
  for (const kind of ["unavailable", "missing", "denied", "conflict"]) {
    const result = consumeProjection({ kind, reason: "SYNTHETIC-PRIVATE", projection: { ...base(), evidence: [publicRow] } });
    assert.equal(result.kind, kind); assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC|public.pdf|projection|summary/);
  }
  for (const stamp of [null, "2024-02-29", "2026-11-11T23:00:00.000Z"]) assert.deepEqual(consumeProjection({ kind: "stale", asOf: stamp }), { kind: "stale", asOf: stamp });
  for (const stamp of [undefined, {}, [], 42, "2026-02-30", "2026-11-11T25:00:00Z"]) assert.equal(consumeProjection({ kind: "stale", asOf: stamp }).kind, "conflict");
  assert.equal(consumeProjection({ kind: "made-up" }).kind, "conflict");
});

test("whitelisting prevents source mutation from changing an accepted projection", () => {
  const input = { ...base(), evidence: [{ ...publicRow, secretExtra: "PRIVATE" }], awards: [{ ...award, amount: { cents: 125, currency: "USD" } }] };
  const result = consumeProjection(input);
  assert.equal(result.kind, "ready"); if (result.kind !== "ready") return;
  input.evidence[0].filename = "CHANGED"; input.awards[0].amount.cents = 999; input.matter.scopeRef = "other";
  assert.equal(result.projection.evidence[0].filename, "public.pdf");
  assert.equal(result.projection.awards[0].amount?.cents, 125); assert.equal(result.projection.matter.scopeRef, "s1");
  assert.doesNotMatch(JSON.stringify(result), /secretExtra|PRIVATE|CHANGED/);
});
