import assert from "node:assert/strict";
import { test } from "node:test";
import { assertRevision, docketKey, LegalContractError, parseAward, parseMatter, parseMoney, scopeAllows, totalAwards, CASE_TYPES } from "../../../shared/legal/contracts.ts";

const award = (over: Record<string, unknown> = {}) => parseAward({
  id: "a1", matterId: "m1", kind: "damages", amountCents: 100000, currency: "USD", judgmentVerification: "unverified",
  collectionReadiness: "not_ready", revision: 1, obligors: [{ partyId: "p1", liability: "joint" }, { partyId: "p2", liability: "joint" }], ...over,
});

test("null amount is unknown, zero is a real zero, they are distinct", () => {
  assert.equal(parseMoney(undefined, undefined), null);
  assert.equal(parseMoney(null, null), null);
  assert.deepEqual(parseMoney(0, "USD"), { cents: 0, currency: "USD" });
});
test("amount rules: currency required, integer non-negative cents only", () => {
  for (const [c, cur] of [[5, undefined], [1.5, "USD"], [-1, "USD"], ["5", "USD"], [5, "usd"], [null, "USD"]] as const)
    assert.throws(() => parseMoney(c, cur), LegalContractError);
});
test("joint award with two obligors is counted once", () => {
  assert.deepEqual(totalAwards([award()]).byCurrency, { USD: 100000 });
});
test("unknown awards are counted, not summed as zero", () => {
  const t = totalAwards([award(), award({ id: "a2", amountCents: null, currency: null })]);
  assert.equal(t.unknownCount, 1);
  assert.deepEqual(t.byCurrency, { USD: 100000 });
});
test("obligors cannot carry amounts or repeat", () => {
  assert.throws(() => award({ obligors: [{ partyId: "p1", liability: "joint", amountCents: 5 }] }), LegalContractError);
  assert.throws(() => award({ obligors: [{ partyId: "p1", liability: "joint" }, { partyId: "p1", liability: "joint" }] }), LegalContractError);
});
test("dimensions are separate fields and each rejects foreign values", () => {
  const a = award({ judgmentVerification: "verified" });
  assert.equal(a.judgmentVerification, "verified");
  assert.equal(a.collectionReadiness, "not_ready");
  assert.throws(() => award({ collectionReadiness: "verified" }), LegalContractError);
  assert.throws(() => award({ judgmentVerification: "ready" }), LegalContractError);
});
test("case types include the previously unwritable values", () => {
  assert.ok(CASE_TYPES.includes("collections") && CASE_TYPES.includes("eviction_and_damages"));
});
test("matter parse requires scope and revision; docket may be unknown", () => {
  const m = parseMatter({ id: "m1", scopeRef: "s", caseType: "collections", lifecycle: "filed", revision: 1 });
  assert.equal(m.docketNumber, null);
  assert.equal(docketKey(m), null);
  assert.throws(() => parseMatter({ id: "m1", caseType: "collections", lifecycle: "filed", revision: 1 }), LegalContractError);
  assert.throws(() => parseMatter({ id: "m1", scopeRef: "s", caseType: "collections", lifecycle: "filed", revision: 0 }), LegalContractError);
});
test("docket identity is scoped", () => {
  const a = { scopeRef: "A", courtRef: "c", docketNumber: "1" }, b = { ...a, scopeRef: "B" };
  assert.notEqual(docketKey(a), docketKey(b));
  assert.equal(docketKey(a), docketKey({ ...a }));
});
test("revision compare-and-set", () => {
  assertRevision(2, 2);
  assert.throws(() => assertRevision(1, 2), LegalContractError);
});
test("scope check fails closed", () => {
  assert.equal(scopeAllows(null, "A"), false);
  assert.equal(scopeAllows([], "A"), false);
  assert.equal(scopeAllows(["A"], null), false);
  assert.equal(scopeAllows(["A"], "B"), false);
  assert.equal(scopeAllows(["A"], "A"), true);
});
