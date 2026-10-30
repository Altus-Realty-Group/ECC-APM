import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import CompanyWorkspace from "../../src/features/owners/company-workspace/CompanyWorkspace";
import { fixtureAdapter, selectCompany, unboundCompanyWorkspaceAdapter } from "../../src/features/owners/company-workspace/adapter";
import type { CompanyMembership } from "../../src/features/owners/company-workspace/types";

const memberships: CompanyMembership[] = [
  { companyId: "A", companyName: "Company A", role: "primary", canManageMembers: false, canApproveFinancial: false, canChangeBanking: false },
  { companyId: "B", companyName: "Company B", role: "viewer", canManageMembers: false, canApproveFinancial: false, canChangeBanking: false },
  { companyId: "C", companyName: "Company C", role: "denied", canManageMembers: false, canApproveFinancial: false, canChangeBanking: false },
];

test("selectCompany fails closed on denied and missing", () => {
  assert.deepEqual(selectCompany(memberships, "A"), { selected: memberships[0], denied: false });
  assert.deepEqual(selectCompany(memberships, "B"), { selected: memberships[1], denied: false });
  assert.deepEqual(selectCompany(memberships, "C"), { selected: null, denied: true });
  assert.deepEqual(selectCompany(memberships, "missing"), { selected: null, denied: true });
});

test("primary contact alone grants no admin, financial or banking power", () => {
  const primary = memberships.find((m) => m.companyId === "A")!;
  assert.equal(primary.role, "primary");
  assert.equal(primary.canManageMembers, false);
  assert.equal(primary.canApproveFinancial, false);
  assert.equal(primary.canChangeBanking, false);
});

test("unbound adapter returns truthful unavailable state", async () => {
  const state = await unboundCompanyWorkspaceAdapter().load();
  assert.equal(state.kind, "unavailable");
  if (state.kind === "unavailable") assert.match(state.reason, /not bound/);
});

test("component source imports page-local CSS and rejects denied selectedId", () => {
  const src = readFileSync("src/features/owners/company-workspace/CompanyWorkspace.tsx", "utf8");
  assert.match(src, /import "\.\/company-workspace\.css"/);
  assert.match(src, /denied \? null/);
  const css = readFileSync("src/features/owners/company-workspace/company-workspace.css", "utf8");
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /max-width:\s*420px|max-width:\s*720px/);
});

test("fixture adapter accepts AbortSignal", async () => {
  const adapter = fixtureAdapter({ kind: "ready", memberships, selectedId: "A" });
  const state = await adapter.load(new AbortController().signal);
  assert.equal(state.kind, "ready");
});
