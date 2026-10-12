import { Router, Request, Response } from 'express';
import pool from '../lib/db.js';
import { getDatabaseUrl } from '../lib/env.js';
import { setContract } from '../lib/contractHeaders.js';
import { supabaseGuard } from '../lib/supabaseGuard.js';

const router = Router();

// GET /api/owner-transfer/:id - returns { transfer, audit } or 404
router.get('/owner-transfer/:id', supabaseGuard, async (req: Request, res: Response) => {
  if (!getDatabaseUrl()) {
    return res.status(501).json({ ok: false, error: 'db_unconfigured_for_this_route', message: 'This route requires a direct Postgres connection' });
  }

  const { id } = req.params;

  try {
    const transferQuery = `
      SELECT * FROM owner_transfers 
      WHERE id = $1
    `;

    const auditQuery = `
      SELECT * FROM owner_transfer_audit 
      WHERE transfer_id = $1 
      ORDER BY created_at DESC
    `;

    const [transferResult, auditResult] = await Promise.all([
      pool.query(transferQuery, [id]),
      pool.query(auditQuery, [id])
    ]);

    if (transferResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Transfer not found',
        message: `No transfer found for id=${id}`
      });
    }

    const transfer = transferResult.rows[0];
    const audit = auditResult.rows;

    setContract(req, res, '/api/owner-transfer/:id');
    res.json({ transfer, audit });

  } catch (error) {
    console.error('Error fetching owner transfer:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch owner transfer'
    });
  }
});

// POST /api/owner-transfer/:id/audit - inserts an audit row, returns it
router.post('/owner-transfer/:id/audit', supabaseGuard, async (req: Request, res: Response) => {
  if (!getDatabaseUrl()) {
    return res.status(501).json({ ok: false, error: 'db_unconfigured_for_this_route', message: 'This route requires a direct Postgres connection' });
  }

  const { id } = req.params;
  const { action, actor = 'system', detail = {} } = req.body;

  if (!action) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'action field is required'
    });
  }

  try {
    // Verify transfer exists
    const transferCheck = await pool.query(
      'SELECT id FROM owner_transfers WHERE id = $1',
      [id]
    );

    if (transferCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Transfer not found',
        message: `No transfer found for id=${id}`
      });
    }

    const auditQuery = `
      INSERT INTO owner_transfer_audit (transfer_id, action, actor, detail)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(auditQuery, [id, action, actor, detail]);
    const auditRow = result.rows[0];

    setContract(req, res, '/api/owner-transfer/:id/audit');
    res.status(201).json(auditRow);

  } catch (error) {
    console.error('Error creating audit entry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create audit entry'
    });
  }
});

export default router;