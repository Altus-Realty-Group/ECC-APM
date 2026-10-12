import { test } from "node:test";
import assert from "node:assert/strict";
import { read } from "./helpers";

function rule(css: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|\\n|,)\\s*${esc}\\s*(?:,[^{]*)?\\{([^}]*)\\}`).exec(css);
  assert.ok(m, `no rule for ${selector}`);
  return m![1];
}

test("navigation and table controls are at least 44px", () => {
  const app = read("src/styles/app.css");
  for (const sel of [".ecc-nav-row", ".ecc-child", ".ecc-flyout-item", ".ecc-pin", ".ecc-touch"]) {
    assert.match(rule(app, sel), /min-height:\s*44px/, `${sel} must be >= 44px tall`);
  }
  assert.match(rule(app, ".ecc-touch"), /min-width:\s*44px/);
  const cs = read("src/styles/command-surface.css");
  assert.match(rule(cs, ".ecc-hit"), /min-height:\s*44px/);
  assert.match(rule(cs, ".ecc-hit"), /min-width:\s*44px/);
  assert.match(rule(cs, ".ecc-command-row-link"), /min-height:\s*44px/);
});

test("flyout is fixed-positioned from code, not left unpositioned", () => {
  assert.match(read("src/components/Sidebar.tsx"), /position:\s*"fixed"/);
});

test("palette has no orange; gold is not used as body text color in the new state styles", () => {
  const app = read("src/styles/app.css");
  const tail = app.slice(app.indexOf("Shared operator-state"));
  assert.doesNotMatch(tail, /orange|#ff8|#f60|#ffa/i);
  for (const sel of [".ecc-state__title", ".ecc-state__detail", ".ecc-kpi-card__value", ".ecc-kpi-card__label", ".ecc-kpi-card__note", ".ecc-muted"]) {
    assert.doesNotMatch(rule(app, sel), /gold/, `${sel} must not use gold text`);
  }
});

test("focus is visible on keyboard targets", () => {
  const app = read("src/styles/app.css");
  assert.match(app, /\.ecc-nav-row:focus-visible[\s\S]*outline:\s*2px solid var\(--gold\)/);
});

test("main content is not offset twice (flex row already places it beside the rail)", () => {
  const app = read("src/styles/app.css");
  assert.doesNotMatch(app, /\.ecc-main\s*(?:,[^{]*)?\{[^}]*margin-left/, ".ecc-main must not add margin-left");
  assert.doesNotMatch(app, /\.ecc-sidebar[^{]*~?\s*\+?\s*\.ecc-main\s*\{[^}]*margin-left/);
});
