// L5 v2 review corrections. Each block was reproduced against the reviewed head (63822f76) before the fix.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateCollectionEligibility, evaluateCollectionEligibilityForLedger, isValidProjection, parseCollectionApproval, parseReconciliation, planAppend, projectLedger,
} from "../../../../shared/legal/ledger/index.ts";
import { approval, awardOf, ctxOf, DEFAULT_ENTRIES, payment, reconciled, reversal } from "./fixtures.ts";

const base = () => DEFAULT_ENTRIES();
const readyProjection = () => projectLedger(ctxOf({ reconciliation: reconciled() }), base());
const eligible = () => evaluateCollectionEligibility(readyProjection(), approval());

test("control: a reviewed, approved, identified ledger is eligible (planning result only)", () => {
  assert.deepEqual(eligible(), { eligible: true, blockers: [] });
  assert.deepEqual(Object.keys(eligible()).sort(), ["blockers", "eligible"]);
});

// ---- 1. reconciliation binds to the reviewed ledger state ----
test("a backdated append invalidates the old reconciliation even with a fresh matching approval", () => {
  const more = [...base(), payment("p2", 2, 1000, { effectiveDate: "2026-02-01" })];   // effective BEFORE asOf
  const p = projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", base()) }), more);
  assert.equal(p.reconciliation.state, "stale");
  assert.deepEqual(p.reconciliation.staleReasons, ["LEDGER_CHANGED"]);
  assert.deepEqual(p.reconciliation.unreconciledEntryIds, ["p2"]);
  const r = evaluateCollectionEligibility(p, approval({}, more));
  assert.equal(r.eligible, false); assert.deepEqual(r.blockers, ["RECONCILIATION_NOT_CURRENT"]);
});
test("a reversal appended after review also invalidates it, whatever its date", () => {
  const more = [...base(), reversal("r1", 2, "p1")];
  const p = projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", base()) }), more);
  assert.equal(p.reconciliation.state, "stale");
});
test("reconciling the new state restores eligibility; an old asOf is not an expiry", () => {
  const more = [...base(), payment("p2", 2, 1000, { effectiveDate: "2026-02-01" })];
  const fresh = projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", more) }), more);
  assert.equal(evaluateCollectionEligibility(fresh, approval({}, more)).eligible, true);
  // asOf is a business date: no wall-clock threshold exists, so a long-ago date that covers every entry still counts as current.
  const old = [payment("p1", 1, 25000, { effectiveDate: "2019-01-01" })];
  const p = projectLedger(ctxOf({ reconciliation: reconciled("2019-06-30", old) }), old);
  assert.equal(p.reconciliation.state, "current");
  assert.equal(evaluateCollectionEligibility(p, approval({}, old)).eligible, true);
});
test("same sequence, different content (altered entry) is stale", () => {
  const swapped = [payment("p1", 1, 25001)];
  const p = projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", base()) }), swapped);
  assert.equal(p.reconciliation.state, "stale"); assert.deepEqual(p.reconciliation.staleReasons, ["LEDGER_CHANGED"]);
});
test("an entry effective after asOf is still unreviewed even when the state matches", () => {
  const e = [payment("p1", 1, 5, { effectiveDate: "2026-04-01" })];
  const p = projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", e) }), e);
  assert.equal(p.reconciliation.state, "stale"); assert.deepEqual(p.reconciliation.staleReasons, ["ENTRY_AFTER_AS_OF"]);
});
test("reconciliation must name the state it reviewed (strict parse)", () => {
  const { ledgerDigest: _d, ...noDigest } = reconciled(); assert.throws(() => parseReconciliation(noDigest));
  const { ledgerSeq: _s, ...noSeq } = reconciled(); assert.throws(() => parseReconciliation(noSeq));
  assert.throws(() => parseReconciliation({ ...reconciled(), ledgerDigest: "nope" }));
  assert.throws(() => parseReconciliation({ ...reconciled(), ledgerSeq: -1 }));
  assert.throws(() => parseReconciliation({ ...reconciled(), expiresAfterDays: 30 }));
  assert.equal(projectLedger(ctxOf({ reconciliation: { ...reconciled(), ledgerDigest: "nope" } as never }), []).conflict, "INVALID_RECONCILIATION");
});
test("exact replay stays idempotent and does not disturb a current reconciliation", () => {
  const doubled = [...base(), ...base()];
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }), doubled);
  assert.deepEqual(p, readyProjection());
  assert.equal(planAppend(ctxOf(), base(), payment("p1", 1, 25000)).outcome, "noop");
});

