import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProductionServer } from '../../scripts/serve-production.mjs';
import { readBuildIdentity } from '../../scripts/build-identity.mjs';

test('production host serves SPA/static assets while API stays protected; no traversal, symlink, or mutation fallback', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'ecc-web-'));
  const directory = join(temporary, 'dist'); await mkdir(join(directory, 'assets'), { recursive: true });
  await writeFile(join(directory, 'index.html'), '<!doctype html><title>ECC</title>');
  await writeFile(join(directory, 'assets', 'main-abcdefgh.js'), 'export const title="ECC";');
  await writeFile(join(directory, 'ecc-build-identity.json'), JSON.stringify({ repository: 'Altus-Realty-Group/ECC-APM', commitSha: 'a'.repeat(40), dirtyBuild: false, runtime: 'forged' }));
  await writeFile(join(temporary, 'private.txt'), 'must not serve');
  await symlink(join(temporary, 'private.txt'), join(directory, 'escape.txt'));
  let externalCalls = 0;
  const server = await createProductionServer({ directory, env: {}, fetcher: () => { externalCalls++; throw new Error('Forbidden'); } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const path of ['/', '/dashboard', '/portfolio/properties']) {
      const response = await fetch(base + path); assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type')!, /text\/html/); assert.match(await response.text(), /<title>ECC/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    const asset = await fetch(base + '/assets/main-abcdefgh.js'); assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control')!, /immutable/);
    assert.equal((await fetch(base + '/assets/missing.js')).status, 404);
    assert.equal((await fetch(base + '/escape.txt')).status, 404);
    for (const path of ['/..%2fprivate.txt', '/%2eenv', '/api%2fportfolio/properties']) {
      assert.ok([400, 404].includes((await fetch(base + path)).status), path);
    }
    assert.equal((await fetch(base + '/dashboard', { method: 'POST' })).status, 405);
    const denied = await fetch(base + '/api/portfolio/properties');
    assert.equal(denied.status, 503); assert.equal((await denied.json()).error, 'BACKEND_NOT_CONNECTED');
    const head = await fetch(base + '/dashboard', { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.deepEqual(await (await fetch(base + '/health/live')).json(), { status: 'running', runtime: 'ecc-production-web', repository: 'Altus-Realty-Group/ECC-APM', commitSha: 'a'.repeat(40), dirtyBuild: false, connectionConfigured: false });
    assert.equal(externalCalls, 0);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('build identity never turns unknown or dirty source into a verified revision', () => {
  const run = (_: string, args: string[]) => args[0] === 'rev-parse' ? 'b'.repeat(40) : '';
  assert.deepEqual(readBuildIdentity(run), { repository: 'Altus-Realty-Group/ECC-APM', commitSha: 'b'.repeat(40), dirtyBuild: false });
  assert.equal(readBuildIdentity((_: string, args: string[]) => args[0] === 'rev-parse' ? 'b'.repeat(40) : ' M scripts/example.mjs').dirtyBuild, true);
  assert.deepEqual(readBuildIdentity(() => { throw new Error('No checkout'); }), { repository: 'Altus-Realty-Group/ECC-APM', commitSha: null, dirtyBuild: true });
});
