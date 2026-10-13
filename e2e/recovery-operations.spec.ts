import { test, expect, type Page } from "@playwright/test";

/**
 * R1-C /ops/operations journeys against the BUILT app, desktop and 390px.
 * Network is fully mocked and every request is recorded. This proves mounted-route behavior with no verified
 * operations source: it is NOT live-data acceptance, and it cannot exercise ready/denied/error states because
 * no domain is verified (those are covered by unit tests on the state renderer and resolver).
 */

const UNVERIFIED_PATHS = [/\/api\/legal/, /\/api\/maintenance\/work-?orders/, /\/api\/lease-(charges|payments)/, /\/api\/accounting/];

async function open(page: Page) {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(new URL(r.url()).pathname));
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/ops/operations");
  await expect(page.getByTestId("operations-recovery")).toBeVisible();
  return { requests, errors };
}

function journeys() {
  test("mounted route shows each domain as plainly unavailable with zero requests and no actions", async ({ page }) => {
    const { requests, errors } = await open(page);
    await expect(page.getByTestId("route-not-found")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Operations" })).toBeVisible();
    for (const d of ["legalCases", "workOrders", "ledgerEntries"]) {
      await expect(page.getByTestId(`ops-gate-${d}`)).toBeVisible();
    }
    const page_ = page.getByTestId("operations-recovery");
    await expect(page_).toContainText("Legal cases are not available yet");
    await expect(page_).toContainText("Work orders are not available yet");
    await expect(page_).toContainText("The tenant ledger is not available yet");
    // operator copy carries no implementation vocabulary
    const text = (await page_.innerText()).toLowerCase();
    for (const word of ["backend", "contract", "idempoten", "endpoint", "/api/", "integer cents", "503"]) {
      expect(text, word).not.toContain(word);
    }
    await expect(page_.locator("button, form, input, select, textarea")).toHaveCount(0);
    for (const re of UNVERIFIED_PATHS) expect(requests.filter((p) => re.test(p)), String(re)).toEqual([]);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("single main landmark, ordered headings and no horizontal overflow", async ({ page }) => {
    await open(page);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByTestId("operations-recovery").getByRole("heading", { level: 2 })).toHaveText([
      "Legal cases", "Work orders", "Tenant ledger",
    ]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("status notices are announced politely and the page is keyboard reachable", async ({ page }) => {
    await open(page);
    const gate = page.getByTestId("ops-gate-legalCases");
    await expect(gate).toHaveAttribute("role", "status");
    await expect(gate).toHaveAttribute("aria-live", "polite");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(focused).not.toBe("BODY");
  });
}

test.describe("operations recovery - desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  journeys();
});

test.describe("operations recovery - 390px", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  journeys();
});
