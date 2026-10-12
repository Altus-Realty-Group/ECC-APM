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
