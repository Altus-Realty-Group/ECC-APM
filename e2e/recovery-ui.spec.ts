import { test, expect } from "@playwright/test";

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`recovered card financials and occupancy history at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/rpc/get_property_card**", (route) => route.fulfill({ json: {
      property: { id: 7, name: "Fixture property", type: "Residential", address: { line1: "", city: "", state: "", zip: "" } },
      kpis: { units: 2, activeLeases: 1, occupancyPct: 50, avgRentCents: 150099 },
    } }));
    await page.route("**/api/dashboard/kpi/summary**", (route) => route.fulfill({ json: {
      propertiesTotal: 1, unitsTotal: 2, occupancyRate: 0.5, revenue30dCents: null,
      lastUpdated: new Date().toISOString(), series: [{ date: "2026-09-15", occupancy: 0 }, { date: "2026-10-13", occupancy: 0.5 }],
    } }));
    await page.goto("/card/property/7");
    await page.getByTestId("tab-financials").click();
    await expect(page.getByTestId("property-average-rent")).toHaveText("$1,500.99");
    await expect(page.getByText("Average rent is not collected income.", { exact: false })).toBeVisible();
    await page.goto("/dashboard");
    const summary = page.locator("summary", { hasText: "View reported observations" });
    await expect(summary).toBeVisible();
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("cell", { name: "2026-09-15", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.0%", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
