import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Tenants and Owners expose labeled search controls without using shared FilterBar", () => {
  for (const [file, id, label] of [
    ["src/pages/portfolio/Tenants.tsx", "tenants-search", "Search tenants"],
    ["src/pages/portfolio/Owners.tsx", "owners-search", "Search owners"],
  ] as const) {
    const src = readFileSync(file, "utf8");
    assert.match(src, new RegExp(`htmlFor="${id}"`));
    assert.match(src, new RegExp(`aria-label="${label}"`));
    assert.match(src, /list-search\.css/);
    assert.doesNotMatch(src, /FilterBar/);
  }
});

test("list search style keeps a 44px target and gold focus", () => {
  const css = readFileSync("src/pages/portfolio/styles/list-search.css", "utf8");
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /outline:\s*2px solid #d4af37/);
  assert.doesNotMatch(css, /orange|#ff6|#ff8|#ffa|#ffb/i);
});
