import { test, expect } from "@playwright/test";

const fixtures = {
  owner: { owner: { id: 9, display_name: "Fixture owner" }, properties: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Fixture property ${i + 1}` })) },
  tenant: { tenant: { id: 2, display_name: "Fixture tenant" }, activeLease: { id: 4, status: "ACTIVE" }, leases: [{ id: 4, status: "ACTIVE" }, { id: 5, status: "EXPIRED" }] },
  lease: { lease: { id: 4, status: "ACTIVE", rent_cents: 150099 }, property: { id: 6 }, unit: { id: 8 }, tenant: { id: 2, display_name: "Fixture tenant" } },
  unit: { unit: { id: 8, unit_label: "Fixture unit", status: "OCCUPIED" }, property: { id: 6 }, lease: { id: 4, status: "ACTIVE" } },
};
for (const width of [1280, 390]) {
  test(`reported relationships and denied recovery at ${width}px (simulated source responses)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let denied = false;
    await page.route("**/api/rpc/get_*_card**", route => {
      const entity = /get_(\w+)_card/.exec(route.request().url())?.[1] as keyof typeof fixtures;
      return denied ? route.fulfill({ status: 403, json: { error: "Forbidden" } }) : route.fulfill({ json: fixtures[entity] });
    });
    for (const [entity, id, path] of [["owner", 9, "/card/property/8"], ["tenant", 2, "/card/lease/5"], ["lease", 4, "/card/tenant/2"], ["unit", 8, "/card/lease/4"]] as const) {
      await page.goto(`/card/${entity}/${id}`);
      const tab = page.getByTestId("tab-linked");
      await expect(tab).toBeVisible();
      await tab.focus();
      await page.keyboard.press("Enter");
      const link = page.locator(`a[href="${path}"]`);
      await expect(link).toBeVisible();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByTestId("action-edit")).toHaveCount(0);
    }
    // Traverse two actual related links using keyboard activation.
    const leaseLink = page.getByRole("link", { name: /Lease #4/ });
    await leaseLink.focus(); await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/card\/lease\/4$/);
    await page.getByTestId("tab-linked").click();
    await page.getByRole("link", { name: "Fixture tenant" }).click();
    await expect(page).toHaveURL(/\/card\/tenant\/2$/);
    denied = true;
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("You don't have access to this tenant.");
    await expect(page.getByTestId("tab-linked")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Lease #4/ })).toHaveCount(0);
    denied = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByTestId("tab-linked")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
