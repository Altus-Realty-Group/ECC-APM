// Isolated browser proof of the actual Vite page. No operating services are contacted.
// Start `npm run dev:web`; optionally set ECC_BROWSER_EXECUTABLE for a local browser.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';

const base = process.env.ECC_BROWSER_BASE ?? 'http://127.0.0.1:5179';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Isolated proof requires localhost');
const server = process.env.ECC_BROWSER_BASE ? null : spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5179'], { stdio: 'ignore' });
let ready = false;
for (let attempt = 0; attempt < 50; attempt++) {
  try { ready = (await fetch(base)).ok; } catch { /* Wait for the isolated source host. */ }
  if (ready) break;
  await new Promise(resolve => setTimeout(resolve, 100));
}
if (!ready) { server?.kill(); throw new Error('Local source host unavailable'); }
const browser = await chromium.launch({
  executablePath: process.env.ECC_BROWSER_EXECUTABLE || undefined,
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [], mutations = [];
    let adminFailure = 0, healthFailure = 0, holdAdmin = false, holdHealth = false;
    const heldAdmin = [], heldHealth = [], adminHeaders = [];
    const health = { enabled: false, intervalMinutes: 19, nightlyFullHourUtc: 0,
      status: { next_run_at: '2026-10-18T05:00:00Z' }, lock: { locked: false } };
    const adminBody = token => ({ scheduler: { enabled: true, intervalMinutes: token === 'fixture-new' ? 11 : 7,
      fullSyncHourUTC: 0, nextRun: '2099-01-01T00:00:00Z' } });
    page.on('pageerror', e => pageErrors.push(e.message));
    await context.addInitScript(() => localStorage.setItem('ecc-admin-token', 'fixture-old'));
    await page.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== new URL(base).origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (req.method() !== 'GET') { mutations.push(req.method() + ' ' + url.pathname); return route.abort(); }
      const send = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/admin/sync/status') {
        const token = req.headers()['x-admin-token']; adminHeaders.push(token);
        if (holdAdmin && token === 'fixture-old') { heldAdmin.push(() => send(200, adminBody(token)).catch(() => {})); return; }
        return send(adminFailure || 200, adminFailure ? { error: 'Unavailable' } : adminBody(token));
      }
      if (url.pathname === '/api/health/sync') {
        if (holdHealth) { heldHealth.push(() => send(200, health).catch(() => {})); return; }
        return send(healthFailure || 200, healthFailure ? { error: 'Unavailable' } : health);
      }
      if (url.pathname === '/api/config/integrations') return send(200, { integrations: {} });
      if (url.pathname === '/api/admin/sync/runs') return send(200, { ok: true, runs: [] });
      return send(200, {});
    });
    const invalidate = async path => page.evaluate(async path => {
      const { queryClient } = await import('/src/lib/queryClient.ts');
      void queryClient.invalidateQueries({ queryKey: [path] });
    }, path);
    await page.goto(`${base}/systems/integrations`);
    await expect(page.getByTestId('scheduler-interval')).toHaveText('7 minutes');
    await expect(page.getByTestId('scheduler-nightly')).toHaveText('00:00 UTC');
    await expect(page.getByTestId('scheduler-next')).toHaveText('2026-10-18 05:00:00 UTC');
    await expect(page.getByTestId('scheduler-next').locator('time')).toHaveAttribute('datetime', '2026-10-18T05:00:00.000Z');
    await page.getByTestId('scheduler-panel').screenshot({ path: `/tmp/ecc-scheduler-${width}.png` });

    holdAdmin = true; holdHealth = true;
    await invalidate('/api/admin/sync/status'); await invalidate('/api/health/sync');
    await expect.poll(() => heldAdmin.length > 0 && heldHealth.length > 0).toBe(true);
    await expect(page.getByTestId('scheduler-interval')).toHaveText('7 minutes');
    holdHealth = false; await Promise.all(heldHealth.splice(0).map(release => release()));
    await page.getByTestId('input-admin-token').fill('fixture-new');
    await expect(page.getByTestId('scheduler-interval')).toHaveText('11 minutes');
    holdAdmin = false; await Promise.all(heldAdmin.splice(0).map(release => release()));
    await expect(page.getByTestId('scheduler-interval')).toHaveText('11 minutes');

    adminFailure = 503; await invalidate('/api/admin/sync/status');
    await expect(page.getByTestId('scheduler-interval')).toHaveText('19 minutes');
    adminFailure = 0; await invalidate('/api/admin/sync/status');
    await expect(page.getByTestId('scheduler-interval')).toHaveText('11 minutes');
    adminFailure = 403; await invalidate('/api/admin/sync/status');
    await expect(page.getByTestId('scheduler-panel')).toHaveCount(0);
    adminFailure = 0; await page.reload();
    await expect(page.getByTestId('scheduler-interval')).toHaveText('7 minutes');

    healthFailure = 503; await invalidate('/api/health/sync');
    await expect(page.getByTestId('scheduler-panel')).toHaveCount(0);
    await expect(page.getByText('Integration health could not be loaded')).toBeVisible();
    healthFailure = 0; await page.reload();
    await expect(page.getByTestId('scheduler-interval')).toHaveText('7 minutes');

    holdHealth = true;
    const oldAdminReads = adminHeaders.length;
    await page.evaluate(() => window.dispatchEvent(new Event('ecc:session-boundary')));
    await expect(page.getByTestId('scheduler-panel')).toHaveCount(0);
    await expect.poll(() => heldHealth.length).toBeGreaterThan(0);
    holdHealth = false; await Promise.all(heldHealth.splice(0).map(release => release()));
    await expect(page.getByTestId('input-admin-token')).toHaveValue('');
    await expect(page.getByTestId('scheduler-interval')).toHaveText('19 minutes');
    assert.equal(adminHeaders.length, oldAdminReads, 'Old credential must not be sent in the new session');
    assert.equal(await page.evaluate(() => localStorage.getItem('ecc-admin-token')), null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
    assert.deepEqual(pageErrors, []); assert.deepEqual(mutations, []);
    console.log(`PASS ${width}: actual page; background refresh, stored next run, late credential, failure/denial, session isolation; no errors/writes/overflow`);
    await context.close();
  }
} finally { await browser.close(); server?.kill(); }
