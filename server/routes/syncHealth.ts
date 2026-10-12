import { Router } from 'express';
import { getState } from '../lib/integrationState.js';
import { setContract } from '../lib/contractHeaders.js';
import { supabaseGuard } from '../lib/supabaseGuard.js';

const router = Router();
router.use(supabaseGuard);

function env(name: string, fallback?: string) {
  return (process.env[name] ?? fallback ?? "").trim();
}

// GET /api/control/sync/health - Health check endpoint
router.get('/', async (req, res, next) => {
  try {
    const enabled = env("AUTO_SYNC_ENABLED", "false").toLowerCase() === "true";
    const intervalMinutes = Math.max(2, Number(env("AUTO_SYNC_INTERVAL_MINUTES", "10")));
    const entities = env("SYNC_ENTITIES", "owners,properties,units,leases,tenants").split(",").map(s => s.trim()).filter(Boolean);
    const nightlyFullHourUtc = env("AUTO_SYNC_FULL_AT_HOUR_UTC", "") || null;
    const lockTtlMinutes = Math.max(5, Number(env("AUTO_SYNC_LOCK_TTL_MINUTES", "20")));
    const hardDeadlineMinutes = Math.max(10, Number(env("AUTO_SYNC_HARD_DEADLINE_MINUTES", "30")));

    // Get lock state
    const lockState = await getState("AUTO_SYNC_LOCK");
    const lock = lockState?.value || { locked: false, holder: null, expires_at: null };

    // Get status 
    const statusState = await getState("AUTO_SYNC_STATUS");
    const status = statusState?.value || {
      last_run_at: null,
      last_success_at: null,
      next_run_at: null,
      mode: null,
      status: "never_run"
    };

    setContract(req, res, '/api/control/sync/health');
    res.json({
      enabled,
      intervalMinutes,
      lockTtlMinutes,
      hardDeadlineMinutes,
      entities,
      nightlyFullHourUtc,
      lock: {
        locked: lock.locked || false,
        holder: lock.holder || null,
        expires_at: lock.expires_at || null,
        acquired_at: lock.acquired_at || null,
        released_at: lock.released_at || null
      },
      status: {
        last_run_at: status.last_run_at,
        last_success_at: status.last_success_at,
        next_run_at: status.next_run_at,
        mode: status.mode,
        status: status.status,
        error: status.error || null
      }
    });
  } catch (error) {
    console.error('[sync-health] error:', error);
    next(error);
  }
});

export default router;