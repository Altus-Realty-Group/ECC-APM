import { test, expect } from "@playwright/test";
import { createServer, type ViteDevServer } from "vite";

// Real app and query/cache implementation; intercepted responses are isolated fixtures.
// This is source browser proof, not live identity, data or publication acceptance.
let app: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  app = await createServer({ server: { host: "127.0.0.1", port: 0, strictPort: false } });
  await app.listen();
  const address = app.httpServer!.address();
  if (!address || typeof address === "string") throw new Error("No loopback test listener");
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => { await app?.close(); });

for (const width of [1280, 390]) {
  test(`Data Hub states and read-only recovery at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [], writes: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    let status = 503, payload: unknown = { error: "isolated unavailable" };
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let hold = true;
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "GET") writes.push(route.request().method());
      if (hold) await held;
      await route.fulfill({ status, json: payload });
    });
    await page.goto(`${origin}/data`);
    await expect(page.getByText("Loading records", { exact: true })).toBeVisible();
    await expect(page.getByText("No rows.", { exact: true })).toHaveCount(0);
    hold = false; release();
    await expect(page.getByText("Records could not be loaded", { exact: true })).toBeVisible();
    await expect(page.getByText("No rows.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /initiate|approve|authorize|execute/i })).toHaveCount(0);
    status = 200; payload = { data: [] };
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByText("No rows.", { exact: true })).toBeVisible();
    payload = { data: [{ id: 7, name: "Isolated browser record" }] };
    await page.reload();
    await expect(page.getByText('"Isolated browser record"', { exact: true })).toBeVisible();
    const request = page.waitForRequest(r => r.url().includes("/api/entities/leases"));
    await page.getByLabel("Entity:").selectOption("leases");
    const leaseUrl = new URL((await request).url());
    expect(leaseUrl.searchParams.get("order")).toBe("id.desc");
    expect(leaseUrl.searchParams.get("select")).toContain("rent_cents");
    // A malformed 200 must not become a successful empty collection.
    payload = { ok: true };
    await page.reload();
    await expect(page.getByText("Records could not be loaded", { exact: true })).toBeVisible();
    await expect(page.getByText("No rows.", { exact: true })).toHaveCount(0);
    status = 403;
    await page.reload();
    await expect(page.locator(".ecc-state--denied")).toBeVisible();
    await expect(page.getByText('"Isolated browser record"', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const label of ["Entity:", "Limit:", "Search owners"]) {
      const box = await page.getByLabel(label, { exact: true }).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Search", exact: true }).focus();
    expect(await page.getByRole("button", { name: "Search", exact: true }).evaluate(el => el === document.activeElement)).toBe(true);
    expect(errors).toEqual([]); expect(writes).toEqual([]);
  });

  test(`Integration crash, failure and retry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [], writes: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    let status = 200;
    await page.route("**/api/**", async route => {
      if (route.request().method() !== "GET") writes.push(route.request().method());
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({ status, json: status === 200
        ? path === "/api/health/sync" ? { status: { last_success_at: "2026-10-17T13:00:00Z" }, enabled: false }
          : { integrations: {} }
        : { error: "isolated unavailable" } });
    });
    await page.goto(`${origin}/systems/integrations`);
    await expect(page.getByText("Scheduler", { exact: true })).toBeVisible();
    status = 503;
    await page.reload();
    await expect(page.getByText("Integration health could not be loaded", { exact: true })).toBeVisible();
    await expect(page.getByText("Scheduler", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("input-admin-token")).toHaveCount(0);
    status = 200;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByText("Scheduler", { exact: true })).toBeVisible();
    status = 401;
    await page.reload();
    await expect(page.locator(".ecc-state--denied")).toBeVisible();
    await expect(page.getByText("Scheduler", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]); expect(writes).toEqual([]);
  });
}