// ---- 2. approval binds to award revision and parties ----
test("changed award revision invalidates the approval though amount and sequence are unchanged", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }, { revision: 2 }), base());
  assert.equal(p.outstandingCents, 75000); assert.equal(p.lastSeq, 1);
  assert.deepEqual(evaluateCollectionEligibility(p, approval()).blockers, ["APPROVAL_AWARD_CHANGED"]);
});
test("replaced obligors invalidate the approval (same revision, amount and sequence)", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }, { obligors: [{ partyId: "party-z", liability: "sole" }] }), base());
  assert.deepEqual(evaluateCollectionEligibility(p, approval()).blockers, ["APPROVAL_PARTIES_CHANGED"]);
});
test("changed liability, added obligor, or changed creditor each invalidate the approval", () => {
  const two = [{ partyId: "party-a", liability: "joint" }, { partyId: "party-b", liability: "joint" }];
  const cases: [string, ReturnType<typeof ctxOf>][] = [
    ["liability", ctxOf({ reconciliation: reconciled() }, { obligors: [{ partyId: "party-a", liability: "several" }, { partyId: "party-b", liability: "joint" }] })],
    ["extra obligor", ctxOf({ reconciliation: reconciled() }, { obligors: [...two, { partyId: "party-c", liability: "joint" }] })],
    ["creditor", ctxOf({ creditorPartyId: "creditor-2", reconciliation: reconciled() })],
  ];
  for (const [name, ctx] of cases) assert.deepEqual(evaluateCollectionEligibility(projectLedger(ctx, base()), approval()).blockers, ["APPROVAL_PARTIES_CHANGED"], name);
});
test("obligor order does not matter (same set stays eligible)", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }, { obligors: [{ partyId: "party-b", liability: "joint" }, { partyId: "party-a", liability: "joint" }] }), base());
  assert.equal(evaluateCollectionEligibility(p, approval()).eligible, true);
});
test("approval must name revision, creditor, obligors and ledger state (strict parse)", () => {
  for (const k of ["awardRevision", "creditorPartyId", "obligors", "ledgerDigest"]) {
    const a: Record<string, unknown> = { ...approval() }; delete a[k];
    assert.throws(() => parseCollectionApproval(a), k);
  }
  assert.throws(() => parseCollectionApproval(approval({ obligors: [] })));
  assert.throws(() => parseCollectionApproval(approval({ obligors: [{ partyId: "a", liability: "joint" }, { partyId: "a", liability: "joint" }] })));
  assert.throws(() => parseCollectionApproval(approval({ obligors: [{ partyId: "a", liability: "joint", amountCents: 5 }] })));
  assert.throws(() => parseCollectionApproval(approval({ ledgerDigest: "xyz" })));
});
test("a ledger content change with unchanged sequence stales the approval", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", [payment("p1", 1, 25001)]) }), [payment("p1", 1, 25001)]);
  const b = evaluateCollectionEligibility(p, approval({ outstandingCents: 74999 })).blockers;
  assert.deepEqual(b, ["APPROVAL_STALE"]);
});

// ---- 3. unresolved identity blocks ----
test("missing creditor blocks even with an otherwise matching approval", () => {
  const p = projectLedger(ctxOf({ creditorPartyId: null, reconciliation: reconciled() }), base());
  const r = evaluateCollectionEligibility(p, approval());
  assert.equal(r.eligible, false); assert.ok(r.blockers.includes("CREDITOR_UNRESOLVED"));
});
test("missing obligors block even with an otherwise matching approval", () => {
  const p = projectLedger(ctxOf({ reconciliation: reconciled() }, { obligors: [] }), base());
  const r = evaluateCollectionEligibility(p, approval());
  assert.equal(r.eligible, false); assert.ok(r.blockers.includes("OBLIGOR_UNRESOLVED"));
});
test("an approval cannot paper over an unresolved party (it must name a creditor and obligors)", () => {
  const p = projectLedger(ctxOf({ creditorPartyId: null, reconciliation: reconciled() }, { obligors: [] }), base());
  assert.equal(evaluateCollectionEligibility(p, approval({ creditorPartyId: null, obligors: [] })).eligible, false);
});

