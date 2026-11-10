import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import LegalCommandView from "../../src/features/legal/components/LegalCommandView";
import { fixtureLegalAdapter, unboundLegalAdapter, SYNTHETIC_MATTERS } from "../../src/features/legal/adapter";

test("unbound legal adapter returns unavailable", async () => {
  const state = await unboundLegalAdapter().load();
  assert.equal(state.kind, "unavailable");
});

test("synthetic matters keep awards unverified", () => {
  for (const m of SYNTHETIC_MATTERS) {
    assert.equal(m.awardVerified, false);
    assert.equal(m.awardCents, null);
  }
});

test("command view starts in loading", () => {
  const html = renderToStaticMarkup(<LegalCommandView adapter={fixtureLegalAdapter({ kind: "ready", matters: SYNTHETIC_MATTERS })} />);
  assert.match(html, /Loading legal matters/);
});
