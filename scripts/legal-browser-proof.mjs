// Synthetic exact-source browser acceptance; never authenticates or calls a provider.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
const scratch = await mkdtemp(path.join(tmpdir(), "ecc-legal-proof-"));
const artifacts = process.env.PROOF_ARTIFACT_DIR || path.join(scratch, "artifacts");
await mkdir(artifacts, { recursive: true });
process.env.ECC_LEGAL_PROOF_OUT = path.join(scratch, "dist");
const receipt = { kind: "SYNTHETIC_EXACT_SOURCE_NOT_LIVE", sourceHead: process.env.SOURCE_HEAD_SHA || null,
  testedCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  worktree: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  timestamp: new Date().toISOString(), viewports: [], consoleErrors: [], pageErrors: [], rejectedRequests: [] };
let browser, server;
try {
  const configFile = path.resolve("scripts/legal-proof-vite.config.mjs");
  await build({ configFile });
  // Only the two static assets referenced by the real read-only Sidebar are copied.
  await mkdir(path.join(process.env.ECC_LEGAL_PROOF_OUT, "brand"));
  for (const logo of ["altus-logo.png", "altus-mark.png"]) {
    await copyFile(path.resolve("public/brand", logo), path.join(process.env.ECC_LEGAL_PROOF_OUT, "brand", logo));
  }
  server = await preview({ configFile });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  const page = await browser.newPage();
  // Each viewport starts with the real Sidebar's normal responsive default.
  await page.addInitScript(() => localStorage.removeItem("ecc.sidebar.collapsed"));
  const shellGeometry = async () => {
    const g = await page.evaluate(() => {
      const main = document.querySelector(".ecc-main"), rail = document.querySelector(".ecc-sidebar");
      const content = document.querySelector(".ecc-workspace-content"), legal = document.querySelector(".ecc-legal");
      if (!main || !rail || !content || !legal) throw new Error("Production shell missing");
      return { mainWidth: main.clientWidth, mainScrollWidth: main.scrollWidth,
        sidebarWidth: rail.getBoundingClientRect().width, contentWidth: content.clientWidth,
        contentPadding: getComputedStyle(content).paddingInlineStart,
        fontFamily: getComputedStyle(legal).fontFamily, legalWidth: legal.getBoundingClientRect().width };
    });
    assert.ok(g.sidebarWidth > 0 && g.mainWidth < await page.evaluate(() => innerWidth), "Sidebar must reduce content width");
    assert.ok(g.mainScrollWidth <= g.mainWidth + 1, `Workspace overflow: ${JSON.stringify(g)}`);
    assert.match(g.fontFamily, /Inter/); return g;
  };
  page.on("console", m => { if (m.type() === "error") receipt.consoleErrors.push(m.text()); });
  page.on("pageerror", e => receipt.pageErrors.push(e.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || /^\/(api|bff)(\/|$)/.test(url.pathname)) {
      receipt.rejectedRequests.push(url.origin + url.pathname); return route.abort();
    }
    return route.continue();
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:4181/ops/legal/case-manager", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Legal command", exact: true })).toBeVisible();
    await expect(page.locator(".ecc-legal-list li")).toHaveCount(3);
    await expect(page.getByLabel("Loaded legal record summary")).toContainText("Verified award identities1");
    await expect(page.getByLabel("Loaded legal record summary")).toContainText("Matters with unreported amounts1");
    await page.getByRole("button", { name: "Intake", exact: true }).click();
    await expect(page.locator(".ecc-legal-list li")).toHaveCount(1);
    await page.getByRole("button", { name: "All loaded", exact: true }).click();
    await page.getByLabel("Search legal matters").fill("SYNTHETIC JOINT");
    await expect(page.locator(".ecc-legal-list li")).toHaveCount(1);
    await page.getByLabel("Search legal matters").fill("");
    const targets = [];
    for (const el of await page.locator('.ecc-legal button,.ecc-legal input,.ecc-legal a').all()) {
      const b = await el.boundingBox(); assert.ok(b && b.width >= 44 && b.height >= 44); targets.push(b);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Register overflow");
    const registerShell = await shellGeometry();
    await page.screenshot({ path: path.join(artifacts, `legal-${width}-register.png`) });
    await page.locator('a[href="/ops/legal/matters/joint"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, `legal-${width}-register-scrolled.png`) });
    await page.locator('a[href="/ops/legal/matters/zero"]').click();
    await expect(page.getByRole("heading", { name: "EXAMPLE v. DEMO" })).toBeVisible();
    await page.getByRole("tab", { name: "Overview", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Timeline", exact: true })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Timeline", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End"); await expect(page.getByRole("tab", { name: "Audit", exact: true })).toBeFocused();
    await page.keyboard.press("Home"); await expect(page.getByRole("tab", { name: "Overview", exact: true })).toBeFocused();
    await page.getByRole("tab", { name: "Judgment", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Recorded award amount: 0 cents");
    await page.reload();
    await expect(page.getByRole("heading", { name: "EXAMPLE v. DEMO" })).toBeVisible();
    await page.goto("http://127.0.0.1:4181/ops/legal/matters/zero?id=m-001");
    await expect(page.getByRole("heading", { name: "EXAMPLE v. DEMO" })).toBeVisible();
    await page.goto("http://127.0.0.1:4181/ops/legal/matters/m-001");
    await page.getByRole("tab", { name: "Judgment", exact: true }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Recorded award amount: Not reported");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Matter overflow");
    const matterShell = await shellGeometry();
    await page.screenshot({ path: path.join(artifacts, `legal-${width}-matter.png`) });
    await page.getByRole("tabpanel").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifacts, `legal-${width}-matter-panel.png`) });
    await page.goto("http://127.0.0.1:4181/ops/legal/matters/missing");
    await expect(page.getByText("Matter not found.", { exact: true })).toBeVisible();
    await page.goto("http://127.0.0.1:4181/ops/legal/matters/bad!id");
    await expect(page.getByText("That matter link is not valid.", { exact: true })).toBeVisible();
    await page.goto("http://127.0.0.1:4181/ops/legal/matters/zero");
    for (const [mode, expected] of [["unavailable", "Legal workspace is not available."], ["denied", "You don't have access to this legal matter."], ["error", "Synthetic load failure"], ["loading", "Loading legal matter…"]]) {
      await page.locator(`[data-mode="${mode}"]`).click();
      await expect(page.getByText(expected, { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "EXAMPLE v. DEMO" })).toHaveCount(0);
    }
    await page.goto("http://127.0.0.1:4181/ops/legal/case-manager");
    await page.getByLabel("Search legal matters").fill("SYNTHETIC JOINT");
    await page.locator('[data-mode="session"]').click();
    await expect(page.getByLabel("Search legal matters")).toHaveValue("");
    await page.locator('[data-mode="stale"]').click();
    await expect(page.getByText("Legal list may be out of date.", { exact: true })).toBeVisible();
    await page.locator('[data-mode="empty"]').click();
    await expect(page.getByText("No legal matters are available.", { exact: true })).toBeVisible();
    await expect(page.locator(".ecc-legal-list li")).toHaveCount(0);
    await page.locator('[data-mode="ready"]').click();
    await expect(page.locator(".ecc-legal-list li")).toHaveCount(3);
    await page.locator('[data-mode="other-denial"]').click();
    await expect(page.getByText("Legal records were cleared after an access change.", { exact: true })).toBeVisible();
    await expect(page.locator(".ecc-legal-list li")).toHaveCount(0);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.locator(".ecc-legal-list li")).toHaveCount(3);
    receipt.viewports.push({ width, registerShell, matterShell, targets: targets.length, navigation: "passed", keyboard: "passed", states: "passed", sessionAndDenial: "passed", overflow: 0 });
  }
  assert.deepEqual(receipt.consoleErrors, []); assert.deepEqual(receipt.pageErrors, []); assert.deepEqual(receipt.rejectedRequests, []);
  receipt.passed = true;
} finally {
  await writeFile(path.join(artifacts, "legal-receipt.json"), JSON.stringify(receipt, null, 2));
  await browser?.close(); await server?.httpServer?.close();
  console.log(JSON.stringify({ artifacts, ...receipt }));
}