// ---- 4. strict award representation ----
const withAward = (mutate: (a: Record<string, unknown>) => void) => {
  const c = ctxOf(); const a: Record<string, unknown> = { ...c.award }; mutate(a);
  return { ...c, award: a as never };
};
test("malformed amount is a conflict, never unknown", () => {
  for (const bad of [{}, { cents: 5 }, { currency: "USD" }, { cents: "5", currency: "USD" }, { cents: 1.5, currency: "USD" }, { cents: -1, currency: "USD" }, { cents: 5, currency: "usd" }, { cents: 5, currency: "USD", extra: 1 }, [], "100", 100]) {
    const p = projectLedger(withAward((a) => { a.amount = bad; }), []);
    assert.equal(p.status, "conflict", JSON.stringify(bad)); assert.equal(p.conflict, "INVALID_AWARD");
  }
});
test("a non-object amount that would coerce to unknown is a conflict (normal-form guard alone is sufficient)", () => {
  for (const bad of [undefined, 0, false, "", {}]) assert.equal(projectLedger(withAward((a) => { a.amount = bad; }), []).conflict, "INVALID_AWARD", String(bad));
});
test("recorded wire money without a normalized amount is never erased", () => {
  const p = projectLedger(withAward((a) => { delete a.amount; a.amountCents = 100000; a.currency = "USD"; }), []);
  assert.equal(p.status, "conflict"); assert.equal(p.conflict, "INVALID_AWARD");
});
test("wire money conflicting with a normalized amount, or alongside null, is rejected", () => {
  assert.equal(projectLedger(withAward((a) => { a.amountCents = 5; a.currency = "USD"; }), []).conflict, "INVALID_AWARD");
  assert.equal(projectLedger(withAward((a) => { a.amount = null; a.amountCents = 5; a.currency = "USD"; }), []).conflict, "INVALID_AWARD");
  assert.equal(projectLedger(withAward((a) => { a.amountCents = null; a.currency = null; }), []).conflict, "INVALID_AWARD");
});
test("a missing amount key is not unknown; an explicit null amount is", () => {
  assert.equal(projectLedger(withAward((a) => { delete a.amount; }), []).conflict, "INVALID_AWARD");
  const unk = projectLedger(ctxOf({}, { amountCents: null, currency: null }), []);
  assert.equal(unk.status, "unknown"); assert.deepEqual(unk.review, ["UNKNOWN_PRINCIPAL"]);
});
test("unsupported award keys, bad parties and bad enums are rejected", () => {
  assert.equal(projectLedger(withAward((a) => { a.interestRate = 0.1; }), []).conflict, "INVALID_AWARD");
  assert.equal(projectLedger(withAward((a) => { a.obligors = [{ partyId: "p", liability: "joint", amountCents: 5 }]; }), []).conflict, "INVALID_AWARD");
  assert.equal(projectLedger(withAward((a) => { a.obligors = "none"; }), []).conflict, "INVALID_AWARD");
  assert.equal(projectLedger(withAward((a) => { a.kind = "mystery"; }), []).conflict, "INVALID_AWARD");
  assert.equal(projectLedger(withAward((a) => { a.judgmentVerification = "approved"; }), []).conflict, "INVALID_AWARD");
  assert.equal(projectLedger(withAward((a) => { a.revision = -1; }), []).conflict, "INVALID_AWARD");
});
test("controls: zero principal stays zero, normal and key-reordered awards still project", () => {
  assert.equal(projectLedger(ctxOf({}, { amountCents: 0 }), []).outstandingCents, 0);
  const a = awardOf(); const reordered = { obligors: a.obligors, revision: a.revision, collectionReadiness: a.collectionReadiness, judgmentVerification: a.judgmentVerification, amount: a.amount, kind: a.kind, matterId: a.matterId, id: a.id };
  assert.equal(projectLedger({ ...ctxOf(), award: reordered as never }, []).outstandingCents, 100000);
});

