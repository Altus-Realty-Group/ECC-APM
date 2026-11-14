import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, act } from "react-test-renderer";
import { Router } from "wouter";
import LegalMatterCard from "../../src/features/legal/components/LegalMatterCard";
import { SYNTHETIC_MATTERS, fixtureLegalAdapter } from "../../src/features/legal/adapter";
import { normalizeLegalState } from "../../src/features/legal/viewModel";
import { legalQueryOptions } from "../../src/features/legal/legalQuery";
import { getSessionEpoch } from "../../src/lib/sessionScope";
const projection = () => structuredClone(SYNTHETIC_MATTERS[0]);
const clean = (p: unknown) => normalizeLegalState({ kind: "ready", matters: [p] } as any);

test("native boundary rejects wrong-matter children and duplicate award identities across matters", () => {
  const p = projection(); p.awards[0].matterId = "other";
  assert.equal(clean(p).kind, "conflict");
  const q = structuredClone(SYNTHETIC_MATTERS[1]); q.awards[0].id = SYNTHETIC_MATTERS[0].awards[0].id;
  assert.equal(normalizeLegalState({ kind: "ready", matters: [projection(), q] }).kind, "conflict");
});
test("restricted evidence never reaches cached projection, counts or rendered metadata", () => {
  const p = projection();
  p.evidence = [{ id: "secret", matterId: p.matter.id, filename: "PRIVATE", url: "https://example.com/private", restricted: true, confidence: "high" },
    { id: "public", matterId: p.matter.id, filename: "Public order", url: null, restricted: false, confidence: "low" }];
  const state = clean(p);
  assert.equal(state.kind, "ready"); assert.equal(state.matters[0].evidence.length, 1);
  assert.doesNotMatch(JSON.stringify(state), /PRIVATE|secret|example.com/);
  assert.equal(p.evidence.length, 2);
});
test("malformed and implicit-public evidence fail closed without leaking raw errors", () => {
  const p = projection();
  p.evidence = [{ id: "secret", matterId: p.matter.id, filename: "PRIVATE", url: null, confidence: "high" } as any];
  assert.equal(clean(p).matters[0].evidence.length, 0);
  assert.deepEqual(clean({ ...p, requirements: [null] }), { kind: "conflict" });
  assert.equal(normalizeLegalState({ kind: "error", message: "secret provider path" }).message, "Legal records could not be loaded.");
});
test("detail refuses a different valid matter returned for the requested identity", async () => {
  const adapter = fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS });
  const result = await legalQueryOptions(adapter, "matter:wrong", getSessionEpoch(), "default", async () => ({ kind: "ready" as const, matter: projection() })).queryFn({ signal: new AbortController().signal });
  assert.equal(result.kind, "conflict");
});
test("native card shows multiple awards once, exact cents, separate dimensions and sourced tasks/events", async () => {
  const p = projection();
  p.awards.push({ ...p.awards[0], id: "zero", amount: { cents: 0, currency: "USD" }, judgmentVerification: "verified", collectionReadiness: "ready", obligors: [{ partyId: "p1", liability: "joint" }, { partyId: "p2", liability: "joint" }] },
    { ...p.awards[0], id: "large", amount: { cents: Number.MAX_SAFE_INTEGER, currency: "USD" } });
  p.courtEvents = [{ id: "event", matterId: p.matter.id, date: null, source: "Supplied docket", responsibleActor: null }];
  let tree: any;
  await act(async () => { tree = create(<Router hook={() => ["/ops/legal/matters/m-001", () => {}]}><LegalMatterCard matter={p} /></Router>); });
  const select = async (label: string) => { await act(async () => { tree.root.findAllByProps({ role: "tab" }).find((n: any) => n.children.join("") === label).props.onClick(); }); return JSON.stringify(tree.toJSON()); };
  const judgment = await select("Judgment");
  assert.match(judgment, /USD 0.00/); assert.match(judgment, /Unknown amount/);
  assert.match(judgment, /USD 90,071,992,547,409.91/);
  assert.equal(tree.root.findAllByType("article").length, 3);
  assert.match(judgment, /Judgment verification/); assert.match(judgment, /Collection readiness/);
  assert.match(judgment, /Readiness is not collection approval/);
  const tasks = await select("Tasks"); assert.match(tasks, /Assemble evidence/); assert.match(tasks, /Unassigned/);
  const court = await select("Court"); assert.match(court, /Date unknown/); assert.match(court, /Supplied docket/); assert.match(court, /No deadline is calculated/);
  await act(async () => tree.unmount());
});
