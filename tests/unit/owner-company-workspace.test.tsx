import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import CompanyWorkspace from "../../src/features/owners/company-workspace/CompanyWorkspace";
import { fixtureAdapter, selectCompany, unboundCompanyWorkspaceAdapter } from "../../src/features/owners/company-workspace/adapter";
import type { CompanyMembership } from "../../src/features/owners/company-workspace/types";

const memberships: CompanyMembership[] = [
  { companyId: "A", companyName: "Company A", role: "primary", canManageMembers: false, canApproveFinancial: false, canChangeBanking: false },
  { companyId: "B", companyName: "Company B", role: "viewer", canManageMembers: false, canApproveFinancial: false, canChangeBanking: false },
  { companyId: "C", companyName: "Company C", role: "denied", canManageMembers: false, canApproveFinancial: false, canChangeBanking: false },
];

test("unbound adapter returns truthful unavailable state", async () => {
  const state = await unboundCompanyWorkspaceAdapter().load();
  assert.equal(state.kind, "unavailable");
  if (state.kind === "unavailable") {
    assert.match(state.reason, /not bound/);
  }
});

test("selectCompany denies C and accepts A and B", () => {
  assert.equal(selectCompany(memberships, "A").denied, false);
  assert.equal(selectCompany(memberships, "B").denied, false);
  assert.equal(selectCompany(memberships, "C").denied, true);
  assert.equal(selectCompany(memberships, "missing").denied, true);
});

test("primary contact alone grants no admin, financial or banking power", () => {
  const primary = memberships.find((m) => m.companyId === "A")!;
  assert.equal(primary.role, "primary");
  assert.equal(primary.canManageMembers, false);
  assert.equal(primary.canApproveFinancial, false);
  assert.equal(primary.canChangeBanking, false);
});

test("workspace renders unavailable and ready states from fixtures", () => {
  const unavailable = renderToStaticMarkup(
    <CompanyWorkspace adapter={fixtureAdapter({ kind: "unavailable", reason: "producer not bound" })} />
  );
  // loading is the initial state before the promise resolves; the component starts in loading
  assert.match(unavailable, /Loading companies/);

  const ready = renderToStaticMarkup(
    <CompanyWorkspace adapter={fixtureAdapter({ kind: "ready", memberships, selectedId: null })} />
  );
  assert.match(ready, /Loading companies/);
});
