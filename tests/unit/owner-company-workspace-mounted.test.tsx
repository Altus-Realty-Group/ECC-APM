// Synthetic lifecycle fixtures only. No backend, identity transport or operating data.
import React, { useLayoutEffect } from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import CompanyWorkspace from '../../src/features/owners/company-workspace/CompanyWorkspace';
import { handleSessionBoundary, useSessionEpoch } from '../../src/lib/sessionScope';
import { fixtureAdapter, unboundCompanyWorkspaceAdapter, type CompanyWorkspaceAdapter } from '../../src/features/owners/company-workspace/adapter';
import type { CompanyMembership, CompanyWorkspaceState, WorkspaceContext } from '../../src/features/owners/company-workspace/types';

const member = (id: string, role: CompanyMembership['role'] = 'viewer'): CompanyMembership => ({
  companyId: id, companyName: `SYNTHETIC ${id}`, role,
  canManageMembers: false, canApproveFinancial: false, canChangeBanking: false,
});
const ready = (id: string): CompanyWorkspaceState => ({ kind: 'ready', memberships: [member(id)], selectedId: id });
const text = (view: ReactTestRenderer) => JSON.stringify(view.toJSON());
async function mount(adapter: CompanyWorkspaceAdapter, customerId = 'synthetic-customer-A') {
  let view!: ReactTestRenderer;
  await act(async () => { view = TestRenderer.create(<CompanyWorkspace adapter={adapter} customerId={customerId} />); });
  return view;
}
function deferredAdapter() {
  const requests: Array<{ context: WorkspaceContext; signal?: AbortSignal; resolve: (state: CompanyWorkspaceState) => void; reject: (error: Error) => void }> = [];
  const adapter: CompanyWorkspaceAdapter = { load(context, signal) { return new Promise((resolve, reject) => requests.push({ context, signal, resolve, reject })); } };
  return { requests, adapter };
}
function CommitProbe({ adapter, customerId, capture }: { adapter: CompanyWorkspaceAdapter; customerId: string; capture: () => void }) {
  const sessionEpoch = useSessionEpoch();
  // Observe committed output before passive request effects can clear it.
  useLayoutEffect(capture, [adapter, customerId, sessionEpoch, capture]);
  return <CompanyWorkspace adapter={adapter} customerId={customerId} />;
}

test('settled ready state supports selection without primary-derived powers or denied metadata', async () => {
  const memberships = [member('primary-A', 'primary'), member('viewer-B'), member('DENIED-SECRET', 'denied')];
  const view = await mount(fixtureAdapter({ kind: 'ready', memberships, selectedId: 'primary-A' }));
  try {
    assert.match(text(view), /SYNTHETIC primary-A/);
    assert.doesNotMatch(text(view), /DENIED-SECRET/);
    assert.match(text(view), /not granted/);
    const buttons = view.root.findAllByType('button');
    assert.equal(buttons.length, 2);
    await act(async () => buttons[1].props.onClick());
    assert.equal(view.root.findByType('h2').children.join(''), 'SYNTHETIC viewer-B');
  } finally { await act(async () => view.unmount()); }
});

test('incoming denied selection and denied-only collection reveal no denied name', async () => {
  const denied = member('DENIED-SECRET', 'denied');
  const view = await mount(fixtureAdapter({ kind: 'ready', memberships: [member('allowed-A'), denied], selectedId: denied.companyId }));
  try {
    assert.doesNotMatch(text(view), /DENIED-SECRET/);
    assert.equal(view.root.findAllByType('h2').length, 0);
    await act(async () => view.update(<CompanyWorkspace adapter={fixtureAdapter({ kind: 'ready', memberships: [denied], selectedId: denied.companyId })} />));
    assert.doesNotMatch(text(view), /DENIED-SECRET/);
    assert.match(text(view), /No companies are available/);
  } finally { await act(async () => view.unmount()); }
});

test('unbound, empty, denied and error states settle in the mounted component', async () => {
  for (const [adapter, expected] of [
    [unboundCompanyWorkspaceAdapter(), /Company workspace is not available/],
    [fixtureAdapter({ kind: 'empty' }), /No companies are available/],
    [fixtureAdapter({ kind: 'denied' }), /don.t have access/],
    [fixtureAdapter({ kind: 'error', message: 'SYNTHETIC failure' }), /SYNTHETIC failure/],
  ] as const) {
    const view = await mount(adapter);
    try { assert.match(text(view), expected); } finally { await act(async () => view.unmount()); }
  }
});

