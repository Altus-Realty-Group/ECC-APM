import React from "react";
import { Router } from "wouter";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import CardLoadNotice from "../../src/components/recovery/CardLoadNotice";

const render = (node: React.ReactNode) => renderToStaticMarkup(<Router ssrPath="/">{node}</Router>);

const lists = {
  property: "/portfolio/properties",
  unit: "/portfolio/units",
  lease: "/portfolio/leases",
  tenant: "/portfolio/tenants",
  owner: "/portfolio/owners",
} as const;

test("CardLoadNotice returns to the correct list on loading, error and denied", () => {
  for (const [entity, href] of Object.entries(lists)) {
    for (const state of ["loading", "error", "denied"] as const) {
      const html = render(
        <CardLoadNotice
          entity={entity}
          loading={state === "loading"}
          denied={state === "denied"}
          error={state === "error" ? new Error("fail") : null}
          retry={() => {}}
          retrying={false}
          backPath={href}
        />
      );
      assert.match(html, new RegExp(`href="${href}"`));
      assert.match(html, /Back to /);
      assert.match(html, /ecc-btn ecc-touch/);
    }
  }
});

test("card index pages hardcode the correct list destination on success and invalid paths", () => {
  const files: Record<string, string> = {
    property: "src/pages/card/property/index.tsx",
    unit: "src/pages/card/unit/index.tsx",
    lease: "src/pages/card/lease/index.tsx",
    tenant: "src/pages/card/tenant/index.tsx",
    owner: "src/pages/card/owner/index.tsx",
  };
  for (const [entity, file] of Object.entries(files)) {
    const src = readFileSync(file, "utf8");
    const href = lists[entity as keyof typeof lists];
    assert.ok(src.includes(`href="${href}"`), `${entity} missing ${href}`);
    assert.ok(src.includes("ecc-btn ecc-touch"), `${entity} missing touch target`);
    if (entity === "property") {
      assert.ok(src.includes("Loading property"), "property loading path present");
      assert.ok(src.includes("{backLink}"), "property loading uses backLink");
    } else {
      assert.ok(src.includes("Back to"), `${entity} success path has Back to`);
    }
  }
});
