import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const workflows = ['deploy.yml', 'sync-doorloop-owners.yml'];
function refusalOnly(script: string) {
  // Whitelist shell syntax instead of merely blacklisting known cloud clients.
  const lines = script.trim().split('\n').map(line => line.trim());
  assert.ok(lines.every(line => line === '#!/bin/bash' || line === 'set -euo pipefail'
    || /^printf '%s\\n' '[A-Za-z0-9 ._/-]+' >&2$/.test(line) || line === 'exit 1'));
  assert.equal(lines.at(-1), 'exit 1');
  assert.equal(lines.filter(line => line.startsWith('printf ')).length, 1);
}
function runOffline(script: string) {
  const cwd = mkdtempSync(join(tmpdir(), 'ecc-quarantine-'));
  try {
    const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-c', script], {
      cwd, env: { PATH: '/nonexistent' }, encoding: 'utf8', timeout: 1000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /quarantined.*No .*attempted|quarantined.*No Azure command was run/);
    assert.deepEqual(readdirSync(cwd), []);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}
for (const file of workflows) {
  test(`${file} has only a bounded manual refusal with no executable integration`, () => {
    const source = readFileSync(join(root, '.github/workflows', file), 'utf8');
    assert.match(source, /"on":\n  workflow_dispatch:\n/);
    assert.match(source, /permissions: \{\}/);
    assert.match(source, /timeout-minutes: 1/);
    assert.equal((source.match(/^  [a-z_-]+:$/gm) ?? []).length, 2); // dispatch and one job
    assert.equal((source.match(/^      - name:/gm) ?? []).length, 1);
    assert.doesNotMatch(source, /\$\{|\buses:|\benv:|\bwith:|\bschedule:|\bpush:|\bpull_request:|https?:\/\//);
    const run = source.split('        run: |\n');
    assert.equal(run.length, 2);
    const script = run[1].split('\n').filter(Boolean).map(line => {
      assert.match(line, /^          /);
      return line.slice(10);
    }).join('\n');
    refusalOnly(script);
    runOffline(script);
  });
}
test('legacy deployment script refuses before environment reads, tools or filesystem work', () => {
  const script = readFileSync(join(root, 'azure-deploy-script.sh'), 'utf8');
  refusalOnly(script);
  runOffline(script);
});
