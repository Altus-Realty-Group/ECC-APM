// server/routes/admin/sync.ts
import { Router, Request, Response } from "express";
import { sbAdmin } from "../../lib/supabaseAdmin";
import { dlPaginate, dlFetchFull } from "../../clients/doorloop";

export const sync = Router();

function isAuthorized(req: Request) {
  const token = req.headers['x-admin-token'] || 
                req.headers['authorization']?.replace('Bearer ', '') ||
                req.query.token; // Support query parameter for EventSource compatibility
  return token && token === process.env.ADMIN_SYNC_TOKEN;
}

// In-memory state for sync orchestration
let syncState = {
  isRunning: false,
  currentRun: null as any,
  lock: null as { runId: string; startedAt: number; entity?: string } | null,
  progress: {
    entity: '',
    page: 0,
    rows: 0,
    totalPages: null as number | null,
    startedAt: 0,
    eta: null as number | null,
    rps: 0,
  },
  lastRun: {
    timestamp: 0,
    dryRun: true,
    success: false,
    error: null as string | null,
  },
};

// SSE clients for live log streaming
const sseClients = new Set<Response>();

// Dead Letter Queue (in-memory for now, could be moved to DB)
const dlq: Array<{
  id: string;
  entity: string;
  error: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}> = [];

// Teams webhook helper
async function sendTeamsAlert(text: string) {
  const webhookUrl = process.env.INTEGRATIONS_TEAMS_WEBHOOK;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    console.error('[teams] Alert failed:', error);
  }
}

// Log event emitter for SSE
function emitLogEvent(event: {
  type: 'info' | 'warn' | 'error' | 'progress';
  entity?: string;
  page?: number;
  rows?: number;
  level?: string;
  message: string;
  runId?: string;
  timestamp?: number;
}) {
  const logEvent = {
    ...event,
    timestamp: event.timestamp || Date.now(),
    runId: event.runId || syncState.currentRun?.id,
  };

  // Send to all SSE clients
  sseClients.forEach(client => {
    try {
      client.write(`event: log\ndata: ${JSON.stringify(logEvent)}\n\n`);
    } catch (error) {
      // Client disconnected, remove from set
      sseClients.delete(client);
    }
  });

  console.log(`[sync] ${logEvent.type.toUpperCase()}: ${logEvent.message}`);
}

// Get current sync status
sync.get("/status", async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Get scheduler configuration
  const autoSyncEnabled = process.env.AUTO_SYNC_ENABLED === 'true';
  const intervalMinutes = parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '10');
  const fullSyncHour = parseInt(process.env.AUTO_SYNC_FULL_AT_HOUR_UTC || '5');
  const entities = (process.env.SYNC_ENTITIES || 'owners,properties,units,leases,tenants').split(',');

  // Calculate next run time
  const now = new Date();
  const nextRun = new Date(now.getTime() + intervalMinutes * 60 * 1000);
  const nextFullSync = new Date();
  nextFullSync.setUTCHours(fullSyncHour, 0, 0, 0);
  if (nextFullSync <= now) {
    nextFullSync.setUTCDate(nextFullSync.getUTCDate() + 1);
  }

  res.json({
    ok: true,
    scheduler: {
      enabled: autoSyncEnabled,
      intervalMinutes,
      entities,
      fullSyncHourUTC: fullSyncHour,
      nextRun: nextRun.toISOString(),
      nextFullSync: nextFullSync.toISOString(),
    },
    currentRun: syncState.isRunning ? {
      ...syncState.currentRun,
      progress: syncState.progress,
    } : null,
    lock: syncState.lock,
    lastRun: syncState.lastRun,
    dlqCount: dlq.length,
  });
});

// Start manual sync run
sync.post("/run", async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // A provider preview is implemented; persisted sync is not. Reject before
  // state, audit, provider reads or notification calls, including truthy flags.
  if (req.body?.dryRun !== true) {
    return res.status(503).json({ ok: false, error: "Live sync is unavailable. Use an explicit read-only dry run." });
  }

  if (syncState.isRunning) {
    return res.status(409).json({ error: 'sync already running' });
  }

  const { entities = ['owners'], mode = 'delta', since, dryRun = false } = req.body;
  
  if (!Array.isArray(entities) || entities.length === 0) {
    return res.status(400).json({ error: 'entities array is required' });
  }

  const runId = `manual_${Date.now()}`;
  
  // Set up sync state
  syncState.isRunning = true;
  syncState.currentRun = {
    id: runId,
    entities,
    mode,
    since,
    dryRun,
    startedAt: Date.now(),
  };
  syncState.lock = {
    runId,
    startedAt: Date.now(),
  };
  syncState.progress = {
    entity: '',
    page: 0,
    rows: 0,
    totalPages: null,
    startedAt: Date.now(),
    eta: null,
    rps: 0,
  };

  // Log sync start
  await logAdminAction(req, 'SYNC_DRY_RUN_START', { runId, entities, mode, dryRun });
  emitLogEvent({
    type: 'info',
    message: `Starting ${mode} sync for entities: ${entities.join(', ')}${dryRun ? ' (DRY RUN)' : ''}`,
    runId,
  });

  // Start sync in background
  runSyncInBackground(runId, entities, mode, dryRun, since);

  // Send Teams alert for sync start
  await sendTeamsAlert(`🚀 DoorLoop ${mode} sync started for ${entities.join(', ')}${dryRun ? ' (DRY RUN)' : ''}`);

  res.json({ 
    ok: true, 
    runId,
    message: `${dryRun ? 'Dry run' : 'Sync'} started for ${entities.length} entities`,
  });
});