// ---- 5. eligibility fails closed on malformed projections ----
test("null, non-object and garbage projections never qualify", () => {
  for (const bad of [null, undefined, 5, "known", [], {}, { status: "known" }]) {
    assert.deepEqual(evaluateCollectionEligibility(bad as never, approval()), { eligible: false, blockers: ["PROJECTION_INVALID"] });
  }
});
test("unrecognized status never qualifies", () => {
  const good = readyProjection();
  for (const status of ["OTHER", "KNOWN", "", null, 1, undefined]) assert.equal(evaluateCollectionEligibility({ ...good, status } as never, approval()).eligible, false, String(status));
});
test("inconsistent required fields never qualify", () => {
  const g = readyProjection();
  const mutations: Record<string, Record<string, unknown>> = {
    "outstanding != net": { outstandingCents: 1 },
    "net != charged - satisfied": { netCents: 1 },
    "negative outstanding on known": { outstandingCents: -5, netCents: -5 },
    "float outstanding": { outstandingCents: 0.5 },
    "string outstanding": { outstandingCents: "75000" },
    "review codes on known": { review: ["OVERPAYMENT"] },
    "unknown ids on known": { unknownEntryIds: ["p1"] },
    "conflict code on known": { conflict: "INVALID_ENTRY" },
    "currency != principal": { currency: "CAD" },
    "missing principal": { principal: null },
    "bad digest": { ledgerDigest: "zzz" },
    "missing digest": { ledgerDigest: undefined },
    "bad lastSeq": { lastSeq: -1 },
    "missing reconciliation": { reconciliation: null },
    "bad reconciliation state": { reconciliation: { ...g.reconciliation, state: "fresh" } },
    "obligors not array": { obligors: "party-a" },
    "obligor missing id": { obligors: [{ liability: "joint" }] },
    "bad creditor": { creditorPartyId: 7 },
    "principalVerified not boolean": { principalVerified: "yes" },
  };
  for (const [name, m] of Object.entries(mutations)) {
    const r = evaluateCollectionEligibility({ ...g, ...m } as never, approval());
    assert.equal(r.eligible, false, name); assert.deepEqual(r.blockers, ["PROJECTION_INVALID"], name);
  }
});
test("arithmetic identity is checked on its own: charged or satisfied altered while net and outstanding still agree", () => {
  const g = readyProjection();
  for (const m of [{ chargedCents: g.chargedCents! + 1 }, { satisfiedCents: g.satisfiedCents! + 1 }, { satisfiedCents: 0 }]) {
    assert.deepEqual(evaluateCollectionEligibility({ ...g, ...m } as never, approval()).blockers, ["PROJECTION_INVALID"], JSON.stringify(m));
  }
});
test("review/unknown/conflict projections are valid shapes but never qualify; a conflict without a code is invalid", () => {
  const unk = projectLedger(ctxOf({}, { amountCents: null, currency: null }), []);
  const rev = projectLedger(ctxOf(), [payment("p1", 1, 200000)]);
  const con = projectLedger(ctxOf(), [payment("p1", 1, 5, { currency: "CAD" })]);
  for (const p of [unk, rev, con]) { assert.equal(isValidProjection(p), true); assert.equal(evaluateCollectionEligibility(p, approval()).eligible, false); }
  assert.equal(isValidProjection({ ...con, conflict: null }), false);
  assert.equal(isValidProjection({ ...unk, outstandingCents: 5 }), false);
  assert.equal(isValidProjection({ ...rev, outstandingCents: 0 }), false);
});
test("every real projection status is a valid shape", () => {
  for (const p of [readyProjection(), projectLedger(ctxOf(), []), projectLedger(ctxOf({}, { amountCents: 0 }), [])]) assert.equal(isValidProjection(p), true);
});
test("evaluate-for-ledger projects itself, so a hand-made projection is not needed", () => {
  const r = evaluateCollectionEligibilityForLedger(ctxOf({ reconciliation: reconciled() }), base(), approval());
  assert.equal(r.eligible, true); assert.equal(r.projection.status, "known");
  const bad = evaluateCollectionEligibilityForLedger(ctxOf({ reconciliation: reconciled() }), [...base(), payment("p1", 1, 9)], approval());
  assert.equal(bad.eligible, false); assert.ok(bad.blockers.includes("LEDGER_CONFLICT"));
});

