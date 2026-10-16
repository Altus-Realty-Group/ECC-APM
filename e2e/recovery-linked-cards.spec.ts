import { test, expect, type Page } from "@playwright/test";
import net from "node:net";
import path from "node:path";
import { createServer, type Plugin, type ViteDevServer } from "vite";

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

// ---------------------------------------------------------------------------------------------------------------
// R8-C2 lifecycle journeys, desktop (1280) and 390px.
//
// Real: the repository's own entry (index.html -> src/main.tsx -> App), real card pages, real query client, real
// session-boundary listener, real session-scoped fetcher, all served by Vite from the repo's own config. The one
// addition is IN-MEMORY and READ-ONLY: a Vite transform appends `window.__eccQc = queryClient` to the served copy of
// src/lib/queryClient.ts so the test can ask the real client to refresh an already-loaded card (the shipped UI has no
// refresh control). No product file is edited. Fixture: every card response below is invented and answered by
// Playwright; nothing here is live data, identity or authorization, and none of it is operating-data acceptance.
// ---------------------------------------------------------------------------------------------------------------
type Entity = "owner" | "tenant" | "lease" | "unit";
type Reply = { status: number; body: unknown };
const ok = (body: unknown): Reply => ({ status: 200, body });
const fail = (status: number): Reply => ({ status, body: { error: "fixture" } });
const ENTITIES: Entity[] = ["owner", "tenant", "lease", "unit"];
const ID: Record<Entity, number> = { owner: 9, tenant: 2, lease: 4, unit: 8 };
const LABEL: Record<Entity, string> = { owner: "owner", tenant: "tenant", lease: "lease", unit: "unit" };

