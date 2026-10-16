import { test } from "node:test";
import assert from "node:assert/strict";
import { mapAddress } from "../../server/lib/mapping.ts";

test("prefers canonical over conflicting legacy alias", () => {
  const src = {
    address_city: "CanonicalCity",
    city: "LegacyCity",
    address_street1: "100 Canonical St",
    address1: "999 Legacy Ave",
  };
  const m = mapAddress(src);
  assert.equal(m.city, "CanonicalCity");
  assert.equal(m.street1, "100 Canonical St");
});

test("uses legacy only when canonical key is absent", () => {
  const src = { city: "LegacyOnly", street_1: "Legacy St" };
  const m = mapAddress(src);
  assert.equal(m.city, "LegacyOnly");
  assert.equal(m.street1, "Legacy St");
});

test("treats explicit null/empty canonical as unavailable and does not fall back", () => {
  const src = { address_city: null, city: "ShouldNotAppear", address_street1: "", address1: "Hidden" };
  const m = mapAddress(src);
  assert.equal(m.city, null);
  assert.equal(m.street1, null);
});

test("does not coerce malformed values", () => {
  const src = { address_city: 123 as any, city: "Legacy" };
  const m = mapAddress(src);
  assert.equal(m.city, null);
});

test("does not mutate input", () => {
  const src = { address_city: "A", city: "B" };
  const snap = { ...src };
  mapAddress(src);
  assert.deepEqual(src, snap);
});

test("preserves wire shape keys", () => {
  const m = mapAddress({});
  assert.deepEqual(Object.keys(m).sort(), ["city", "state", "street1", "zip"]);
});