// Stop current sync
sync.post("/stop", async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!syncState.isRunning) {
    return res.status(400).json({ error: 'no sync running' });
  }

  const runId = syncState.currentRun?.id;
  
  // Reset sync state
  syncState.isRunning = false;
  syncState.currentRun = null;
  syncState.lock = null;
  
  await logAdminAction(req, 'SYNC_STOP', { runId });
  emitLogEvent({
    type: 'warn',
    message: `Sync stopped by admin`,
    runId,
  });

  res.json({ ok: true, message: 'Sync stopped' });
});

// SSE log streaming
sync.get("/logs/stream", (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

  // Add client to set
  sseClients.add(res);

  // Send initial event
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to sync logs' })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
  });

  req.on('end', () => {
    sseClients.delete(res);
  });
});

// Only completed observations/errors belong in run history; start/stop audit is not completion.
const COMPLETION_EVENTS = ['SYNC_COMPLETE', 'SYNC_ERROR', 'SYNC_DRY_RUN_COMPLETE', 'SYNC_DRY_RUN_ERROR'];
export function mapSyncCompletions(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Invalid run history');
  const seen = new Set<string>();
  return value.map(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid run history');
    const event = raw as Record<string, any>, payload = event.payload;
    const id = typeof event.id === 'string' && event.id.trim() ? event.id.trim()
      : typeof event.id === 'number' && Number.isSafeInteger(event.id) && event.id > 0 ? String(event.id) : null;
    if (!id || seen.has(id) || !COMPLETION_EVENTS.includes(event.event_type)
      || typeof event.created_at !== 'string' || !Number.isFinite(Date.parse(event.created_at))
      || !payload || typeof payload !== 'object' || Array.isArray(payload)
      || !['delta', 'backfill'].includes(payload.mode)
      || !Number.isSafeInteger(payload.rows) || payload.rows < 0
      || typeof payload.duration !== 'number' || !Number.isFinite(payload.duration) || payload.duration < 0) throw new Error('Invalid run history');
    seen.add(id);
    const dryRun = event.event_type.startsWith('SYNC_DRY_RUN_') || payload.dryRun === true;
    const failed = event.event_type.endsWith('_ERROR') || typeof payload.error === 'string';
    return { id, timestamp: event.created_at,
      entity: typeof payload.entity === 'string' ? payload.entity : Array.isArray(payload.entities) && payload.entities.every((v: unknown) => typeof v === 'string') ? payload.entities.join(',') : 'Not reported',
      mode: payload.mode as 'delta' | 'backfill', rows: payload.rows, duration: payload.duration,
      result: failed ? 'error' as const : 'success' as const,
      error: typeof payload.error === 'string' ? payload.error : undefined,
      fullDetails: payload, dryRun };
  });
}
sync.get("/runs", async (req, res) => {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const limit = req.query.limit === undefined ? 20 : typeof req.query.limit === 'string' && /^\d+$/.test(req.query.limit) ? Number(req.query.limit) : NaN;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) return res.status(400).json({ ok: false, error: 'Invalid history limit' });
  try {
    const { data, error } = await sbAdmin.from('audit_events').select('id,created_at,event_type,payload')
      .in('event_type', COMPLETION_EVENTS).order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error('Run history unavailable');
    return res.json({ ok: true, runs: mapSyncCompletions(data) });
  } catch {
    return res.status(503).json({ ok: false, error: 'Run history could not be loaded.' });
  }
});

// Get DLQ items
sync.get("/dlq", async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const entity = req.query.entity as string;
  const filteredDlq = entity ? dlq.filter(item => item.entity === entity) : dlq;
  
  res.json({
    ok: true,
    items: filteredDlq.slice(0, 50), // Limit to 50 items
    total: filteredDlq.length,
  });
});

// Requeue DLQ item
sync.post("/dlq/requeue", async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // No failed item is removed and no provider request/audit-success is emitted.
  // A real item-specific persisted replay must replace this unavailable boundary.
  return res.status(503).json({ ok: false, error: "Requeue is not available." });
});

