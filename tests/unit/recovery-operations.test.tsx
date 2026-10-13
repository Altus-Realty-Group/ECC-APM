import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { ContractError } from "../../src/lib/dataState";
import { StaleSessionError } from "../../src/lib/sessionScope";
import {
  type LedgerEntry, type LegalCase,
  parseCents, parseDateOnly, parseLegalCase, parseWorkOrder, parseLedgerEntry, parseCollection,
  summarizeLedger, groupLedgerByLease, formatCents, formatDateOnly,
} from "../../src/lib/recovery/operationsContracts";
import { OPERATIONS_CONTRACTS, loadDomain, resolveDomain } from "../../src/lib/recovery/operationsRegistry";
import { LegalCasesTable, WorkOrdersTable, LedgerView } from "../../src/features/recovery/operations/OperationsViews";
import OperationsRecoveryPage, { DomainPanel } from "../../src/features/recovery/operations/OperationsRecoveryPage";
import { ROOT, read } from "./helpers";

// SOURCE FIXTURES ONLY. These rows are invented to exercise the adapters; they are NOT live-data proof and
// no current ECC backend serves these shapes yet.
const ledger = (o: object) => ({ id: "e1", leaseId: "L1", kind: "charge", postedOn: "2026-03-05", amountCents: 150000, ...o });

test("cents are integers only; floats, strings and NaN are rejected as null", () => {
  assert.equal(parseCents(150000), 150000);
  for (const bad of [1500.5, "1500", NaN, Infinity, null, undefined, 2 ** 60]) assert.equal(parseCents(bad), null);
});

test("date-only values never shift and impossible dates are rejected", () => {
  assert.equal(parseDateOnly("2026-03-05"), "2026-03-05");
  assert.equal(parseDateOnly("2026-02-30"), null);
  assert.equal(parseDateOnly("03/05/2026"), null);
  assert.equal(formatDateOnly("2026-03-05"), "Mar 5, 2026");
  assert.equal(formatDateOnly(null), "—");
});

test("missing money is null, never $0.00; a recorded zero stays zero", () => {
  const w = parseWorkOrder({ id: 1, description: "Leak", actualCostCents: 0 });
  assert.equal(w.actualCostCents, 0);
  assert.equal(w.estimatedCostCents, null);
  assert.equal(formatCents(null), "—");
  assert.equal(formatCents(0), "$0.00");
  const c = parseLegalCase({ id: "c1" });
  assert.equal(c.amountClaimedCents, null);
  assert.equal(c.status, "unknown");
});

test("present-but-malformed money or ids reject the row", () => {
  assert.throws(() => parseLegalCase({ id: "c1", amountClaimedCents: "12.50" }), ContractError);
  assert.throws(() => parseLegalCase({ id: "" }), ContractError);
  assert.throws(() => parseWorkOrder({ id: 1, description: "" }), ContractError);
  assert.throws(() => parseLedgerEntry(ledger({ kind: "rent" })), ContractError);
  assert.throws(() => parseLedgerEntry(ledger({ amountCents: 12.5 })), ContractError);
  assert.throws(() => parseLedgerEntry(ledger({ kind: "payment", amountCents: -100 })), ContractError);
  assert.throws(() => parseLedgerEntry(ledger({ postedOn: "yesterday" })), ContractError);
});

test("collections require the {data: []} envelope and unique ids", () => {
  assert.throws(() => parseCollection([], parseLegalCase), ContractError);
  assert.throws(() => parseCollection({ data: "x" }, parseLegalCase), ContractError);
  assert.throws(() => parseCollection({ data: [{ id: "a" }, { id: "a" }] }, parseLegalCase), ContractError);
  assert.deepEqual(parseCollection({ data: [] }, parseLegalCase), []);
});

test("ledger totals come only from recorded entries; empty is unknown, not zero", () => {
  assert.equal(summarizeLedger([]), null);
  const entries = [
    parseLedgerEntry(ledger({ id: "a", amountCents: 150000 })),
    parseLedgerEntry(ledger({ id: "b", kind: "payment", amountCents: 50000 })),
    parseLedgerEntry(ledger({ id: "c", kind: "adjustment", amountCents: -2500 })),
  ];
  const s = summarizeLedger(entries);
  assert.equal(s?.balanceCents, 150000 - 2500 - 50000);
});

test("every operations domain is gated and an unverified domain makes no request", async () => {
  for (const c of Object.values(OPERATIONS_CONTRACTS)) assert.equal(c.status, "unverified", c.domain);
  let calls = 0;
  const r = await loadDomain("legalCases", (p) => parseCollection(p, parseLegalCase), {
    fetcher: async () => { calls++; return { data: [] }; },
  });
  assert.equal(r.state, "unavailable");
  assert.equal(calls, 0);
});

