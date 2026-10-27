import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Leases list exposes a labeled search control wired to the existing filter", () => {
  const src = readFileSync("src/pages/portfolio/Leases.tsx", "utf8");
  assert.match(src, /htmlFor="leases-search"/);
  assert.match(src, /aria-label="Search leases"/);
  assert.match(src, /value=\{q\}/);
  assert.match(src, /onChange=\{\(e\) => setQ\(e\.target\.value\)\}/);
  assert.match(src, /leases-list\.css/);
});

test("Leases search style keeps a 44px target and visible focus", () => {
  const css = readFileSync("src/pages/portfolio/leases/leases-list.css", "utf8");
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /outline:\s*2px solid #d4af37/);
  assert.match(css, /max-width:\s*420px/);
  assert.doesNotMatch(css, /orange|#ff/i);
});