// Background sync execution
async function runSyncInBackground(
  runId: string,
  entities: string[],
  mode: 'delta' | 'backfill',
  dryRun: boolean,
  since?: string
) {
  const startTime = Date.now();
  let totalRows = 0;
  let hasError = false;
  let errorMessage = '';

  try {
    for (const entity of entities) {
      if (!syncState.isRunning) break; // Check if stopped

      syncState.progress.entity = entity;
      syncState.progress.page = 0;
      syncState.progress.rows = 0;
      syncState.progress.totalPages = null; // Provider total is not reported.

      emitLogEvent({
        type: 'info',
        message: `Starting ${entity} read-only dry run`,
        entity,
        runId,
      });

      try {
        // Fetch provider observations for this explicit read-only preview.
        const entityData = await dlPaginate(
          `/${entity}`,
          since ? { updated_after: since } : {},
          200,
          (page, items, rateLimit) => {
            syncState.progress.page = page;
            syncState.progress.rows += items;
            totalRows += items;

            // Calculate observed records per second only.
            const elapsed = Date.now() - startTime;
            const rps = totalRows / (elapsed / 1000);
            syncState.progress.rps = Math.round(rps * 100) / 100;
            
            // The provider callback does not establish remaining pages or a completion time.
            syncState.progress.totalPages = null;
            syncState.progress.eta = null;

            emitLogEvent({
              type: 'progress',
              entity,
              page,
              rows: items,
              message: `Page ${page}: ${items} items${rateLimit ? ` (rate limit: ${rateLimit.remaining}/${rateLimit.limit})` : ''} | observed RPS: ${syncState.progress.rps}; completion estimate unavailable`,
              runId,
            });
          }
        );

        emitLogEvent({
          type: 'info',
          message: `READ-ONLY DRY RUN: Found ${entityData.length} ${entity} records; no operating records were written`,
          entity,
          runId,
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errorMessage = errorMsg;
        hasError = true;

        // Add to DLQ
        dlq.push({
          id: `${entity}_${Date.now()}`,
          entity,
          error: errorMsg,
          payload: { runId, mode, since },
          timestamp: Date.now(),
          retryCount: 0,
        });

        emitLogEvent({
          type: 'error',
          entity,
          message: `Read-only dry run error for ${entity}: ${errorMsg}`,
          runId,
        });

        // Send Teams alert for errors
        await sendTeamsAlert(`DoorLoop READ-ONLY DRY RUN failed for ${entity}: ${errorMsg.slice(0, 200)}`);
      }
    }

    // Complete sync
    const duration = Date.now() - startTime;
    
    syncState.isRunning = false;
    syncState.currentRun = null;
    syncState.lock = null;
    syncState.lastRun = {
      timestamp: Date.now(),
      dryRun: true,
      success: !hasError,
      error: hasError ? errorMessage : null,
    };

    // Log completion
    const eventType = hasError ? 'SYNC_DRY_RUN_ERROR' : 'SYNC_DRY_RUN_COMPLETE';
    await sbAdmin.from('audit_events').insert({
      event_type: eventType,
      payload: {
        runId,
        entities,
        mode,
        rows: totalRows,
        duration,
        dryRun: true,
        operatingRecordsWritten: 0,
        error: hasError ? errorMessage : null,
      },
    });

    emitLogEvent({
      type: hasError ? 'error' : 'info',
      message: `Read-only dry run finished in ${duration}ms. ${totalRows} provider records observed; no operating records were written${hasError ? `; preview had errors` : ''}`,
      runId,
    });

    // Send Teams completion alert
    const status = hasError ? 'Preview failed' : 'Preview finished';
    await sendTeamsAlert(`${status} DoorLoop READ-ONLY DRY RUN: ${totalRows} provider records observed in ${Math.round(duration/1000)}s; no operating records were written`);

  } catch (error) {
    // Fatal error
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    syncState.isRunning = false;
    syncState.currentRun = null;
    syncState.lock = null;
    syncState.lastRun = {
      timestamp: Date.now(),
      dryRun: true,
      success: false,
      error: errorMsg,
    };

    emitLogEvent({
      type: 'error',
      message: `Read-only dry run failed: ${errorMsg}`,
      runId,
    });

    await sendTeamsAlert(`DoorLoop READ-ONLY DRY RUN failed: ${errorMsg.slice(0, 200)}; no operating records were written`);
  }
}

// Helper to log admin actions
async function logAdminAction(req: Request, action: string, payload: any) {
  try {
    await sbAdmin.from('audit_events').insert({
      event_type: action,
      payload: {
        ...payload,
        admin_ip: req.ip,
        user_agent: req.get('user-agent'),
      },
    });
  } catch (error) {
    console.error('[sync] Failed to log admin action:', error);
  }
}