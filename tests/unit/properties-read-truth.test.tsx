import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { PropertiesSurface } from "../../src/pages/portfolio/Properties";

type Query = React.ComponentProps<typeof PropertiesSurface>["query"];
const property = { id: 42, name: "Verified property", city: "Gary", units: 4, occPct: 75 };
function render(overrides: Partial<Query> = {}) {
  const query = {
    data: undefined, isLoading: false, isFetching: false, isError: false, isSuccess: false,
    error: null, refetch: async () => ({}), ...overrides,
  } as Query;
  return renderToStaticMarkup(<Router ssrPath="/portfolio/properties"><PropertiesSurface query={query} /></Router>);
}
function noVerifiedSummary(html: string) {
  assert.doesNotMatch(html, /\d+ loaded|Markets:|visible rows?|avg occupancy|\d+ selected|Selected IDs:/);
  assert.doesNotMatch(html, /No properties were returned|Select all visible|Select properties from the table/);
  assert.doesNotMatch(html, /Verified property|\/card\/property\/42|type="checkbox"/);
  assert.match(html, /Selection review is unavailable/);
}

test("Properties failed read shows failure without successful-empty counts", () => {
  const html = render({ isError: true, error: new Error("HTTP 503") });
  assert.match(html, /Properties could not be loaded/);
  assert.match(html, />Retry</);
  noVerifiedSummary(html);
});

test("Properties failed refresh suppresses cached rows and their portfolio summaries", () => {
  const html = render({ data: [property], isError: true, error: new Error("HTTP 503") });
  assert.match(html, /Properties could not be loaded/);
  noVerifiedSummary(html);
});

test("Properties denial suppresses cached rows and selection controls", () => {
  for (const status of [401, 403]) {
    const html = render({ data: [property], isError: true, error: Object.assign(new Error("Denied"), { status }) });
    assert.match(html, /access to properties/);
    assert.match(html, />Retry</);
    noVerifiedSummary(html);
  }
});

test("Properties initial loading and active refresh cannot imply confirmed counts", () => {
  for (const state of [
    { isLoading: true, isFetching: true },
    { data: [property], isSuccess: true, isFetching: true },
  ]) {
    const html = render(state);
    assert.match(html, /Loading properties/);
    noVerifiedSummary(html);
  }
});

test("Properties unresolved or paused read does not become a confirmed empty portfolio", () => {
  const html = render();
  assert.match(html, /Properties have not been confirmed/);
  noVerifiedSummary(html);
});

test("Properties completed successful empty read preserves confirmed zero and empty state", () => {
  const html = render({ data: [], isSuccess: true });
  assert.match(html, /0 loaded/);
  assert.match(html, /Markets: 0/);
  assert.match(html, /0 visible rows/);
  assert.match(html, /No properties were returned/);
  assert.doesNotMatch(html, /could not be loaded|have not been confirmed|Selection review is unavailable/);
});

test("Properties completed populated read preserves source counts, metrics and card links", () => {
  const html = render({ data: [property], isSuccess: true });
  assert.match(html, /1 loaded/);
  assert.match(html, /Markets: 1/);
  assert.match(html, /75% avg occupancy/);
  assert.match(html, /Verified property/);
  assert.match(html, /href="\/card\/property\/42"/);
  assert.match(html, /1 visible row/);
  assert.match(html, /type="checkbox"/);
});


test("Properties accepts only finite occupancy percentages within zero to one hundred", () => {
  for (const occPct of [0, 100]) {
    const html = render({ data: [{ ...property, occPct }], isSuccess: true });
    assert.match(html, new RegExp(`${occPct}% avg occupancy`));
  }
  for (const occPct of [null, undefined, -1, 101, NaN, Infinity, "75"]) {
    const html = render({ data: [{ ...property, occPct }], isSuccess: true });
    assert.doesNotMatch(html, /avg occupancy|NaN%|Infinity%|101%|-1%/);
  }
});
