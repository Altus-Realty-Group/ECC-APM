import { test, expect, type Locator, type Page } from "@playwright/test";
import net from "node:net";
import path from "node:path";
import { createServer, type ViteDevServer } from "vite";

/**
 * R8-C populated lifecycle journeys for /ops/operations, desktop and 390px.
 *
 * What is real: the mounted OperationsRecoveryView, createQueryClient (shared denial purge), installSessionBoundary,
 * the access guard and the production session-scoped fetcher, all served by a Vite dev server from the repo's own
 * config. What is fixture: the three operations contracts (marked verified ONLY inside e2e/fixtures/operations-harness)
 * and every row, all invented and answered by Playwright. The built production app keeps all three domains
 * unverified with zero requests (e2e/recovery-operations.spec.ts). This is fixture/lifecycle proof, NOT operating-data
 * or authorization acceptance: no live identity, backend or data is involved.
 */

const HARNESS = "/e2e/fixtures/operations-harness/index.html";
const P = { legal: "/fixture/legal", work: "/fixture/work-orders", ledger: "/fixture/ledger", portfolio: "/fixture/portfolio" } as const;
const OPS = [P.legal, P.work, P.ledger] as const;
const BOUNDARY = "ecc:session-boundary";

type Reply = { status: number; body: unknown };
const ok = (body: unknown): Reply => ({ status: 200, body });
const status = (code: number): Reply => ({ status: code, body: { error: "fixture" } });

/** Invented data. A = the first signed-in account, B = the account after a session boundary. */
const A = {
  legal: ok({ data: [
    { id: "a-case-1", type: "Eviction", status: "Filed", tenantName: "Alder Tenant", propertyName: "Alder Court", unitLabel: "2B", filedDate: "2026-03-05", courtDate: "2026-04-09", amountClaimedCents: 125000 },
    { id: "a-case-2", type: "Damages", status: "Open", tenantName: "Alder Second Tenant", propertyName: "Alder Court", unitLabel: "3C", filedDate: "2026-03-06", amountClaimedCents: null },
  ] }),
  work: ok({ data: [
    { id: "a-wo-1", description: "Alder leak repair", propertyName: "Alder Court", unitLabel: "2B", priority: "HIGH", status: "OPEN", scheduledDate: "2026-03-10", estimatedCostCents: 45000, actualCostCents: 0 },
    { id: "a-wo-2", description: "Alder hallway light", propertyName: "Alder Court", priority: "LOW", status: "ASSIGNED", estimatedCostCents: null, actualCostCents: null },
  ] }),
  ledger: ok({ data: [
    { id: "a-e1", leaseId: "LA-100", kind: "charge", postedOn: "2026-03-01", amountCents: 150000, memo: "March rent" },
    { id: "a-e2", leaseId: "LA-100", kind: "payment", postedOn: "2026-03-03", amountCents: 50000 },
    { id: "a-e3", leaseId: "LA-200", kind: "charge", postedOn: "2026-03-01", amountCents: 90000 },
    { id: "a-e4", leaseId: "LA-200", kind: "credit", postedOn: "2026-03-04", amountCents: 10000 },
  ] }),
  portfolio: ok({ data: [{ id: "a-p1", name: "Alder Court Portfolio Row" }] }),
};
const B = {
  legal: ok({ data: [{ id: "b-case-1", type: "Other", status: "Open", tenantName: "Birch Tenant", propertyName: "Birch Place", filedDate: "2026-05-01" }] }),
  work: ok({ data: [{ id: "b-wo-1", description: "Birch gutter clean", priority: "MEDIUM", status: "OPEN" }] }),
  ledger: ok({ data: [{ id: "b-e1", leaseId: "LB-900", kind: "charge", postedOn: "2026-05-01", amountCents: 70000 }] }),
  portfolio: ok({ data: [{ id: "b-p1", name: "Birch Place Portfolio Row" }] }),
};
const EMPTY = ok({ data: [] });

const PRIOR_TEXT = ["Alder Tenant", "Alder Second Tenant", "Alder leak repair", "Alder hallway light", "Lease LA-100", "Lease LA-200", "Alder Court Portfolio Row"];
const BIRCH_TEXT = ["Birch Tenant", "Birch gutter clean", "Lease LB-900"];