// ---- v3: complete reconciliation projection, positive revisions, strict recorded amounts ----
const withRecon = (reconciliation: unknown) => ({ ...readyProjection(), reconciliation } as never);
test("a partial or contradictory `current` reconciliation is PROJECTION_INVALID, never eligible", () => {
  const bad: Record<string, unknown> = {
    "state only": { state: "current" },
    "bad asOf + stale fields": { state: "current", asOf: "bad", unreconciledEntryIds: ["missing-entry"], staleReasons: ["LEDGER_CHANGED"] },
    "current with unreconciled ids": { state: "current", asOf: "2026-03-05", unreconciledEntryIds: ["p1"], staleReasons: [] },
    "current with stale reasons": { state: "current", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: ["LEDGER_CHANGED"] },
    "current with null asOf": { state: "current", asOf: null, unreconciledEntryIds: [], staleReasons: [] },
    "current with impossible date": { state: "current", asOf: "2026-02-30", unreconciledEntryIds: [], staleReasons: [] },
    "current with non-string date": { state: "current", asOf: 20260305, unreconciledEntryIds: [], staleReasons: [] },
    "ids missing": { state: "current", asOf: "2026-03-05", staleReasons: [] },
    "reasons missing": { state: "current", asOf: "2026-03-05", unreconciledEntryIds: [] },
    "ids not an array": { state: "current", asOf: "2026-03-05", unreconciledEntryIds: "", staleReasons: [] },
    "blank id": { state: "current", asOf: "2026-03-05", unreconciledEntryIds: [" "], staleReasons: [] },
    "unknown reason": { state: "current", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: ["EXPIRED"] },
    "stale with only an unknown reason": { state: "stale", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: ["EXPIRED"] },
    "stale with a known and an unknown reason": { state: "stale", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: ["LEDGER_CHANGED", "EXPIRED"] },
    "extra key (expiry)": { state: "current", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: [], expiresOn: "2027-01-01" },
    "none with a date": { state: "none", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: [] },
    "none with reasons": { state: "none", asOf: null, unreconciledEntryIds: [], staleReasons: ["LEDGER_CHANGED"] },
    "stale with no reason": { state: "stale", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: [] },
    "stale after-asOf with no entries": { state: "stale", asOf: "2026-03-05", unreconciledEntryIds: [], staleReasons: ["ENTRY_AFTER_AS_OF"] },
    "duplicate ids": { state: "stale", asOf: "2026-03-05", unreconciledEntryIds: ["a", "a"], staleReasons: ["ENTRY_AFTER_AS_OF"] },
    "duplicate reasons": { state: "stale", asOf: "2026-03-05", unreconciledEntryIds: ["a"], staleReasons: ["LEDGER_CHANGED", "LEDGER_CHANGED"] },
    "null": null, "string": "current", "array": [],
  };
  for (const [name, r] of Object.entries(bad)) {
    const out = evaluateCollectionEligibility(withRecon(r), approval());
    assert.equal(out.eligible, false, name); assert.deepEqual(out.blockers, ["PROJECTION_INVALID"], name);
  }
});
test("controls: every reconciliation the projector can produce is a valid shape", () => {
  const e = [payment("p1", 1, 5)];
  const shapes = [
    projectLedger(ctxOf(), e),                                                              // none
    projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", e) }), e),               // current
    projectLedger(ctxOf({ reconciliation: reconciled("2026-02-01", e) }), e),               // stale: entry after asOf
    projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", base()) }), [...base(), payment("p2", 2, 1)]),  // stale: ledger changed
    projectLedger(ctxOf({ reconciliation: reconciled("2026-03-05", [payment("p1", 1, 9)]) }), [payment("p1", 1, 10)]), // stale: same seq
  ];
  for (const p of shapes) assert.equal(isValidProjection(p), true, JSON.stringify(p.reconciliation));
  assert.deepEqual(shapes.map((p) => p.reconciliation.state), ["none", "current", "stale", "stale", "stale"]);
  assert.equal(evaluateCollectionEligibility(readyProjection(), approval()).eligible, true);
});

