import test from 'node:test';
import assert from 'node:assert/strict';
import { frontendApiBoundary } from '../../scripts/frontend-api-boundary.mjs';

for (const hook of ['configureServer', 'configurePreviewServer']) {
  test(`${hook}: API endpoints fail honestly while SPA routes pass through`, () => {
    let middleware: any;
    const result = frontendApiBoundary()[hook]({ middlewares: { use: (fn: any) => { middleware = fn; return function connect() {}; } } });
    assert.equal(result, undefined, "Vite must not invoke the Connect app as a post hook");
    for (const url of ['/api', '/api/dashboard/kpi/summary?x=1', '/bff', '/bff/owners']) {
      const headers: Record<string, string> = {};
      let body = '';
      const response = { statusCode: 0, setHeader: (key: string, value: string) => { headers[key] = value; }, end: (value: string) => { body = value; } };
      middleware({ url }, response, () => assert.fail('API fell through to SPA'));
      assert.equal(response.statusCode, 503);
      assert.match(headers['Content-Type'], /application\/json/);
      assert.equal(headers['Cache-Control'], 'no-store');
      assert.equal(JSON.parse(body).error, 'BACKEND_NOT_CONNECTED');
    }
    for (const url of ['/', '/dashboard', '/apiary', '/assets/main.js']) {
      let next = false;
      middleware({ url }, {}, () => { next = true; });
      assert.equal(next, true);
    }
  });
}
