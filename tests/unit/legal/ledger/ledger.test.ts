import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_MONEY_CENTS } from "../../../../shared/legal/contracts.ts";
import { evaluateCollectionEligibility, parseLedgerEntry, planAppend, projectLedger, summarizeLedgers } from "../../../../shared/legal/ledger/index.ts";
import { approval, awardOf, charge, credit, ctxOf, entry, payment, reconciled, reversal } from "./fixtures.ts";

const conflict = (ctx: ReturnType<typeof ctxOf>, entries: unknown[]) => projectLedger(ctx, entries);
const expectConflict = (ctx: ReturnType<typeof ctxOf>, entries: unknown[], code: string) => {
  const p = conflict(ctx, entries);
  assert.equal(p.status, "conflict"); assert.equal(p.conflict, code);
  assert.equal(p.outstandingCents, null); assert.equal(p.netCents, null); assert.equal(p.satisfiedCents, null);
};

test("empty ledger: principal is the award amount, nothing paid", () => {
  const p = projectLedger(ctxOf(), []);
  assert.equal(p.status, "known"); assert.equal(p.outstandingCents, 100000); assert.equal(p.satisfiedCents, 0); assert.equal(p.chargedCents, 100000);
});
test("one award identity regardless of obligor count", () => {
  const one = projectLedger(ctxOf({}, { obligors: [{ partyId: "p1", liability: "sole" }] }), [payment("e1", 1, 100)]);
  const four = projectLedger(ctxOf({}, { obligors: ["p1", "p2", "p3", "p4"].map((partyId) => ({ partyId, liability: "joint" })) }), [payment("e1", 1, 100)]);
  assert.equal(one.outstandingCents, 99900); assert.equal(four.outstandingCents, 99900);
  const s = summarizeLedgers([ctxOf({}, { obligors: ["p1", "p2", "p3"].map((partyId) => ({ partyId, liability: "joint" })) })], []);
  assert.deepEqual(s.outstandingByCurrency, { USD: 100000 }); assert.equal(s.awards.length, 1);
});
test("distinct awards stay distinct even for the same obligor", () => {
  const a2 = ctxOf({}, { id: "award-2", amountCents: 5000 });
  const s = summarizeLedgers([ctxOf(), a2], [payment("e1", 1, 100), payment("x1", 1, 50, { awardId: "award-2" })]);
  assert.equal(s.awards.length, 2);
  assert.deepEqual(s.outstandingByCurrency, { USD: 99900 + 4950 });
});
test("identical repeated award is one award; conflicting repeat fails the summary", () => {
  assert.equal(summarizeLedgers([ctxOf(), ctxOf()], []).awards.length, 1);
  const s = summarizeLedgers([ctxOf(), ctxOf({}, { amountCents: 1 })], []);
  assert.equal(s.conflict, "DUPLICATE_AWARD_CONFLICT"); assert.equal(s.awards.length, 0);
});
test("entries naming no supplied award fail the summary (orphans are never dropped)", () => {
  assert.equal(summarizeLedgers([ctxOf()], [payment("e1", 1, 1, { awardId: "ghost" })]).conflict, "ORPHAN_ENTRIES");
});
test("charges, payments, credits combine exactly with no allocation order", () => {
  const p = projectLedger(ctxOf(), [charge("c1", 1, "fees", 5000), charge("c2", 2, "interest", 700), payment("p1", 3, 20000), credit("k1", 4, 300)]);
  assert.equal(p.chargedCents, 105700); assert.equal(p.satisfiedCents, 20300); assert.equal(p.outstandingCents, 85400);
});
test("payments need evidence from the same matter", () => {
  assert.throws(() => parseLedgerEntry(payment("e1", 1, 5, { evidence: [] })));
  expectConflict(ctxOf(), [payment("e1", 1, 5, { evidence: [{ evidenceId: "ev-9", matterId: "matter-2" }] })], "WRONG_MATTER_EVIDENCE");
});
test("wrong-matter / wrong-award entries are rejected", () => {
  expectConflict(ctxOf(), [payment("e1", 1, 5, { matterId: "matter-2", evidence: [{ evidenceId: "e", matterId: "matter-2" }] })], "WRONG_ASSOCIATION");
  expectConflict(ctxOf(), [payment("e1", 1, 5, { awardId: "award-2" })], "WRONG_ASSOCIATION");
});
test("currency mismatch rejected, never converted", () => {
  expectConflict(ctxOf(), [payment("e1", 1, 5, { currency: "CAD" })], "CURRENCY_MISMATCH");
});
test("unsafe arithmetic rejected, no wraparound or rounding", () => {
  expectConflict(ctxOf({}, { amountCents: MAX_MONEY_CENTS }), [charge("c1", 1, "fees", 1)], "UNSAFE_ARITHMETIC");
  expectConflict(ctxOf({}, { amountCents: MAX_MONEY_CENTS }), [payment("p1", 1, MAX_MONEY_CENTS), payment("p2", 2, 1)], "UNSAFE_ARITHMETIC");
});
test("unsafe amount in an entry is a parse failure", () => {
  assert.throws(() => parseLedgerEntry(payment("e1", 1, MAX_MONEY_CENTS + 1)));
  assert.throws(() => parseLedgerEntry(payment("e1", 1, 1.5)));
  assert.throws(() => parseLedgerEntry(payment("e1", 1, -5)));
});
test("unknown principal stays unknown (never zero) and shows no totals", () => {
  const p = projectLedger(ctxOf({}, { amountCents: null, currency: null }), [payment("p1", 1, 500)]);
  assert.equal(p.status, "unknown"); assert.deepEqual(p.review, ["UNKNOWN_PRINCIPAL"]);
  assert.equal(p.outstandingCents, null); assert.equal(p.chargedCents, null); assert.equal(p.principal, null);
});
test("recorded zero principal stays zero and is not unknown", () => {
  const p = projectLedger(ctxOf({}, { amountCents: 0 }), []);
  assert.equal(p.status, "known"); assert.equal(p.outstandingCents, 0); assert.deepEqual(p.principal, { cents: 0, currency: "USD" });
});
test("recorded zero payment is zero; unknown payment amount is unknown and blocks totals", () => {
  assert.equal(projectLedger(ctxOf(), [payment("p1", 1, 0)]).outstandingCents, 100000);
  const u = projectLedger(ctxOf(), [payment("p1", 1, null)]);
  assert.equal(u.status, "unknown"); assert.deepEqual(u.unknownEntryIds, ["p1"]); assert.equal(u.outstandingCents, null);
});
test("overpayment requires review: signed net, no clamping, no outstanding figure", () => {
  const p = projectLedger(ctxOf(), [payment("p1", 1, 100500)]);
  assert.equal(p.status, "review"); assert.deepEqual(p.review, ["OVERPAYMENT"]);
  assert.equal(p.netCents, -500); assert.equal(p.outstandingCents, null);
});
test("exact payoff is known with zero outstanding, not review", () => {
  const p = projectLedger(ctxOf(), [payment("p1", 1, 100000)]);
  assert.equal(p.status, "known"); assert.equal(p.outstandingCents, 0);
});
test("append-only reversal undoes its target exactly", () => {
  const p = projectLedger(ctxOf(), [payment("p1", 1, 40000), reversal("r1", 2, "p1")]);
  assert.equal(p.outstandingCents, 100000); assert.equal(p.satisfiedCents, 0);
});
test("reversal of a charge removes it; reversal of an unknown-amount entry clears the unknown", () => {
  assert.equal(projectLedger(ctxOf(), [charge("c1", 1, "fees", 900), reversal("r1", 2, "c1", "vacated_charge")]).outstandingCents, 100000);
  assert.equal(projectLedger(ctxOf(), [payment("p1", 1, null), reversal("r1", 2, "p1", "entered_in_error")]).status, "known");
});
test("reversal rules fail closed", () => {
  const base = [payment("p1", 1, 100)];
  expectConflict(ctxOf(), [...base, reversal("r1", 2, "nope")], "REVERSAL_TARGET_MISSING");
  expectConflict(ctxOf(), [...base, reversal("r1", 2, "p1"), reversal("r2", 3, "p1")], "DOUBLE_REVERSAL");
  expectConflict(ctxOf(), [...base, reversal("r1", 2, "p1"), reversal("r2", 3, "r1", "entered_in_error")], "REVERSAL_OF_REVERSAL");
  expectConflict(ctxOf(), [...base, reversal("r1", 2, "r1")], "REVERSAL_OF_SELF");
  expectConflict(ctxOf(), [reversal("r1", 1, "p1"), payment("p1", 2, 100)], "REVERSAL_TARGET_NOT_EARLIER");
  expectConflict(ctxOf(), [...base, reversal("r1", 2, "p1", "returned_payment", { effectiveDate: "2026-02-01" })], "REVERSAL_PREDATES_TARGET");
  expectConflict(ctxOf(), [...base, reversal("r1", 2, "p1", "vacated_charge")], "REVERSAL_WRONG_REASON");
  expectConflict(ctxOf(), [payment("p1", 1, 5), reversal("r1", 2, "p1", "returned_payment", { awardId: "award-2" })], "WRONG_ASSOCIATION");
});
test("reversals need approval and carry no amount", () => {
  assert.throws(() => parseLedgerEntry(reversal("r1", 2, "p1", "returned_payment", { provenance: { source: "bank_record", recordedBy: "c", approvedBy: null } })));
  assert.throws(() => parseLedgerEntry(reversal("r1", 2, "p1", "returned_payment", { amountCents: 5, currency: "USD" })));
});
test("exact replay is idempotent (projection and append plan)", () => {
  const a = [payment("p1", 1, 500)];
  assert.deepEqual(projectLedger(ctxOf(), [...a, ...a, ...a]), projectLedger(ctxOf(), a));
  const plan = planAppend(ctxOf(), a, payment("p1", 1, 500));
  assert.equal(plan.outcome, "noop");
});
test("conflicting replay fails closed", () => {
  expectConflict(ctxOf(), [payment("p1", 1, 500), payment("p1", 1, 501)], "DUPLICATE_ENTRY_CONFLICT");
  const plan = planAppend(ctxOf(), [payment("p1", 1, 500)], payment("p1", 1, 501));
  assert.equal(plan.outcome, "reject"); assert.equal(plan.outcome === "reject" && plan.conflict, "DUPLICATE_ENTRY_CONFLICT");
  // evidence order does not make a replay conflicting
  const ev2 = [{ evidenceId: "a", matterId: "matter-1" }, { evidenceId: "b", matterId: "matter-1" }];
  assert.equal(planAppend(ctxOf(), [payment("p1", 1, 5, { evidence: ev2 })], payment("p1", 1, 5, { evidence: [...ev2].reverse() })).outcome, "noop");
});
test("sequence: gap and duplicate rejected; append must be next", () => {
  expectConflict(ctxOf(), [payment("p1", 1, 5), payment("p2", 3, 5)], "SEQUENCE_GAP");
  expectConflict(ctxOf(), [payment("p1", 2, 5)], "SEQUENCE_GAP");
  expectConflict(ctxOf(), [payment("p1", 1, 5), payment("p2", 1, 5)], "DUPLICATE_SEQUENCE");
  const e = [payment("p1", 1, 5)];
  assert.equal(planAppend(ctxOf(), e, payment("p2", 2, 5)).outcome, "append");
  const gap = planAppend(ctxOf(), e, payment("p2", 5, 5)); assert.equal(gap.outcome === "reject" && gap.conflict, "SEQUENCE_GAP");
  const dup = planAppend(ctxOf(), e, payment("p2", 1, 5)); assert.equal(dup.outcome === "reject" && dup.conflict, "DUPLICATE_SEQUENCE");
});
test("append plan rejects entries that would create a conflict, and conflicted ledgers accept nothing", () => {
  const dbl = planAppend(ctxOf(), [payment("p1", 1, 5), reversal("r1", 2, "p1")], reversal("r2", 3, "p1"));
  assert.equal(dbl.outcome === "reject" && dbl.conflict, "DOUBLE_REVERSAL");
  const broken = planAppend(ctxOf(), [payment("p1", 1, 5), payment("p1", 1, 6)], payment("p2", 2, 5));
  assert.equal(broken.outcome, "reject");
  assert.equal(planAppend(ctxOf(), [], payment("p1", 1, 5, { currency: "EUR" })).outcome, "reject");
});
test("append plan does not mutate its inputs", () => {
  const e = [payment("p1", 1, 5)]; const snap = JSON.stringify(e);
  planAppend(ctxOf(), e, payment("p2", 2, 5)); assert.equal(JSON.stringify(e), snap);
});
test("strict parsing: rate, accrual, deadline, enforceability and unknown keys are refused", () => {
  for (const extra of [{ interestRate: 0.09 }, { accrual: "daily" }, { deadline: "2027-01-01" }, { enforceable: true }, { limitationDate: "2030-01-01" }, { allocation: "interest_first" }])
    assert.throws(() => parseLedgerEntry({ ...payment("p1", 1, 5), ...extra }));
  assert.throws(() => parseLedgerEntry({ ...payment("p1", 1, 5), provenance: { source: "bank_record", recordedBy: "c", approvedBy: null, rate: 1 } }));
  const { effectiveDate: _omit, ...missing } = payment("p1", 1, 5); assert.throws(() => parseLedgerEntry(missing));
});
test("authority rules: charges from court orders, interest explicit+approved, credits approved, payments not from orders", () => {
  assert.throws(() => parseLedgerEntry(charge("c1", 1, "fees", 5, { provenance: { source: "creditor_statement", recordedBy: "c", approvedBy: null } })));
  assert.throws(() => parseLedgerEntry(charge("c1", 1, "interest", 5, { provenance: { source: "court_order", recordedBy: "c", approvedBy: null } })));
  assert.throws(() => parseLedgerEntry(charge("c1", 1, "principal", 5)));
  assert.throws(() => parseLedgerEntry(credit("k1", 1, 5, { provenance: { source: "creditor_statement", recordedBy: "c", approvedBy: null } })));
  assert.throws(() => parseLedgerEntry(payment("p1", 1, 5, { provenance: { source: "court_order", recordedBy: "c", approvedBy: null } })));
});
test("dates must be real calendar dates", () => {
  for (const d of ["2026-02-30", "2026-13-01", "26-01-01", "2026-1-1"]) assert.throws(() => parseLedgerEntry(payment("p1", 1, 5, { effectiveDate: d })));
  assert.doesNotThrow(() => parseLedgerEntry(payment("p1", 1, 5, { effectiveDate: "2028-02-29" })));
});
test("creditor cannot be an obligor; invalid L1 award is refused", () => {
  expectConflict(ctxOf({ creditorPartyId: "party-a" }), [], "INVALID_AWARD");
  const bad = { award: { id: "", matterId: "m" } } as never;
  assert.equal(projectLedger(bad, []).status, "conflict");
  assert.equal(projectLedger(null as never, []).status, "conflict");
  assert.equal(summarizeLedgers([bad], []).conflict, "INVALID_AWARD");
});
test("reconciliation: none / current / stale; later entries are listed", () => {
  assert.equal(projectLedger(ctxOf(), []).reconciliation.state, "none");
  assert.equal(projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05") }), [payment("p1", 1, 5)]).reconciliation.state, "current");
  const stale = projectLedger(ctxOf({ reconciliation: reconciled("2026-02-01") }), [payment("p1", 1, 5)]);
  assert.equal(stale.reconciliation.state, "stale"); assert.deepEqual(stale.reconciliation.unreconciledEntryIds, ["p1"]);
  expectConflict(ctxOf({ reconciliation: { ...reconciled(), evidence: [{ evidenceId: "x", matterId: "matter-9" }] } }), [], "WRONG_MATTER_EVIDENCE");
});
test("projection is pure and order-insensitive on input order", () => {
  const e = [payment("p1", 1, 10), charge("c1", 2, "costs", 20), credit("k1", 3, 5)];
  const snap = JSON.stringify(e);
  assert.deepEqual(projectLedger(ctxOf(), [...e].reverse()), projectLedger(ctxOf(), e));
  assert.equal(JSON.stringify(e), snap);
});
test("summary sums per currency only over fully-known awards; unknown/review/conflict counted not summed", () => {
  const cad = ctxOf({}, { id: "award-cad", amountCents: 700, currency: "CAD" });
  const unk = ctxOf({}, { id: "award-unk", amountCents: null, currency: null });
  const over = ctxOf({}, { id: "award-over", amountCents: 10 });
  const s = summarizeLedgers([ctxOf(), cad, unk, over], [payment("o1", 1, 99, { awardId: "award-over" })]);
  assert.deepEqual(s.outstandingByCurrency, { CAD: 700, USD: 100000 });
  assert.equal(s.unknownAwards, 1); assert.equal(s.reviewAwards, 1); assert.equal(s.conflictAwards, 0);
});
test("summary: one conflicted award does not poison others but is never summed", () => {
  const b = ctxOf({}, { id: "award-2", amountCents: 50 });
  const s = summarizeLedgers([ctxOf(), b], [payment("x", 1, 5, { currency: "CAD" }), payment("y", 1, 5, { awardId: "award-2" })]);
  assert.equal(s.conflictAwards, 1); assert.deepEqual(s.outstandingByCurrency, { USD: 45 });
});
test("summary total overflow fails closed", () => {
  const s = summarizeLedgers([ctxOf({}, { id: "a", amountCents: MAX_MONEY_CENTS }), ctxOf({}, { id: "b", amountCents: 1 })], []);
  assert.equal(s.conflict, "UNSAFE_ARITHMETIC");
});

// ---- collection eligibility: separate from arithmetic ----
const ready = () => projectLedger(ctxOf({ reconciliation: reconciled() }), [payment("p1", 1, 25000)]);
test("eligible only with explicit verified+approved input bound to the current ledger state", () => {
  assert.deepEqual(evaluateCollectionEligibility(ready(), approval()), { eligible: true, blockers: [] });
});
test("a clean balance alone is never eligible (arithmetic is not approval)", () => {
  assert.deepEqual(evaluateCollectionEligibility(ready(), null), { eligible: false, blockers: ["APPROVAL_MISSING"] });
  assert.deepEqual(evaluateCollectionEligibility(ready(), undefined), { eligible: false, blockers: ["APPROVAL_MISSING"] });
});
test("L1 collectionReadiness flag is not trusted as a shortcut", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }, { collectionReadiness: "ready" }), [payment("p1", 1, 25000)]);
  assert.equal(evaluateCollectionEligibility(p, null).eligible, false);
});
test("unverified judgment blocks even with approval", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }, { judgmentVerification: "unverified" }), [payment("p1", 1, 25000)]);
  assert.deepEqual(evaluateCollectionEligibility(p, approval()).blockers, ["PRINCIPAL_NOT_VERIFIED"]);
  for (const v of ["disputed", "vacated"]) assert.equal(evaluateCollectionEligibility(projectLedger(ctxOf({ reconciliation: reconciled() }, { judgmentVerification: v }), [payment("p1", 1, 25000)]), approval()).eligible, false);
});
test("unknown, review, conflict ledgers are never eligible", () => {
  const unk = projectLedger(ctxOf({}, { amountCents: null, currency: null }), []);
  const rev = projectLedger(ctxOf(), [payment("p1", 1, 200000)]);
  const con = projectLedger(ctxOf(), [payment("p1", 1, 5, { currency: "CAD" })]);
  assert.ok(evaluateCollectionEligibility(unk, approval()).blockers.includes("LEDGER_UNKNOWN"));
  assert.ok(evaluateCollectionEligibility(rev, approval()).blockers.includes("LEDGER_REVIEW"));
  assert.ok(evaluateCollectionEligibility(con, approval()).blockers.includes("LEDGER_CONFLICT"));
});
test("zero outstanding is not collectible", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }), [payment("p1", 1, 100000)]);
  assert.ok(evaluateCollectionEligibility(p, approval({ outstandingCents: 1, ledgerSeq: 1 })).blockers.includes("NOTHING_OUTSTANDING"));
});
test("stale, mismatched or cross-matter approvals are blockers", () => {
  const later = projectLedger(ctxOf({ reconciliation: reconciled("2026-04-01") }), [payment("p1", 1, 25000), payment("p2", 2, 1)]);
  assert.ok(evaluateCollectionEligibility(later, approval()).blockers.includes("APPROVAL_STALE"));
  assert.ok(evaluateCollectionEligibility(ready(), approval({ outstandingCents: 74999 })).blockers.includes("APPROVAL_AMOUNT_MISMATCH"));
  assert.ok(evaluateCollectionEligibility(ready(), approval({ awardId: "award-2" })).blockers.includes("APPROVAL_WRONG_AWARD"));
  assert.ok(evaluateCollectionEligibility(ready(), approval({ matterId: "matter-2", evidence: [{ evidenceId: "e", matterId: "matter-2" }] })).blockers.includes("APPROVAL_WRONG_MATTER"));
  assert.ok(evaluateCollectionEligibility(ready(), approval({ evidence: [{ evidenceId: "e", matterId: "matter-2" }] })).blockers.some((b) => b === "APPROVAL_WRONG_EVIDENCE_MATTER" || b === "APPROVAL_INVALID"));
  assert.ok(evaluateCollectionEligibility(ready(), approval({ currency: "CAD" })).blockers.includes("APPROVAL_CURRENCY_MISMATCH"));
});
test("a ledger change after approval invalidates it (reversal included)", () => {
  const rev = projectLedger(ctxOf({ reconciliation: reconciled("2026-04-01") }), [payment("p1", 1, 25000), reversal("r1", 2, "p1")]);
  const b = evaluateCollectionEligibility(rev, approval()).blockers;
  assert.ok(b.includes("APPROVAL_STALE") && b.includes("APPROVAL_AMOUNT_MISMATCH"));
});
test("stale or missing reconciliation blocks", () => {
  const none = projectLedger(ctxOf(), [payment("p1", 1, 25000)]);
  assert.ok(evaluateCollectionEligibility(none, approval()).blockers.includes("RECONCILIATION_NOT_CURRENT"));
});
test("malformed approvals are invalid, never throw, and unknown keys (deadline, enforceable) are refused", () => {
  for (const bad of [{}, "yes", 5, [], approval({ outstandingCents: 0 }), approval({ ledgerSeq: -1 }), approval({ currency: undefined }), { ...approval(), enforceable: true }, { ...approval(), deadline: "2027-01-01" }, approval({ evidence: [] })])
    assert.ok(evaluateCollectionEligibility(ready(), bad).blockers.includes("APPROVAL_INVALID"), JSON.stringify(bad));
});
test("eligibility carries no enforcement, deadline or interest fields", () => {
  const out = evaluateCollectionEligibility(ready(), approval());
  assert.deepEqual(Object.keys(out).sort(), ["blockers", "eligible"]);
});
