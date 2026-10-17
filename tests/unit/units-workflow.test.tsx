import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { UnitSurface } from '../../src/pages/portfolio/Units';
import {
  mapUnitRows,
  filterUnitRows,
  reportedOptions,
} from '../../src/pages/portfolio/unitWorkflow';

type Query = React.ComponentProps<typeof UnitSurface>['query'];
const row = {
  id: 31,
  unitLabel: 'Apt 4B',
  propertyName: 'Elm Court',
  beds: 0,
  baths: 1.5,
  sqft: 900,
  status: 'VACANT',
  marketRent: 1500,
};
function render(patch: Partial<Query> = {}) {
  const query = {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: async () => ({}),
    ...patch,
  } as Query;
  return renderToStaticMarkup(
    <Router ssrPath="/portfolio/units">
      <UnitSurface query={query} />
    </Router>,
  );
}
test('Units mounts source-declared unit/property fields and raw rent, preserves zero and half baths', () => {
  const html = render({ isSuccess: true, data: [row] });
  assert.match(html, /Apt 4B/);
  assert.match(html, /Elm Court/);
  assert.match(html, /Reported market rent \(units unverified\)<\/dt><dd>1500<\/dd>/);
  assert.doesNotMatch(html, /\$|USD/);
  assert.match(html, /whether they represent dollars or cents have not been confirmed/);
  assert.match(html, /href="\/card\/unit\/31"/);
  assert.match(html, /1 loaded unit/);
  assert.match(html, /Beds<\/dt><dd>0/);
  assert.match(html, /Baths<\/dt><dd>1.5/);
  assert.doesNotMatch(html, /avg|occupancy|Unit Triage/);
});
test('Units failed, denied, refreshing and unresolved reads expose no retained records or zero counts', () => {
  const states: Partial<Query>[] = [
    { isError: true, error: new Error('HTTP 503') },
    { isError: true, error: Object.assign(new Error('Denied'), { status: 403 }) },
    { isFetching: true, isSuccess: true },
    { isLoading: true, isFetching: true },
    {},
  ];
  for (const state of states) {
    const html = render({ data: [row], ...state });
    assert.doesNotMatch(
      html,
      /Apt 4B|Elm Court|\$1,500|\d+ loaded|type="checkbox"|\/card\/unit\/31|Unit review/,
    );
    assert.match(html, /unavailable until a read succeeds/);
  }
});
test('Units malformed successful rows fail closed instead of crashing or declaring emptiness', () => {
  for (const data of [[null], [7], [[]]]) {
    const html = render({ isSuccess: true, data });
    assert.match(html, /Units could not be loaded/);
    assert.doesNotMatch(html, /0 loaded|No units were returned/);
  }
});
test('Units successful empty result is distinct from an unconfirmed result', () => {
  const html = render({ isSuccess: true, data: [] });
  assert.match(html, /0 loaded units/);
  assert.match(html, /No units were returned/);
  assert.doesNotMatch(html, /could not be loaded/);
});
test('Unit mapping rejects malformed values without aliases or monetary conversion', () => {
  const [mapped] = mapUnitRows([
    {
      id: 0,
      unitLabel: { bad: true },
      propertyName: '—',
      status: false,
      beds: -1,
      baths: '2',
      sqft: NaN,
      marketRent: null,
      label: 'invented',
      property_name: 'wrong',
      market_rent_cents: 123456,
    },
  ]);
  assert.equal(mapped.unit, null);
  assert.equal(mapped.property, null);
  assert.equal(mapped.status, null);
  assert.equal(mapped.beds, null);
  assert.equal(mapped.baths, null);
  assert.equal(mapped.sqft, null);
  assert.equal(mapped.marketRent, null);
  assert.equal(mapped.href, undefined);
  assert.equal(mapUnitRows([{ marketRent: 0 }])[0].marketRent, 0);
});
test('Unit links accept only positive safe IDs while invalid IDs remain readable', () => {
  for (const id of [0, -1, 1.5, 'abc', '', null, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(mapUnitRows([{ id }])[0].href, undefined);
  assert.equal(mapUnitRows([{ id: '7' }])[0].href, '/card/unit/7');
  const html = render({ isSuccess: true, data: [{ ...row, id: 'abc' }] });
  assert.match(html, />abc<\/dd>/);
  assert.doesNotMatch(html, /href="\/card\/unit/);
});
test('Unit property/status options use only reported source values and filters intersect', () => {
  const rows = mapUnitRows([
    row,
    { ...row, id: 32, unitLabel: 'Garage', propertyName: 'Oak House', status: 'OCCUPIED' },
    { id: 33 },
  ]);
  assert.deepEqual(reportedOptions(rows, 'property'), ['Elm Court', 'Oak House']);
  assert.deepEqual(reportedOptions(rows, 'status'), ['OCCUPIED', 'VACANT']);
  assert.equal(
    filterUnitRows(rows, { search: ' apt ', property: 'Elm Court', status: 'VACANT' }).length,
    1,
  );
  assert.equal(filterUnitRows(rows, { search: '31', property: 'Oak House', status: '' }).length, 0);
  assert.equal(filterUnitRows(rows, { search: '', property: '', status: '' }).length, 3);
});

test('Units raw rent values never imply currency, divide cents, round precision or replace null with zero', () => {
  for (const value of [0, 150000, 1234.56789, null]) {
    const html = render({ isSuccess: true, data: [{ ...row, marketRent: value }] });
    assert.ok(
      html.includes(
        '<dt>Reported market rent (units unverified)</dt><dd>' +
          (value === null ? 'Not reported' : String(value)) +
          '</dd>',
      ),
    );
    assert.doesNotMatch(html, /\$|USD|€|£/);
  }
});
