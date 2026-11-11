import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, act } from "react-test-renderer";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../src/lib/queryClient";

function Fixture({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(createQueryClient);
  return <QueryClientProvider client={client}><Router hook={useLoc}>{children}</Router></QueryClientProvider>;
}
import LegalCommandView from "../../src/features/legal/components/LegalCommandView";
import { fixtureLegalAdapter, unboundLegalAdapter, SYNTHETIC_MATTERS } from "../../src/features/legal/adapter";

const useLoc = (): [string, (to: string) => void] => ["/ops/legal/case-manager", () => {}];

test("unbound legal adapter returns unavailable", async () => {
  const state = await unboundLegalAdapter().load();
  assert.equal(state.kind, "unavailable");
});

test("synthetic matters keep awards unknown, not zero", () => {
  for (const m of SYNTHETIC_MATTERS) {
    assert.equal(m.awardVerified, false);
    assert.equal(m.awardCents, null);
    assert.equal(m.awardId, null);
  }
});

test("command view loads and filters by queue", async () => {
  const adapter = fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS });
  let tree: any;
  await act(async () => { tree = create(<Fixture><LegalCommandView adapter={adapter} /></Fixture>); });
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });
  const json = JSON.stringify(tree.toJSON());
  assert.match(json, /EXAMPLE v. SAMPLE/);
  assert.match(json, /EXAMPLE v. DEMO/);
  const intake = tree.root.findAll((n: any) => n.props && n.props.children === "Intake")[0];
  await act(async () => { intake.props.onClick(); });
  const after = JSON.stringify(tree.toJSON());
  assert.match(after, /EXAMPLE v. SAMPLE/);
  assert.doesNotMatch(after, /EXAMPLE v. DEMO/);
});

test("command view search filters captions", async () => {
  const adapter = fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS });
  let tree: any;
  await act(async () => { tree = create(<Fixture><LegalCommandView adapter={adapter} /></Fixture>); });
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });
  const input = tree.root.findByProps({ "aria-label": "Search legal matters" });
  await act(async () => { input.props.onChange({ target: { value: "DEMO" } }); });
  const json = JSON.stringify(tree.toJSON());
  assert.match(json, /EXAMPLE v. DEMO/);
  assert.doesNotMatch(json, /EXAMPLE v. SAMPLE/);
});

test("session key clears search", async () => {
  const adapter = fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS });
  let tree: any;
  await act(async () => { tree = create(<Fixture><LegalCommandView adapter={adapter} sessionKey="a" /></Fixture>); });
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });
  const input = tree.root.findByProps({ "aria-label": "Search legal matters" });
  await act(async () => { input.props.onChange({ target: { value: "DEMO" } }); });
  await act(async () => { tree.update(<Fixture><LegalCommandView adapter={adapter} sessionKey="b" /></Fixture>); });
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });
  const cleared = tree.root.findByProps({ "aria-label": "Search legal matters" });
  assert.equal(cleared.props.value, "");
  await act(async () => { tree.unmount(); });
});
