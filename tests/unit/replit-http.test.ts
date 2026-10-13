import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('fresh frontend serves SPA routes and unavailable JSON APIs over HTTP', async () => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    for (const route of ['/', '/dashboard']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /ECC-APM \(v1\.0\)/);
    }
    for (const route of ['/api/dashboard/kpi/summary', '/bff/owners']) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 503);
      assert.match(response.headers.get('content-type') ?? '', /application\/json/);
      assert.equal((await response.json()).error, 'BACKEND_NOT_CONNECTED');
    }
  } finally {
    await server.close();
  }
});
