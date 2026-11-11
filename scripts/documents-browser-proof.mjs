import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
const scratch = await mkdtemp(path.join(tmpdir(), "ecc-documents-proof-"));
const artifacts = process.env.PROOF_ARTIFACT_DIR || path.join(scratch, "artifacts");
await mkdir(artifacts, { recursive: true });
process.env.ECC_DOCUMENTS_PROOF_OUT = path.join(scratch, "dist");
const receipt = { kind: "SYNTHETIC_EXACT_SOURCE_NOT_LIVE", sourceHead: process.env.SOURCE_HEAD_SHA || null, head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  worktree: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(), viewports: [], consoleErrors: [], pageErrors: [], rejectedRequests: [] };
let browser, server;
try {
  const configFile = path.resolve("scripts/documents-proof-vite.config.mjs");
  await build({ configFile });
  await mkdir(path.join(process.env.ECC_DOCUMENTS_PROOF_OUT, "brand"));
  for (const logo of ["altus-logo.png", "altus-mark.png"]) await copyFile(path.resolve("public/brand", logo), path.join(process.env.ECC_DOCUMENTS_PROOF_OUT, "brand", logo));
  server = await preview({ configFile });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  const page = await browser.newPage({ acceptDownloads: true });
  await page.addInitScript(() => localStorage.removeItem("ecc.sidebar.collapsed"));
  page.on("console", m => { if (m.type() === "error") receipt.consoleErrors.push(m.text()); });
  page.on("pageerror", e => receipt.pageErrors.push(e.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" || /^\/(api|bff)(\/|$)/.test(url.pathname)) {
      receipt.rejectedRequests.push(url.origin + url.pathname); return route.abort();
    }
    return route.continue();
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:4183", { waitUntil: "networkidle" });
    const docs = page.getByRole("region", { name: "Ownership documents", exact: true });
    await expect(docs.locator("li")).toHaveCount(2);
    await docs.getByRole("button", { name: "Owner Statements & Reports", exact: true }).click();
    await expect(docs.locator("li")).toHaveCount(1);
    await expect(docs.getByRole("button", { name: "Download", exact: true })).toBeDisabled();
    await docs.getByRole("button", { name: "All documents", exact: true }).click();
    await docs.getByLabel("Search documents").fill("management");
    await expect(docs.locator("li")).toHaveCount(1);
    const downloading = page.waitForEvent("download");
    await docs.getByRole("button", { name: "Download", exact: true }).click();
    const downloaded = await downloading;
    assert.equal(await readFile(await downloaded.path(), "utf8"), "SYNTHETIC DOWNLOAD ONLY");
    await page.locator('[data-mode="session"]').press("Enter");
    await expect(docs.getByLabel("Search documents")).toHaveValue("");
    await expect(docs.locator("li")).toHaveCount(2);
    const geometry = await page.evaluate(() => {
      const rail = document.querySelector(".ecc-sidebar"), main = document.querySelector(".ecc-main");
      return { width: innerWidth, pageWidth: document.documentElement.scrollWidth, mainWidth: main.clientWidth,
        mainScrollWidth: main.scrollWidth, sidebarWidth: rail.getBoundingClientRect().width };
    });
    assert.ok(geometry.pageWidth <= width + 1 && geometry.mainScrollWidth <= geometry.mainWidth + 1, JSON.stringify(geometry));
    for (const target of await docs.locator("button,input").all()) {
      const b = await target.boundingBox(); assert.ok(b && b.height >= 44 && b.width >= 44);
    }
    await page.screenshot({ path: path.join(artifacts, `documents-${width}-owner.png`) });
    await page.locator('[data-mode="property"]').press("Enter");
    const property = page.getByRole("region", { name: "Property documents", exact: true });
    await expect(property.getByRole("button", { name: "Property Pics & Video", exact: true })).toBeVisible();
    await property.getByRole("button", { name: "Linked ownership documents", exact: true }).click();
    await expect(property.locator("li")).toHaveCount(1);
    await expect(property.locator("li")).toContainText("Linked from ownership");
    await page.screenshot({ path: path.join(artifacts, `documents-${width}-property.png`) });
    for (const [mode, text] of [["unavailable", "Document storage is not connected yet."], ["denied", "You don't have access to these documents."],
      ["missing", "This document record was not found."], ["stale", "Documents need a fresh verification."], ["conflict", "Document records need reconciliation."],
      ["loading", "Loading documents..."], ["error", "Documents could not be loaded."], ["empty", "No documents were returned for this folder."]]) {
      await page.locator(`[data-mode="${mode}"]`).press("Enter");
      await expect(page.getByText(text, { exact: true })).toBeVisible();
      await expect(page.locator(".ecc-docs__list li")).toHaveCount(0);
    }
    await page.locator('[data-mode="ready"]').press("Enter");
    await expect(page.locator(".ecc-docs__list li")).toHaveCount(2);
    await page.locator('[data-mode="other-denial"]').press("Enter");
    await expect(page.locator(".ecc-docs__list li")).toHaveCount(0);
    await page.reload(); await expect(page.locator(".ecc-docs__list li")).toHaveCount(2);
    receipt.viewports.push(geometry);
  }
  assert.deepEqual(receipt.consoleErrors, []); assert.deepEqual(receipt.pageErrors, []); assert.deepEqual(receipt.rejectedRequests, []);
  receipt.result = "PASS";
} catch (error) { receipt.result = "FAIL"; receipt.error = String(error.stack || error); process.exitCode = 1; }
finally { await browser?.close(); await new Promise(r => server?.httpServer.close(r) || r());
  await writeFile(path.join(artifacts, "receipt.json"), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ ...receipt, artifacts })); }
