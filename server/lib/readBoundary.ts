// Read boundary for the generic entity reader (R9-C).
//
// Nothing here authenticates anyone. It consumes an already-verified actor from a resolver that the real identity layer
// (Control Plane) must supply; until one is wired the default resolver reports "no verified actor" and every read is
// denied before any database client is created. No login, user store, role fallback or identity contract is defined
// here: the scope shape below is only what this boundary needs to filter rows, supplied by whatever verified the actor.
import type { Request } from 'express';

/** Row ids the verified actor may read, by relationship. Produced by the identity layer, never by this module. */
export type VerifiedReadScope = { ownerIds?: readonly number[]; propertyIds?: readonly number[] };
export type ReadActorResolver = (req: Request) => Promise<VerifiedReadScope | null> | VerifiedReadScope | null;

/** Production default until the Control Plane resolver is bound: nobody is verified, so nothing is readable. */
export const noVerifiedActor: ReadActorResolver = () => null;

type ScopeKind = 'ownerIds' | 'propertyIds';
export type EntityPolicy = {
  table: string;
  /** Only these columns are ever selected, filtered on or returned. */
  fields: readonly string[];
  /** How rows are limited to the actor. Absent means the entity has no verified scope path and is not readable. */
  scope?: { kind: ScopeKind; column: string };
};

// Fields come from shared/schema.ts (source-declared, not live-verified). Contact details, vendor ids, balances and
// audit columns are deliberately absent. Tenants have no column that ties a row to an owner or property, so they stay
// unavailable rather than guessing a relationship through leases.
export const ENTITY_POLICY: Readonly<Record<string, EntityPolicy>> = Object.freeze({
  properties: {
    table: 'properties',
    fields: ['id', 'name', 'type', 'class', 'active', 'address_state', 'address_city', 'address_zip', 'property_address', 'address', 'street_address', 'full_address', 'lat', 'lng'],
    scope: { kind: 'propertyIds', column: 'id' },
  },
  units: {
    table: 'units',
    fields: ['id', 'property_id', 'name', 'unit_number', 'unit_name', 'beds', 'baths', 'sqft', 'status', 'condition', 'unit_condition', 'rent', 'market_rent', 'marketRent'],
    scope: { kind: 'propertyIds', column: 'property_id' },
  },
  leases: {
    table: 'leases',
    fields: ['id', 'property_id', 'unit_id', 'tenant_id', 'status', 'start', 'end', 'start_date', 'end_date', 'rent'],
    scope: { kind: 'propertyIds', column: 'property_id' },
  },
  owners: {
    table: 'owners',
    fields: ['id', 'company', 'name', 'active'],
    scope: { kind: 'ownerIds', column: 'id' },
  },
  tenants: { table: 'tenants', fields: ['id', 'name'] },
});

export const MAX_ROWS = 500;
const FILTER_OPS = new Set(['eq', 'lt', 'lte', 'gt', 'gte']);
const RESERVED = new Set(['select', 'limit', 'offset', 'order']);
const DIGITS = /^[0-9]+$/;

export type ReadDenial = { status: 400 | 401 | 403 | 404 | 503; error: string };
export type PlannedRead = {
  policy: EntityPolicy;
  columns: string[];
  scopeIds: number[];
  filters: Array<{ column: string; op: string; value: string }>;
  /** Always non-empty and always ends in `id`, so paging is deterministic even when the caller orders by another column. */
  orders: Array<{ column: string; ascending: boolean }>;
  limit: number;
  offset: number;
  /** A by-id read: `id` is the primary key, so at most one row can match. */
  single: boolean;
};

export const deny = (status: ReadDenial['status'], error: string): ReadDenial => ({ status, error });
export const isDenial = (v: unknown): v is ReadDenial => !!v && typeof v === 'object' && 'status' in (v as object) && 'error' in (v as object);

export function policyFor(name: string): EntityPolicy | undefined {
  return Object.prototype.hasOwnProperty.call(ENTITY_POLICY, name) ? ENTITY_POLICY[name] : undefined;
}

const positiveInts = (v: readonly number[] | undefined): number[] =>
  Array.isArray(v) ? Array.from(new Set(v.filter((n) => Number.isSafeInteger(n) && n > 0))) : [];

/** Resolves who is asking. Anything but a clear scope object is "not verified". Never reaches the database. */
export async function resolveActor(resolver: ReadActorResolver, req: Request): Promise<VerifiedReadScope | ReadDenial> {
  let scope: VerifiedReadScope | null;
  try { scope = await resolver(req); } catch { return deny(503, 'unavailable'); }
  if (!scope || typeof scope !== 'object') return deny(401, 'unauthenticated');
  return scope;
}

