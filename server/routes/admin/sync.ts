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
    totalPages: 0,
    startedAt: 0,
    eta: 0,
    rps: 0,
  },
  lastRun: {
    timestamp: 0,
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
    totalPages: 0,
    startedAt: Date.now(),
    eta: 0,
    rps: 0,
  };

  // Log sync start
  await logAdminAction(req, 'SYNC_START', { runId, entities, mode, dryRun });
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

// Get sync run history
sync.get("/runs", async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const limit = Math.min(50, Number(req.query.limit) || 20);
  
  try {
    const { data: auditEvents } = await sbAdmin
      .from('audit_events')
      .select('*')
      .in('event_type', ['AUTO_SYNC', 'MANUAL_SYNC', 'SYNC_START', 'SYNC_STOP'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!auditEvents) {
      return res.json({ ok: true, runs: [] });
    }

    const runs = auditEvents.map(event => ({
      id: event.id?.toString() || Math.random().toString(),
      timestamp: event.created_at,
      entity: event.payload?.entity || event.payload?.entities?.join(',') || 'unknown',
      mode: event.payload?.mode === 'backfill' ? 'backfill' as const : 'delta' as const,
      rows: event.payload?.rows || 0,
      duration: event.payload?.duration || 0,
      result: event.payload?.error ? 'error' as const : 'success' as const,
      error: event.payload?.error || undefined,
      fullMessage: event.payload?.fullError || undefined,
      fullDetails: event.payload || undefined,
      dryRun: event.payload?.dryRun || false,
    }));

    res.json({ ok: true, runs });
  } catch (error) {
    console.error('[sync] Error fetching runs:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch runs' });
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
      syncState.progress.totalPages = 0; // Will be estimated during pagination

      emitLogEvent({
        type: 'info',
        message: `Starting ${entity} sync`,
        entity,
        runId,
      });

      try {
        // Simulate sync for the entity
        const entityData = await dlPaginate(
          `/${entity}`,
          since ? { updated_after: since } : {},
          200,
          (page, items, rateLimit) => {
            syncState.progress.page = page;
            syncState.progress.rows += items;
            totalRows += items;

            // Calculate ETA and RPS
            const elapsed = Date.now() - startTime;
            const rps = totalRows / (elapsed / 1000);
            syncState.progress.rps = Math.round(rps * 100) / 100;
            
            // Dynamic ETA estimation based on page rate and batch size
            // Estimate remaining pages based on the pattern: if we got full pages, there's likely more
            if (items === 200 && page <= 3) {
              // Early stage: estimate conservatively based on typical entity sizes
              syncState.progress.totalPages = Math.max(page * 2, 10);
            } else if (items < 200) {
              // Last page detected (partial batch)
              syncState.progress.totalPages = page;
            } else if (page > 3) {
              // Mid-stage: extrapolate based on current rate
              syncState.progress.totalPages = Math.max(syncState.progress.totalPages, page + 5);
            }
            
            const remainingPages = Math.max(0, syncState.progress.totalPages - page);
            const avgTimePerPage = elapsed / page;
            syncState.progress.eta = remainingPages > 0 ? Math.round(remainingPages * avgTimePerPage) : 0;

            emitLogEvent({
              type: 'progress',
              entity,
              page,
              rows: items,
              message: `Page ${page}: ${items} items${rateLimit ? ` (rate limit: ${rateLimit.remaining}/${rateLimit.limit})` : ''} | RPS: ${syncState.progress.rps} | ETA: ${Math.round(syncState.progress.eta/1000)}s`,
              runId,
            });
          }
        );

        if (!dryRun) {
          // TODO: Implement actual database writes here
          emitLogEvent({
            type: 'info',
            message: `Would insert ${entityData.length} ${entity} records`,
            entity,
            runId,
          });
        } else {
          emitLogEvent({
            type: 'info',
            message: `DRY RUN: Found ${entityData.length} ${entity} records`,
            entity,
            runId,
          });
        }

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
          message: `Error syncing ${entity}: ${errorMsg}`,
          runId,
        });

        // Send Teams alert for errors
        await sendTeamsAlert(`🚨 DoorLoop sync failed for ${entity}: ${errorMsg.slice(0, 200)}`);
      }
    }

    // Complete sync
    const duration = Date.now() - startTime;
    
    syncState.isRunning = false;
    syncState.currentRun = null;
    syncState.lock = null;
    syncState.lastRun = {
      timestamp: Date.now(),
      success: !hasError,
      error: hasError ? errorMessage : null,
    };

    // Log completion
    const eventType = hasError ? 'SYNC_ERROR' : 'SYNC_COMPLETE';
    await sbAdmin.from('audit_events').insert({
      event_type: eventType,
      payload: {
        runId,
        entities,
        mode,
        rows: totalRows,
        duration,
        dryRun,
        error: hasError ? errorMessage : null,
      },
    });

    emitLogEvent({
      type: hasError ? 'error' : 'info',
      message: `Sync completed in ${duration}ms. ${totalRows} total rows processed${hasError ? ` with errors` : ''}`,
      runId,
    });

    // Send Teams completion alert
    const status = hasError ? '❌ Failed' : '✅ Completed';
    await sendTeamsAlert(`${status} DoorLoop sync: ${totalRows} rows in ${Math.round(duration/1000)}s`);

  } catch (error) {
    // Fatal error
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    syncState.isRunning = false;
    syncState.currentRun = null;
    syncState.lock = null;
    syncState.lastRun = {
      timestamp: Date.now(),
      success: false,
      error: errorMsg,
    };

    emitLogEvent({
      type: 'error',
      message: `Fatal sync error: ${errorMsg}`,
      runId,
    });

    await sendTeamsAlert(`🚨 DoorLoop sync fatal error: ${errorMsg.slice(0, 200)}`);
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