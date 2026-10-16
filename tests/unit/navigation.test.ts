import { test } from "node:test";
import assert from "node:assert/strict";
import { HIDDEN_ROUTES, NAV_SECTIONS, PLANNED_DESTINATIONS, activeSectionTitle, isPathActive, navLeafPaths } from "../../src/config/navigation";
import navConfig from "../../src/components/layout/navConfig";
import { appRoutePatterns, read, routeExists } from "./helpers";

test("every visible nav link resolves to a registered route (no 404 links)", () => {
  const patterns = appRoutePatterns();
  assert.ok(patterns.length > 10, "expected to parse routes from App.tsx");
  for (const p of navLeafPaths()) {
    assert.ok(routeExists(p, patterns), `nav link ${p} has no matching <Route> in App.tsx`);
  }
});

test("nav paths are unique and sections are non-empty", () => {
  const paths = navLeafPaths();
  assert.equal(new Set(paths).size, paths.length, "duplicate nav path");
  for (const s of NAV_SECTIONS) {
    assert.ok(s.path || s.children?.length, `section ${s.title} has neither path nor children`);
    assert.ok(!(s.path && s.children?.length), `section ${s.title} must be a link or a group, not both`);
  }
});

test("unbuilt destinations are never linked or routed", () => {
  const linked = new Set(navLeafPaths());
  const patterns = appRoutePatterns();
  assert.ok(PLANNED_DESTINATIONS.length > 30);
  for (const d of PLANNED_DESTINATIONS) {
    assert.ok(!linked.has(d.path), `${d.path} is planned but linked`);
    assert.ok(!routeExists(d.path, patterns), `${d.path} is planned but routed to a stub page`);
    assert.ok(d.dependency.length > 10, `${d.path} needs a dependency note`);
  }
});

test("hidden routes (Admin, owner transfer) are real routes but never linked", () => {
  const linked = new Set(navLeafPaths());
  for (const h of HIDDEN_ROUTES) {
    assert.ok(routeExists(h.path), `${h.path} is listed as hidden but is not a registered route`);
    assert.ok(!linked.has(h.path), `${h.path} is hidden but linked`);
    assert.ok(h.reason.length > 20);
  }
  for (const p of navLeafPaths()) assert.ok(!p.startsWith("/admin"), `${p} exposes Admin`);
});

test("Sidebar consumes the single navigation source and defines no nav of its own", () => {
  const sidebar = read("src/components/Sidebar.tsx");
  assert.match(sidebar, /from "@\/config\/navigation"/);
  assert.doesNotMatch(sidebar, /const NAV\b|const NAV:/);
});

test("legacy navConfig is a derived view of the single source", () => {
  assert.deepEqual(navConfig.items.map((i) => i.to), navLeafPaths());
});

test("active matching is segment-aware and longest-match wins", () => {
  assert.equal(isPathActive("/data", "/data"), true);
  assert.equal(isPathActive("/data/x", "/data"), true);
  assert.equal(isPathActive("/database", "/data"), false);
  assert.equal(activeSectionTitle("/owners/transfer"), null);
  assert.equal(activeSectionTitle("/portfolio/properties/12"), "Portfolio");
  assert.equal(activeSectionTitle("/reports/saved"), "Reports");
  assert.equal(activeSectionTitle("/nope"), null);
});

test("command palette targets all resolve to routes", () => {
  const src = read("src/features/command-surface/EccCommandPalette.tsx");
  const targets = [...src.matchAll(/(?:path:|\?\?)\s*"(\/[^"]*)"/g)].map((m) => m[1]);
  assert.ok(targets.length >= 3, `expected >=3 palette targets, got ${targets.length}`);
  assert.ok(!targets.some((t) => t.startsWith("/integrations/")), "palette must not link unbuilt integrations");
  for (const t of targets) assert.ok(routeExists(t), `palette target ${t} has no route`);
});

test("property and unit rows link to registered card routes", () => {
  assert.ok(routeExists("/card/property/12"));
  assert.ok(routeExists("/card/unit/12"));
});

test("the full destination inventory is visible without inventing working routes", () => {
  const displayed = NAV_SECTIONS.flatMap((section) => section.children ?? []);
  for (const destination of PLANNED_DESTINATIONS) {
    const item = displayed.find((candidate) => candidate.path === destination.path);
    assert.ok(item, `missing navigation destination ${destination.path}`);
    assert.equal(item.unavailable, true);
  }
  assert.ok(navLeafPaths().includes("/ops/operations"));
  assert.equal(activeSectionTitle("/ops/operations"), "Operations");
  assert.equal(new Set(NAV_SECTIONS.map((section) => section.title)).size, NAV_SECTIONS.length);
});
