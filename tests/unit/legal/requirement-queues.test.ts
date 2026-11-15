import { test } from "node:test";
import assert from "node:assert/strict";
import { requirementQueues } from "../../../shared/legal/workflow/requirementQueues";

const matter = { id: "m1", scopeRef: "s1", caseType: "eviction", lifecycle: "draft", courtRef: null, docketNumber: null, revision: 1 };
const base = { matter, evidence: [], courtEvents: [], awards: [] };

test("assigned and unassigned open are distinct; resolved excluded", () => {
  const input = { ...base, requirements: [
    { id: "r1", matterId: "m1", description: "Assemble", assignedActor: null, sourceDate: null, status: "open" },
    { id: "r2", matterId: "m1", description: "Review", assignedActor: "user-1", sourceDate: "2026-11-01", status: "open" },
    { id: "r3", matterId: "m1", description: "Done", assignedActor: null, sourceDate: null, status: "resolved" },
  ] };
  const q = requirementQueues(input);
  assert.equal(q.kind, "ready");
  if (q.kind === "ready") {
    assert.equal(q.open.length, 2);
    assert.equal(q.assigned.length, 1);
    assert.equal(q.unassigned.length, 1);
    assert.equal(q.counts.open, 2);
    assert.equal(q.byActor["user-1"].length, 1);
  }
});

test("empty ready is distinct from unavailable", () => {
  const empty = requirementQueues({ ...base, requirements: [] });
  const unavailable = requirementQueues({ kind: "unavailable", reason: "x" });
  assert.equal(empty.kind, "ready");
  assert.equal(unavailable.kind, "unavailable");
});

test("malformed input returns conflict", () => {
  assert.equal(requirementQueues(null).kind, "conflict");
  assert.equal(requirementQueues({ ...base, requirements: 42 }).kind, "conflict");
});

test("duplicate and wrong-matter are conflict", () => {
  const dup = requirementQueues({ ...base, requirements: [
    { id: "r1", matterId: "m1", description: "A", assignedActor: null, sourceDate: null, status: "open" },
    { id: "r1", matterId: "m1", description: "B", assignedActor: null, sourceDate: null, status: "open" },
  ] });
  assert.equal(dup.kind, "conflict");
  const wrong = requirementQueues({ ...base, requirements: [
    { id: "r1", matterId: "other", description: "A", assignedActor: null, sourceDate: null, status: "open" },
  ] });
  assert.equal(wrong.kind, "conflict");
});

test("unknown date stays unknown; no deadline invented", () => {
  const q = requirementQueues({ ...base, requirements: [
    { id: "r1", matterId: "m1", description: "Request to attorney", assignedActor: null, sourceDate: null, status: "open" },
  ] });
  assert.equal(q.kind, "ready");
  if (q.kind === "ready") {
    assert.equal(q.open[0].sourceDate, null);
    assert.equal(q.unassigned.length, 1);
  }
});

test("deterministic ordering by id", () => {
  const q = requirementQueues({ ...base, requirements: [
    { id: "r2", matterId: "m1", description: "B", assignedActor: "user-1", sourceDate: null, status: "open" },
    { id: "r1", matterId: "m1", description: "A", assignedActor: "user-1", sourceDate: null, status: "open" },
  ] });
  assert.equal(q.kind, "ready");
  if (q.kind === "ready") assert.deepEqual(q.open.map(r => r.id), ["r1", "r2"]);
});

test("prototype-like actor ids are safe own keys", () => {
  const q = requirementQueues({ ...base, requirements: [
    { id: "r1", matterId: "m1", description: "A", assignedActor: "__proto__", sourceDate: null, status: "open" },
    { id: "r2", matterId: "m1", description: "B", assignedActor: "constructor", sourceDate: null, status: "open" },
    { id: "r3", matterId: "m1", description: "C", assignedActor: "toString", sourceDate: null, status: "open" },
    { id: "r4", matterId: "m1", description: "D", assignedActor: "__proto__", sourceDate: null, status: "open" },
  ] });
  assert.equal(q.kind, "ready");
  if (q.kind === "ready") {
    assert.equal(q.byActor["__proto__"].length, 2);
    assert.equal(q.byActor["constructor"].length, 1);
    assert.equal(q.byActor["toString"].length, 1);
    assert.equal(q.counts.assigned, 4);
  }
});

test("locale-independent ordering for mixed-case and non-ascii", () => {
  const q = requirementQueues({ ...base, requirements: [
    { id: "rB", matterId: "m1", description: "B", assignedActor: null, sourceDate: null, status: "open" },
    { id: "ra", matterId: "m1", description: "A", assignedActor: null, sourceDate: null, status: "open" },
    { id: "ré", matterId: "m1", description: "E", assignedActor: null, sourceDate: null, status: "open" },
  ] });
  assert.equal(q.kind, "ready");
  if (q.kind === "ready") assert.deepEqual(q.open.map(r => r.id), ["rB", "ra", "ré"]);
});

test("nonready states are returned unchanged", () => {
  for (const kind of ["unavailable", "missing", "denied", "stale", "conflict"] as const) {
    const q = requirementQueues({ kind, reason: "x", asOf: null });
    assert.equal(q.kind, kind === "stale" ? "stale" : kind === "conflict" ? "conflict" : kind);
  }
});

test("input is not mutated", () => {
  const reqs = [{ id: "r1", matterId: "m1", description: "A", assignedActor: "user-1", sourceDate: null, status: "open" as const }];
  const input = { ...base, requirements: reqs };
  const before = JSON.stringify(input);
  requirementQueues(input);
  assert.equal(JSON.stringify(input), before);
});
