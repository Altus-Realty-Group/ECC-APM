import express from "express";
import cors from "cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PropertyOut, UnitOut, LeaseOut, TenantOut, OwnerOut } from "./mappings";
import { installOwnerRoutes } from './routes/owners';
import { integrations } from './routes/admin/integrations';
import { sync } from './routes/admin/sync';
import ownerTransferRouter from './routes/ownerTransfer.js';
import { installPropertyRoutes } from './routes/properties.js'; // Ensure file exists or logic remains valid
import syncHealth from './routes/syncHealth.js';
import m365Router from './routes/m365.js';
import entitiesRouter from './routes/entities.js';
import rpcRouter from './routes/rpc';
import { startAutoSyncLoop } from './lib/sync/auto';
import { supabaseGuard } from './lib/supabaseGuard.js';
import bff from "./bff.js";
import * as path from "path";

/** ───────────────────────────────────────────────────────────────────
 *  ECC Dev API — resilient Supabase wiring
 *  - Accepts either REST URL (https://<ref>.supabase.co) or a Postgres
 *    connection string and auto-converts it to REST URL.
 *  - Clear /api/health and /api/portfolio/:collection endpoints.
 *  - No changes to the frontend nav or pages required.
 *  ─────────────────────────────────────────────────────────────────── */

const app = express();

// Secure CORS configuration
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Define allowed origins
    const allowedOrigins = [
      'https://258f1742-e4c0-4f32-8eb6-bd862a90d7be-00-24bv9skxcb4sk.us-east-2.replit.dev', // Replit dev
      'https://empirecommandcenter.replit.app', // Published app
      'http://localhost:5173', // Local dev
      'http://localhost:3000', // Alternative local dev
      'http://0.0.0.0:5000'    // Replit internal
    ];

    // Add custom allowed origins from env
    const customOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    allowedOrigins.push(...customOrigins);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
};

app.use(cors(corsOptions));
app.use(express.json());

// Only mount BFF if properly configured - DISABLED for testing
const hasBffConfig = false; // !!(process.env.API_BASE_URL && process.env.ADMIN_SYNC_TOKEN);
if (hasBffConfig) {
  app.use(bff);
  console.log('[Security] BFF endpoints mounted with authentication');
} else {
  console.warn('[Security] BFF endpoints temporarily disabled for testing');
  // Mount a stub that explains why BFF is disabled
  app.use('/bff', (req, res) => {
    res.status(503).json({
      error: 'BFF temporarily disabled for testing'
    });
  });
}
import { getMissingServerEnv, serverEnvPresence } from './lib/env.js';
import { getRouteManifest } from './lib/routeRegistry.js';
import { setContract } from './lib/contractHeaders.js';
import { installPropertyRoutes } from './routes/properties.js';
import { installOwnerRoutes as installOwnerRoutesNew } from './routes/owners.js'; // Renamed to avoid conflict with existing import

// GLOBAL T1 HEADER MIDDLEWARE
app.use((req, res, next) => {
  const method = req.method;
  const cleanPath = req.path;
  const registry = getRouteManifest();

  const match = registry.find(r => {
    if (r.method !== method) return false;
    if (r.path === cleanPath) return true;
    if (r.path.includes(':')) {
      const pattern = r.path.replace(/:[^\/]+/g, '[^/]+');
      return new RegExp('^' + pattern + '$').test(cleanPath);
    }
    return false;
  });

  if (match) {
    res.locals.ecc = {
      handler: match.handler,
      contract: match.contract_name || match.contract_family || 'SYSTEM',
      version: match.contract_version || 'v1',
      canonical: match.canonical ?? false
    };
  } else {
    res.locals.ecc = { handler: 'unhandled', contract: 'SYSTEM', version: 'v1', canonical: null };
  }

  const originalJson = res.json;
  res.json = function (body) {
    if (!res.headersSent) {
      res.setHeader('x-ecc-handler', res.locals.ecc.handler || 'unhandled');
      res.setHeader('x-ecc-contract', res.locals.ecc.contract || 'SYSTEM');
      res.setHeader('x-ecc-contract-version', res.locals.ecc.version || 'v1');
      res.setHeader('x-ecc-route-canonical', String(res.locals.ecc.canonical !== null ? res.locals.ecc.canonical : 'unknown'));
    }

    if (res.statusCode === 404 && res.locals.ecc.handler === 'unhandled') {
      if (!body || typeof body === 'string' || body.error === 'Not found') {
        body = { ok: false, message: "Not found" };
      }
    }
    return originalJson.call(this, body);
  };

  const originalSend = res.send;
  res.send = function (body) {
    if (!res.headersSent) {
      res.setHeader('x-ecc-handler', res.locals.ecc.handler || 'unhandled');
      res.setHeader('x-ecc-contract', res.locals.ecc.contract || 'SYSTEM');
      res.setHeader('x-ecc-contract-version', res.locals.ecc.version || 'v1');
      res.setHeader('x-ecc-route-canonical', String(res.locals.ecc.canonical !== null ? res.locals.ecc.canonical : 'unknown'));
    }
    return originalSend.call(this, body);
  };

  next();
});

