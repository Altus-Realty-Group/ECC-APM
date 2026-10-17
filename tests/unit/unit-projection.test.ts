import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  projectUnits,
  readUnitCollection,
  UNIT_COLUMNS,
  UNIT_READ_LIMIT,
} from '../../server/lib/unitProjection';
const unit = (patch = {}) => ({
  id: 31,
  property_id: 7,
  unit_number: '4B',
  unit_label: null,
  name: null,
  beds: 0,
  baths: 0.5,
  sqft: 0,
  status: null,
  market_rent: 0,
  ...patch,
});
const property = { id: 7, name: 'Elm Court' };
const tables = { units: 'units', properties: 'properties' };
function reader(responses: Record<string, unknown[]>) {
  const calls: unknown[][] = [];
  return {
    calls,
    client: {
      from(table: string) {
        calls.push(['from', table]);
        return {
          select(columns: string, options?: unknown) {
            calls.push(['select', table, columns, options]);
            const response = responses[table]?.shift();
            if (response === undefined) throw Error('Unexpected read');
            const p = Promise.resolve(response) as any;
            p.in = (column: string, values: number[]) => {
              calls.push(['in', table, column, values]);
              return p;
            };
            p.limit = (n: number) => {
              calls.push(['limit', table, n]);
              return p;
            };
            p.order = (column: string, options: unknown) => {
              calls.push(['order', table, column, options]);
              return p;
            };
            return p;
          },
        };
      },
    },
  };
}
test('unit projector preserves studio/half bath/zero/null and joins only the canonical property ID', () => {
  const [row] = projectUnits([unit()], [property]);
  assert.deepEqual(row, {
    id: 31,
    propertyName: 'Elm Court',
    unitLabel: '4B',
    beds: 0,
    baths: 0.5,
    sqft: 0,
    status: null,
    marketRent: 0,
  });
  assert.equal(
    projectUnits(
      [unit({ market_rent: null, beds: null, baths: null, sqft: null, property_id: null })],
      [],
    )[0].marketRent,
    null,
  );
  assert.equal(
    projectUnits(
      [unit({ unit_label: ' Suite 4 ', unit_number: 'other', name: 'alias' })],
      [property],
    )[0].unitLabel,
    'Suite 4',
  );
  assert.equal(projectUnits([unit({ market_rent: 123.45 })], [property])[0].marketRent, 123.45);
});
test('unit projection never infers or converts rent from cent/vendor/legacy alias columns', () => {
  for (const patch of [
    { rent_amount: 900 },
    { market_rent_cents: 90000 },
    { doorloop_property_id: 'vendor' },
    { bedrooms: 9 },
  ])
    assert.throws(
      () => projectUnits([unit(patch)], [property]),
      /Unit records could not be loaded/,
    );
  for (const rent of ['1000', NaN, Infinity, -1, undefined])
    assert.throws(() => projectUnits([unit({ market_rent: rent })], [property]));
});
test('malformed rows, missing projection keys, unsafe IDs and duplicate unit IDs fail', () => {
  for (const raw of [
    null,
    {},
    [null],
    [1],
    [[]],
    [unit({ id: 0 })],
    [unit({ id: '31' })],
    [unit({ id: Number.MAX_SAFE_INTEGER + 1 })],
    [unit({ beds: -1 })],
    [unit({ baths: '0.5' })],
    [unit({ status: { active: true } })],
    [unit(), unit()],
  ])
    assert.throws(() => projectUnits(raw, [property]));
  const missing = unit();
  delete (missing as any).sqft;
  assert.throws(() => projectUnits([missing], [property]));
});
test('property query must cover the exact canonical references; malformed/extra/duplicate joins fail', () => {
  for (const raw of [
    null,
    {},
    [],
    [null],
    [{ id: 7 }],
    [{ ...property, name: 4 }],
    [{ ...property, id: 8 }],
    [property, property],
    [{ ...property, doorloop_id: '7' }],
  ])
    assert.throws(() => projectUnits([unit()], raw));
  assert.equal(projectUnits([unit()], [{ ...property, name: null }])[0].propertyName, '—');
  assert.equal(projectUnits([unit({ property_id: null })], [])[0].propertyName, '—');
});
test('actual units reader selects exact fields and exact count with deterministic bounded order', async () => {
  const r = reader({
    units: [{ data: [unit()], error: null, count: 9 }],
    properties: [{ data: [property], error: null }],
  });
  const result = await readUnitCollection(r.client, tables);
  assert.deepEqual(result.meta, {
    totalCount: 9,
    returned: 1,
    limit: UNIT_READ_LIMIT,
    truncated: true,
  });
  assert.equal(result.data[0].beds, 0);
  assert.deepEqual(r.calls, [
    ['from', 'units'],
    ['select', 'units', UNIT_COLUMNS, { count: 'exact' }],
    ['order', 'units', 'id', { ascending: true }],
    ['limit', 'units', 5000],
    ['from', 'properties'],
    ['select', 'properties', 'id,name', undefined],
    ['in', 'properties', 'id', [7]],
    ['limit', 'properties', 1],
  ]);
});
test('empty units skip property lookups and retain exact zero completeness', async () => {
  const r = reader({ units: [{ data: [], error: null, count: 0 }] });
  assert.deepEqual(await readUnitCollection(r.client, tables), {
    data: [],
    meta: { totalCount: 0, returned: 0, limit: 5000, truncated: false },
  });
  assert.equal(r.calls.filter((c) => c[0] === 'from').length, 1);
});
test('unit/count/property failures reject instead of successful empty or null context', async () => {
  for (const result of [
    { data: null, error: null, count: 0 },
    { data: [], error: { message: 'secret SQL' }, count: 0 },
    { data: [unit()], error: null, count: null },
    { data: [unit()], error: null, count: 0 },
    { data: [], error: null, count: 3 },
  ]) {
    const r = reader({ units: [result] });
    await assert.rejects(
      readUnitCollection(r.client, tables),
      /^Error: Unit records could not be loaded\.$/,
    );
    assert.equal(r.calls.filter((c) => c[0] === 'from').length, 1);
  }
  for (const result of [
    { data: [], error: { message: 'secret SQL' } },
    { data: null, error: null },
    { data: [], error: null },
    { data: [{ id: 7 }], error: null },
  ]) {
    const r = reader({ units: [{ data: [unit()], error: null, count: 1 }], properties: [result] });
    await assert.rejects(
      readUnitCollection(r.client, tables),
      /^Error: Unit records could not be loaded\.$/,
    );
  }
});
test('property reads batch exact FK IDs so unrelated global property truncation cannot hide joins', async () => {
  const units = Array.from({ length: 251 }, (_, index) =>
    unit({ id: index + 1, property_id: index + 1 }),
  );
  const properties = units.map((row) => ({
    id: row.property_id,
    name: 'Property ' + row.property_id,
  }));
  const r = reader({
    units: [{ data: units, error: null, count: 251 }],
    properties: [
      { data: properties.slice(0, 250), error: null },
      { data: properties.slice(250), error: null },
    ],
  });
  const result = await readUnitCollection(r.client, tables);
  assert.equal(result.data.length, 251);
  assert.equal(result.data[250].propertyName, 'Property 251');
  assert.deepEqual(
    r.calls.filter((c) => c[0] === 'limit' && c[1] === 'properties').map((c) => c[2]),
    [250, 1],
  );
});
test('mounted units handler invokes the tested reader and contains generic database failures', () => {
  const source = fs.readFileSync(new URL('../../server/index.ts', import.meta.url), 'utf8');
  const handler = source
    .split('/** Units with property context */')[1]
    .split('/** Leases with property')[0];
  assert.match(handler, /readUnitCollection\(supa.client/);
  assert.doesNotMatch(
    handler,
    /select\(["']\*|doorloop|rent_amount|market_rent_cents|row\.beds\s*\|\|/,
  );
  assert.match(
    handler,
    /res\.status\(503\)\.json\(\{ error: "Unit records could not be loaded\." \}\)/,
  );
});
