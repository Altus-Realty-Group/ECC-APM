import { Router } from 'express';
import { getServerClient } from '../db.js';
import { setContract } from '../lib/contractHeaders.js';
import { supabaseGuard } from '../lib/supabaseGuard.js';

export const entities = Router();
entities.use(supabaseGuard);

function parseFilters(q: any) {
  const filters: Array<[string, string, any]> = [];
  for (const [key, value] of Object.entries(q)) {
    const [op, val] = String(value).split('.');
    filters.push([key, op, val]);
  }
  return filters;
}

entities.get('/:table/:id', async (req, res) => {
  const { table, id } = req.params as { table: string; id: string };
  const ctl = new AbortController();
  req.on('close', () => ctl.abort());
  const supa = getServerClient();
  const { data, error } = await supa.from(table).select('*').eq('id', id).single();
  if (error || !data) return res.status(404).json({ error: 'not found' });
  setContract(req, res, '/api/entities/:table/:id');
  res.json({ data: [data], meta: { totalCount: 1 } });
});

entities.get('/:table', async (req, res) => {
  const { table } = req.params as { table: string };
  const ctl = new AbortController();
  req.on('close', () => ctl.abort());
  const supa = getServerClient();
  let q = supa.from(table).select('*');
  for (const [col, op, val] of parseFilters(req.query)) {
    switch (op) {
      case 'eq': q = q.eq(col, val); break;
      case 'lt': q = q.lt(col, val); break;
      case 'lte': q = q.lte(col, val); break;
      case 'gt': q = q.gt(col, val); break;
      case 'gte': q = q.gte(col, val); break;
      case 'like': q = q.like(col, val); break;
      case 'ilike': q = q.ilike(col, val); break;
      default: break;
    }
  }
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  setContract(req, res, '/api/entities/:table');
  res.json({ data: data || [], meta: { totalCount: (data || []).length } });
});

export default entities;