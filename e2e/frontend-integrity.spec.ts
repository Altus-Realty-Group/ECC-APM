import { test, expect, type Page } from "@playwright/test";

/**
 * ECC-C4-V1 frontend integrity journeys.
 * Network is fully mocked per test, so this proves UI behavior against the BUILT app only.
 * It is NOT acceptance evidence for a deployed preview or for live data.
 */

const NAV_PATHS = [
  "/dashboard", "/portfolio/properties", "/portfolio/units", "/portfolio/leases", "/portfolio/tenants",
  "/portfolio/owners", "/reports/create", "/reports/saved", "/reports/templates",
  "/data", "/systems/integrations",
];

async function mockApi(page: Page, overrides: Record<string, () => { status?: number; body: unknown }> = {}) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const key = Object.keys(overrides).find((k) => url.pathname + url.search === k || url.pathname === k);
    const res = key ? overrides[key]() : { status: 200, body: [] };
    await route.fulfill({ status: res.status ?? 200, contentType: "application/json", body: JSON.stringify(res.body) });
  });
}

const box = async (loc: ReturnType<Page["locator"]>) => (await loc.first().boundingBox())!;

test.describe("navigation integrity", () => {
  test("every sidebar destination renders a real page (no 404) with no page errors", async ({ page }) => {
    await mockApi(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e.message}`));
    for (const path of NAV_PATHS) {
      await page.goto(path);
      await expect(page.locator("#ecc-app")).toBeVisible();
      await expect(page.getByTestId("route-not-found"), `${path} 404`).toHaveCount(0);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("no sidebar link leads to the crashing owner-transfer page", async ({ page }) => {
    await mockApi(page);
    await page.goto("/portfolio/owners");
    await page.getByRole("button", { name: "Portfolio" }).click();
    await expect(page.getByRole("navigation", { name: "Primary" }).locator('a[href^="/owners/transfer"], a[href^="/admin"]')).toHaveCount(0);
  });

  test("clicking visible links reaches their routes (expanded rail, mouse)", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Reports" }).click();
    await expect(nav.getByRole("button", { name: "Reports" })).toHaveAttribute("aria-expanded", "true");
    await nav.getByRole("link", { name: "Saved" }).click();
    await expect(page).toHaveURL(/\/reports\/saved$/);
    await expect(nav.getByRole("link", { name: "Saved" })).toHaveAttribute("aria-current", "page");
  });

  test("group headers are keyboard operable (Enter/Space toggle, focus ring present)", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    const reports = page.getByRole("button", { name: "Reports" });
    await reports.focus();
    await page.keyboard.press("Enter");
    await expect(reports).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(reports).toHaveAttribute("aria-expanded", "false");
  });

  test("collapsed rail: flyout opens by keyboard, arrows move focus, Escape restores focus", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Collapse navigation" }).click();
    const trigger = page.getByRole("button", { name: "Portfolio" });
    await trigger.focus();
    await page.keyboard.press("ArrowRight");
    const menu = page.getByRole("menu", { name: "Portfolio" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Properties" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Units" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitem", { name: "Owners", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    // Flyout is actually on screen (was unpositioned before).
    await trigger.focus();
    await page.keyboard.press("ArrowRight");
    const b = await box(menu);
    const vp = page.viewportSize()!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
  });

  for (const key of ["Enter", "Space"] as const) {
    test(`collapsed rail: ${key} on a group opens the flyout AND focuses its first item; Escape returns focus`, async ({ page }) => {
      await mockApi(page);
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Collapse navigation" }).click();
      const trigger = page.getByRole("button", { name: "Reports" });
      await trigger.focus();
      await page.keyboard.press(key);
      const menu = page.getByRole("menu", { name: "Reports" });
      await expect(menu).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Create" })).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("menuitem", { name: "Saved" })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(trigger).toBeFocused();
      // pressing the key again toggles it closed rather than trapping focus
      await page.keyboard.press(key);
      await expect(menu).toBeVisible();
      await page.keyboard.press(key === "Enter" ? "Escape" : "Escape");
      await expect(menu).toHaveCount(0);
    });
  }

  test("collapsed rail: a pointer click opens the flyout without stealing focus into it", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Collapse navigation" }).click();
    await page.getByRole("button", { name: "Reports" }).click();
    await expect(page.getByRole("menu", { name: "Reports" })).toBeVisible();
    await expect(page.getByRole("menuitem").first()).not.toBeFocused();
  });

  test("outside click closes the flyout; choosing an item navigates", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Collapse navigation" }).click();
    await page.getByRole("button", { name: "Reports" }).click();
    await expect(page.getByRole("menu", { name: "Reports" })).toBeVisible();
    await page.mouse.click(700, 500);
    await expect(page.getByRole("menu", { name: "Reports" })).toHaveCount(0);
    await page.getByRole("button", { name: "Reports" }).click();
    await page.getByRole("menuitem", { name: "Templates" }).click();
    await expect(page).toHaveURL(/\/reports\/templates$/);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("main content sits beside the rail (no double offset), expanded and collapsed", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    const side = await box(page.locator("aside.ecc-sidebar"));
    const main = await box(page.locator("main#main"));
    expect(Math.abs(main.x - (side.x + side.width))).toBeLessThanOrEqual(2);
    await page.getByRole("button", { name: "Collapse navigation" }).click();
    const side2 = await box(page.locator("aside.ecc-sidebar"));
    const main2 = await box(page.locator("main#main"));
    expect(side2.width).toBeLessThan(side.width);
    expect(Math.abs(main2.x - (side2.x + side2.width))).toBeLessThanOrEqual(2);
  });

  test("404 offers recovery: Go back and working links", async ({ page }) => {
    await mockApi(page);
    await page.goto("/definitely-not-a-page");
    const nf = page.getByTestId("route-not-found");
    await expect(nf).toBeVisible();
    await expect(nf.getByRole("button", { name: "Go back" })).toBeVisible();
    await nf.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("touch", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("a phone starts on the narrow rail; expanding it overlays the page instead of squeezing content", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    await expect(page.locator("aside.ecc-sidebar")).toHaveClass(/is-collapsed/);
    const mainCollapsed = await box(page.locator("main#main"));
    expect(mainCollapsed.width).toBeGreaterThan(300);
    await page.getByRole("button", { name: "Expand navigation" }).tap();
    const inner = await box(page.locator(".ecc-sidebar__inner"));
    expect(inner.x).toBe(0);
    expect(inner.width).toBeGreaterThan(250);
    const mainExpanded = await box(page.locator("main#main"));
    expect(mainExpanded.width).toBe(mainCollapsed.width); // content did not shrink; the rail overlays it
    await page.getByRole("button", { name: "Reports" }).tap();
    await page.getByRole("link", { name: "Saved" }).tap();
    await expect(page).toHaveURL(/\/reports\/saved$/);
  });

  test("tap opens the flyout on the collapsed rail; targets are >= 44px", async ({ page }) => {
    await mockApi(page);
    await page.goto("/dashboard");
    // Small screens use the collapsed rail by default layout; make sure it is collapsed.
    const pin = page.getByRole("button", { name: /(Collapse|Expand) navigation/ });
    if ((await pin.getAttribute("aria-label")) === "Collapse navigation") await pin.tap();
    const rows = page.locator(".ecc-nav-row");
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const b = (await rows.nth(i).boundingBox())!;
      expect(b.height, `nav row ${i}`).toBeGreaterThanOrEqual(44);
    }
    expect((await box(pin)).height).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "Portfolio" }).tap();
    const items = page.getByRole("menuitem");
    await expect(items.first()).toBeVisible();
    for (let i = 0; i < (await items.count()); i++) {
      expect((await items.nth(i).boundingBox())!.height, `menuitem ${i}`).toBeGreaterThanOrEqual(44);
    }
    await items.filter({ hasText: "Units" }).tap();
    await expect(page).toHaveURL(/\/portfolio\/units$/);
  });
});

test.describe("dashboard states: null vs zero, denied, error, retry", () => {
  test("partial payload: missing revenue is a dash, not $0; confirmed zero units stays 0", async ({ page }) => {
    await mockApi(page, { "/api/dashboard/kpi/summary": () => ({ body: { propertiesTotal: 4, unitsTotal: 0, occupancyRate: 0.9, lastUpdated: new Date().toISOString() } }) });
    await page.goto("/dashboard");
    await expect(page.getByTestId("kpi.units")).toContainText("0");
    await expect(page.getByTestId("kpi.units")).not.toContainText("Not reported");
    await expect(page.getByTestId("kpi.revenue")).toContainText("—");
    await expect(page.getByTestId("kpi.revenue")).toContainText("Not reported");
    await expect(page.getByTestId("kpi.revenue")).not.toContainText("$0");
    await expect(page.getByTestId("state-partial")).toContainText("Revenue (30d)");
    await expect(page.getByTestId("kpi.occupancy")).toContainText("%");
  });

  test("denied shows an access message with Retry; Retry recovers when access returns", async ({ page }) => {
    let denied = true;
    await mockApi(page, { "/api/dashboard/kpi/summary": () => (denied ? { status: 403, body: { error: "forbidden" } } : { body: { propertiesTotal: 9, unitsTotal: 90, occupancyRate: 0.5, revenue30dCents: 12345, lastUpdated: new Date().toISOString() } }) });
    await page.goto("/dashboard");
    await expect(page.getByTestId("state-denied")).toContainText("don't have access");
    await expect(page.getByTestId("kpi.properties")).toHaveCount(0);
    denied = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByTestId("kpi.properties")).toContainText("9");
    await expect(page.getByTestId("kpi.revenue")).toContainText("$123.45");
  });

  test("server failure shows an error with Retry and no figures", async ({ page }) => {
    await mockApi(page, { "/api/dashboard/kpi/summary": () => ({ status: 500, body: { error: "boom" } }) });
    await page.goto("/dashboard");
    await expect(page.getByTestId("state-error")).toContainText("could not be loaded");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    expect((await box(page.getByRole("button", { name: "Retry" }))).height).toBeGreaterThanOrEqual(44);
  });

  for (const [label, body] of [
    ["negative count", { propertiesTotal: -5, unitsTotal: 10 }],
    ["occupancy as percent", { propertiesTotal: 1, occupancyRate: 93.4 }],
    ["fractional cents", { revenue30dCents: 12.5 }],
    ["series out of range", { series: [{ date: "2026-10-01", occupancy: 7 }] }],
    ["array instead of object", []],
    ["envelope without object", { data: [] }],
  ] as const) {
    test(`malformed dashboard payload (${label}) is a contract error with no figures`, async ({ page }) => {
      await mockApi(page, { "/api/dashboard/kpi/summary": () => ({ body }) });
      await page.goto("/dashboard");
      await expect(page.getByTestId("state-error")).toContainText("unexpected format");
      await expect(page.getByTestId("kpi.properties")).toHaveCount(0);
      await expect(page.getByTestId("kpi.units")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    });
  }

  test("a future source timestamp is flagged and never shown as 'Updated'", async ({ page }) => {
    const future = new Date(Date.now() + 3 * 3600_000).toISOString();
    await mockApi(page, { "/api/dashboard/kpi/summary": () => ({ body: { propertiesTotal: 1, unitsTotal: 1, occupancyRate: 1, revenue30dCents: 1, lastUpdated: future } }) });
    await page.goto("/dashboard");
    await expect(page.getByTestId("state-timestamp")).toContainText("in the future");
    await expect(page.getByTestId("dashboard-freshness")).not.toContainText(/Updated \d/);
  });

  test("stale data is flagged", async ({ page }) => {
    await mockApi(page, { "/api/dashboard/kpi/summary": () => ({ body: { propertiesTotal: 1, unitsTotal: 1, occupancyRate: 1, revenue30dCents: 1, lastUpdated: "2026-01-01T00:00:00Z" } }) });
    await page.goto("/dashboard");
    await expect(page.getByTestId("state-stale")).toContainText("out of date");
  });
});

test.describe("operator journey: properties list -> property card", () => {
  const rows = [{ id: 12, name: "Elm Court", street_1: "1 Elm St", city: "Indianapolis", state: "IN", units: null, occupancy_pct: null }];

  test("row link opens the card; unreported figures are dashes, never 0", async ({ page }) => {
    await mockApi(page, {
      "/api/portfolio/properties": () => ({ body: rows }),
      "/api/rpc/get_property_card": () => ({ body: { property: { id: 12, name: "Elm Court", address: { line1: "1 Elm St", city: "Indianapolis", state: "IN", zip: "46201" } }, kpis: {} } }),
    });
    await page.goto("/portfolio/properties");
    await expect(page.getByText("Average occupancy not reported")).toBeVisible();
    const link = page.getByRole("link", { name: "Elm Court" });
    expect((await box(link)).height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/\/card\/property\/12$/);
    await expect(page.getByTestId("kpi-units")).toContainText("—");
    await expect(page.getByTestId("kpi-occupancy")).toContainText("—");
    await expect(page.getByTestId("kpi-occupancy")).not.toContainText("0%");
    await expect(page.getByTestId("tab-financials")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export PDF" })).toHaveCount(0);
  });

  test("property card failure offers Retry and a way back", async ({ page }) => {
    await mockApi(page, { "/api/rpc/get_property_card": () => ({ status: 403, body: { error: "no" } }) });
    await page.goto("/card/property/12");
    await expect(page.getByTestId("state-denied")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await page.getByRole("link", { name: "Back to properties" }).click();
    await expect(page).toHaveURL(/\/portfolio\/properties$/);
  });

  test("list failure: error with Retry that recovers", async ({ page }) => {
    let fail = true;
    await mockApi(page, { "/api/portfolio/properties": () => (fail ? { status: 500, body: { error: "x" } } : { body: rows }) });
    await page.goto("/portfolio/properties");
    await expect(page.getByTestId("state-error")).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("link", { name: "Elm Court" })).toBeVisible();
  });

  test("envelope-shaped collection ({data:[...]}) renders rows, not a crash", async ({ page }) => {
    await mockApi(page, { "/api/portfolio/properties": () => ({ body: { data: rows, meta: { totalCount: 1 } } }) });
    await page.goto("/portfolio/properties");
    await expect(page.getByRole("link", { name: "Elm Court" })).toBeVisible();
  });
});


test.describe("session boundary: cached data, selections and late responses", () => {
  const rowsA = [{ id: 12, name: "Previous Account Court", street_1: "1 Elm St", city: "Indy", state: "IN", units: 40, occupancy_pct: 90 }];
  const rowsB = [{ id: 99, name: "New Account Plaza", street_1: "9 Oak St", city: "Indy", state: "IN", units: 5, occupancy_pct: 50 }];

  test("boundary event clears rows and selections and reloads under the new session; a LATE old response is ignored", async ({ page }) => {
    let calls = 0;
    let releaseStale!: () => void;
    const staleGate = new Promise<void>((r) => { releaseStale = r; });
    await page.route("**/api/portfolio/properties", async (route) => {
      calls += 1;
      if (calls === 1) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rowsA) });
      if (calls === 2) { // request started under the old session, answered late
        await staleGate;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rowsA) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rowsB) });
    });
    await page.route("**/api/**", (r) => (r.request().url().includes("/portfolio/properties") ? r.fallback() : r.fulfill({ status: 200, contentType: "application/json", body: "[]" })));

    await page.goto("/portfolio/properties");
    await expect(page.getByRole("link", { name: "Previous Account Court" })).toBeVisible();
    await page.getByRole("checkbox", { name: /Select property Previous Account Court/ }).check();
    await expect(page.getByText("1 selected").first()).toBeVisible();

    // account switch #1: refetch begins (call 2) and is held open
    await page.evaluate(() => window.dispatchEvent(new Event("ecc:session-boundary")));
    await expect(page.getByRole("link", { name: "Previous Account Court" })).toHaveCount(0);
    await expect(page.getByText("Selection review is unavailable until properties load successfully.")).toBeVisible();
    // account switch #2 supersedes it; the new session's data (call 3) loads
    await page.evaluate(() => window.dispatchEvent(new Event("ecc:session-boundary")));
    await expect(page.getByRole("link", { name: "New Account Plaza" })).toBeVisible();
    // now the stale call-2 response (old identity) finally arrives
    releaseStale();
    await page.waitForTimeout(400);
    await expect(page.getByRole("link", { name: "Previous Account Court" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "New Account Plaza" })).toBeVisible();
    await expect(page.getByText("0 selected").first()).toBeVisible();
    await expect(page.getByText("Selected IDs: none")).toBeVisible();
  });

  test("a denied (403) properties response shows no rows, totals or selection and offers Retry", async ({ page }) => {
    await mockApi(page, { "/api/portfolio/properties": () => ({ status: 403, body: { error: "forbidden" } }) });
    await page.goto("/portfolio/properties");
    await expect(page.getByTestId("state-denied")).toBeVisible();
    await expect(page.getByRole("link")).not.toContainText(["Previous Account Court"]);
    await expect(page.getByText("0 loaded")).toHaveCount(0);
    await expect(page.getByText("Average occupancy not reported")).toHaveCount(0);
    await expect(page.getByText("Selection review is unavailable until properties load successfully.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("cached dashboard figures disappear when the session boundary fires", async ({ page }) => {
    await mockApi(page, { "/api/dashboard/kpi/summary": () => ({ body: { propertiesTotal: 4, unitsTotal: 40, occupancyRate: 0.9, revenue30dCents: 5, lastUpdated: new Date().toISOString() } }) });
    await page.goto("/dashboard");
    await expect(page.getByTestId("kpi.properties")).toContainText("4");
    // next load for the new identity is denied
    await page.unroute("**/api/**");
    await mockApi(page, { "/api/dashboard/kpi/summary": () => ({ status: 403, body: { error: "forbidden" } }) });
    await page.evaluate(() => window.dispatchEvent(new Event("ecc:session-boundary")));
    await expect(page.getByTestId("state-denied")).toBeVisible();
    await expect(page.getByTestId("kpi.properties")).toHaveCount(0);
  });

  test("property card shows only contract fields: no Contacts, Key Dates, owner, class, status or DoorLoop", async ({ page }) => {
    await mockApi(page, { "/api/rpc/get_property_card": () => ({ body: { property: { id: 12, name: "Elm Court", type: "Residential", address: { line1: "1 Elm St", city: "Indianapolis", state: "IN", zip: "46201" }, owner: { display_name: "Not In Contract" }, created_at: "2020-01-01" }, kpis: { units: 5, activeLeases: 4, occupancyPct: 80, avgRentCents: 100000 } } }) });
    await page.goto("/card/property/12");
    await expect(page.getByTestId("kpi-units")).toContainText("5");
    const body = page.locator("main#main");
    for (const t of ["Contacts", "Key Dates", "Created:", "Updated:", "DoorLoop", "Not In Contract"]) await expect(body).not.toContainText(t);
    await expect(body).toContainText("1 Elm St, Indianapolis, IN, 46201");
  });
});

// PM correction: recovery URLs must not mount unfinished ownership-changing controls.
for (const path of ["/owners/transfer", "/owners/transfer/detail?id=17", "/admin/transfers"]) {
  test(`owner transfer recovery route stays unavailable: ${path}`, async ({ page }) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "GET") writes.push(route.request().url());
      await route.fulfill({status: 503, body: "Unavailable"});
    });
    await page.route("**/bff/**", async route => {
      writes.push(route.request().url());
      await route.fulfill({status: 503, body: "Unavailable"});
    });
    await page.goto(path);
    const area = page.getByTestId("owner-transfer-unavailable");
    await expect(area).toBeVisible();
    await expect(area.getByText("Owner transfers are unavailable", {exact: true})).toBeVisible();
    await expect(area.locator("button, input, select")).toHaveCount(0);
    await expect(page.getByText(/localStorage|ADMIN_SYNC_TOKEN/)).toHaveCount(0);
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
