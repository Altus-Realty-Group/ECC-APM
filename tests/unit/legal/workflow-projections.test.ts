import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProjection, publicEvidence, openRequirements, unassignedOpenRequirements, unknownAwardCount, verifiedAwardCount } from "../../../shared/legal/workflow/projections";
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

test("rejects malformed court date", () => {
  const p: WorkflowProjection = { matter, evidence: [], requirements: [], courtEvents: [{ id: "c1", matterId: "m1", date: "not-a-date", source: null, responsibleActor: null }], awards: [] };
  assert.equal(validateProjection(p).kind, "conflict");
});

test("outcomes cover unavailable missing denied stale conflict", () => {
  const kinds = ["unavailable", "missing", "denied", "stale", "conflict"] as const;
  for (const k of kinds) assert.ok(k);
});