test("a verified contract is fetched from its declared endpoint and parsed strictly", async () => {
  const contracts = { ...OPERATIONS_CONTRACTS, legalCases: { ...OPERATIONS_CONTRACTS.legalCases, status: "verified" as const, endpoint: "/api/test/legal" } };
  let seen = "";
  const r = await loadDomain("legalCases", (p) => parseCollection(p, parseLegalCase), {
    contracts, fetcher: async (p) => { seen = p; return { data: [{ id: "c1", type: "Eviction", status: "Open" }] }; },
  });
  assert.equal(seen, "/api/test/legal");
  assert.equal(r.state === "ready" && r.rows[0].type, "Eviction");
  await assert.rejects(loadDomain("legalCases", (p) => parseCollection(p, parseLegalCase), { contracts, fetcher: async () => ({ data: [{}] }) }), ContractError);
  const noEndpoint = { ...contracts, legalCases: { ...contracts.legalCases, endpoint: undefined } };
  await assert.rejects(loadDomain("legalCases", (p) => parseCollection(p, parseLegalCase), { contracts: noEndpoint, fetcher: async () => ({}) }));
});

test("views render fixtures honestly: dashes for unknown, no mutation controls", () => {
  const legal = renderToStaticMarkup(<LegalCasesTable rows={[parseLegalCase({ id: "c1", type: "Eviction", status: "Filed", filedDate: "2026-03-05" })]} />);
  assert.match(legal, /Mar 5, 2026/);
  assert.doesNotMatch(legal, /\$0\.00/);
  const wo = renderToStaticMarkup(<WorkOrdersTable rows={[parseWorkOrder({ id: 1, description: "Leak", status: "CANCELLED" })]} />);
  assert.match(wo, /CANCELLED/);
  const led = renderToStaticMarkup(<LedgerView entries={[parseLedgerEntry(ledger({}))]} />);
  assert.match(led, /\$1,500\.00/);
  assert.match(renderToStaticMarkup(<LedgerView entries={[]} />), /unknown, not \$0\.00/);
  for (const html of [legal, wo, led]) assert.doesNotMatch(html, /<button|<form|<input/);
});

test("the recovery page states each gate in plain language and offers no actions", () => {
  const html = renderToStaticMarkup(<OperationsRecoveryPage />);
  // Static render = first paint: every domain is loading until its (zero-request) resolution settles.
  for (const d of ["legalCases", "workOrders", "ledgerEntries"]) assert.match(html, new RegExp(`ops-section-${d}`));
  assert.doesNotMatch(html, /<button|<form|<input|<main/);
  for (const c of Object.values(OPERATIONS_CONTRACTS)) {
    const gate = renderToStaticMarkup(<DomainPanel domain={c.domain} label={c.label} state={{ state: "unavailable", contract: c }}>{() => null}</DomainPanel>);
    assert.match(gate, new RegExp(`ops-gate-${c.domain}`));
    assert.match(gate, /not available yet/);
    assert.doesNotMatch(gate, TECHNICAL_COPY, c.domain);
  }
});

const TECHNICAL_COPY = /backend|contract|idempoten|endpoint|\/api\/|route|schema|HTTP \d|integer cents|authorization|audit|503/i;

test("domain panels render loading, denied, error (with retry), empty and ready without technical copy", () => {
  const render = (state: Parameters<typeof DomainPanel<LegalCase>>[0]["state"], onRetry?: () => void) =>
    renderToStaticMarkup(<DomainPanel domain="legalCases" label="Legal cases" state={state} onRetry={onRetry}>{(rows) => <LegalCasesTable rows={rows} />}</DomainPanel>);
  const loading = render({ state: "loading" });
  assert.match(loading, /ops-loading-legalCases/);
  assert.match(loading, /aria-busy="true"/);
  const denied = render({ state: "denied" });
  assert.match(denied, /ops-denied-legalCases/);
  assert.match(denied, /role="alert"/);
  assert.doesNotMatch(denied, /<table/);
  const err = render({ state: "error" }, () => {});
  assert.match(err, /ops-error-legalCases/);
  assert.match(err, /Retry/);
  assert.doesNotMatch(err, /No legal cases recorded/, "a failure is never an empty list");
  const empty = render({ state: "ready", rows: [] });
  assert.match(empty, /ops-legal-empty/);
  const ready = render({ state: "ready", rows: [parseLegalCase({ id: "c1", type: "Eviction", status: "Open" })] });
  assert.match(ready, /ops-legal-table/);
  for (const html of [loading, denied, err, empty, ready]) assert.doesNotMatch(html, TECHNICAL_COPY);
});