test('same-adapter customer replacement hides prior content on its first commit', async () => {
  const source = deferredAdapter();
  let view!: ReactTestRenderer;
  const commits: string[] = [];
  const capture = () => { if (view) commits.push(text(view)); };
  await act(async () => { view = TestRenderer.create(<CommitProbe adapter={source.adapter} customerId="customer-A" capture={capture} />); });
  try {
    await act(async () => source.requests[0].resolve(ready('company-A')));
    commits.length = 0;
    await act(async () => view.update(<CommitProbe adapter={source.adapter} customerId="customer-B" capture={capture} />));
    assert.ok(commits.length > 0);
    assert.ok(commits.every(commit => !commit.includes('SYNTHETIC company-A')), 'old company appeared on a new-customer commit');
    assert.equal(source.requests[0].signal?.aborted, true);
    assert.equal(source.requests[1].context.customerId, 'customer-B');
    await act(async () => source.requests[1].resolve(ready('company-B')));
    assert.match(text(view), /SYNTHETIC company-B/);
  } finally { await act(async () => view.unmount()); }
});

test('supported session boundary hides prior content on its first commit and passes the new epoch', async () => {
  const source = deferredAdapter();
  const client = new QueryClient();
  let view!: ReactTestRenderer;
  const commits: string[] = [];
  const capture = () => { if (view) commits.push(text(view)); };
  await act(async () => { view = TestRenderer.create(<CommitProbe adapter={source.adapter} customerId="customer-A" capture={capture} />); });
  try {
    await act(async () => source.requests[0].resolve(ready('old-session-company')));
    commits.length = 0;
    await act(async () => handleSessionBoundary(client));
    assert.ok(commits.length > 0);
    assert.ok(commits.every(commit => !commit.includes('SYNTHETIC old-session-company')), 'old company appeared after session replacement');
    assert.equal(source.requests[0].signal?.aborted, true);
    assert.ok(source.requests[1].context.sessionEpoch > source.requests[0].context.sessionEpoch);
  } finally { await act(async () => view.unmount()); client.clear(); }
});

test('late success and error from an old customer cannot replace current data', async () => {
  for (const rejectOld of [false, true]) {
    const source = deferredAdapter();
    const view = await mount(source.adapter, 'customer-A');
    try {
      await act(async () => view.update(<CompanyWorkspace adapter={source.adapter} customerId="customer-B" />));
      await act(async () => source.requests[1].resolve(ready('current-company')));
      await act(async () => rejectOld ? source.requests[0].reject(new Error('SYNTHETIC old failure')) : source.requests[0].resolve(ready('old-company')));
      assert.match(text(view), /SYNTHETIC current-company/);
      assert.doesNotMatch(text(view), /SYNTHETIC old-company|could not be loaded/);
    } finally { await act(async () => view.unmount()); }
  }
});

test('adapter replacement hides previous data before the replacement effect', async () => {
  const old = fixtureAdapter(ready('old-adapter-company'));
  const next = deferredAdapter();
  let view!: ReactTestRenderer;
  const commits: string[] = [];
  const capture = () => { if (view) commits.push(text(view)); };
  await act(async () => { view = TestRenderer.create(<CommitProbe adapter={old} customerId="customer-A" capture={capture} />); });
  try {
    commits.length = 0;
    await act(async () => view.update(<CommitProbe adapter={next.adapter} customerId="customer-A" capture={capture} />));
    assert.ok(commits.every(commit => !commit.includes('SYNTHETIC old-adapter-company')));
  } finally { await act(async () => view.unmount()); }
});

test('unmount aborts the active retry request and ignores its late result', async () => {
  const source = deferredAdapter();
  const view = await mount(source.adapter);
  await act(async () => source.requests[0].resolve({ kind: 'error', message: 'SYNTHETIC retry' }));
  await act(async () => view.root.findByType('button').props.onClick());
  assert.equal(source.requests[0].signal?.aborted, true);
  assert.equal(source.requests.length, 2);
  await act(async () => view.unmount());
  assert.equal(source.requests[1].signal?.aborted, true);
  await act(async () => source.requests[1].resolve(ready('late-unmounted-company')));
  assert.equal(view.toJSON(), null);
});

test('synchronous adapter failure settles as error instead of escaping the effect', async () => {
  const view = await mount({ load() { throw new Error('SYNTHETIC synchronous adapter failure'); } });
  try { assert.match(text(view), /Company workspace could not be loaded/); } finally { await act(async () => view.unmount()); }
});
