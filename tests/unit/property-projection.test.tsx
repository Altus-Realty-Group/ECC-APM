import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { readPropertyCollection, PROPERTY_COLUMNS, PROPERTY_READ_LIMIT } from '../../server/lib/propertyProjection';
import { toRows } from '../../src/lib/ecc-resolvers';
import { PropertiesSurface } from '../../src/pages/portfolio/Properties';
const tables = { properties: 'properties', units: 'units' };
const property = (patch = {}) => ({ id: 7, name: 'Reported property', type: null, class: null, active: null,
  address_street1: '17 Source Street', address_city: 'Gary', address_state: null, address_zip: null, lat: 0, lng: 0, ...patch });
const result = (data: unknown[], count = data.length) => ({ data, count, error: null });
function reader(responses: Record<string, any[]>) {
  const calls: unknown[][] = [];
  return { calls, client: { from(table: string) {
    calls.push(['from', table]);
    return { select(columns: string, options?: unknown) {
      calls.push(['select', table, columns, options]);
      assert.ok(responses[table]?.length, 'unexpected read');
      const response = responses[table].shift(), promise = Promise.resolve(response) as any;
      for (const method of ['in', 'order', 'limit']) promise[method] = (...args: unknown[]) => { calls.push([method, table, ...args]); return promise; };
      return promise;
    } };
  } } };
}
const load = (properties = result([property()]), units = result([])) => {
  const harness = reader({ properties: [properties], units: [units] });
  return readPropertyCollection(harness.client, tables);
};
test('property adapter preserves canonical street, false/null activity and coordinate zero without guessed occupancy', async () => {
  for (const active of [null, false, true]) {
    const response = await load(result([property({ active })]), result([{ id: 1, property_id: 7 }]));
    assert.deepEqual(response.data[0], { id: 7, name: 'Reported property', type: null, class: null, active,
      street_1: '17 Source Street', city: 'Gary', state: null, zip: null, lat: 0, lng: 0, units: 1, occPct: null });
    assert.deepEqual(toRows(response), response.data); // actual collection adapter must preserve nulls
  }
  const response = await load(result([property({ name: null, address_street1: null, lat: null, lng: null })]));
  assert.equal(response.data[0].name, null); assert.equal(response.data[0].street_1, null);
  assert.equal(response.data[0].units, 0); assert.equal(response.data[0].occPct, null);
});
test('actual reader selects verified columns, exact counts and canonical batched keys only', async () => {
  const harness = reader({ properties: [result([property()])], units: [result([{ id: 1, property_id: 7 }])] });
  await readPropertyCollection(harness.client, tables);
  assert.deepEqual(harness.calls, [
    ['from', 'properties'], ['select', 'properties', PROPERTY_COLUMNS, { count: 'exact' }],
    ['order', 'properties', 'id', { ascending: true }], ['limit', 'properties', PROPERTY_READ_LIMIT],
    ['from', 'units'], ['select', 'units', 'id,property_id', { count: 'exact' }],
    ['in', 'units', 'property_id', [7]], ['order', 'units', 'id', { ascending: true }], ['limit', 'units', PROPERTY_READ_LIMIT],
  ]);
  assert.doesNotMatch(JSON.stringify(harness.calls), /doorloop|status|\*/);
});
test('actual property batches are bounded and never read units outside the loaded property keys', async () => {
  const rows = Array.from({ length: 251 }, (_, i) => property({ id: i + 1 }));
  const harness = reader({ properties: [result(rows)], units: [result([{ id: 1, property_id: 250 }]), result([{ id: 2, property_id: 251 }])] });
  const response = await readPropertyCollection(harness.client, tables);
  const keys = harness.calls.filter(call => call[0] === 'in').map(call => call[3]) as number[][];
  assert.deepEqual(keys.map(batch => batch.length), [250, 1]);
  assert.equal(response.data[249].units, 1); assert.equal(response.data[250].units, 1);
  assert.equal(response.data[0].units, 0);
});
test('complete zero is distinct from failure and capped property metadata never claims completeness', async () => {
  const empty = reader({ properties: [result([])] });
  assert.deepEqual(await readPropertyCollection(empty.client, tables), { data: [], meta: { totalCount: 0, returned: 0, limit: 5000, truncated: false } });
  assert.equal(empty.calls.filter(call => call[0] === 'from').length, 1);
  assert.deepEqual((await load(result([property()], 5001))).meta, { totalCount: 5001, returned: 1, limit: 5000, truncated: true });
  for (const count of [null, undefined, -1, 0, 1.5, '1', Infinity]) await assert.rejects(load({ ...result([property()]), count } as any));
  await assert.rejects(load(result([], 1)));
});
test('unit query errors, truncation or missing/invalid exact count never return invented zero totals', async () => {
  for (const units of [
    { data: null, count: null, error: { message: 'private' } },
    { data: [], count: null, error: null }, { data: [], count: 1, error: null },
    { data: [{ id: 1, property_id: 7 }], count: 5001, error: null },
    { data: [{ id: 1, property_id: 7 }], count: 0, error: null },
    { data: [], count: '0', error: null },
  ]) await assert.rejects(load(result([property()]), units as any), /^Error: Property records could not be loaded\.$/);
});
test('malformed, duplicate, unsafe and out-of-batch rows fail with fixed error text', async () => {
  for (const row of [null, [], property({ id: 0 }), property({ id: '7' }), property({ active: 'false' }),
    property({ lat: NaN }), property({ lng: 181 }), property({ name: {} }), property({ address: 'alias' })])
    await assert.rejects(load(result([row] as any)), /Property records could not be loaded/);
  await assert.rejects(load(result([property(), property()])));
  for (const units of [[{ id: 1, property_id: 8 }], [{ id: 1, property_id: null }],
    [{ id: 1, property_id: 7 }, { id: 1, property_id: 7 }], [{ id: '1', property_id: 7 }], [{ id: 1, property_id: 7, status: 'occupied' }]])
    await assert.rejects(load(result([property()]), result(units)));
});
test('projected nullable fields survive the real collection adapter and mounted Properties render', async () => {
  const projected = await load();
  const query = { data: toRows(projected), isLoading: false, isFetching: false, isError: false, isSuccess: true, error: null, refetch: async () => ({}) } as any;
  const html = renderToStaticMarkup(<Router ssrPath="/portfolio/properties"><PropertiesSurface query={query} /></Router>);
  assert.match(html, /17 Source Street, Gary/); assert.match(html, /Reported property/);
  assert.doesNotMatch(html, /0%|NaN|undefined|false|avg occupancy/);
  assert.match(html, /href="\/card\/property\/7"/);
});
test('existing handler delegates to tested projection and uses a fixed unavailable response', () => {
  const source = readFileSync(new URL('../../server/index.ts', import.meta.url), 'utf8');
  const handler = source.split('app.get("/api/portfolio/properties"')[1].split('/** Units')[0];
  assert.match(handler, /readPropertyCollection/); assert.match(handler, /res.status\(503\).json\(\{ error: "Property records could not be loaded\." \}\)/);
  assert.doesNotMatch(handler, /doorloop|occupied|\.from\(|sendErr/);
});