test("resolveDomain maps failures to denied/error, drops aborted and stale results, and never requests unverified domains", async () => {
  const contracts = { ...OPERATIONS_CONTRACTS, legalCases: { ...OPERATIONS_CONTRACTS.legalCases, status: "verified" as const, endpoint: "/api/test/legal" } };
  const parse = (p: unknown) => parseCollection(p, parseLegalCase);
  const run = (fetcher: () => Promise<unknown>, signal?: AbortSignal) => resolveDomain("legalCases", parse, { contracts, fetcher, signal });
  assert.deepEqual(await run(async () => { throw Object.assign(new Error("HTTP 403"), { status: 403 }); }), { state: "denied" });
  assert.deepEqual(await run(async () => { throw new Error("HTTP 500"); }), { state: "error" });
  assert.deepEqual(await run(async () => ({ data: [{}] })), { state: "error" });
  assert.deepEqual(await run(async () => ({ data: [] })), { state: "ready", rows: [] });
  const ctl = new AbortController();
  ctl.abort();
  assert.equal(await run(async () => { throw new Error("aborted"); }, ctl.signal), null);
  assert.equal(await run(async () => { throw new StaleSessionError(); }), null);
  let calls = 0;
  const gate = await resolveDomain("workOrders", parseCollection.bind(null) as never, { contracts, fetcher: async () => { calls++; return {}; } });
  assert.equal(gate?.state, "unavailable");
  assert.equal(calls, 0);
});

test("ledger summaries are per lease: mixed leases are rejected, grouping keeps leases apart", () => {
  const a = parseLedgerEntry(ledger({ id: "a", leaseId: "L1", amountCents: 100000 }));
  const b = parseLedgerEntry(ledger({ id: "b", leaseId: "L2", kind: "payment", amountCents: 100000 }));
  assert.throws(() => summarizeLedger([a, b]), ContractError);
  const groups = groupLedgerByLease([a, b]);
  assert.deepEqual(groups.map((g) => [g.leaseId, g.summary.balanceCents]), [["L1", 100000], ["L2", -100000]]);
  const html = renderToStaticMarkup(<LedgerView entries={[a, b]} />);
  assert.equal((html.match(/ops-ledger-lease/g) ?? []).length, 2);
  assert.match(html, /Lease L1/);
  assert.match(html, /Lease L2/);
});

test("ledger overflow is caught per accumulator even when signed values cancel in a combined sum", () => {
  const MAX = Number.MAX_SAFE_INTEGER;
  const e = (id: string, kind: LedgerEntry["kind"], amountCents: number): LedgerEntry =>
    ({ id, leaseId: "L1", kind, postedOn: "2026-03-05", amountCents, memo: null });
  // charges reach MAX+5 (unsafe) while the old combined check saw (MAX+5)+(-5) = MAX and passed.
  assert.throws(() => summarizeLedger([e("a", "adjustment", -5), e("b", "charge", MAX), e("c", "charge", 5)]), ContractError);
  assert.throws(() => summarizeLedger([e("a", "payment", MAX), e("b", "payment", 5), e("c", "adjustment", 5)]), ContractError);
  // accumulators are safe individually but the final balance is not
  assert.throws(() => summarizeLedger([e("a", "charge", MAX), e("b", "adjustment", MAX)]), ContractError);
  assert.throws(() => summarizeLedger([e("a", "payment", MAX), e("b", "credit", MAX)]), ContractError);
  // a large but safe ledger is still summarized exactly
  assert.equal(summarizeLedger([e("a", "charge", MAX), e("b", "payment", MAX)])?.balanceCents, 0);
});

test("recovered sources stay inside guardrails", () => {
  const files: string[] = [];
  for (const dir of ["src/features/recovery/operations", "src/lib/recovery"]) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) files.push(`${dir}/${f}`);
  }
  assert.ok(files.length >= 5);
  for (const f of files) {
    const src = read(f);
    assert.doesNotMatch(src, /import\.meta\.env\.VITE_|console\.log|Math\.random|parseFloat\(|\|\| 0\b|method:\s*["'](?:POST|PUT|PATCH|DELETE)/i, f);
    assert.doesNotMatch(src, /orange|#f97316|#ea580c|#fb923c/i, f);
    assert.doesNotMatch(src, /Payment Received|rent_cents/, f);
  }
});