/** Built-in route manifest for ECC-ROUTE-LOCK-01 */
app.get("/api/_meta/routes", (req, res) => {
  setContract(req, res, '/api/_meta/routes');
  res.json({
    ok: true,
    routes: getRouteManifest()
  });
});

/** Health check — pure env presence, does not crash or throw */
app.get("/api/health", (req, res) => {
  console.log('HIT API HEALTH HANDLER');
  const missing = getMissingServerEnv(); // Only checks Supabase credentials now
  const envInfo = serverEnvPresence();

  if (missing.length === 0) {
    const warnings = envInfo.DATABASE_URL === 'missing' ? ["database_url_unset_using_supabase_only"] : [];
    setContract(req, res, '/api/health');
    return res.json({ ok: true, mode: 'ready', warnings, env: envInfo });
  } else {
    // 503 allows monitoring tools to see degraded but app stays alive
    setContract(req, res, '/api/health');
    return res.status(503).json({
      ok: false,
      mode: 'degraded',
      error: 'Server misconfigured',
      missing_env: missing,
      env: envInfo
    });
  }
});

app.get("/api/diag/env", (req, res) => {
  // Use new env summary where possible, fallback to old inline format
  setContract(req, res, '/api/diag/env');
  res.json({ env: serverEnvPresence() });
});


// Canonical Admin/Control Mounts
const markCanonical = (req: any, res: any, next: any) => { res.locals.ecc.canonical = true; next(); };
app.use('/api/control/sync/health', markCanonical, syncHealth);
app.use('/api/control/sync', markCanonical, sync);
app.use('/api/control/integrations', markCanonical, integrations);

// T2: 501 Placeholders for unimplemented endpoints
app.post('/api/control/sync/reset-lock', (req, res) => {
  res.locals.ecc = { handler: 'not_implemented', contract: 'ADMIN_SYNC', version: 'v1', canonical: true };
  res.status(501).json({ ok: false, message: 'Not implemented' });
});
app.post('/api/control/sync/quick-run', (req, res) => {
  res.locals.ecc = { handler: 'not_implemented', contract: 'ADMIN_SYNC', version: 'v1', canonical: true };
  res.status(501).json({ ok: false, message: 'Not implemented' });
});
app.post('/api/control/integrations/m365/planner/tasks', (req, res) => {
  res.locals.ecc = { handler: 'not_implemented', contract: 'WORKFLOW', version: 'v1', canonical: true };
  res.status(501).json({ ok: false, message: 'Not implemented' });
});

// Deprecated Alias Admin Mounts
const markAlias = (req: any, res: any, next: any) => {
  if (!res.locals.ecc) res.locals.ecc = {};
  res.locals.ecc.canonical = false;
  res.locals.ecc.handler = 'alias_forward';
  next();
};
app.use('/api/admin/sync/health', markAlias, syncHealth);
app.use('/api/admin/sync', markAlias, sync);
app.use('/api/admin/integrations', markAlias, integrations);