/** Answers /fixture/* from Playwright. A path can be held, so a response can be released after a later event. */
class FixtureNet {
  readonly hits: string[] = [];
  private replies = new Map<string, Reply>();
  private held = new Set<string>();
  private queue: { path: string; send: (r: Reply) => Promise<void> }[] = [];
  serve(path: string, reply: Reply) { this.replies.set(path, reply); }
  serveAll(set: { legal: Reply; work: Reply; ledger: Reply; portfolio: Reply }) {
    this.serve(P.legal, set.legal); this.serve(P.work, set.work); this.serve(P.ledger, set.ledger); this.serve(P.portfolio, set.portfolio);
  }
  hold(...paths: string[]) { paths.forEach((p) => this.held.add(p)); }
  unhold(...paths: string[]) { paths.forEach((p) => this.held.delete(p)); }
  count(path: string) { return this.hits.filter((h) => h === path).length; }
  pending(path: string) { return this.queue.filter((q) => q.path === path); }
  /** Release one held request with the given reply. A request the app already aborted simply cannot be answered. */
  async release(held: { send: (r: Reply) => Promise<void> }, reply: Reply) {
    this.queue = this.queue.filter((q) => q !== held);
    await held.send(reply);
  }
  async releaseAll(path: string, reply: Reply) {
    for (const h of this.pending(path)) await this.release(h, reply);
  }
  async install(page: Page) {
    await page.route("**/fixture/**", async (route) => {
      const p = new URL(route.request().url()).pathname;
      this.hits.push(p);
      const send = async (r: Reply) => {
        try { await route.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.body) }); }
        catch { /* the app aborted this request (session boundary or purge) */ }
      };
      if (this.held.has(p)) { this.queue.push({ path: p, send }); return; }
      await send(this.replies.get(p) ?? status(500));
    });
  }
}

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const port = (s.address() as net.AddressInfo).port; s.close(() => resolve(port)); });
  });
}

let server: ViteDevServer | undefined;
let base = "";
test.beforeAll(async () => {
  const port = await freePort();
  server = await createServer({ configFile: path.resolve("vite.config.js"), logLevel: "error", server: { host: "127.0.0.1", port, strictPort: true } });
  await server.listen();
  base = `http://127.0.0.1:${port}`;
});
test.afterAll(async () => { await server?.close(); });

async function open(page: Page, fixtureNet: FixtureNet) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixtureNet.install(page);
  await page.goto(base + HARNESS);
  await expect(page.getByTestId("operations-recovery")).toBeVisible();
  return errors;
}

const boundary = (page: Page) => page.evaluate((name) => { window.dispatchEvent(new Event(name)); }, BOUNDARY);
const refetch = (page: Page, key: unknown[]) => page.evaluate((k) => window.__eccHarness.refetch(k), key);
const cachedKeys = (page: Page) => page.evaluate(() => window.__eccHarness.cachedKeys());
/** Two animation frames: lets React and TanStack flush anything a late response could have caused. */
const settle = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

async function expectNoneOf(page: Page, texts: string[]) {
  for (const t of texts) await expect(page.getByText(t), t).toHaveCount(0);
}
async function expectAllOf(page: Page, texts: string[]) {
  for (const t of texts) await expect(page.getByText(t, { exact: false }).first(), t).toBeVisible();
}
async function waitPopulated(page: Page) {
  await expect(page.getByTestId("ops-legal-table")).toBeVisible();
  await expect(page.getByTestId("ops-wo-table")).toBeVisible();
  await expect(page.getByTestId("ops-ledger")).toBeVisible();
  await expect(page.getByText("Alder Court Portfolio Row")).toBeVisible();
}

async function pageOverflow(page: Page) {
  return page.evaluate(() => Math.max(
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.documentElement.clientWidth,
  ));
}

