import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPropertyActive } from "../../server/lib/mapping.ts";

test("string false is not coerced to true", () => {
  assert.equal(mapPropertyActive({ active: "false" as any }), null);
});

test("canonical false wins over legacy true", () => {
  assert.equal(mapPropertyActive({ active: false, is_active: true }), false);
});

test("canonical true wins over legacy false", () => {
  assert.equal(mapPropertyActive({ active: true, is_active: false }), true);
});

test("legacy only when canonical absent and exact boolean", () => {
  assert.equal(mapPropertyActive({ is_active: true }), true);
  assert.equal(mapPropertyActive({ is_active: false }), false);
  assert.equal(mapPropertyActive({ is_active: "true" as any }), null);
});

test("absent or null canonical is unavailable", () => {
  assert.equal(mapPropertyActive({}), null);
  assert.equal(mapPropertyActive({ active: null }), null);
});

test("malformed values are unavailable", () => {
  assert.equal(mapPropertyActive({ active: 1 as any }), null);
  assert.equal(mapPropertyActive({ active: {} as any }), null);
});

test("does not mutate input", () => {
  const src = { active: false, is_active: true };
  const snap = { ...src };
  mapPropertyActive(src);
  assert.deepEqual(src, snap);
});