app.post('/api/admin/sync/reset-lock', (req, res) => {
  res.locals.ecc = { handler: 'not_implemented', contract: 'ADMIN_SYNC', version: 'v1', canonical: false };
  res.status(501).json({ ok: false, message: 'Not implemented' });
});
app.post('/api/admin/sync/quick-run', (req, res) => {
  res.locals.ecc = { handler: 'not_implemented', contract: 'ADMIN_SYNC', version: 'v1', canonical: false };
  res.status(501).json({ ok: false, message: 'Not implemented' });
});
app.post('/api/admin/integrations/m365/planner/tasks', (req, res) => {
  res.locals.ecc = { handler: 'not_implemented', contract: 'WORKFLOW', version: 'v1', canonical: false };
  res.status(501).json({ ok: false, message: 'Not implemented' });
});

app.use('/api', ownerTransferRouter);
app.use("/api/entities", entitiesRouter);
app.use("/api/rpc", rpcRouter);

// LEGACY 410 MOUNTS
installPropertyRoutes(app);
installOwnerRoutesNew(app); // Using the renamed import

// --- alias-aware env helpers (top of file, after imports) ---
function mask(v?: string) {
  if (!v) return "MISSING";
  return v.slice(0, 6) + "…" + v.slice(-4);
}
function pickKey(...candidates: string[]) {
  for (const k of candidates) if (process.env[k]) return k;
  return "MISSING";
}

// Prefer server-only keys; include public aliases for completeness
const KEY_SUPABASE_URL = pickKey("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_URL");
const KEY_ANON = pickKey("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "PUBLIC_SUPABASE_ANON_KEY");
const KEY_SERVICE_ROLE = pickKey("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE", "SERVICE_ROLE");

function envSummary() {
  return {
    SUPABASE_URL_KEY: KEY_SUPABASE_URL,
    SUPABASE_URL: KEY_SUPABASE_URL === "MISSING" ? "MISSING" : process.env[KEY_SUPABASE_URL],
    ANON_KEY_KEY: KEY_ANON,
    ANON_KEY_MASKED: KEY_ANON === "MISSING" ? "MISSING" : mask(process.env[KEY_ANON]),
    SERVICE_ROLE_KEY: KEY_SERVICE_ROLE,
    SERVICE_ROLE_MASKED: KEY_SERVICE_ROLE === "MISSING" ? "MISSING" : mask(process.env[KEY_SERVICE_ROLE]),
    NODE_ENV: process.env.NODE_ENV || "dev",
  };
}
console.log("[EnvLock]", envSummary());

// If you initialize Supabase here, make sure you use the resolved keys:
const SUPABASE_URL = KEY_SUPABASE_URL === "MISSING" ? undefined : process.env[KEY_SUPABASE_URL]!;
const SERVICE_ROLE = KEY_SERVICE_ROLE === "MISSING" ? undefined : process.env[KEY_SERVICE_ROLE]!;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[EnvLock] Missing required server envs for Supabase (URL or SERVICE_ROLE)");
}

const PORT = Number(process.env.API_PORT ?? 8787);

// Add process-level error guards for development
process.on('unhandledRejection', (e) => {
  console.error('[unhandledRejection]', e);
});
process.on('uncaughtException', (e) => {
  console.error('[uncaughtException]', e);
});

// Map of logical collections -> table names (override via Replit secrets)
const TABLE: Record<string, string> = {
  properties: process.env.TBL_PROPERTIES || "properties",
  units: process.env.TBL_UNITS || "units",
  leases: process.env.TBL_LEASES || "leases",
  tenants: process.env.TBL_TENANTS || "tenants",
  owners: process.env.TBL_OWNERS || "owners",
};

function coerceRestUrl(raw?: string | null): string | null {
  if (!raw) return null;

  // Already a proper REST URL?
  const rest = raw.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  if (rest) return `https://${rest[1]}.supabase.co`;

  // Postgres connection string → pull out project ref after "@db."
  // Handles postgres:// and postgresql:// forms.
  const m = raw.match(/@db\.([a-z0-9-]+)\.supabase\.co/i);
  if (m) return `https://${m[1]}.supabase.co`;

  // Unknown format; let client creation fail with a clear message.
  return raw;
}