/** Three disjoint invented data sets: A (first session), LATE (a stale prior-session answer), B (the next session). */
const DATA: Record<"A" | "LATE" | "B", Record<Entity, Reply>> = {
  A: {
    owner: ok({ owner: { id: 9, display_name: "Alder owner" }, properties: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Alder property ${i + 1}` })) }),
    tenant: ok({ tenant: { id: 2, display_name: "Alder tenant" }, activeLease: { id: 4, status: "ACTIVE" }, leases: [{ id: 4, status: "ACTIVE" }, { id: 5, status: "EXPIRED" }] }),
    lease: ok({ lease: { id: 4, status: "ACTIVE", rent_cents: 150099 }, property: { id: 6 }, unit: { id: 8 }, tenant: { id: 2, display_name: "Alder tenant" } }),
    unit: ok({ unit: { id: 8, unit_label: "Alder unit", status: "OCCUPIED" }, property: { id: 6 }, lease: { id: 4, status: "ACTIVE" } }),
  },
  LATE: {
    owner: ok({ owner: { id: 9, display_name: "Late prior owner" }, properties: [{ id: 51, name: "Late prior property" }] }),
    tenant: ok({ tenant: { id: 2, display_name: "Late prior tenant" }, activeLease: { id: 54, status: "ACTIVE" }, leases: [] }),
    lease: ok({ lease: { id: 4, status: "ACTIVE" }, property: { id: 56 }, unit: { id: 58 }, tenant: { id: 52, display_name: "Late prior tenant" } }),
    unit: ok({ unit: { id: 8, unit_label: "Late prior unit", status: "OCCUPIED" }, property: { id: 56 }, lease: { id: 54, status: "ACTIVE" } }),
  },
  B: {
    owner: ok({ owner: { id: 9, display_name: "Birch owner" }, properties: [{ id: 21, name: "Birch property" }] }),
    tenant: ok({ tenant: { id: 2, display_name: "Birch tenant" }, activeLease: null, leases: [{ id: 31, status: "ACTIVE" }] }),
    lease: ok({ lease: { id: 4, status: "ACTIVE" }, property: { id: 66 }, unit: { id: 88 }, tenant: { id: 22, display_name: "Birch tenant" } }),
    unit: ok({ unit: { id: 8, unit_label: "Birch unit", status: "OCCUPIED" }, property: { id: 66 }, lease: { id: 44, status: "ACTIVE" } }),
  },
};
/** What each data set shows: a title that identifies the account and the exact related-record links. */
const SHOWS: Record<"A" | "LATE" | "B", Record<Entity, { title: string; hrefs: string[] }>> = {
  A: {
    owner: { title: "Alder owner", hrefs: Array.from({ length: 8 }, (_, i) => `/card/property/${i + 1}`) },
    tenant: { title: "Alder tenant", hrefs: ["/card/lease/4", "/card/lease/5"] },
    lease: { title: "Lease #4", hrefs: ["/card/property/6", "/card/unit/8", "/card/tenant/2"] },
    unit: { title: "Alder unit", hrefs: ["/card/property/6", "/card/lease/4"] },
  },
  LATE: {
    owner: { title: "Late prior owner", hrefs: ["/card/property/51"] },
    tenant: { title: "Late prior tenant", hrefs: ["/card/lease/54"] },
    lease: { title: "Lease #4", hrefs: ["/card/property/56", "/card/unit/58", "/card/tenant/52"] },
    unit: { title: "Late prior unit", hrefs: ["/card/property/56", "/card/lease/54"] },
  },
  B: {
    owner: { title: "Birch owner", hrefs: ["/card/property/21"] },
    tenant: { title: "Birch tenant", hrefs: ["/card/lease/31"] },
    lease: { title: "Lease #4", hrefs: ["/card/property/66", "/card/unit/88", "/card/tenant/22"] },
    unit: { title: "Birch unit", hrefs: ["/card/property/66", "/card/lease/44"] },
  },
};
/** Strings that must be gone once an account's data is gone. The lease title is its own id (shared), so use names/links. */
const MARKERS: Record<"A" | "LATE" | "B", Record<Entity, string[]>> = {
  A: { owner: ["Alder owner", "Alder property 8"], tenant: ["Alder tenant"], lease: ["Alder tenant"], unit: ["Alder unit"] },
  LATE: { owner: ["Late prior owner", "Late prior property"], tenant: ["Late prior tenant"], lease: ["Late prior tenant"], unit: ["Late prior unit"] },
  B: { owner: ["Birch owner", "Birch property"], tenant: ["Birch tenant"], lease: ["Birch tenant"], unit: ["Birch unit"] },
};

/** Answers the card RPCs from Playwright. An entity can be held so a response is released after a later event. */
class CardNet {
  readonly hits: Entity[] = [];
  private replies = new Map<Entity, Reply>();
  private held = new Set<Entity>();
  private queue: { entity: Entity; send: (r: Reply) => Promise<void> }[] = [];
  serve(entity: Entity, reply: Reply) { this.replies.set(entity, reply); }
  hold(entity: Entity) { this.held.add(entity); }
  unhold(entity: Entity) { this.held.delete(entity); }
  count(entity: Entity) { return this.hits.filter((h) => h === entity).length; }
  pending(entity: Entity) { return this.queue.filter((q) => q.entity === entity); }
  async release(held: { send: (r: Reply) => Promise<void> }, reply: Reply) {
    this.queue = this.queue.filter((q) => q !== held);
    await held.send(reply);
  }
  async install(page: Page) {
    await page.route("**/api/rpc/get_*_card**", async (route) => {
      const entity = /get_(\w+)_card/.exec(route.request().url())?.[1] as Entity;
      this.hits.push(entity);
      const send = async (r: Reply) => {
        try { await route.fulfill({ status: r.status, contentType: "application/json", body: JSON.stringify(r.body) }); }
        catch { /* the app aborted this request (session boundary): there is nothing left to answer */ }
      };
      if (this.held.has(entity)) { this.queue.push({ entity, send }); return; }
      await send(this.replies.get(entity) ?? fail(500));
    });
  }
}

const freePort = () => new Promise<number>((resolve) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const port = (s.address() as net.AddressInfo).port; s.close(() => resolve(port)); });
});
/** In-memory, read-only handle on the real query client. Nothing on disk changes. */
const exposeQueryClient: Plugin = {
  name: "expose-query-client-for-test", enforce: "pre",
  transform(code, id) {
    if (id.split("?")[0].endsWith("/src/lib/queryClient.ts")) return code + "\nif (typeof window !== 'undefined') (window as any).__eccQc = queryClient;\n";
    return null;
  },
};

type Watch = { errors: string[]; consoleErrors: string[] };
async function openCard(page: Page, base: string, net_: CardNet, entity: Entity, id = ID[entity]): Promise<Watch> {
  const watch: Watch = { errors: [], consoleErrors: [] };
  page.on("pageerror", (e) => watch.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") watch.consoleErrors.push(m.text()); });
  await net_.install(page);
  await page.goto(`${base}/card/${entity}/${id}`);
  return watch;
}
/** Only the browser's own notice for a deliberately failed fixture response is tolerated; anything else is a failure. */
function expectCleanConsole(watch: Watch) {
  expect(watch.errors, watch.errors.join("\n")).toEqual([]);
  const unexpected = watch.consoleErrors.filter((t) => !/^Failed to load resource: the server responded with a status of (4\d\d|5\d\d)/.test(t));
  expect(unexpected, unexpected.join("\n")).toEqual([]);
}
const boundary = (page: Page) => page.evaluate(() => { window.dispatchEvent(new Event("ecc:session-boundary")); });
/** Ask the REAL client to refresh a loaded card (the shipped UI has no refresh control). */
const refresh = (page: Page, entity: Entity) => page.evaluate(([e, i]) => (window as any).__eccQc.refetchQueries({ queryKey: ["card", e, i] }), [entity, ID[entity]] as const);
const dataKeys = (page: Page) => page.evaluate(() => (window as any).__eccQc.getQueryCache().getAll().filter((q: any) => q.state.data !== undefined).map((q: any) => JSON.stringify(q.queryKey)) as string[]);
const settle = (page: Page) => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
const cardLinks = (page: Page) => page.locator('main a[href^="/card/"]');
const retryButton = (page: Page) => page.getByRole("button", { name: "Retry", exact: true });

async function pageOverflow(page: Page) {
  return page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
}
/** Every visible interactive control must be at least 44 x 44 CSS px. */
async function undersized(page: Page, shell = false) {
  return page.evaluate((wantShell) => {
    const sel = "button, a[href], input, select, textarea, [role=button], [role=tab], [tabindex]:not([tabindex='-1'])";
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (!!el.closest("nav,header,aside,footer") !== wantShell) continue;   // card content vs app-shell chrome, judged separately
      if (r.width < 44 || r.height < 44) bad.push(`${el.closest("main") ? "main" : (el.closest("header,nav,aside,footer")?.tagName ?? "page").toLowerCase()}>${el.tagName}[${el.getAttribute("aria-label") ?? el.getAttribute("data-testid") ?? ""}]:${(el.textContent ?? "").trim().slice(0, 24)}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return bad;
  }, shell);
}
async function tabTo(page: Page, matches: (d: { tag: string; text: string; href: string }) => boolean, limit = 80) {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const d = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return { tag: el?.tagName ?? "", text: (el?.textContent ?? "").trim(), href: el?.getAttribute("href") ?? "" };
    });
    if (matches(d)) return d;
  }
  throw new Error("keyboard focus never reached the expected control");
}
async function expectShown(page: Page, entity: Entity, set: "A" | "LATE" | "B") {
  await expect(page.getByTestId("tab-linked")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).filter({ hasText: SHOWS[set][entity].title }).first()).toBeVisible();
  await page.getByTestId("tab-linked").click();
  for (const href of SHOWS[set][entity].hrefs) await expect(page.locator(`main a[href="${href}"]`), href).toBeVisible();
}
async function expectGone(page: Page, entity: Entity, set: "A" | "LATE" | "B") {
  for (const t of MARKERS[set][entity]) await expect(page.getByText(t), t).toHaveCount(0);
  for (const href of SHOWS[set][entity].hrefs) await expect(page.locator(`a[href="${href}"]`), href).toHaveCount(0);
}
const hrefSet = async (page: Page) => (await cardLinks(page).evaluateAll((els) => els.map((e) => e.getAttribute("href")))).sort();

