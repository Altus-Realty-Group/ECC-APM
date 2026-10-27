import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import UnitOverview from "../../src/pages/card/unit/Overview";
import LeaseOverview from "../../src/pages/card/lease/Overview";
import TenantOverview from "../../src/pages/card/tenant/Overview";
import OwnerOverview from "../../src/pages/card/owner/Overview";

for (const [name, render] of [
  ["Unit", (cents: number | null) => <UnitOverview unit={{ rent_cents: cents }} />],
  ["Lease", (cents: number | null) => <LeaseOverview data={{ lease: { rent_cents: cents } }} />],
  ["Tenant", (cents: number | null) => <TenantOverview tenant={{ balance_cents: cents }} />],
] as const) {
  test(`${name} overview preserves cents and distinguishes confirmed zero from unreported money`, () => {
    assert.match(renderToStaticMarkup(render(12345)), /\$123\.45/);
    assert.match(renderToStaticMarkup(render(0)), /\$0\.00/);
    assert.doesNotMatch(renderToStaticMarkup(render(null)), /\$0\.00/);
  });
}
test("Owner overview preserves reported zero counts", () => {
  const html = renderToStaticMarkup(<OwnerOverview data={{ owner: { properties_count: 0, total_units: 0 } }} />);
  assert.equal((html.match(/<span>0<\/span>/g) ?? []).length, 2);
});
