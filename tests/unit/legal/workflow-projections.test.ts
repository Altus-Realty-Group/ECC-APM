import { test } from "node:test";
import assert from "node:assert/strict";
import { publicEvidence, missingRequirements, verifiedAwardCount, unknownAwardCount } from "../../../shared/legal/workflow/projections";

test("restricted evidence is excluded from public output", () => {
  const evidence = [
    { id: "e1", matterId: "m1", filename: "public.pdf", url: "http://x", restricted: false, confidence: "high" as const },
    { id: "e2", matterId: "m1", filename: "secret.pdf", url: "http://secret", restricted: true, confidence: "low" as const },
  ];
  const out = publicEvidence(evidence);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "e1");
  assert.doesNotMatch(JSON.stringify(out), /secret/);
});

test("missing requirements ignore request-to text as actor", () => {
  const reqs = [
    { id: "r1", matterId: "m1", description: "Request to attorney", assignedActor: null, sourceDate: null, status: "open" as const },
    { id: "r2", matterId: "m1", description: "Filed", assignedActor: "user-1", sourceDate: "2026-11-01", status: "open" as const },
  ];
  const missing = missingRequirements(reqs);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].id, "r1");
});

test("verified awards are deduplicated; unknown is not zero", () => {
  const awards = [
    { id: "a1", matterId: "m1", kind: "rent" as const, amount: { cents: 1000, currency: "USD" }, judgmentVerification: "verified" as const, collectionReadiness: "ready" as const, revision: 1, obligors: [] },
    { id: "a1", matterId: "m1", kind: "rent" as const, amount: { cents: 1000, currency: "USD" }, judgmentVerification: "verified" as const, collectionReadiness: "ready" as const, revision: 1, obligors: [] },
    { id: "a2", matterId: "m1", kind: "fees" as const, amount: null, judgmentVerification: "unverified" as const, collectionReadiness: "not_ready" as const, revision: 1, obligors: [] },
  ];
  assert.equal(verifiedAwardCount(awards), 1);
  assert.equal(unknownAwardCount(awards), 1);
});
