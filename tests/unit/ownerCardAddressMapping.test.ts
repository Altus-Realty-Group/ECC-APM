import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { mapAddress } from '../../server/lib/mapping.ts';

// Execute the real router with recording database/Express boundaries. No server,
// credentials or database client is imported, and projection follows SELECT.
function ownerHandler(rows: Record<string, unknown>[]) {
  const handlers = new Map<string, Function>();
  const router = {
    get: (path: string, handler: Function) => { handlers.set(path, handler); },
    post: () => {},
  };
  const queriedKeys: string[] = [];
  const database = {
    from(table: string) {
      assert.ok(['owners', 'properties'].includes(table));
      return { select(columns: string) {
        return { eq(key: string, value: unknown) {
          if (table === 'owners') {
            return { limit: async () => ({ data: [{ id: 7, name: 'Fixture owner' }], error: null }) };
          }
          queriedKeys.push(key);
          const selected = rows.filter(row => row[key] === value).map(row => {
            if (columns === '*') return { ...row };
            return Object.fromEntries(columns.split(',').filter(col => col in row).map(col => [col, row[col]]));
          });
          return Promise.resolve({ data: selected, error: null });
        } };
      } };
    },
  };
  const dependencies: Record<string, unknown> = {
    express: { Router: () => router },
    '../db.js': { getServerClient: () => database },
    '../lib/contractHeaders.js': { setContract: () => {} },
    '../lib/mapping.js': { mapAddress },
  };
  const source = readFileSync(new URL('../../server/routes/rpc.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(compiled.outputText, {
    exports: {},
    require: (name: string) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: 'rpc.cjs', timeout: 1000 });
  return { handler: handlers.get('/get_owner_card')!, queriedKeys };
}

for (const ownerKey of ['owner_id', 'ownerid']) {
  for (const unavailable of [false, true]) {
    test(`owner card preserves canonical address presence through ${ownerKey}, unavailable=${unavailable}`, async () => {
      const row = {
        id: 31, name: 'Fixture property', [ownerKey]: 7,
        address_street1: unavailable ? null : '100 Canonical St', address1: '999 Legacy Ave',
        address_city: unavailable ? '' : 'Canonical city', city: 'Legacy city',
        address_state: unavailable ? null : 'IN', state: 'XX',
        address_zip: unavailable ? '' : '46307', zip: '00000',
      };
      const snapshot = { ...row };
      const { handler, queriedKeys } = ownerHandler([row]);
      let status = 0;
      let body: any;
      const res = { status: (code: number) => { status = code; return res; }, json: (value: unknown) => { body = value; } };
      await handler({ query: { id: '7' } }, res);
      assert.equal(status, 200);
      assert.deepEqual(queriedKeys, ['owner_id', 'ownerid']);
      assert.equal(body.properties.length, 1);
      assert.equal(body.properties[0].id, 31);
      assert.equal(body.properties[0].address.line1, unavailable ? '' : '100 Canonical St');
      assert.equal(body.properties[0].address.city, unavailable ? '' : 'Canonical city');
      assert.equal(body.properties[0].address.state, unavailable ? '' : 'IN');
      assert.equal(body.properties[0].address.zip, unavailable ? '' : '46307');
      assert.deepEqual(row, snapshot);
    });
  }
}
