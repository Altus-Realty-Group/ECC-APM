import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import RunHistoryBoundary from '../../src/features/systems/integrations/components/RunHistoryBoundary';
import {
  parseSyncHistory,
  readyHistoryRows,
  nextHistoryRevision,
  syncHistoryKey,
  type HistoryQuery,
} from '../../src/features/systems/integrations/syncHistory';
const row = {
  id: 'persisted-id',
  timestamp: '2026-10-17T00:00:00Z',
  entity: 'units',
  mode: 'delta',
  rows: 0,
  duration: 0,
  result: 'success',
  dryRun: true,
};
const ready = {
  data: { ok: true, runs: [row] },
  isSuccess: true,
  isError: false,
  isPending: false,
  isFetching: false,
  error: null,
  refetch: () => {},
};
function render(enabled: boolean, patch: Partial<HistoryQuery> = {}) {
  return renderToStaticMarkup(
    <RunHistoryBoundary enabled={enabled} query={{ ...ready, ...patch }} onRowClick={() => {}} />,
  );
}
test('completion history disabled, pending, refreshing, failed, denied and unconfirmed never imply successful empty or retained records', () => {
  const cases: [boolean, Partial<HistoryQuery>][] = [
    [false, {}],
    [true, { isSuccess: false, isPending: true }],
    [true, { isFetching: true }],
    [true, { isError: true, error: new Error('503') }],
    [true, { isError: true, error: Object.assign(new Error('Denied'), { status: 403 }) }],
    [true, { isSuccess: false }],
  ];
  for (const [enabled, patch] of cases) {
    const html = render(enabled, patch);
    assert.doesNotMatch(
      html,
      /No completion history was returned|persisted-id|Preview completed|Reported completion history/,
    );
    assert.match(
      html,
      /No previous history is shown until the current access-scoped read succeeds/,
    );
  }
  assert.match(render(true, { isError: true, error: new Error('503') }), />Retry</);
});
test('only current successful well-formed completion read supports zero rows and an empty-history claim', () => {
  const html = render(true);
  assert.match(html, /persisted-id/);
  assert.match(html, /Preview completed/);
  assert.match(render(true, { data: { ok: true, runs: [] } }), /No completion history was returned/);
  for (const data of [
    {},
    { ok: false, runs: [] },
    { ok: true, runs: null },
    { ok: true, runs: [null] },
    { ok: true, runs: [{ ...row, rows: null }] },
    { ok: true, runs: [row, row] },
  ]) {
    assert.throws(() => parseSyncHistory(data));
    const invalid = render(true, { data });
    assert.match(invalid, /Completion history could not be loaded/);
    assert.doesNotMatch(invalid, /No completion history was returned|persisted-id/);
  }
  assert.equal(readyHistoryRows(ready, true)![0].rows, 0);
});
test('non-secret local history scopes are distinct across remounts/edits and session epochs', () => {
  const first = nextHistoryRevision(),
    second = nextHistoryRevision();
  assert.notDeepEqual(syncHistoryKey(first, 0), syncHistoryKey(second, 0));
  assert.notDeepEqual(syncHistoryKey(second, 0), syncHistoryKey(second, 1));
  assert.ok(
    syncHistoryKey(first, 0).every(
      (part) => typeof part === 'number' || part === 'integration-run-history',
    ),
  );
  const source = readFileSync(
    new URL('../../src/features/systems/integrations/IntegrationsHealthPage.tsx', import.meta.url),
    'utf8',
  );
  const history = source
    .split('// History is a session-scoped read;')[1]
    .split('// Enhanced ping')[0];
  assert.match(history, /sessionFetchJSON/);
  assert.match(history, /signal, headers: \{ 'X-Admin-Token': adminToken \}/);
  assert.doesNotMatch(history, /queryKey:\s*\[[^\]]*adminToken/);
  assert.match(history, /cancelQueries/);
  assert.match(history, /removeQueries/);
  assert.match(history, /setSelectedRun\(null\)/);
  assert.match(history, /setIsErrorPaneOpen\(false\)/);
  assert.match(source, /selectedHistorySource === runsQuery.data/);
});
