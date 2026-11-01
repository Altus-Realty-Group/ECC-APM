// Test-only entry. The production entry does not import this fixture or its records.
import "../../../src/styles/index.css";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { DashboardView } from "../../../src/features/dashboard/pages/DashboardPage";
import { normalizeDashboardKpis } from "../../../src/features/dashboard/kpiAdapter";

type Props = React.ComponentProps<typeof DashboardView>;
const summary = normalizeDashboardKpis({ propertiesTotal: 1, unitsTotal: 4, occupancyRate: .5,
  revenue30dCents: 123456, lastUpdated: new Date().toISOString(),
  series: [{ date: "2026-10-01", occupancy: .25 }, { date: "2026-10-15", occupancy: .5 }] });
const leases = [{ id: 1, status: "active", end: "2026-10-31" },
  { id: 2, status: "active", end: "2027-01-30" }, // exactly90 days from fixture planning date
  { id: 3, status: "active", end: "2027-01-31" }, // exactly91 days
  { id: 4, status: "ended", end: "2026-11-15" }];
const units = [{ id: 11 }, { id: 12, status: "Vacant" }, { id: 13, status: "Occupied" }, { id: 14, status: "Occupied" }];
const useFixtureLocation = (): [string, (path: string) => void] => ["/dashboard", () => {}];
function Fixture() {
  const [mode, setMode] = useState("ready");
  const denied = mode === "denied", refreshing = mode === "refreshing";
  const error = denied ? Object.assign(new Error("Synthetic denied read"), { status: 403 }) : null;
  const records = (data: unknown) => ({ data, isSuccess: !denied, isLoading: false,
    isFetching: refreshing, isError: denied, error, refetch: () => {} });
  const query = { data: mode === "missing" ? normalizeDashboardKpis({}) : summary,
    isLoading: false, isFetching: refreshing, isError: denied, error, refetch: async () => ({}) } as Props["query"];
  return <><aside aria-label="Synthetic test controls" style={{ padding: 12, color: "white", background: "#222" }}>
    <strong>SYNTHETIC FIXTURE — no live identity, database or provider</strong>
    <div>{["ready", "missing", "denied", "refreshing"].map(key => <button key={key} style={{ minHeight: 44, margin: 4 }}
      data-fixture-state={key} onClick={() => setMode(key)}>{key}</button>)}</div>
  </aside><div id="ecc-app"><main className="content-wrap"><Router hook={useFixtureLocation}>
    <DashboardView query={query} leases={records(leases)} units={records(units)} today="2026-11-01" epoch={denied ? 1 : 0} />
  </Router></main></div></>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
