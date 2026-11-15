import assert from "node:assert/strict";
import { test } from "node:test";
import { assertRevision, nextRevision, docketKey, LegalContractError, MAX_MONEY_CENTS, moneyToWire, parseAward, parseMatter, parseMoney, scopeAllows, totalAwards, CASE_TYPES } from "../../../shared/legal/contracts.ts";

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

test("duplicate award ids are rejected, identical or conflicting", () => {
  assert.throws(() => totalAwards([award(), award()]), LegalContractError);
  assert.throws(() => totalAwards([award(), award({ amountCents: 5 })]), LegalContractError);
});
test("unsafe aggregation is rejected; safe individual values can overflow in total", () => {
  const big = (id: string) => award({ id, amountCents: MAX_MONEY_CENTS });
  assert.deepEqual(totalAwards([big("a")]).byCurrency, { USD: MAX_MONEY_CENTS });
  assert.throws(() => totalAwards([big("a"), big("b")]), LegalContractError);
});
test("unknown stays unknown and explicit zero stays zero through totals", () => {
  const t = totalAwards([award({ id: "z", amountCents: 0 }), award({ id: "u", amountCents: null, currency: null })]);
  assert.deepEqual(t.byCurrency, { USD: 0 });
  assert.equal(t.unknownCount, 1);
});
test("amounts beyond the JS safe range are rejected in every representation", () => {
  const over = MAX_MONEY_CENTS + 1;
  for (const v of [over, 2 ** 63, "9007199254740992", 9007199254740992n, Number.MAX_VALUE, NaN, Infinity])
    assert.throws(() => parseMoney(v, "USD"), LegalContractError);
  assert.deepEqual(parseMoney(MAX_MONEY_CENTS, "USD"), { cents: MAX_MONEY_CENTS, currency: "USD" });
});
test("nullable money round trips and matches the SQL both-or-neither rule", () => {
  for (const [c, cur] of [[null, null], [0, "USD"], [1, "USD"], [MAX_MONEY_CENTS, "EUR"]] as const) {
    const m = parseMoney(c, cur);
    const w = moneyToWire(m);
    assert.deepEqual(parseMoney(w.amountCents, w.currency), m);
    assert.equal(w.amountCents === null, w.currency === null);
  }
  assert.throws(() => parseMoney(null, "USD"), LegalContractError);   // SQL rejects the same state
  assert.throws(() => parseMoney(5, null), LegalContractError);
});

test("next revision is read + 1 and rejects unusable input", () => {
  assert.equal(nextRevision(1), 2);
  for (const bad of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER]) assert.throws(() => nextRevision(bad), LegalContractError);
});