test("award revision must be positive in projections and approvals (conflict sentinel stays separate)", () => {
  const out = evaluateCollectionEligibility({ ...readyProjection(), awardRevision: 0 } as never, approval({ awardRevision: 0 }));
  assert.deepEqual(out, { eligible: false, blockers: ["PROJECTION_INVALID"] });
  for (const rev of [0, -1, 1.5, "1", null, NaN]) assert.throws(() => parseCollectionApproval(approval({ awardRevision: rev })), String(rev));
  const p0 = { ...readyProjection(), awardRevision: 0 } as never;
  assert.equal(isValidProjection(p0), false);
  assert.ok(evaluateCollectionEligibility(readyProjection(), approval({ awardRevision: 0 })).blockers.includes("APPROVAL_INVALID"));
  // an award with revision 0 never reaches a projection: L1 requires >= 1
  assert.equal(projectLedger(ctxOf({}, {}), []).awardRevision, 1);
  assert.equal(projectLedger({ ...ctxOf(), award: { ...ctxOf().award, revision: 0 } as never }, []).conflict, "INVALID_AWARD");
  const conflict = projectLedger(ctxOf(), [payment("p1", 1, 5, { currency: "CAD" })]);
  assert.equal(conflict.awardRevision, 0); assert.equal(isValidProjection(conflict), true);
  assert.equal(evaluateCollectionEligibility(conflict, approval()).eligible, false);
});

test("a recorded amount needs numeric cents and a currency; null members are malformed, not unknown", () => {
  const bad: unknown[] = [
    { cents: null, currency: null }, { cents: undefined, currency: undefined }, { cents: undefined, currency: "USD" }, { cents: 5, currency: undefined },
    { cents: null, currency: "USD" }, { cents: 5, currency: null }, { cents: "5", currency: "USD" }, { cents: NaN, currency: "USD" },
    { cents: Infinity, currency: "USD" }, { cents: 5, currency: 840 }, { cents: 5, currency: "" }, { cents: 5, currency: "US" }, { cents: Number.MAX_SAFE_INTEGER + 1, currency: "USD" },
  ];
  for (const amount of bad) {
    const p = projectLedger(withAward((a) => { a.amount = amount; }), []);
    assert.equal(p.status, "conflict", JSON.stringify(amount)); assert.equal(p.conflict, "INVALID_AWARD", JSON.stringify(amount));
    assert.equal(p.principal, null);
  }
});
test("undefined award fields are rejected, not read as unknown", () => {
  for (const key of ["id", "matterId", "kind", "judgmentVerification", "collectionReadiness", "revision", "obligors", "amount"]) {
    const p = projectLedger(withAward((a) => { a[key] = undefined; }), []);
    assert.equal(p.conflict, "INVALID_AWARD", key);
  }
});
test("only amount:null is unknown; recorded zero stays zero; a normal amount is unchanged", () => {
  const unk = projectLedger(ctxOf({}, { amountCents: null, currency: null }), []);
  assert.equal(unk.status, "unknown"); assert.deepEqual(unk.review, ["UNKNOWN_PRINCIPAL"]); assert.equal(unk.principal, null);
  const zero = projectLedger(withAward((a) => { a.amount = { cents: 0, currency: "USD" }; }), []);
  assert.equal(zero.status, "known"); assert.equal(zero.outstandingCents, 0); assert.deepEqual(zero.principal, { cents: 0, currency: "USD" });
  assert.equal(projectLedger(ctxOf(), []).outstandingCents, 100000);
});