function makeSupabase(): {
  client: SupabaseClient | null;
  restUrl?: string;
  error?: string;
} {
  const rawUrl =
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_REST_URL ||
    null;

  const restUrl = coerceRestUrl(rawUrl);
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!restUrl || !key) {
    return {
      client: null,
      restUrl: restUrl || undefined,
      error:
        "Missing Supabase REST URL and/or key. Set SUPABASE_URL=https://<ref>.supabase.co and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).",
    };
  }

  try {
    const client = createClient(restUrl, key, { auth: { persistSession: false } });
    return { client, restUrl };
  } catch (e: any) {
    return { client: null, restUrl, error: `createClient failed: ${e?.message || e}` };
  }
}

const supa = makeSupabase();

function sendErr(res: express.Response, http: number, err: any) {
  console.error('[sendErr route]', res.req?.path);
  console.error('[sendErr STACK]', typeof err === 'object' && err ? err.stack : err);
  const body = {
    ok: false,
    message: err?.message || String(err),
    details: err?.details,
    code: err?.code,
    hint: err?.hint,
  };
  if (http >= 500) console.error("[API ERROR]", body);
  return res.status(http).json(body);
}






/** Config integrations endpoint - public endpoint for UI */
app.get("/api/config/integrations", async (req, res) => {
  setContract(req, res, '/api/config/integrations');
  res.json({
    ok: true,
    integrations: {
      doorloop: {
        configured: !!(process.env.DOORLOOP_BASE_URL && process.env.DOORLOOP_API_KEY),
        baseUrl: process.env.DOORLOOP_BASE_URL ? "***configured***" : null
      },
      supabase: {
        configured: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
        connected: !!supa.client
      },
      teams: {
        configured: !!process.env.INTEGRATIONS_TEAMS_WEBHOOK
      },
      admin: {
        available: !!process.env.ADMIN_SYNC_TOKEN
      }
    },
    endpoints: [
      '/api/portfolio/properties',
      '/api/portfolio/units',
      '/api/portfolio/leases',
      '/api/portfolio/tenants',
      '/api/portfolio/owners',
      '/api/admin/sync/status',
      '/api/admin/integrations/doorloop/ping'
    ]
  });
});