/** Validates a request against the policy and the verified scope. Pure: no database access. */
export function planRead(name: string, query: Record<string, unknown>, scope: VerifiedReadScope, id?: string): PlannedRead | ReadDenial {
  const policy = policyFor(name);
  if (!policy) return deny(404, 'not found');
  if (!policy.scope) return deny(403, 'not permitted');
  const scopeIds = positiveInts(scope[policy.scope.kind]);
  if (!scopeIds.length) return deny(403, 'not permitted');

  const allowed = new Set(policy.fields);
  let columns = [...policy.fields];
  const filters: PlannedRead['filters'] = [];
  let orders: PlannedRead['orders'] = [];
  let limit = MAX_ROWS;
  let offset = 0;

  for (const [key, raw] of Object.entries(query)) {
    if (typeof raw !== 'string') return deny(400, 'invalid request');
    if (key === 'select') {
      if (raw !== '*') {
        const wanted = raw.split(',').map((s) => s.trim());
        if (!wanted.length || wanted.some((c) => !allowed.has(c))) return deny(403, 'not permitted');
        columns = Array.from(new Set(wanted));
      }
      continue;
    }
    if (key === 'limit') {
      const n = Number(raw);
      if (!DIGITS.test(raw) || !Number.isSafeInteger(n) || n < 1) return deny(400, 'invalid request');
      limit = Math.min(n, MAX_ROWS);
      continue;
    }
    if (key === 'offset') {
      const n = Number(raw);
      if (!DIGITS.test(raw) || !Number.isSafeInteger(n)) return deny(400, 'invalid request');
      offset = n;
      continue;
    }
    if (key === 'order') {
      // One key in the form `<column>.<asc|desc>` (what Data Hub sends: `id.desc`). Only allow-listed columns can order
      // the result, so ordering cannot be used to learn about values in hidden columns.
      const dot = raw.lastIndexOf('.');
      const column = dot < 0 ? '' : raw.slice(0, dot);
      const dir = dot < 0 ? '' : raw.slice(dot + 1);
      if (!column || raw.includes(',') || (dir !== 'asc' && dir !== 'desc')) return deny(400, 'invalid request');
      if (!allowed.has(column)) return deny(403, 'not permitted');
      orders = [{ column, ascending: dir === 'asc' }];
      continue;
    }
    if (RESERVED.has(key)) continue;
    if (!allowed.has(key)) return deny(403, 'not permitted');
    const dot = raw.indexOf('.');
    const op = dot < 0 ? '' : raw.slice(0, dot);
    const value = dot < 0 ? '' : raw.slice(dot + 1);
    if (!FILTER_OPS.has(op) || value === '') return deny(400, 'invalid request');
    if (key === policy.scope.column && op === 'eq' && !scopeIds.includes(Number(value))) return deny(403, 'not permitted');
    filters.push({ column: key, op, value });
  }

  if (id !== undefined) {
    const n = Number(id);
    if (!/^[0-9]+$/.test(id) || !Number.isSafeInteger(n) || n < 1) return deny(404, 'not found');
    filters.push({ column: 'id', op: 'eq', value: String(n) });
    // A single-record read is one row at offset zero whatever paging the caller sent.
    limit = 1;
    offset = 0;
    // Out-of-scope and missing look identical so existence is not disclosed.
  }
  if (!orders.some((o) => o.column === 'id')) orders.push({ column: 'id', ascending: true });
  return { policy, columns, scopeIds, filters, orders, limit, offset, single: id !== undefined };
}

/**
 * Completeness metadata for one page of a read.
 *  - `returned`   rows in `data` (never the total).
 *  - `totalCount` rows matching the actor's scope and the filters, from the database's exact count, ignoring limit/offset.
 *  - `limit`      the page size actually applied (a larger request is lowered to MAX_ROWS).
 *  - `truncated`  true when rows matching the read were not returned in this page.
 *  - `nextOffset` offset that continues the read, or null when the read is complete.
 */
export type PageMeta = { returned: number; totalCount: number; limit: number; offset: number; truncated: boolean; nextOffset: number | null };
export type ReadPage = { rows: Record<string, unknown>[]; meta: PageMeta };

/**
 * Accepts a database result only if it is exactly what the plan asked for; otherwise null (the caller answers with the
 * generic `read failed`). A null/object/scalar `data`, a missing or non-integer count, rows carrying any column that
 * was not selected, more rows than the limit, or a page whose size contradicts the count are all treated as a failed
 * read. None of them is ever converted into a successful empty list.
 */
export function buildPage(plan: PlannedRead, data: unknown, count: unknown): ReadPage | null {
  if (!Array.isArray(data)) return null;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return null;
  if (plan.single && count > 1) return null;
  const selected = new Set(plan.columns);
  for (const row of data) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    if (Object.keys(row).some((k) => !selected.has(k))) return null;
  }
  const expected = Math.max(0, Math.min(plan.limit, count - plan.offset));
  if (data.length !== expected) return null;
  const truncated = plan.offset + data.length < count;
  return {
    rows: data as Record<string, unknown>[],
    meta: { returned: data.length, totalCount: count, limit: plan.limit, offset: plan.offset, truncated, nextOffset: truncated ? plan.offset + data.length : null },
  };
}
