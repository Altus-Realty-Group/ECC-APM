import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Router, Route, Switch, Link, useRoute } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { PropertyCardDTO } from "../../src/lib/dto.ts";
import PrefetchLink from "../../src/components/cardkit/PrefetchLink.tsx";

test("prefetch links retain both URL forms and child anchors", () => {
  const client = new QueryClient();
  for (const props of [{to: "/card/property/17"}, {href: "/card/property/17"}, {href: "/card/property/17", asChild: true}]) {
    const child = props.asChild ? createElement("a", {"data-child": "yes"}, "Open") : "Open";
    const html = renderToString(createElement(QueryClientProvider, {client},
      createElement(Router, {ssrPath: "/"}, createElement(PrefetchLink, props, child))));
    assert.ok(html.includes('href="/card/property/17"'));
    assert.equal((html.match(/<a /g) || []).length, 1);
    if (props.asChild) assert.ok(html.includes('data-child="yes"'));
  }
  client.clear();
});

test("actual DTO still distinguishes missing, null and zero money", () => {
  const base = {property: {id: 17}, kpis: {units: 0, activeLeases: 0, occupancyPct: 0, avgRentCents: null}};
  assert.equal(PropertyCardDTO.parse(base).kpis.avgRentCents, null);
  assert.equal(PropertyCardDTO.parse({...base, kpis: {...base.kpis, avgRentCents: 0}}).kpis.avgRentCents, 0);
  assert.equal(PropertyCardDTO.safeParse({...base, kpis: {...base.kpis, avgRentCents: "0"}}).success, false);
  assert.equal(PropertyCardDTO.safeParse({...base, property: {id: "17"}}).success, false);
  assert.equal(PropertyCardDTO.safeParse({...base, property: null}).success, false);
});

test("Wouter preserves each active App route and entity parameter", () => {
  const source = readFileSync(new URL("../../src/App.tsx", import.meta.url), "utf8");
  const patterns = [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1]);
  assert.ok(patterns.length > 10, "must exercise the real route inventory");
  for (const pattern of patterns) {
    const path = pattern.replace(":id", "17");
    function Probe() {
      const [match, params] = useRoute(pattern);
      assert.equal(match, true, pattern);
      if (pattern.includes(":id")) assert.equal(params.id, "17", pattern);
      return createElement(Link, {href: path}, pattern);
    }
    const html = renderToString(createElement(Router, {ssrPath: path},
      createElement(Switch, null,
        createElement(Route, {path: pattern, component: Probe}),
        createElement(Route, null, "NO_MATCH"))));
    assert.ok(!html.includes("NO_MATCH"), pattern);
    assert.ok(html.includes('href="' + path + '"'), pattern);
  }
  const html = renderToString(createElement(Router, {ssrPath: "/not-a-real-route"},
    createElement(Switch, null,
      createElement(Route, {path: "/portfolio/properties"}, "MATCH"),
      createElement(Route, null, "NO_MATCH"))));
  assert.ok(html.includes("NO_MATCH"));
});

test("query invalidation rereads and clear removes cached data", async () => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  const key = ["dependency-regression"];
  let reads = 0;
  const query = {queryKey: key, queryFn: async () => ++reads, staleTime: Infinity};
  assert.equal(await client.fetchQuery(query), 1);
  assert.equal(await client.fetchQuery(query), 1);
  await client.invalidateQueries({queryKey: key});
  assert.equal(await client.fetchQuery(query), 2);
  client.clear();
  assert.equal(client.getQueryData(key), undefined);
});

test("Playwright test, core and browser tooling stay aligned", () => {
  const require = createRequire(import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.dependencies.playwright, manifest.dependencies["@playwright/test"]);
  assert.equal(require("playwright/package.json").version, require("@playwright/test/package.json").version);
  assert.equal(require("playwright/package.json").version, require("playwright-core/package.json").version);
});


// Source-only ORM compatibility: compile queries, never execute a database call.
test("declared schema retains primary/FK, array and decimal metadata", async () => {
  const schema = await import("../../shared/schema.ts");
  const {getTableConfig} = await import("drizzle-orm/pg-core");
  for (const key of ["properties", "units", "leases", "tenants", "owners", "workorders", "geocodeCache", "ownerTransfers", "ownerTransferSnapshots", "auditEvents"]) {
    const cfg = getTableConfig(schema[key]);
    assert.ok(cfg.columns.some(c => c.name === "id" && c.primary), key);
  }
  const refs = getTableConfig(schema.units).foreignKeys.map(f => f.reference());
  assert.ok(refs.some(r => r.columns[0].name === "property_id" && getTableConfig(r.foreignTable).name === "properties"));
  assert.match(schema.properties.lat.getSQLType(), /^numeric\(10,\s*8\)$/);
  assert.match(schema.units.marketRent.getSQLType(), /^numeric\(10,\s*2\)$/);
  assert.equal(schema.ownerTransfers.property_ids.getSQLType(), "text[]");
});

test("actual drizzle-zod insert/status validators retain null/type constraints", async () => {
  const s = await import("../../shared/schema.ts");
  assert.equal(s.insertPropertySchema.safeParse({name: "isolated schema fixture", lat: "41.12345678"}).success, true);
  assert.equal(s.insertPropertySchema.safeParse({name: "isolated schema fixture", lat: 41.12}).success, false);
  assert.equal(s.insertOwnerTransferSchema.safeParse({property_ids: ["17"], new_owner_id: 3}).success, true);
  assert.equal(s.insertOwnerTransferSchema.safeParse({property_ids: [17]}).success, false);
  assert.equal(s.insertAuditEventSchema.safeParse({}).success, false);
  assert.equal(s.ownerTransferStatusSchema.safeParse({transfer_id: 0, new_status: "COMPLETE"}).success, false);
  assert.equal(s.ownerTransferStatusSchema.safeParse({transfer_id: 17, new_status: "not-a-status"}).success, false);
});

test("actual PostgreSQL query compilation keeps untrusted values parameterized", async () => {
  const {drizzle} = await import("drizzle-orm/pg-proxy");
  const {eq} = await import("drizzle-orm");
  const {properties, units} = await import("../../shared/schema.ts");
  let calls = 0;
  const db = drizzle(async () => {calls++; throw new Error("No database execution permitted");});
  const fixture = "schema-fixture'; DROP TABLE properties; --";
  const select = db.select({id: properties.id, unitId: units.id})
    .from(properties).leftJoin(units, eq(units.property_id, properties.id))
    .where(eq(properties.name, fixture)).limit(2).toSQL();
  assert.ok(select.sql.includes("left join"));
  assert.ok(!select.sql.includes(fixture));
  assert.ok(select.params.includes(fixture));
  const insert = db.insert(properties).values({name: fixture, active: false, lat: null}).toSQL();
  assert.ok(!insert.sql.includes(fixture));
  assert.ok(insert.params.includes(fixture));
  assert.ok(insert.params.includes(false));
  assert.equal(calls, 0, "compatibility check must not read/write a database");
});
