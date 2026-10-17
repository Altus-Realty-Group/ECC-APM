import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { __resetAccessForTests, recordAccessMode, getAccessState, suspendAccessReads } from "../../src/lib/accessState";
import AccessSessionBar from "../../src/features/access/AccessSessionBar";
import { fetchJSON } from "../../src/lib/http";

test("attested review disclosure persists visibly; unknown mode grants nothing", () => {
  __resetAccessForTests();
  recordAccessMode("admin"); assert.equal(getAccessState().mode, "unknown");
  recordAccessMode("read-only");
  const html = renderToStaticMarkup(<AccessSessionBar />);
  assert.match(html, /DEV BYPASS · READ ONLY/); assert.match(html, /Sign out/);
  __resetAccessForTests();
});
test("sign-out suspension prevents reads and later responses cannot restore the mode", async () => {
  __resetAccessForTests(); recordAccessMode("canonical"); suspendAccessReads(); recordAccessMode("canonical");
  assert.equal(getAccessState().mode, "unknown"); assert.equal(getAccessState().suspended, true);
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error(); };
  try { await assert.rejects(fetchJSON("/api/portfolio/owners"), error => (error as { status?: number }).status === 401); assert.equal(calls, 0); }
  finally { globalThis.fetch = original; __resetAccessForTests(); }
});

test("cross-tab invalidation removes access and emits the established boundary without token data", async () => {
  const { installAccessLifecycle, ACCESS_CLEAR_KEY } = await import("../../src/features/access/accessLifecycle");
  __resetAccessForTests(); recordAccessMode("canonical");
  const target = new EventTarget(); let events = 0, closed = false;
  target.addEventListener("ecc:session-boundary", () => { events++; });
  const bus = { postMessage: () => {}, close: () => { closed = true; }, onmessage: null as ((event: { data: unknown }) => void) | null };
  const clean = installAccessLifecycle(target as Window, () => bus);
  bus.onmessage!({ data: { type: "clear", id: "logout-notice" } });
  assert.equal(getAccessState().suspended, true); assert.equal(events, 1);
  bus.onmessage!({ data: { type: "clear", id: "logout-notice" } }); assert.equal(events, 1);
  const storage = new Event("storage"); Object.assign(storage, { key: ACCESS_CLEAR_KEY, newValue: "another-notice" }); target.dispatchEvent(storage);
  assert.equal(events, 2);
  clean(); assert.equal(closed, true); __resetAccessForTests();
});
