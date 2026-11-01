// Isolated exact-source UI acceptance; no app auth, API, provider or production fixture route.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { expect } from "@playwright/test";

const scratch = await mkdtemp(path.join(tmpdir(), "ecc-dashboard-proof-"));
const artifacts = process.env.PROOF_ARTIFACT_DIR || path.join(scratch, "artifacts");
await mkdir(artifacts, { recursive: true });
process.env.ECC_DASHBOARD_PROOF_OUT = path.join(scratch, "dist");
const receipt = { kind: "SYNTHETIC_EXACT_SOURCE_NOT_LIVE", sourceHead: process.env.SOURCE_HEAD_SHA || null,
  testedCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  timestamp: new Date().toISOString(), viewports: [], consoleErrors: [], pageErrors: [], rejectedRequests: [] };
let browser, server;
try {
  const configFile = path.resolve("scripts/dashboard-proof-vite.config.mjs");
  await build({ configFile });
  server = await preview({ configFile });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", message => { if (message.type() === "error") receipt.consoleErrors.push(message.text()); });
  page.on("pageerror", error => receipt.pageErrors.push(error.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || /^\/(api|bff)(\/|$)/.test(url.pathname)) {
      receipt.rejectedRequests.push(url.origin + url.pathname); return route.abort();
    }
    return route.continue();
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
    await page.locator('[data-testid="kpi.revenue"]').filter({ hasText: "$1,234.56" }).waitFor();
    const chart = page.locator(".cc-occupancy-history svg.recharts-surface").first();
    await chart.waitFor();
    const chartBox = await chart.boundingBox();
    assert.ok(chartBox && chartBox.width > 0 && chartBox.height > 0, "Reported history chart has no geometry");
    await page.screenshot({ path: path.join(artifacts, `dashboard-${width}-ready.png`) });
    const lease = page.locator('[data-review-action="lease-dates"]');
    await lease.click();
    await expect(page.locator('[aria-label="End-date window"]')).toHaveValue("review");
    for (const id of [1, 2]) await expect(page.locator(`a[href="/card/lease/${id}"]`)).toHaveCount(1);
    for (const id of [3, 4]) await expect(page.locator(`a[href="/card/lease/${id}"]`)).toHaveCount(0);
    await expect(page.locator(".cc-workbench")).toBeFocused();
    const unit = page.locator('[data-review-action="unit-status"]');
    await unit.focus(); await page.keyboard.press("Enter");
    await expect(page.locator('[aria-label="Queue unit status"]')).toHaveValue("missing");
    await expect(page.locator('a[href="/card/unit/11"]')).toHaveCount(1);
    await expect(page.locator('a[href="/card/unit/12"]')).toHaveCount(0);
    await expect(page.locator(".cc-workbench")).toBeFocused();
    const targets = [];
    for (const locator of [lease, unit, page.getByRole("link", { name: "Review property records", exact: true }),
      page.getByRole("link", { name: "Review unit records", exact: true })]) {
      const box = await locator.boundingBox(); assert.ok(box && box.height >= 44 && box.width >= 44); targets.push(box);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 1, `Horizontal page overflow at${width}px: ${overflow}`);
    await page.screenshot({ path: path.join(artifacts, `dashboard-${width}-queue.png`) });
    await page.locator('[data-fixture-state="refreshing"]').click();
    await expect(lease).toBeDisabled(); await expect(unit).toBeDisabled();
    await expect(page.locator('a[href^="/card/lease/"],a[href^="/card/unit/"]')).toHaveCount(0);
    await page.locator('[data-fixture-state="denied"]').click();
    await page.locator('[data-testid="state-denied"]').waitFor();
    await expect(page.locator('[data-testid^="kpi."][data-missing="true"]')).toHaveCount(4);
    await expect(page.locator(".cc-occupancy-history svg.recharts-surface")).toHaveCount(0);
    await page.screenshot({ path: path.join(artifacts, `dashboard-${width}-denied.png`) });
    await page.locator('[data-fixture-state="missing"]').click();
    await expect(page.locator('[data-testid^="kpi."][data-missing="true"]')).toHaveCount(4);
    await expect(page.locator(".cc-occupancy-history").getByText("No trend data reported for this period.", { exact: true })).toBeVisible();
    receipt.viewports.push({ width, height: 1000, chartBox, targets, overflow, viewportScreenshots: true,
      checks: ["90_vs91_day_records", "unit_status_records", "keyboard_focus", "refresh_suppression", "denied_cache", "unknown_values"] });
  }
  assert.deepEqual(receipt.consoleErrors, []); assert.deepEqual(receipt.pageErrors, []); assert.deepEqual(receipt.rejectedRequests, []);
  receipt.status = "PASS";
} catch (error) {
  receipt.status = "FAIL"; receipt.failure = String(error?.stack || error); process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
  await writeFile(path.join(artifacts, "dashboard-browser-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt, null, 2));
}
