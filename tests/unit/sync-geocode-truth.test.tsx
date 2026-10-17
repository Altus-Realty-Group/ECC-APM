import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import RunPanel from '../../src/features/systems/integrations/components/RunPanel';
import LastRunTable from '../../src/features/systems/integrations/components/LastRunTable';
import ErrorPane from '../../src/features/systems/integrations/components/ErrorPane';
import AdminSyncPage from '../../src/features/admin/pages/AdminSyncPage';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GeocodeManagementView,
  parseGeocodeStats,
} from '../../src/features/admin/pages/AdminGeocodeManagementPage';
function syncHarness(history: { data: unknown; error: unknown } = { data: [], error: null }) {
  const exported: { mapSyncCompletions?: Function } = {};
  let historyFilter: string[] = [];
  const routes = new Map<string, Function>(),
    logs: string[] = [],
    audit: any[] = [],
    alerts: string[] = [],
    calls = { provider: 0, db: 0, webhook: 0 };
  const router = {
    get: (path: string, handler: Function) => routes.set('GET ' + path, handler),
    post: (path: string, handler: Function) => routes.set('POST ' + path, handler),
  };
  const source = readFileSync(
    new URL('../../server/routes/admin/sync.ts', import.meta.url),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require', 'exports', 'process', 'fetch', 'console', compiled)(
    (name: string) => {
      if (name === 'express') return { Router: () => router };
      if (name.includes('supabaseAdmin'))
        return {
          sbAdmin: {
            from: (table: string) => {
              calls.db++;
              assert.equal(table, 'audit_events');
              return {
                select: () => ({
                  in: (_column: string, values: string[]) => {
                    historyFilter = values;
                    return { order: () => ({ limit: async () => history }) };
                  },
                }),
                insert: async (value: any) => {
                  audit.push(value);
                  return { error: null };
                },
              };
            },
          },
        };
      if (name.includes('doorloop'))
        return {
          dlPaginate: async (_path: string, _query: unknown, _size: number, progress: Function) => {
            calls.provider++;
            progress(1, 2);
            return [{ id: 1 }, { id: 2 }];
          },
          dlFetchFull: () => {
            throw Error('Unexpected provider read');
          },
        };
      throw Error('Unexpected import ' + name);
    },
    exported,
    {
      env: {
        ADMIN_SYNC_TOKEN: 'isolated-token',
        INTEGRATIONS_TEAMS_WEBHOOK: 'https://isolated.invalid/hook',
      },
    },
    async (_url: string, init: any) => {
      calls.webhook++;
      alerts.push(JSON.parse(init.body).text);
      return { ok: true };
    },
    { log: (value: string) => logs.push(value), error: (value: string) => logs.push(value) },
  );
  const invoke = async (key: string, body: unknown, authorized = true) => {
    let status = 200,
      payload: any;
    const response = {
      status: (v: number) => {
        status = v;
        return response;
      },
      json: (v: unknown) => {
        payload = v;
        return response;
      },
    };
    await routes.get(key)!(
      {
        body,
        headers: authorized ? { 'x-admin-token': 'isolated-token' } : {},
        query: {},
        ip: 'isolated',
        get: () => undefined,
      },
      response,
    );
    return { status, payload };
  };
  return {
    routes,
    logs,
    audit,
    alerts,
    calls,
    invoke,
    exported,
    get historyFilter() {
      return historyFilter;
    },
  };
}
test('actual mounted run handler refuses absent/false/truthy dryRun before provider, state, audit or notification', async () => {
  const h = syncHarness();
  assert.equal((await h.invoke('POST /run', { dryRun: false }, false)).status, 401);
  for (const body of [
    undefined,
    null,
    {},
    { dryRun: false },
    { dryRun: 'true' },
    { dryRun: 1 },
    { dryRun: [] },
    { dryRun: {} },
  ]) {
    const r = await h.invoke('POST /run', body);
    assert.equal(r.status, 503);
    assert.equal(r.payload.ok, false);
    assert.match(r.payload.error, /Live sync is unavailable/);
  }
  assert.deepEqual(h.calls, { provider: 0, db: 0, webhook: 0 });
  assert.equal(h.audit.length, 0);
  assert.equal(h.logs.length, 0);
  const status = await h.invoke('GET /status', {});
  assert.equal(status.payload.currentRun, null);
  assert.equal(status.payload.lastRun.success, false);
});
test('explicit real dry-run path observes records but labels audit/completion/alerts as read-only with zero writes', async () => {
  const h = syncHarness();
  const result = await h.invoke('POST /run', { entities: ['units'], dryRun: true });
  assert.equal(result.status, 200);
  assert.match(result.payload.message, /Dry run started/);
  // Background handler settles its isolated promises without clocks or external requests.
  for (let i = 0; i < 12; i++) await Promise.resolve();
  assert.equal(h.calls.provider, 1);
  assert.ok(h.audit.some((e) => e.event_type === 'SYNC_DRY_RUN_START'));
  const complete = h.audit.find((e) => e.event_type === 'SYNC_DRY_RUN_COMPLETE');
  assert.ok(complete);
  assert.equal(complete.payload.dryRun, true);
  assert.equal(complete.payload.operatingRecordsWritten, 0);
  assert.equal(complete.payload.rows, 2);
  assert.ok(
    h.audit.every((e) => e.event_type !== 'SYNC_COMPLETE' && e.event_type !== 'SYNC_START'),
  );
  assert.ok(h.logs.some((v) => v.includes('no operating records were written')));
  assert.ok(
    h.alerts.some(
      (v) => v.includes('READ-ONLY DRY RUN') && v.includes('no operating records were written'),
    ),
  );
  assert.ok(h.alerts.every((v) => !v.includes('✅ Completed')));
  const status = await h.invoke('GET /status', {});
  assert.equal(status.payload.lastRun.dryRun, true);
  assert.equal(status.payload.lastRun.success, true);
});
test('geocode unknown audit fields stay unknown; real zero remains zero without a success-rate calculation', () => {
  const raw = { events: [{ created_at: 'not-a-date', payload: {} }] };
  const unknown = parseGeocodeStats(raw);
  assert.deepEqual(unknown, { timestamp: null, processed: null, updated: null, batchSize: null });
  const html = renderToStaticMarkup(
    <GeocodeManagementView stats={unknown} loading={false} failed={false} retry={() => {}} />,
  );
  assert.match(html, /Not reported/);
  assert.doesNotMatch(
    html,
    /Success Rate:|60 seconds|2 requests\/second|batch size would be|would be triggered/,
  );
  const zero = parseGeocodeStats({
    events: [
      { created_at: '2026-10-17T00:00:00Z', payload: { processed: 0, updated: 0, batch_size: 0 } },
    ],
  });
  assert.equal(zero!.processed, 0);
  assert.equal(zero!.updated, 0);
  assert.equal(zero!.batchSize, null);
});
test('geocode stats reject malformed collections and never coerce strings/negative/NaN counts', () => {
  for (const raw of [null, {}, { events: null }, { events: [null] }, { events: [{ payload: [] }] }])
    assert.throws(() => parseGeocodeStats(raw));
  assert.equal(parseGeocodeStats({ events: [] }), null);
  assert.deepEqual(
    parseGeocodeStats({ events: [{ payload: { processed: '0', updated: -1, batch_size: NaN } }] }),
    { timestamp: null, processed: null, updated: null, batchSize: null },
  );
});
test('geocode unsupported actions are disabled, failed/refreshing reads suppress stale stats', () => {
  const stats = { timestamp: null, processed: 123, updated: 99, batchSize: 10 };
  for (const patch of [
    { loading: true, failed: false },
    { loading: false, failed: true },
  ]) {
    const html = renderToStaticMarkup(
      <GeocodeManagementView stats={stats} {...patch} retry={() => {}} />,
    );
    assert.doesNotMatch(html, />123<|>99<|>10</);
    assert.match(html, /disabled=""[^>]*>Update batch size/);
    assert.match(html, /disabled=""[^>]*>Trigger manual geocode run/);
    assert.match(html, /not connected to an approved service/);
  }
  const source = readFileSync(
    new URL('../../src/features/admin/pages/AdminGeocodeManagementPage.tsx', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(
    source,
    /setTimeout|updateBatchSize|triggerManualRun|setMessage|Success Rate:/,
  );
});

test('completion history requires persisted IDs/observations and excludes start/stop/noncompletion audit', async () => {
  const event = {
    id: 12,
    created_at: '2026-10-17T00:00:00Z',
    event_type: 'SYNC_DRY_RUN_COMPLETE',
    payload: {
      entities: ['units'],
      mode: 'delta',
      rows: 0,
      duration: 12,
      dryRun: true,
      operatingRecordsWritten: 0,
    },
  };
  const h = syncHarness({ data: [event], error: null });
  const response = await h.invoke('GET /runs', {});
  assert.equal(response.status, 200);
  assert.equal(response.payload.runs[0].id, '12');
  assert.equal(response.payload.runs[0].rows, 0);
  assert.equal(response.payload.runs[0].dryRun, true);
  assert.deepEqual(h.historyFilter, [
    'SYNC_COMPLETE',
    'SYNC_ERROR',
    'SYNC_DRY_RUN_COMPLETE',
    'SYNC_DRY_RUN_ERROR',
  ]);
  const map = h.exported.mapSyncCompletions!;
  for (const patch of [
    { id: null },
    { id: '' },
    { event_type: 'SYNC_START' },
    { event_type: 'SYNC_DRY_RUN_START' },
    { event_type: 'SYNC_STOP' },
    { event_type: 'AUTO_SYNC' },
    { event_type: 'MANUAL_SYNC' },
    { payload: { ...event.payload, rows: undefined } },
    { payload: { ...event.payload, duration: undefined } },
  ])
    assert.throws(() => map([{ ...event, ...patch }]));
  assert.throws(() => map([event, event]));
  assert.deepEqual(map([]), []);
  for (const value of [
    { data: null, error: null },
    { data: [], error: { message: 'sensitive database text' } },
  ]) {
    const bad = await syncHarness(value).invoke('GET /runs', {});
    assert.equal(bad.status, 503);
    assert.deepEqual(bad.payload, { ok: false, error: 'Run history could not be loaded.' });
  }
});

test('mounted history and detail clearly label preview outcomes and historical reported outcomes', () => {
  const run = {
    id: 'stored-id',
    timestamp: '2026-10-17T00:00:00Z',
    entity: 'units',
    mode: 'delta' as const,
    rows: 0,
    duration: 12,
    result: 'success' as const,
    dryRun: true,
  };
  const table = renderToStaticMarkup(<LastRunTable runs={[run]} onRowClick={() => {}} />);
  assert.match(table, /Read-only preview/);
  assert.match(table, /Preview completed/);
  assert.match(table, /Reported outcome/);
  assert.match(table, /does not verify persisted operating records/);
  const detail = renderToStaticMarkup(
    <ErrorPane isOpen={true} onClose={() => {}} runDetails={run} />,
  );
  assert.match(detail, /Preview completed/);
  assert.match(detail, /does not verify persisted operating records/);
});

test('mounted RunPanel requires explicit preview opt-in and legacy admin write controls remain unavailable', () => {
  const panel = renderToStaticMarkup(
    <RunPanel
      entities={['units']}
      selectedEntities={['units']}
      onEntitiesChange={() => {}}
      isRunning={false}
      onRun={async () => {}}
      onStop={async () => {}}
    />,
  );
  assert.match(panel, /Live sync is unavailable/);
  assert.match(panel, /disabled=""[^>]*data-testid="button-run-sync"/);
  assert.doesNotMatch(panel, /simulate the sync/);
  assert.match(panel, /explicit opt-in/);
  const admin = renderToStaticMarkup(<AdminSyncPage />);
  assert.match(admin, /Live sync and quick-run writes are unavailable/);
  for (const id of ['run-sync-btn', 'quick-run-btn'])
    assert.match(admin, new RegExp('disabled=""[^>]*data-testid="' + id + '"'));
});
