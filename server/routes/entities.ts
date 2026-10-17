import { Router } from 'express';
import type { Request, Response } from 'express';
import { getServerClient } from '../db.js';
import { setContract } from '../lib/contractHeaders.js';
import { supabaseGuard } from '../lib/supabaseGuard.js';
import { buildPage, isDenial, noVerifiedActor, planRead, resolveActor } from '../lib/readBoundary.js';
import type { PlannedRead, ReadActorResolver, VerifiedReadScope } from '../lib/readBoundary.js';

type Reader = () => { from: (table: string) => any };

/**
 * Generic entity reader behind a read boundary. Order matters: verified actor first, then request validation against the
 * explicit entity/field policy, and only then a database client. Every denial is a fixed body with no table, column,
 * identifier or database text in it.
 */
export function createEntitiesRouter(opts: { resolveActor?: ReadActorResolver; getClient?: Reader } = {}) {
  const resolver = opts.resolveActor ?? noVerifiedActor;
  const getClient = opts.getClient ?? (getServerClient as unknown as Reader);
  const router = Router();

  async function handle(req: Request, res: Response, scope: VerifiedReadScope, contract: string, name: string, id?: string) {
    const plan = planRead(name, req.query as Record<string, unknown>, scope, id);
    if (isDenial(plan)) return res.status(plan.status).json({ error: plan.error });
    return run(req, res, contract, plan, id !== undefined);
  }

  async function run(req: Request, res: Response, contract: string, plan: PlannedRead, single: boolean) {
    try {
      let q = getClient().from(plan.policy.table).select(plan.columns.join(','), { count: 'exact' });
      q = q.in(plan.policy.scope!.column, plan.scopeIds);
      for (const f of plan.filters) {
        switch (f.op) {
          case 'eq': q = q.eq(f.column, f.value); break;
          case 'lt': q = q.lt(f.column, f.value); break;
          case 'lte': q = q.lte(f.column, f.value); break;
          case 'gt': q = q.gt(f.column, f.value); break;
          case 'gte': q = q.gte(f.column, f.value); break;
        }
      }
      for (const o of plan.orders) q = q.order(o.column, { ascending: o.ascending });
      const { data, error, count } = await q.range(plan.offset, plan.offset + plan.limit - 1);
      if (error) return res.status(500).json({ error: 'read failed' });
      // A database "success" that is not exactly the planned shape is a failed read, never an empty list.
      const page = buildPage(plan, data, count);
      if (!page) return res.status(500).json({ error: 'read failed' });
      if (single && page.rows.length !== 1) return res.status(404).json({ error: 'not found' });
      setContract(req, res, contract);
      return res.json({ data: page.rows, meta: page.meta });
    } catch {
      return res.status(500).json({ error: 'read failed' });
    }
  }

  // Identity and scope are checked before the environment guard so an unverified caller learns nothing about server setup.
  router.get('/:table/:id', async (req, res, next) => {
    const scope = await resolveActor(resolver, req);
    if (isDenial(scope)) return res.status(scope.status).json({ error: scope.error });
    supabaseGuard(req, res, () => { void handle(req, res, scope, '/api/entities/:table/:id', req.params.table, req.params.id).catch(next); });
  });
  router.get('/:table', async (req, res, next) => {
    const scope = await resolveActor(resolver, req);
    if (isDenial(scope)) return res.status(scope.status).json({ error: scope.error });
    supabaseGuard(req, res, () => { void handle(req, res, scope, '/api/entities/:table', req.params.table).catch(next); });
  });
  return router;
}

export const entities = createEntitiesRouter();
export default entities;
