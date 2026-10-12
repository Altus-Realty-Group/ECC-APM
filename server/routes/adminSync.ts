// server/routes/adminSync.ts
import type { Request, Response, Router } from 'express';
import express from 'express';
import { runSync } from '../lib/sync.js';
import { upsertState } from '../lib/integrationState.js';
import { setContract } from '../lib/contractHeaders.js';

const router: Router = express.Router();

function isAuthorized(req: Request) {
  const token = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');
  return token && token === process.env.ADMIN_SYNC_TOKEN;
}

router.post('/run', async (req: Request, res: Response) => {
  try {
    if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });

    const {
      entities = ['owners', 'properties', 'units', 'leases', 'tenants'],
      mode = 'incremental',
      sinceDays = 30,
    } = req.body || {};

    const result = await runSync(entities, mode, sinceDays);
    setContract(req, res, '/api/control/sync/run');
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// POST /reset-lock - Reset the auto-sync lock (admin only)
router.post('/reset-lock', async (req: Request, res: Response) => {
  try {
    if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });

    await upsertState("AUTO_SYNC_LOCK", {
      locked: false,
      holder: null,
      expires_at: null,
      reset_at: new Date().toISOString(),
      reset_by: "admin"
    });

    setContract(req, res, '/api/control/sync/reset-lock');
    res.json({ ok: true, message: 'Lock reset successfully' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// POST /quick-run - Quick incremental sync for owners+properties (admin only)
router.post('/quick-run', async (req: Request, res: Response) => {
  try {
    if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });

    const result = await runSync(['owners', 'properties'], 'incremental');
    setContract(req, res, '/api/control/sync/quick-run');
    res.json({ ok: true, message: 'Quick sync completed', ...result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;