/** Geocode properties endpoint for adding coordinates */
app.post("/api/geocode/properties", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const { properties: propertiesToGeocode } = req.body;

    if (!Array.isArray(propertiesToGeocode)) {
      return sendErr(res, 400, "Properties array is required");
    }

    // Import geocoding function
    const { geocodeAddress: geocode } = await import("./lib/geocode");

    const results = [];

    for (const property of propertiesToGeocode) {
      const addressToGeocode = property.property_address ||
        property.address ||
        property.street_address ||
        property.full_address ||
        property.name;

      if (!addressToGeocode) {
        results.push({ id: property.id, success: false, error: "No address available" });
        continue;
      }

      try {
        const result = await geocode(addressToGeocode);

        if (result) {
          // Try to update the property in Supabase
          const { error: updateError } = await supa.client
            .from(TABLE.properties)
            .update({ lat: result.lat, lng: result.lng })
            .eq("id", property.id);

          if (updateError) {
            // If database update fails (columns don't exist), still return the geocoded result
            results.push({
              id: property.id,
              success: true,
              lat: result.lat,
              lng: result.lng,
              provider: result.provider,
              dbUpdateFailed: true,
              error: updateError.message
            });
          } else {
            results.push({
              id: property.id,
              success: true,
              lat: result.lat,
              lng: result.lng,
              provider: result.provider
            });
          }
        } else {
          results.push({ id: property.id, success: false, error: "Geocoding failed" });
        }
      } catch (error: any) {
        results.push({ id: property.id, success: false, error: error.message });
      }
    }

    res.json({ results });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Middleware to ensure Server Environment is valid before handling portfolio & accounting routes */
app.use(['/api/portfolio', '/api/maintenance', '/api/accounting', '/api/geocode'], (req, res, next) => {
  console.log('HIT API HEALTH HANDLER');
  const missing = getMissingServerEnv();
  if (missing.length > 0) {
    return res.status(503).json({
      ok: false,
      error: 'Server misconfigured',
      missing_env: missing
    });
  }
  next();
});

/** Properties with computed units & occupancy */
app.get("/api/portfolio/properties", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    // Get properties - use actual column names from the current database
    const { data: propertiesData, error: propsError } = await supa.client
      .from(TABLE.properties)
      .select("id, name, doorloop_id, address_city, address_state, address_zip, type, class, active, lat, lng")
      .limit(5000);

    if (propsError) throw propsError;

    // build property maps by id and by doorloop_id
    const byId = new Map((propertiesData ?? []).map(p => [String(p.id), p]));
    const byDL = new Map((propertiesData ?? []).filter(p => p.doorloop_id).map(p => [String(p.doorloop_id), p]));

    // Get units data for occupancy calculation
    const { data: unitsData, error: unitsError } = await supa.client
      .from(TABLE.units)
      .select(`
        id,
        property_id,
        doorloop_property_id,
        status
      `);

    if (unitsError) throw unitsError;

    // Group units by property using dual-key mapping
    const unitsByProperty = new Map();
    const occupiedByProperty = new Map();

    (unitsData || []).forEach((unit: any) => {
      // when attributing a unit to a property:
      const p =
        (unit.property_id && byId.get(String(unit.property_id))) ||
        (unit.doorloop_property_id && byDL.get(String(unit.doorloop_property_id))) ||
        null;
      const propKey = p ? String(p.id) : String(unit.property_id ?? '');

      if (!propKey) return;

      if (!unitsByProperty.has(propKey)) {
        unitsByProperty.set(propKey, 0);
        occupiedByProperty.set(propKey, 0);
      }
      unitsByProperty.set(propKey, unitsByProperty.get(propKey) + 1);

      if (unit.status && ['occupied', 'occ', 'active'].includes(unit.status.toLowerCase())) {
        occupiedByProperty.set(propKey, occupiedByProperty.get(propKey) + 1);
      }
    });

    const properties: PropertyOut[] = (propertiesData || []).map((row: any) => {
      const propId = String(row.id);
      const totalUnits = unitsByProperty.get(propId) || 0;
      const occupiedUnits = occupiedByProperty.get(propId) || 0;
      const occPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      return {
        id: row.id,
        name: row.name || "—",
        type: row.type || "—",
        class: row.class || "—",
        state: row.address_state || "—",
        city: row.address_city || "—",
        zip: row.address_zip || "—",
        units: totalUnits,
        occPct: occPct,
        active: Boolean(row.active),
        lat: row.lat || null,
        lng: row.lng || null
      };
    });

    setContract(req, res, '/api/portfolio/properties');
    res.json({ data: properties, meta: { totalCount: properties.length } });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Units with property context */
app.get("/api/portfolio/units", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const { data, error } = await supa.client
      .from(TABLE.units)
      .select("*")
      .limit(5000);
    if (error) throw error;

    // build property maps by id and by doorloop_id
    const { data: propertiesData } = await supa.client.from(TABLE.properties).select("id, name, doorloop_id").limit(5000);
    const byId = new Map((propertiesData ?? []).map(p => [String(p.id), p]));
    const byDL = new Map((propertiesData ?? []).filter(p => p.doorloop_id).map(p => [String(p.doorloop_id), p]));

    const units: UnitOut[] = (data || []).map((row: any) => {
      // when attributing a unit to a property:
      const p =
        (row.property_id && byId.get(String(row.property_id))) ||
        (row.doorloop_property_id && byDL.get(String(row.doorloop_property_id))) ||
        null;

      return {
        id: row.id,
        propertyName: p?.name || "—",
        unitLabel: row.unit_number || row.number || row.name || "—",
        beds: row.beds || row.bedrooms,
        baths: row.baths || row.bathrooms,
        sqft: row.sq_ft || row.square_feet || row.sqft,
        status: row.status,
        marketRent: row.rent_amount || row.market_rent || 0
      };
    });

    setContract(req, res, '/api/portfolio/units');
    res.json({ data: units, meta: { totalCount: units.length } });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Leases with property, unit, and tenant context */
app.get("/api/portfolio/leases", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    // Get leases
    const { data: leasesData, error } = await supa.client
      .from(TABLE.leases)
      .select("*")
      .limit(5000);
    if (error) throw error;

    // Get related properties, units, and tenants
    const propertyIds = [...new Set((leasesData || []).map((l: any) => l.property_id).filter(Boolean))];
    const unitIds = [...new Set((leasesData || []).map((l: any) => l.unit_id).filter(Boolean))];
    const tenantIds = [...new Set((leasesData || []).map((l: any) => l.primary_tenant_id || l.tenant_id).filter(Boolean))];

    const [propertiesRes, unitsRes, tenantsRes] = await Promise.all([
      supa.client!.from(TABLE.properties).select("id, name").in('id', propertyIds),
      supa.client!.from(TABLE.units).select("id, unit_number").in('id', unitIds),
      supa.client!.from(TABLE.tenants).select("id, display_name, full_name, first_name, last_name").in('id', tenantIds)
    ]);

    const propertyMap = new Map((propertiesRes.data || []).map((p: any) => [p.id, p.name || "—"]));
    const unitMap = new Map((unitsRes.data || []).map((u: any) => [u.id, u.unit_number || "—"]));
    const tenantMap = new Map((tenantsRes.data || []).map((t: any) => [
      t.id,
      t.display_name || t.full_name ||
      (t.first_name && t.last_name ? `${t.first_name} ${t.last_name}` : "—")
    ]));

    const leases: LeaseOut[] = (leasesData || []).map((row: any) => ({
      id: row.id,
      propertyName: propertyMap.get(row.property_id) || "—",
      unitLabel: unitMap.get(row.unit_id) || "—",
      tenants: tenantMap.get(row.primary_tenant_id || row.tenant_id) ? [tenantMap.get(row.primary_tenant_id || row.tenant_id)] : [],
      status: row.status || "unknown",
      start: row.start_date,
      end: row.end_date,
      rent: row.rent_cents ? row.rent_cents / 100 : 0
    }));

    setContract(req, res, '/api/portfolio/leases');
    res.json({ data: leases, meta: { totalCount: leases.length } });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Tenants with latest lease context */
app.get("/api/portfolio/tenants", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const { data: tenantsData, error } = await supa.client
      .from(TABLE.tenants)
      .select("*")
      .limit(5000);
    if (error) throw error;

    // Get latest lease info for each tenant
    const tenants: TenantOut[] = await Promise.all((tenantsData || []).map(async (tenant: any) => {
      const { data: leaseData } = await supa.client!
        .from(TABLE.leases)
        .select("property_id, unit_id")
        .or(`primary_tenant_id.eq.${tenant.id},tenant_id.eq.${tenant.id}`)
        .order('start_date', { ascending: false })
        .limit(1);

      let propertyName = null;
      let unitLabel = null;

      if (leaseData && leaseData.length > 0) {
        const lease = leaseData[0];
        // Get property and unit names
        const [propRes, unitRes] = await Promise.all([
          supa.client!.from(TABLE.properties).select("name").eq('id', lease.property_id).single(),
          supa.client!.from(TABLE.units).select("unit_number").eq('id', lease.unit_id).single()
        ]);
        propertyName = propRes.data?.name;
        unitLabel = unitRes.data?.unit_number;
      }

      return {
        id: tenant.id,
        name: tenant.display_name || tenant.full_name ||
          (tenant.first_name && tenant.last_name ? `${tenant.first_name} ${tenant.last_name}` : "—"),
        email: tenant.primary_email || tenant.email || (tenant.emails_json?.[0]?.address) || null,
        phone: tenant.primary_phone || tenant.phone || tenant.phone_number ||
          (tenant.phones_json?.[0]?.number) || null,
        propertyName,
        unitLabel,
        type: tenant.type || "LEASE_TENANT",
        balance: tenant.balance || 0
      };
    }));

    setContract(req, res, '/api/portfolio/tenants');
    res.json({ data: tenants, meta: { totalCount: tenants.length } });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Owners */
app.get("/api/portfolio/owners", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const { data, error } = await supa.client
      .from(TABLE.owners)
      .select("*")
      .limit(5000);
    if (error) throw error;

    const owners: OwnerOut[] = (data || []).map((row: any) => ({
      id: row.id,
      company: row.company_name || row.business_name || "—",
      name: row.display_name || row.full_name ||
        (row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : "—"),
      email: row.primary_email || row.email || (row.emails_json?.[0]?.address) || null,
      phone: row.primary_phone || row.phone || row.phone_number ||
        (row.phones_json?.[0]?.number) || null,
      active: Boolean(row.active)
    }));

    setContract(req, res, '/api/portfolio/owners');
    res.json({ data: owners, meta: { totalCount: owners.length } });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Maintenance work orders endpoint */
app.get("/api/maintenance/workorders", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    // For now, return structured mock data since maintenance table may not exist
    const workOrders = [
      {
        id: 1,
        property_id: 1,
        priority: 'High',
        status: 'open',
        created_at: new Date().toISOString(),
        title: 'Leaky faucet in kitchen'
      },
      {
        id: 2,
        property_id: 2,
        priority: 'Medium',
        status: 'in_progress',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        title: 'HVAC maintenance required'
      },
      {
        id: 3,
        property_id: 1,
        priority: 'Critical',
        status: 'open',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        title: 'Water heater malfunction'
      }
    ];

    setContract(req, res, '/api/maintenance/workorders');
    res.json({ data: workOrders, meta: { totalCount: workOrders.length } });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Accounting transactions endpoint */
app.get("/api/accounting/transactions", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    // Generate realistic transaction data for the last 90 days
    const transactions = [];
    const now = new Date();

    for (let i = 0; i < 90; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

      // Add rent income every 1st of month
      if (date.getDate() === 1) {
        transactions.push({
          type: 'rent',
          amount_cents: 125000, // $1,250
          posted_on: date.toISOString()
        });
      }

      // Add random expenses
      if (Math.random() > 0.85) {
        transactions.push({
          type: 'expense',
          amount_cents: Math.floor(Math.random() * 50000) + 5000, // $50-$500
          posted_on: date.toISOString()
        });
      }
    }

    setContract(req, res, '/api/accounting/transactions');
    res.json({ data: transactions, meta: { totalCount: transactions.length } });
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** Debug endpoint for SQL queries */
app.get("/api/portfolio/_debug/sql", async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  const query = String(req.query.q || "");
  const limit = Math.min(parseInt(String(req.query.limit || "10")), 50);

  if (!query.toLowerCase().startsWith("select")) {
    return res.status(400).json({ error: "SELECT queries only" });
  }

  try {
    const { data, error } = await supa.client.rpc('exec_sql', {
      query_text: `${query} LIMIT ${limit}`
    });
    if (error) throw error;
    setContract(req, res, '/api/portfolio/_debug/sql');
    res.json(data || []);
  } catch (e: any) {
    // Fallback to table queries if RPC doesn't work
    try {
      if (query.includes("FROM properties")) {
        const { data, error } = await supa.client.from(TABLE.properties).select("*").limit(limit);
        if (error) throw error;
        setContract(req, res, '/api/portfolio/_debug/sql');
        res.json(data || []);
      } else {
        return sendErr(res, 400, "RPC not available, use table-specific queries");
      }
    } catch (fallbackError: any) {
      return sendErr(res, 500, fallbackError);
    }
  }
});

/** POST /api/owner-transfer/initiate - Initiate owner transfer */
app.post("/api/owner-transfer/initiate", supabaseGuard, async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const input: InitiateInput = req.body;
    const result = await initiateTransfer(input);

    setContract(req, res, '/api/owner-transfer/initiate');
    res.status(201).json({
      transferId: result.transferId,
      reportUrl: result.reportUrl ? result.reportUrl : `/api/owner-transfer/${result.transferId}/report`,
      reportFilename: `owner_transfer_${result.transferId}.xlsx`,
    });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return sendErr(res, 400, { message: 'Validation error', details: e.errors });
    }
    return sendErr(res, 500, e);
  }
});

/** POST /api/owner-transfer/approve-accounting - Mark approved by accounting */
app.post("/api/owner-transfer/approve-accounting", supabaseGuard, async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const { transferId, actorId } = req.body;
    await markApprovedByAccounting(transferId, actorId);
    setContract(req, res, '/api/owner-transfer/approve-accounting');
    res.json({ ok: true, message: "Transfer approved by accounting" });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return sendErr(res, 400, { message: 'Validation error', details: e.errors });
    }
    return sendErr(res, 500, e);
  }
});

/** POST /api/owner-transfer/authorize - Authorize transfer execution (admin only) */
app.post("/api/owner-transfer/authorize", supabaseGuard, async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    // TODO: Add proper admin role checking here
    // For now, we assume the request is authorized if it reaches this point

    const { transferId, actorId } = req.body;
    await authorizeExecution(transferId, actorId);
    setContract(req, res, '/api/owner-transfer/authorize');
    res.json({ ok: true, message: "Transfer authorized for execution" });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return sendErr(res, 400, { message: 'Validation error', details: e.errors });
    }
    return sendErr(res, 500, e);
  }
});

