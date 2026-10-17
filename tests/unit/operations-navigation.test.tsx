import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../../src/lib/queryClient";
import { getSessionEpoch } from "../../src/lib/sessionScope";
import { OPERATIONS_CONTRACTS, operationsQueryOptions, type OperationsDomain } from "../../src/lib/recovery/operationsRegistry";
import { parseCollection, parseLegalCase, parseWorkOrder, parseLedgerEntry } from "../../src/lib/recovery/operationsContracts";
import { filterOperationRows, OperationRecords, OperationsRecoveryView } from "../../src/features/recovery/operations/OperationsRecoveryPage";
import { activeSectionTitle, navLeafPaths, PLANNED_DESTINATIONS } from "../../src/config/navigation";
import { appRoutePatterns, read, routeExists } from "./helpers";

const cases = [
  ["/ops/legal/case-manager", "Legal Tracker", "LegalCaseManagerPage", "legalCases"],
  ["/ops/maintenance/work-orders", "Construction & Repair", "WorkOrdersPage", "workOrders"],
  ["/ops/accounting/tenant-ledgers", "Accounting", "TenantLedgersPage", "ledgerEntries"],
] as const;

test("three individual routes link to concrete domain pages and remain distinct from planned destinations", () => {
  const app = read("src/App.tsx");
  for (const [path, section, page, domain] of cases) {
    assert.ok(navLeafPaths().includes(path));
    assert.ok(routeExists(path, appRoutePatterns()));
    assert.equal(activeSectionTitle(path), section);
    assert.ok(!PLANNED_DESTINATIONS.some((d) => d.path === path));
    assert.ok(app.includes(`path="${path}" component={${page}}`));
    const source = read(`src/features/recovery/operations/${page}.tsx`);
    assert.ok(source.includes(`domains={["${domain}"]}`));
    assert.doesNotMatch(source, /fetch\(|\/api\//);
  }
  assert.ok(navLeafPaths().includes("/ops/operations"));
});

test("individual query views mount only requested domain and preserve unavailable versus confirmed empty", () => {
  for (const [, , , domain] of cases) {
    for (const state of ["unavailable", "ready"] as const) {
      const qc = createQueryClient();
      qc.setDefaultOptions({ queries: { ...qc.getDefaultOptions().queries, gcTime: Infinity } });
      const key = operationsQueryOptions(domain, () => [], getSessionEpoch()).queryKey;
      qc.setQueryData(key, state === "ready" ? { state: "ready", rows: [] } : { state: "unavailable", contract: OPERATIONS_CONTRACTS[domain] });
      let requests = 0;
      const html = renderToStaticMarkup(<QueryClientProvider client={qc}>
        <OperationsRecoveryView domains={[domain]} fetcher={async () => { requests++; return []; }} />
      </QueryClientProvider>);
      assert.match(html, new RegExp(`ops-section-${domain}`));
      for (const other of ["legalCases", "workOrders", "ledgerEntries"] as OperationsDomain[]) {
        if (other !== domain) assert.ok(!html.includes(`ops-section-${other}`));
      }
      assert.equal(qc.getQueryCache().getAll().length, 1);
      assert.equal(requests, 0);
      assert.equal(html.includes("ops-gate-"), state === "unavailable");
      if (state === "unavailable") assert.doesNotMatch(html, /No legal cases recorded|No work orders recorded|No recorded ledger entries/);
      qc.clear();
    }
  }
});

test("record filters search validated context and apply recorded statuses without guessing", () => {
  const legal = parseCollection({data: [{ id: "c1", tenantName: "Fixture person", propertyName: "Fixture address", status: "Filed" }, { id: "c2", status: null }]}, parseLegalCase);
  assert.deepEqual(filterOperationRows("legalCases", legal, "address", "Filed"), [legal[0]]);
  assert.deepEqual(filterOperationRows("legalCases", legal, "", "unknown"), [legal[1]]);
  assert.deepEqual(filterOperationRows("legalCases", legal, "no match"), []);
  const work = parseCollection({data: [{ id: "w1", description: "Fixture repair", propertyName: "Fixture address", status: "OPEN" }, { id: "w2", description: "Other work", status: "COMPLETED" }]}, parseWorkOrder);
  assert.deepEqual(filterOperationRows("workOrders", work, "repair", "OPEN"), [work[0]]);
  assert.deepEqual(filterOperationRows("workOrders", work, "", "COMPLETED"), [work[1]]);
});

test("ledger search retains every entry of matching lease, so filtered display never recalculates a partial balance", () => {
  const rows = parseCollection({data: [
    { id: "e1", leaseId: "lease-a", kind: "charge", postedOn: "2026-01-01", amountCents: 100000, memo: "Unique memo" },
    { id: "e2", leaseId: "lease-a", kind: "payment", postedOn: "2026-01-02", amountCents: 60000 },
    { id: "e3", leaseId: "lease-b", kind: "charge", postedOn: "2026-01-01", amountCents: 70000 },
  ]}, parseLedgerEntry);
  const filtered = filterOperationRows("ledgerEntries", rows, "unique");
  assert.deepEqual(filtered, rows.slice(0, 2));
  const html = renderToStaticMarkup(<OperationRecords domain="ledgerEntries" rows={filtered} />);
  assert.match(html, /\$400\.00/);
  assert.doesNotMatch(html, /Lease lease-b/);
  assert.match(html, /balances cover those entries only/);
});

test("populated filters have explicit labels and no operational write controls", () => {
  const rows = [parseWorkOrder({ id: "w1", description: "Fixture repair", status: "OPEN" })];
  const html = renderToStaticMarkup(<OperationRecords domain="workOrders" rows={rows} />);
  assert.match(html, /type="search"/);
  assert.match(html, /for="ops-search-workOrders"/);
  assert.match(html, /for="ops-status-workOrders"/);
  assert.match(html, /1 of 1 loaded records shown/);
  assert.doesNotMatch(html, /Create|Assign|Submit|Delete/);
  const css = read("src/features/recovery/operations/operations.css");
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
});
