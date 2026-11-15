import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { UnitCard, LeaseCard } from "../../src/shared/card-contracts";

// ECC-R02: unit/lease card field delivery. Part 1 drives the REAL server/routes/rpc.ts handlers against a loopback fake
// PostgREST (same isolation as rpc-containment.test.ts: no real database, vendor or operating data) and parses the actual
// producer JSON with the REAL consumer contracts. Part 2 pins the contract's own boundary behavior with synthetic payloads.

let tables: Record<string, unknown[]> = {};
let fake: Server;
let api: Server;
let base = "";

before(async () => {
  fake = createServer((req, res) => {
    req.on("data", () => {});
    req.on("end", () => {
      const m = /^\/rest\/v1\/([a-z_]+)/.exec(req.url ?? "");
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(m && m[1] !== "rpc" ? (tables[m[1]] ?? []) : {}));
    });
  });
  await new Promise<void>((r) => fake.listen(0, "127.0.0.1", () => r()));
  process.env.SUPABASE_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-value";
  const { rpc } = await import("../../server/routes/rpc");
  const app = express();
  app.use("/api/rpc", rpc);
  api = await new Promise<Server>((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  base = `http://127.0.0.1:${(api.address() as AddressInfo).port}/api/rpc`;
});
after(() => { api.close(); fake.close(); });

const produce = async (path: string) => {
  const r = await fetch(`${base}${path}`);
  assert.equal(r.status, 200);
  return r.json() as Promise<any>;
};
const unitRow = { id: 7, unit_label: "A-101", beds: 2, baths: 1, sqft: 800, status: "OCCUPIED", property_id: 3 };
const leaseRow = { id: 11, status: "ACTIVE", rent_cents: 125000, unit_id: 7, property_id: 3, tenant_id: 5, start_date: "2026-01-01", end_date: "2026-12-31" };
const seed = (lease: Record<string, unknown> = leaseRow, unit: Record<string, unknown> = unitRow) => {
  tables = {
    units: [unit], leases: [lease],
    properties: [{ id: 3, name: "Maple Court" }], tenants: [{ id: 5, display_name: "R. Tenant" }],
  };
};

// ---- Part 1: real producer shape -> real consumer contract ------------------------------------------------------------

test("producer emits unit `label` and lease `rentCents`/`start`/`end` (the shapes the contract must map)", async () => {
  seed();
  const unit = await produce("/get_unit_card?id=7");
  assert.equal(unit.unit.label, "A-101");
  assert.equal("unit_label" in unit.unit, false);
  assert.equal(unit.lease.rentCents, 125000);
  const lease = await produce("/get_lease_card?id=11");
  assert.deepEqual(
    { rentCents: lease.lease.rentCents, start: lease.lease.start, end: lease.lease.end, hasSnake: "rent_cents" in lease.lease },
    { rentCents: 125000, start: "2026-01-01", end: "2026-12-31", hasSnake: false },
  );
});

test("unit card: the producer's unit label and lease rent reach the parsed card", async () => {
  seed();
  const card = UnitCard.parse(await produce("/get_unit_card?id=7"));
  assert.equal(card.unit.unit_label, "A-101");
  assert.equal(card.lease?.rent_cents, 125000);
  assert.equal(card.property?.id, 3);
});

test("lease card: rent, start and end dates and the unit label reach the parsed card", async () => {
  seed();
  const card = LeaseCard.parse(await produce("/get_lease_card?id=11"));
  assert.equal(card.lease.rent_cents, 125000);
  assert.equal(card.lease.start_date, "2026-01-01");
  assert.equal(card.lease.end_date, "2026-12-31");
  assert.equal(card.unit?.label, "A-101");
  assert.equal(card.tenant?.display_name, "R. Tenant");
});

test("missing lease dates are unknown (null), never an empty or invented date", async () => {
  seed({ ...leaseRow, start_date: null, end_date: null });
  const wire = await produce("/get_lease_card?id=11");
  assert.equal(wire.lease.start, "");
  const card = LeaseCard.parse(wire);
  assert.equal(card.lease.start_date, null);
  assert.equal(card.lease.end_date, null);
});

test("KNOWN PRODUCER DEPENDENCY: server n(rent_cents, 0) turns a missing rent into 0, which the consumer cannot tell from a recorded 0", async () => {
  seed({ ...leaseRow, rent_cents: null });
  const wire = await produce("/get_lease_card?id=11");
  assert.equal(wire.lease.rentCents, 0);
  // The consumer must not guess: a producer-supplied 0 stays 0. Fix belongs to the producer (emit null when absent).
  assert.equal(LeaseCard.parse(wire).lease.rent_cents, 0);
});

// ---- Part 2: contract boundary behavior (synthetic payloads) ------------------------------------------------------------

const lease = (over: Record<string, unknown>) => ({ lease: { id: 1, status: "ACTIVE", ...over } });
const unitCard = (over: Record<string, unknown>) => ({ unit: { id: 1, status: "VACANT", ...over } });

test("canonical shapes still parse unchanged", () => {
  assert.equal(UnitCard.parse(unitCard({ unit_label: "B2" })).unit.unit_label, "B2");
  const c = LeaseCard.parse(lease({ rent_cents: 100, start_date: "2026-02-01", end_date: "2027-01-31" })).lease;
  assert.deepEqual([c.rent_cents, c.start_date, c.end_date], [100, "2026-02-01", "2027-01-31"]);
});

test("unit label: alias maps, absence is empty, conflict is a contract error", () => {
  assert.equal(UnitCard.parse(unitCard({ label: "C3" })).unit.unit_label, "C3");
  assert.equal(UnitCard.parse(unitCard({})).unit.unit_label, "");
  assert.equal(UnitCard.parse(unitCard({ label: "C3", unit_label: "C3" })).unit.unit_label, "C3");
  assert.equal(UnitCard.parse(unitCard({ label: "", unit_label: "C3" })).unit.unit_label, "C3");
  assert.equal(UnitCard.safeParse(unitCard({ label: "C3", unit_label: "D4" })).success, false);
  for (const bad of [5, {}, [], true]) assert.equal(UnitCard.safeParse(unitCard({ label: bad })).success, false);
});

test("rent: cents are non-negative integers; absent/null is unknown; zero is preserved; aliases must agree", () => {
  const rent = (over: Record<string, unknown>) => LeaseCard.parse(lease(over)).lease.rent_cents;
  assert.equal(rent({}), null);
  assert.equal(rent({ rent_cents: null }), null);
  assert.equal(rent({ rentCents: null }), null);
  assert.equal(rent({ rentCents: 0 }), 0);
  assert.equal(rent({ rent_cents: 0 }), 0);
  assert.equal(rent({ rentCents: 95050 }), 95050);
  assert.equal(rent({ rentCents: 95050, rent_cents: 95050 }), 95050);
  assert.equal(rent({ rentCents: null, rent_cents: 700 }), 700);
  for (const bad of [-1, 10.5, NaN, Infinity, "1000", "", true, {}, []]) {
    assert.equal(LeaseCard.safeParse(lease({ rentCents: bad })).success, false, `rentCents ${String(bad)}`);
    assert.equal(LeaseCard.safeParse(lease({ rent_cents: bad })).success, false, `rent_cents ${String(bad)}`);
  }
  assert.equal(LeaseCard.safeParse(lease({ rentCents: 100, rent_cents: 200 })).success, false);
  assert.equal(LeaseCard.safeParse(lease({ rentCents: 0, rent_cents: 100 })).success, false, "0 is a value, not a wildcard");
});

test("unit card lease carries the same rent contract", () => {
  const rent = (over: Record<string, unknown>) => UnitCard.parse({ ...unitCard({}), lease: { id: 2, status: "ACTIVE", ...over } }).lease?.rent_cents;
  assert.equal(rent({ rentCents: 4200 }), 4200);
  assert.equal(rent({}), null);
  assert.equal(rent({ rentCents: 0 }), 0);
  assert.equal(UnitCard.safeParse({ ...unitCard({}), lease: { id: 2, rentCents: 1.5 } }).success, false);
});

test("dates are exact calendar dates; no times, offsets, locale text or invented values", () => {
  const dates = (over: Record<string, unknown>) => { const l = LeaseCard.parse(lease(over)).lease; return [l.start_date, l.end_date]; };
  assert.deepEqual(dates({ start: "2024-02-29", end: "2026-12-31" }), ["2024-02-29", "2026-12-31"]);
  assert.deepEqual(dates({ start_date: "2026-03-01" }), ["2026-03-01", null]);
  assert.deepEqual(dates({ start: "", end: null }), [null, null]);
  assert.deepEqual(dates({ start: "2026-04-01", start_date: "2026-04-01" }), ["2026-04-01", null]);
  assert.deepEqual(dates({ start: "", start_date: "2026-04-01" }), ["2026-04-01", null]);
  for (const bad of ["2026-02-30", "2025-02-29", "2026-13-01", "2026-00-10", "2026-04-31", "2026-1-1", "01/02/2026", "2026-04-01T00:00:00Z", "2026-04-01T00:00:00+00:00", "2026-04-01 ", " ", "today", 20260401, {}, true]) {
    assert.equal(LeaseCard.safeParse(lease({ start: bad })).success, false, `start ${String(bad)}`);
    assert.equal(LeaseCard.safeParse(lease({ end_date: bad })).success, false, `end_date ${String(bad)}`);
  }
  assert.equal(LeaseCard.safeParse(lease({ start: "2026-04-01", start_date: "2026-04-02" })).success, false);
});

test("no passthrough: unmapped and alias keys never reach the parsed card", () => {
  const u = UnitCard.parse({ ...unitCard({ label: "E5", beds: 3, rent_cents: 9 }), lease: { id: 2, status: "ACTIVE", rentCents: 5, secret: "x" }, extra: 1 }) as any;
  assert.deepEqual(Object.keys(u.unit).sort(), ["id", "status", "unit_label"]);
  assert.deepEqual(Object.keys(u.lease).sort(), ["id", "rent_cents", "status"]);
  assert.equal("extra" in u, false);
  const l = LeaseCard.parse({ ...lease({ rentCents: 5, start: "2026-01-01", end: "", balance: 99, notes: "n" }), unit: { id: 9, label: "F6", beds: 1 } }) as any;
  assert.deepEqual(Object.keys(l.lease).sort(), ["end_date", "id", "rent_cents", "start_date", "status"]);
  assert.deepEqual(Object.keys(l.unit).sort(), ["id", "label"]);
});

test("identity validation is unchanged: ids stay required numbers and unit/lease/tenant/property stay nullable", () => {
  assert.equal(UnitCard.safeParse({ unit: { label: "x" } }).success, false);
  assert.equal(UnitCard.safeParse({ unit: { id: "7", label: "x" } }).success, false);
  assert.equal(LeaseCard.safeParse({ lease: { rentCents: 1 } }).success, false);
  assert.equal(LeaseCard.safeParse({ lease: { id: "1" } }).success, false);
  const none = LeaseCard.parse(lease({}));
  assert.deepEqual([none.unit, none.tenant, none.property], [null, null, null]);
  assert.equal(UnitCard.parse(unitCard({})).lease, null);
  assert.equal(LeaseCard.safeParse({ ...lease({}), unit: { label: "no id" } }).success, false);
});

test("lease unit label is optional text; other unit fields are not delivered", () => {
  assert.equal(LeaseCard.parse({ ...lease({}), unit: { id: 4 } }).unit?.label, "");
  assert.equal(LeaseCard.safeParse({ ...lease({}), unit: { id: 4, label: 9 } }).success, false);
});