/** POST /api/owner-transfer/execute - Execute transfer with dry-run support */
app.post("/api/owner-transfer/execute", supabaseGuard, async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const { transferId, dryRun = true, actorId } = req.body;
    const result = await executeTransfer(transferId, { dryRun });
    setContract(req, res, '/api/owner-transfer/execute');
    res.json({
      ok: true,
      applied: result.applied,
      summary: result.summary,
    });
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return sendErr(res, 400, { message: 'Validation error', details: e.errors });
    }
    return sendErr(res, 500, e);
  }
});

/** GET /api/owner-transfer/:id/report - Download Excel report */
app.get("/api/owner-transfer/:id/report", supabaseGuard, async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const transferId = parseInt(req.params.id);
    if (isNaN(transferId)) {
      return sendErr(res, 400, "Invalid transfer ID");
    }

    // Generate the report
    const report = await generateAccountingReport(transferId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);

    // Send the buffer directly
    res.send(report.buffer);
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

/** GET /api/owner-transfer/:id - Get transfer details */
app.get("/api/owner-transfer/:id", supabaseGuard, async (req, res) => {
  if (!supa.client) return sendErr(res, 500, supa.error || "Supabase not configured");

  try {
    const transferId = parseInt(req.params.id);
    if (isNaN(transferId)) {
      return sendErr(res, 400, "Invalid transfer ID");
    }

    const details = await getTransferDetails(transferId);
    setContract(req, res, '/api/owner-transfer/:id');
    res.json(details);
  } catch (e: any) {
    return sendErr(res, 500, e);
  }
});

app.use("/api", (_req, res) => res.status(404).json({ ok: false, message: "Not found" }));

// T2: Global JSON Error Envelope
app.use((err: any, req: any, res: any, next: any) => {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: err.message || 'Server error',
    code: err.code || 'ECC_UNHANDLED',
    route: `${req.method} ${req.path}`
  });
});

app.get("/", (_req, res) => res.type("text/plain").send("ECC Dev API running"));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Dev API] Listening on :${PORT}`);
  if (!supa.client) {
    console.warn(`[Dev API] Supabase not ready: ${supa.error}`);
  }

  // Start auto-sync after server is listening (idempotent; logs if disabled)
  // DISABLED for testing - auto-sync causing server crashes
  try {
    // startAutoSyncLoop();
    console.log(`[Dev API] Auto-sync loop temporarily disabled for testing`);
  } catch (e) {
    console.warn(`[Dev API] Auto-sync disabled:`, e);
  }

  if (!supa.client) {
    console.warn(`[Dev API] Raw SUPABASE_URL sample: ${(process.env.SUPABASE_URL || "").slice(0, 80)}…`);
  } else {
    console.log(`[Dev API] Supabase REST URL: ${supa.restUrl}`);
  }
});







