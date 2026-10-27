import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import WorkspaceBar from "../../src/components/layout/WorkspaceBar";
import { HIDDEN_ROUTES, NAV_SECTIONS, navLeafPaths, PLANNED_DESTINATIONS } from "../../src/config/navigation";
import { OccupancyPosition } from "../../src/features/dashboard/components/CommandCenterPanels";

test("workspace page switcher includes every implemented navigation destination and excludes hidden or unbuilt routes", () => {
  const html = renderToStaticMarkup(<Router ssrPath="/portfolio/units"><WorkspaceBar /></Router>);
  for (const path of navLeafPaths(NAV_SECTIONS)) assert.ok(html.includes(`value="${path}"`), path);
  for (const { path } of [...HIDDEN_ROUTES, ...PLANNED_DESTINATIONS]) assert.ok(!html.includes(`value="${path}"`), path);
  assert.match(html, /value="\/portfolio\/units" selected=""/);
  assert.match(html, /Portfolio \/ Units/);
});

test("occupancy visual distinguishes an unreported rate from confirmed zero and preserves fractional percentages", () => {
  const render = (rate: number | null) => renderToStaticMarkup(<Router ssrPath="/dashboard"><OccupancyPosition rate={rate} /></Router>);
  assert.doesNotMatch(render(null), /role="img"|0\.0%/);
  assert.match(render(null), /Occupancy is unavailable/);
  assert.match(render(0), /Reported occupancy 0\.0 percent/);
  assert.match(render(.925), /Reported occupancy 92\.5 percent/);
  assert.match(render(.925), /stroke-dasharray="92\.5 7\.5"/);
});