function lifecycle() {
  let server: ViteDevServer | undefined;
  let base = "";
  test.beforeAll(async () => {
    const port = await freePort();
    server = await createServer({ configFile: path.resolve("vite.config.js"), plugins: [exposeQueryClient], logLevel: "error", server: { host: "127.0.0.1", port, strictPort: true } });
    await server.listen();
    base = `http://127.0.0.1:${port}`;
  });
  test.afterAll(async () => { await server?.close(); });

  for (const entity of ENTITIES) {
    test(`${entity}: loading is announced with no record details, links or Retry, then the card appears`, async ({ page }) => {
      const n = new CardNet(); n.serve(entity, DATA.A[entity]); n.hold(entity);
      const watch = await openCard(page, base, n, entity);
      const notice = page.getByText(`Loading ${LABEL[entity]}...`);
      await expect(notice).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
      await expect(page.getByTestId("tab-linked")).toHaveCount(0);
      await expect(retryButton(page)).toHaveCount(0);
      await expect(cardLinks(page)).toHaveCount(0);
      await expectGone(page, entity, "A");
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      await expect.poll(() => n.pending(entity).length).toBe(1);
      await n.release(n.pending(entity)[0], DATA.A[entity]);
      await expectShown(page, entity, "A");
      expectCleanConsole(watch);
    });
  }

  test("empty relationships are stated as unreported; no link and no invented destination", async ({ page }) => {
    const empties: Record<Entity, { reply: Reply; text: RegExp[] }> = {
      owner: { reply: ok({ owner: { id: 9, display_name: "Empty owner" }, properties: [] }), text: [/No properties were reported for this owner\./] },
      tenant: { reply: ok({ tenant: { id: 2, display_name: "Empty tenant" }, leases: [], activeLease: null }), text: [/No leases were reported for this tenant\./] },
      lease: { reply: ok({ lease: { id: 4, status: "ACTIVE" }, property: null, unit: null, tenant: null }), text: [/No property was reported for this lease\./, /No unit was reported for this lease\./, /No tenant was reported for this lease\./] },
      unit: { reply: ok({ unit: { id: 8, unit_label: "Empty unit" }, property: null, lease: null }), text: [/No property was reported for this unit\./, /No lease was reported for this unit\./] },
    };
    const n = new CardNet();
    const watch = await openCard(page, base, n, "owner");
    for (const entity of ENTITIES) {
      n.serve(entity, empties[entity].reply);
      await page.goto(`${base}/card/${entity}/${ID[entity]}`);
      await expect(page.getByTestId("tab-linked")).toBeVisible();
      await page.getByTestId("tab-linked").click();
      for (const re of empties[entity].text) await expect(page.getByText(re)).toBeVisible();
      await expect(cardLinks(page)).toHaveCount(0);
      await expect(page.locator('main a[href="/card/property/1"], main a[href="/card/lease/1"], main a[href="/card/unit/1"], main a[href="/card/tenant/1"]')).toHaveCount(0);
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      expect(await undersized(page)).toEqual([]);
    }
    expectCleanConsole(watch);
  });

  test("unusable identifiers stay readable but never become links; names fall back to the record's own id", async ({ page }) => {
    const n = new CardNet();
    n.serve("owner", ok({ owner: { id: 9, display_name: "Mixed owner" }, properties: [{ id: 0, name: "Zero id property" }, { id: -3, name: "" }, { id: 1.5, name: "Fractional id property" }, { id: 7, name: "   " }, { id: 3, name: "Valid property" }] }));
    n.serve("tenant", ok({ tenant: { id: 2, display_name: "Mixed tenant" }, activeLease: { id: 0, status: "ACTIVE" }, leases: [{ id: -1, status: "EXPIRED" }, { id: 5, status: "EXPIRED" }] }));
    const watch = await openCard(page, base, n, "owner");
    await page.getByTestId("tab-linked").click();
    expect(await hrefSet(page)).toEqual(["/card/property/3", "/card/property/7"]);
    await expect(page.getByText("Zero id property")).toBeVisible();
    await expect(page.getByText("Fractional id property")).toBeVisible();
    await expect(page.getByText("Property #-3")).toBeVisible();
    await expect(page.getByText("Property #7")).toBeVisible();                     // the actual record id, never the demo id 1
    await expect(page.getByText("This record cannot be opened because its link is incomplete.")).toHaveCount(3);
    await page.goto(`${base}/card/tenant/2`);
    await page.getByTestId("tab-linked").click();
    expect(await hrefSet(page)).toEqual(["/card/lease/5"]);
    await expect(page.getByText("This record cannot be opened because its link is incomplete.")).toHaveCount(2);
    expectCleanConsole(watch);
  });

  test("the current lease appears once and first; every owner property is listed; unit to lease to tenant is real navigation", async ({ page }) => {
    const n = new CardNet();
    n.serve("owner", DATA.A.owner);
    n.serve("tenant", ok({ tenant: { id: 2, display_name: "Alder tenant" }, activeLease: { id: 5, status: "ACTIVE" }, leases: [{ id: 3, status: "EXPIRED" }, { id: 5, status: "ACTIVE" }, { id: 4, status: "EXPIRED" }] }));
    n.serve("unit", DATA.A.unit); n.serve("lease", DATA.A.lease);
    const watch = await openCard(page, base, n, "owner");
    await page.getByTestId("tab-linked").click();
    expect(await cardLinks(page).count()).toBe(8);                                  // beyond the old limit of five
    await page.goto(`${base}/card/tenant/2`);
    await page.getByTestId("tab-linked").click();
    expect(await cardLinks(page).evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual(["/card/lease/5", "/card/lease/3", "/card/lease/4"]);
    await expect(page.getByText("Current lease - ACTIVE")).toHaveCount(1);
    // unit -> lease -> tenant by keyboard, asserting each hop shows that record
    await page.goto(`${base}/card/unit/8`);
    await expect(page.getByRole("heading", { level: 1 }).filter({ hasText: "Alder unit" })).toBeVisible();
    await page.getByTestId("tab-linked").click();
    await tabTo(page, (d) => d.href === "/card/lease/4");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/card\/lease\/4$/);
    await expect(page.getByRole("heading", { level: 1 }).filter({ hasText: "Lease #4" })).toBeVisible();
    await page.getByTestId("tab-linked").click();
    await tabTo(page, (d) => d.href === "/card/tenant/2");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/card\/tenant\/2$/);
    await expect(page.getByRole("heading", { level: 1 }).filter({ hasText: "Alder tenant" })).toBeVisible();
    expectCleanConsole(watch);
  });

  const failures: { name: string; reply: Reply; alert: RegExp; detail: RegExp; retries?: boolean }[] = [
    { name: "server error", reply: fail(500), alert: /could not be loaded\./, detail: /Check your connection and try again\./ },
    { name: "malformed body (missing required fields)", reply: ok({ unexpected: true }), alert: /could not be loaded\./, detail: /unexpected format, so none are shown/ },
    { name: "malformed body (wrong id type)", reply: ok({ owner: { id: "nine" }, tenant: { id: "two" }, lease: { id: "four" }, unit: { id: "eight" } }), alert: /could not be loaded\./, detail: /unexpected format, so none are shown/ },
    { name: "malformed body (not an object)", reply: ok([1, 2, 3]), alert: /could not be loaded\./, detail: /unexpected format, so none are shown/ },
    { name: "denied (403)", reply: fail(403), alert: /You don't have access to this/, detail: /No record details are shown/ },
    { name: "unauthenticated (401)", reply: fail(401), alert: /You don't have access to this/, detail: /No record details are shown/ },
  ];
  for (const f of failures) {
    test(`first load, ${f.name}: a distinct alert, no details, and keyboard Retry recovers`, async ({ page }) => {
      const entity: Entity = "tenant";
      const n = new CardNet(); n.serve(entity, f.reply);
      const watch = await openCard(page, base, n, entity);
      const alert = page.getByRole("alert");
      await expect(alert).toContainText(f.alert);
      await expect(alert).toContainText(f.detail);
      await expect(page.getByTestId("tab-linked")).toHaveCount(0);
      await expect(cardLinks(page)).toHaveCount(0);
      await expect(page.getByText("No leases were reported for this tenant.")).toHaveCount(0);     // a failure is never an empty record
      await expect(page.getByRole("link", { name: /Back to tenants/ })).toBeVisible();
      const box = await retryButton(page).boundingBox();
      expect(box && box.width >= 44 && box.height >= 44, JSON.stringify(box)).toBe(true);
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      expect(await undersized(page)).toEqual([]);
      n.serve(entity, DATA.A[entity]);
      await tabTo(page, (d) => d.tag === "BUTTON" && d.text === "Retry");
      await page.keyboard.press("Enter");
      await expectShown(page, entity, "A");
      await expect(page.getByRole("alert")).toHaveCount(0);
      expectCleanConsole(watch);
    });
  }

  test("a failed refresh keeps the loaded details but labels them; a denied refresh removes them everywhere; Retry recovers", async ({ page }) => {
    const entity: Entity = "tenant";
    const n = new CardNet(); n.serve(entity, DATA.A[entity]);
    const watch = await openCard(page, base, n, entity);
    await expectShown(page, entity, "A");
    // an ordinary refresh failure: details stay, honestly labelled, with a Retry
    n.serve(entity, fail(500));
    void refresh(page, entity);
    const banner = page.getByRole("alert").filter({ hasText: "Showing the last loaded details; the latest refresh failed." });
    await expect(banner).toBeVisible();
    await expect(page.getByTestId("tab-linked")).toBeVisible();
    await expect(cardLinks(page)).toHaveCount(2);
    const box = await banner.getByRole("button", { name: "Retry" }).boundingBox();
    expect(box && box.width >= 44 && box.height >= 44, JSON.stringify(box)).toBe(true);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    n.serve(entity, DATA.A[entity]);
    await tabTo(page, (d) => d.tag === "BUTTON" && d.text === "Retry");
    await page.keyboard.press("Enter");
    await expect(banner).toHaveCount(0);
    await expect(cardLinks(page)).toHaveCount(2);
    // a denied refresh: details, tabs, links and the shared cache are gone
    n.serve(entity, fail(403));
    void refresh(page, entity);
    await expect(page.getByRole("alert")).toContainText("You don't have access to this tenant.");
    await expect(page.getByTestId("tab-linked")).toHaveCount(0);
    await expect(cardLinks(page)).toHaveCount(0);
    await expectGone(page, entity, "A");
    expect(await dataKeys(page)).toEqual([]);
    n.serve(entity, DATA.A[entity]);
    await retryButton(page).click();
    await expectShown(page, entity, "A");
    expect(expectedOnlyHttpNotices(watch)).toBe(true);
  });

  for (const entity of ENTITIES) {
    test(`${entity}: a session boundary removes populated details and links at once; a refresh held across it cannot restore them`, async ({ page }) => {
      const n = new CardNet(); n.serve(entity, DATA.A[entity]);
      const watch = await openCard(page, base, n, entity);
      await expectShown(page, entity, "A");
      expect((await dataKeys(page)).length).toBeGreaterThan(0);

      // a session-one refresh is still in flight when the boundary arrives
      n.hold(entity);
      void refresh(page, entity);
      await expect.poll(() => n.pending(entity).length).toBe(1);
      const stale = n.pending(entity)[0];
      await boundary(page);

      // populated details and related links vanish immediately; the replacement is loading, never placeholder data
      await expect(page.getByText(`Loading ${LABEL[entity]}...`)).toBeVisible();
      await expect(page.getByTestId("tab-linked")).toHaveCount(0);
      await expect(cardLinks(page)).toHaveCount(0);
      await expectGone(page, entity, "A");
      await expect.poll(async () => (await dataKeys(page)).length).toBe(0);
      await expect.poll(() => n.pending(entity).length).toBeGreaterThan(0);   // the new session asked again

      // the prior session's answer arrives late (A-shaped but marked): it must not restore anything
      await n.release(stale, DATA.LATE[entity]);
      await settle(page);
      await expectGone(page, entity, "LATE");
      await expectGone(page, entity, "A");
      await expect(page.getByTestId("tab-linked")).toHaveCount(0);
      await expect(page.getByText(`Loading ${LABEL[entity]}...`)).toBeVisible();

      // the new session answers: only its record appears
      n.unhold(entity); n.serve(entity, DATA.B[entity]);
      for (const h of n.pending(entity)) await n.release(h, DATA.B[entity]);
      await expectShown(page, entity, "B");
      await expectGone(page, entity, "A");
      await expectGone(page, entity, "LATE");
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      expect(await undersized(page)).toEqual([]);
      expectCleanConsole(watch);
    });
  }

  test("a first load held across a boundary: the prior session's late response is discarded, even after the new session has answered", async ({ page }) => {
    const entity: Entity = "owner";
    const n = new CardNet(); n.hold(entity);
    const watch = await openCard(page, base, n, entity);
    await expect(page.getByText("Loading owner...")).toBeVisible();
    await expect.poll(() => n.pending(entity).length).toBe(1);
    const stale = n.pending(entity)[0];
    await boundary(page);
    await expect.poll(() => n.pending(entity).length).toBeGreaterThan(1);
    // new session answers first; then the old one limps in
    const current = n.pending(entity).filter((h) => h !== stale);
    n.unhold(entity); n.serve(entity, DATA.B[entity]);
    for (const h of current) await n.release(h, DATA.B[entity]);
    await expectShown(page, entity, "B");
    await n.release(stale, DATA.A[entity]);
    await settle(page);
    await expectGone(page, entity, "A");
    await expect(page.getByRole("heading", { level: 1 }).filter({ hasText: "Birch owner" }).first()).toBeVisible();
    expect(await hrefSet(page)).toEqual(["/card/property/21"]);
    expectCleanConsole(watch);
  });

  test("a failed load after a session boundary shows the retryable alert, and Retry recovers only the current session's record", async ({ page }) => {
    const entity: Entity = "unit";
    const n = new CardNet(); n.serve(entity, DATA.A[entity]);
    const watch = await openCard(page, base, n, entity);
    await expectShown(page, entity, "A");
    n.serve(entity, fail(500));
    await boundary(page);
    await expect(page.getByRole("alert")).toContainText("This unit could not be loaded.");
    await expectGone(page, entity, "A");
    await expect(page.getByTestId("tab-linked")).toHaveCount(0);
    n.serve(entity, DATA.B[entity]);
    await retryButton(page).click();
    await expectShown(page, entity, "B");
    await expectGone(page, entity, "A");
    expectCleanConsole(watch);
  });

  test("app-shell navigation targets are at least 44px (known shell defect at 390px is pinned, not hidden)", async ({ page }) => {
    const n = new CardNet(); n.serve("owner", DATA.A.owner);
    await openCard(page, base, n, "owner");
    await expectShown(page, "owner", "A");
    // Product defect observed outside this lane: the bottom nav items are 43x44 at 390px. Pinned with test.fail so the
    // suite stays green only while the defect is real and goes red the moment it is fixed (then drop the line below).
    test.fail((page.viewportSize()?.width ?? 0) < 400, "shell nav items are 43px wide at 390px (src shell, not PR132)");
    expect(await undersized(page, true)).toEqual([]);
  });

  test("keyboard reach, 44px targets and no overflow on a populated card", async ({ page }) => {
    const n = new CardNet(); n.serve("owner", DATA.A.owner);
    const watch = await openCard(page, base, n, "owner");
    await expectShown(page, "owner", "A");
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    expect(await undersized(page)).toEqual([]);
    for (const href of ["/card/property/1", "/card/property/8"]) await tabTo(page, (d) => d.href === href);
    await expect(page.locator("main")).toHaveCount(1);
    expectCleanConsole(watch);
  });
}

function expectedOnlyHttpNotices(watch: Watch) {
  expect(watch.errors).toEqual([]);
  return watch.consoleErrors.every((t) => /^Failed to load resource: the server responded with a status of (4\d\d|5\d\d)/.test(t));
}

test.describe("linked-card lifecycle - desktop", () => {
  test.use({ viewport: { width: 1280, height: 844 } });
  lifecycle();
});
test.describe("linked-card lifecycle - 390px", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  lifecycle();
});