/** Every visible interactive control (and focusable region) must be at least 44 x 44 CSS px. */
async function undersizedTargets(page: Page) {
  return page.evaluate(() => {
    const sel = "button, a[href], input, select, textarea, [role=button], [tabindex]:not([tabindex='-1'])";
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.width < 44 || r.height < 44) bad.push(`${el.tagName}:${el.getAttribute("aria-label") ?? el.textContent?.trim()}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return bad;
  });
}

/** Tab until the focused element satisfies `matches`; fails if it is never reached. */
async function tabTo(page: Page, matches: (d: { tag: string; label: string; notice: string }) => boolean, limit = 60) {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const d = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return {
        tag: el?.tagName ?? "", label: el?.getAttribute("aria-label") ?? el?.textContent?.trim() ?? "",
        notice: (el?.closest("[data-testid^='ops-']") as HTMLElement | null)?.dataset.testid ?? "",
      };
    });
    if (matches(d)) return d;
  }
  throw new Error("keyboard focus never reached the expected control");
}

const lease = (page: Page, id: string): Locator =>
  page.getByTestId("ops-ledger-lease").filter({ has: page.getByRole("heading", { level: 3, name: `Lease ${id}` }) });

function journeys() {
  test("production contracts stay unverified and the harness fixture contracts are the only verified ones", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A);
    await open(page, n);
    expect(await page.evaluate(() => window.__eccHarness.productionStatuses())).toEqual([
      "legalCases:unverified:none", "workOrders:unverified:none", "ledgerEntries:unverified:none",
    ]);
  });

  test("populated fixtures render truthfully: per-lease ledgers, null versus zero, plain copy, no overflow, keyboard and 44px", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A);
    const errors = await open(page, n);
    await waitPopulated(page);
    // Only the fixture endpoints were requested, once each: no unverified production path was touched.
    expect([...new Set(n.hits)].sort()).toEqual([P.ledger, P.legal, P.portfolio, P.work].sort());
    for (const p of [P.legal, P.work, P.ledger, P.portfolio]) expect(n.count(p), p).toBe(1);

    // legal: a recorded claim is formatted; an unreported claim is a dash, never $0.00
    const legal = page.getByTestId("ops-legal-table");
    await expect(legal.getByRole("row").filter({ hasText: "Alder Tenant" })).toContainText("$1,250.00");
    await expect(legal.getByRole("row").filter({ hasText: "Alder Second Tenant" })).toContainText("—");
    await expect(legal.getByRole("row").filter({ hasText: "Alder Second Tenant" })).not.toContainText("$0.00");
    // work orders: a recorded zero stays $0.00, an unrecorded cost is a dash
    const wo = page.getByTestId("ops-wo-table");
    await expect(wo.getByRole("row").filter({ hasText: "Alder leak repair" })).toContainText("$0.00");
    await expect(wo.getByRole("row").filter({ hasText: "Alder hallway light" })).not.toContainText("$");
    // ledger: two leases, two separate balances, never a combined one
    await expect(page.getByTestId("ops-ledger-lease")).toHaveCount(2);
    await expect(lease(page, "LA-100").getByTestId("ops-ledger-balance")).toHaveText("$1,000.00");
    await expect(lease(page, "LA-200").getByTestId("ops-ledger-balance")).toHaveText("$800.00");
    await expect(page.getByTestId("operations-recovery")).not.toContainText("$1,800.00");
    await expect(page.getByTestId("operations-recovery")).not.toContainText("$2,400.00");
    // plain copy and no controls in the ready state
    const text = (await page.getByTestId("operations-recovery").innerText()).toLowerCase();
    for (const word of ["backend", "contract", "idempoten", "endpoint", "/fixture/", "/api/", "integer cents", "undefined"]) {
      expect(text, word).not.toContain(word.toLowerCase() === "nan" ? "not a number" : word.toLowerCase());
    }
    await expect(page.getByTestId("operations-recovery").locator("button, form, input, select, textarea")).toHaveCount(0);
    // structure
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Operations");
    await expect(page.getByTestId("operations-recovery").getByRole("heading", { level: 2 })).toHaveText(["Legal cases", "Work orders", "Tenant ledger"]);
    await expect(page.getByRole("heading", { level: 3 })).toHaveText(["Lease LA-100", "Lease LA-200"]);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(await undersizedTargets(page)).toEqual([]);
    // keyboard: every scrollable table region is reachable and named
    for (const name of ["Legal cases", "Work orders", "Ledger entries for lease LA-100", "Ledger entries for lease LA-200"]) {
      await tabTo(page, (d) => d.label === name);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("empty, malformed and overflowing sources are never shown as data and never as zero", async ({ page }) => {
    const n = new FixtureNet();
    n.serve(P.legal, EMPTY);
    n.serve(P.work, ok({ data: [{ id: "x", description: "Float cost", estimatedCostCents: 12.5 }] }));   // 12.5 is not integer cents -> payload rejected
    n.serve(P.ledger, ok({ data: [                                           // 2 x 9,007,199,254,740,000 cents exceeds the safe range
      { id: "o1", leaseId: "LX-1", kind: "charge", postedOn: "2026-03-01", amountCents: 9007199254740000 },
      { id: "o2", leaseId: "LX-1", kind: "charge", postedOn: "2026-03-02", amountCents: 9007199254740000 },
    ] }));
    n.serve(P.portfolio, A.portfolio);
    const errors = await open(page, n);
    await expect(page.getByTestId("ops-legal-empty")).toBeVisible();
    await expect(page.getByTestId("ops-error-workOrders")).toBeVisible();
    await expect(page.getByTestId("ops-error-ledgerEntries")).toBeVisible();
    await expect(page.getByTestId("ops-wo-table")).toHaveCount(0);
    await expect(page.getByTestId("ops-ledger")).toHaveCount(0);
    await expect(page.getByTestId("ops-ledger-balance")).toHaveCount(0);
    await expect(page.getByTestId("operations-recovery")).not.toContainText("$0.00");
    await expect(page.getByTestId("operations-recovery")).not.toContainText("Balance due");
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(await undersizedTargets(page)).toEqual([]);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("an empty ledger says the balance is unknown, not $0.00", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll({ ...A, legal: EMPTY, work: EMPTY, ledger: EMPTY });
    await open(page, n);
    await expect(page.getByTestId("ops-ledger-empty")).toContainText("Balance is unknown, not $0.00.");
    await expect(page.getByTestId("ops-wo-empty")).toBeVisible();
    await expect(page.getByTestId("operations-recovery")).not.toContainText(/\$0\.00(?!\.)/);
  });

  test("loading is announced while a request is in flight and nothing else is shown", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A); n.hold(...OPS);
    await open(page, n);
    for (const d of ["legalCases", "workOrders", "ledgerEntries"]) {
      const l = page.getByTestId(`ops-loading-${d}`);
      await expect(l).toBeVisible();
      await expect(l).toHaveAttribute("aria-busy", "true");
    }
    await expectNoneOf(page, PRIOR_TEXT.filter((t) => !t.includes("Portfolio")));      // the portfolio probe is not held in this test
    n.unhold(...OPS);
    for (const p of OPS) await n.releaseAll(p, p === P.legal ? A.legal : p === P.work ? A.work : A.ledger);
    await expect(page.getByTestId("ops-legal-table")).toBeVisible();
  });

  test("a session boundary removes populated rows at once and a late prior-session response cannot restore them", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A);
    const errors = await open(page, n);
    await waitPopulated(page);
    expect((await cachedKeys(page)).length).toBeGreaterThan(0);

    // A session-one refresh is still in flight when the boundary arrives.
    n.hold(...OPS, P.portfolio);
    void refetch(page, ["recovery-operations", "workOrders"]);
    await expect.poll(() => n.pending(P.work).length).toBeGreaterThan(0);
    const stale = n.pending(P.work)[0];

    await boundary(page);
    // Rows for the previous account are gone immediately; replacement requests are loading, never placeholders.
    await expectNoneOf(page, PRIOR_TEXT);
    for (const d of ["legalCases", "workOrders", "ledgerEntries"]) await expect(page.getByTestId(`ops-loading-${d}`)).toBeVisible();
    await expect.poll(async () => (await cachedKeys(page)).filter((k) => k.includes('",0,"'))).toEqual([]);   // no epoch-0 data survives

    // The prior session's response arrives late. It is discarded.
    await n.release(stale, A.work);
    await settle(page);
    await expectNoneOf(page, PRIOR_TEXT);
    for (const d of ["legalCases", "workOrders", "ledgerEntries"]) await expect(page.getByTestId(`ops-loading-${d}`)).toBeVisible();

    // The current session answers: only its rows appear.
    n.unhold(...OPS, P.portfolio); n.serveAll(B);
    await n.releaseAll(P.legal, B.legal); await n.releaseAll(P.work, B.work); await n.releaseAll(P.ledger, B.ledger); await n.releaseAll(P.portfolio, B.portfolio);
    await expectAllOf(page, BIRCH_TEXT);
    await expectNoneOf(page, PRIOR_TEXT);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a 403 in one operations domain removes protected data everywhere; siblings are cleared, not loading; Retry recovers in this session", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A);
    const errors = await open(page, n);
    await waitPopulated(page);
    const hitsBefore = { work: n.count(P.work), ledger: n.count(P.ledger), portfolio: n.count(P.portfolio) };

    n.serve(P.legal, status(403));
    await refetch(page, ["recovery-operations", "legalCases"]);
    await expect(page.getByTestId("ops-denied-legalCases")).toBeVisible();
    await expect(page.getByTestId("ops-denied-legalCases")).toContainText("You don't have access to legal cases");
    // every protected row is gone: operations domains and the portfolio cache
    await expectNoneOf(page, PRIOR_TEXT);
    await expect(page.getByTestId("ops-legal-table")).toHaveCount(0);
    expect(await cachedKeys(page)).toEqual([]);
    // siblings truthfully say they were cleared; nothing claims to be loading and no request was made on their behalf
    for (const d of ["workOrders", "ledgerEntries"]) {
      await expect(page.getByTestId(`ops-cleared-${d}`)).toBeVisible();
      await expect(page.getByTestId(`ops-loading-${d}`)).toHaveCount(0);
    }
    expect({ work: n.count(P.work), ledger: n.count(P.ledger), portfolio: n.count(P.portfolio) }).toEqual(hitsBefore);
    expect(await undersizedTargets(page)).toEqual([]);

    // Retry by keyboard in the CURRENT session restores only that domain
    await tabTo(page, (d) => d.tag === "BUTTON" && d.notice === "ops-cleared-workOrders");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("ops-wo-table")).toBeVisible();
    await expect(page.getByText("Alder leak repair")).toBeVisible();
    await expect(page.getByTestId("ops-cleared-ledgerEntries")).toBeVisible();
    await expect(page.getByTestId("ops-denied-legalCases")).toBeVisible();
    await expect(page.getByText("Alder Court Portfolio Row")).toHaveCount(0);        // other features' cache is not silently restored
    await expect(page.getByText("Alder Tenant")).toHaveCount(0);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("Retry started in one session cannot bring that session's rows into the next", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A);
    const errors = await open(page, n);
    await waitPopulated(page);
    n.serve(P.legal, status(403));
    await refetch(page, ["recovery-operations", "legalCases"]);
    await expect(page.getByTestId("ops-cleared-ledgerEntries")).toBeVisible();

    // Retry the ledger, but hold the response; the session ends first.
    n.hold(P.ledger);
    await page.getByTestId("ops-cleared-ledgerEntries").getByRole("button", { name: "Retry" }).click();
    await expect.poll(() => n.pending(P.ledger).length).toBeGreaterThan(0);
    const staleRetry = n.pending(P.ledger)[0];
    n.hold(...OPS);
    n.serve(P.portfolio, B.portfolio);                                                  // the backend now answers for the new account
    await boundary(page);
    await expectNoneOf(page, PRIOR_TEXT);
    await n.release(staleRetry, A.ledger);                                              // late prior-session answer
    await settle(page);
    await expectNoneOf(page, PRIOR_TEXT);
    await expect(page.getByTestId("ops-denied-legalCases")).toHaveCount(0);            // the old denial does not carry over
    await expect(page.getByTestId("ops-loading-ledgerEntries")).toBeVisible();

    n.unhold(...OPS); n.serveAll(B);
    await n.releaseAll(P.ledger, B.ledger); await n.releaseAll(P.legal, B.legal); await n.releaseAll(P.work, B.work);
    await expect(lease(page, "LB-900").getByTestId("ops-ledger-balance")).toHaveText("$700.00");
    await expectNoneOf(page, PRIOR_TEXT);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("an ordinary failure shows an error with Retry (44px, keyboard) and recovers in the current session", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A); n.serve(P.work, status(500));
    const errors = await open(page, n);
    await expect(page.getByTestId("ops-error-workOrders")).toBeVisible();                // after the one transient retry
    await expect(page.getByTestId("ops-error-workOrders")).toContainText("Work orders could not be loaded");
    await expect(page.getByTestId("ops-legal-table")).toBeVisible();                     // other domains are unaffected by a 500
    const retry = page.getByTestId("ops-error-workOrders").getByRole("button", { name: "Retry" });
    const box = await retry.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44, JSON.stringify(box)).toBe(true);
    n.serve(P.work, A.work);
    await tabTo(page, (d) => d.tag === "BUTTON" && d.notice === "ops-error-workOrders");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("ops-wo-table")).toBeVisible();
    await expect(page.getByTestId("ops-error-workOrders")).toHaveCount(0);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("a denial on first load is shown as denied with no Retry and no rows", async ({ page }) => {
    const n = new FixtureNet(); n.serveAll(A); n.serve(P.ledger, status(401));
    await open(page, n);
    await expect(page.getByTestId("ops-denied-ledgerEntries")).toBeVisible();
    await expect(page.getByTestId("ops-denied-ledgerEntries").getByRole("button")).toHaveCount(0);
    await expect(page.getByTestId("ops-ledger")).toHaveCount(0);
    await expect(page.getByTestId("ops-ledger-balance")).toHaveCount(0);
    expect(await undersizedTargets(page)).toEqual([]);
  });
}

test.describe("operations lifecycle - desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  journeys();
});

test.describe("operations lifecycle - 390px", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  journeys();
});
