// server/routes/rpc.ts
import { Router } from 'express';
import { getServerClient } from '../db.js';
import { setContract } from '../lib/contractHeaders.js';

export const rpc = Router();

// ---------- helpers (place near top of rpc.ts) ----------
const s = (v: any, d = '') => (v ?? d);
const n = (v: any, d = 0) => (typeof v === 'number' ? v : (v == null || Number.isNaN(Number(v)) ? d : Number(v)));
const cents = (v: any) => (typeof v === 'number' ? Math.round(v) : (v == null ? null : Math.round(Number(v) * 100)));
const ok = (res: any, body: any) => res.status(200).json(body);
const fail = (res: any, code: number, msg: string) => res.status(code).json({ error: msg });

async function getOneByMulti(sb: any, table: string, id: string | number, alts: string[] = []) {
  const key = Number.isFinite(Number(id)) ? Number(id) : id;
  const byId = await sb.from(table).select('*').eq('id', key).limit(1);
  if (byId.error) throw byId.error;
  if (byId.data?.length) return byId.data[0];
  for (const col of alts) {
    const r = await sb.from(table).select('*').eq(col, id).limit(1);
    if (r.error) throw r.error;
    if (r.data?.length) return r.data[0];
  }
  return null;
}

function addrFrom(p: any) {
  return {
    line1: s(p?.address1 ?? p?.address_line1 ?? p?.line1 ?? p?.address_street1 ?? p?.property_address),
    city: s(p?.city ?? p?.address_city),
    state: s(p?.state ?? p?.address_state),
    zip: s(p?.zip ?? p?.zipcode ?? p?.address_zip),
  };
}

// ---------- DIAGNOSTIC: find one id of each entity ----------
rpc.get('/diag/ids', async (_req, res) => {
  try {
    const supabase = getServerClient();
    const grab = async (t: string) => (await supabase.from(t).select('id').limit(1)).data?.[0]?.id ?? null;
    ok(res, {
      property: await grab('properties'),
      unit: await grab('units'),
      lease: await grab('leases'),
      owner: await grab('owners'),
      tenant: await grab('tenants'),
    });
  } catch (e: any) { fail(res, 500, e?.message || 'diag error'); }
});

// ---------- DEBUG: check leases table columns ----------
rpc.get('/debug_leases', async (_req, res) => {
  try {
    const supabase = getServerClient();
    const l1 = await supabase.from('leases').select('*').limit(1);
    ok(res, { sample: l1.data?.[0] ?? null, error: l1.error });
  } catch (e: any) { fail(res, 500, e?.message || 'debug error'); }
});

// ---------- SIMPLE TEST: try basic leases queries ----------  
rpc.get('/simple_lease_test', async (_req, res) => {
  try {
    const supabase = getServerClient();
    const l1 = await supabase.from('leases').select('id,status').limit(1);
    const l2 = await supabase.from('leases').select('id,status,rent').limit(1);
    ok(res, {
      withoutRent: { data: l1.data, error: l1.error },
      withRent: { data: l2.data, error: l2.error }
    });
  } catch (e: any) { fail(res, 500, e?.message || 'simple test error'); }
});

// ---------- PROPERTY ----------
rpc.get('/get_property_card', async (req, res) => {
  try {
    const supabase = getServerClient();
    const id = s(req.query.id ?? '').trim();
    if (!id) return fail(res, 400, 'missing id');

    const property = await getOneByMulti(supabase, 'properties', id, ['doorloop_id']);
    if (!property) return fail(res, 404, 'property not found');

    const u = await supabase.from('units').select('id').eq('property_id', property.id);
    if (u.error) throw u.error;
    const units = Array.isArray(u.data) ? u.data : [];
    const totalUnits = units.length;

    const l = await supabase.from('leases')
      .select('status,rent_cents,property_id,unit_id')
      .eq('property_id', property.id);
    if (l.error) throw l.error;
    const leases = Array.isArray(l.data) ? l.data : [];

    const activeCount = leases.filter(x => String(x?.status).toUpperCase() === 'ACTIVE').length;
    const rents = leases.map(x => x?.rent_cents)
      .filter((v: any) => typeof v === 'number');
    const avgRentCents = rents.length ? Math.round(rents.reduce((a: number, b: number) => a + b, 0) / rents.length) : null;

    return ok(res, {
      property: {
        id: n(property.id),
        name: s(property.name),
        type: s(property.type, 'UNKNOWN'),
        address: addrFrom(property),
      },
      kpis: {
        units: n(totalUnits, 0),
        activeLeases: n(activeCount, 0),
        occupancyPct: totalUnits > 0 ? Math.round((activeCount / totalUnits) * 100) : 0,
        avgRentCents,
      },
    });
  } catch (e: any) { fail(res, 500, e?.message || 'server error'); }
});

// ---------- UNIT ----------
rpc.get('/get_unit_card', async (req, res) => {
  try {
    const supabase = getServerClient();
    const id = s(req.query.id ?? '').trim();
    if (!id) return fail(res, 400, 'missing id');

    const unit = await getOneByMulti(supabase, 'units', id, ['doorloop_id']);
    if (!unit) return fail(res, 404, 'unit not found');

    const property = unit?.property_id
      ? (await supabase.from('properties').select('*').eq('id', unit.property_id).limit(1)).data?.[0] ?? null
      : null;

    const lease = (await supabase.from('leases')
      .select('id,status,rent_cents,unit_id,property_id,tenant_id,start_date,end_date')
      .eq('unit_id', unit.id).limit(1)).data?.[0] ?? null;

    return ok(res, {
      unit: {
        id: n(unit.id),
        label: s(unit.unit_label ?? unit.unit_number ?? unit.unit_name ?? unit.name),
        beds: n(unit.beds, 0),
        baths: n(unit.baths, 0),
        sqft: n(unit.sqft, 0),
        status: s(unit.status, 'UNKNOWN'),
      },
      property: property ? {
        id: n(property.id), name: s(property.name), address: addrFrom(property)
      } : null,
      lease: lease ? {
        id: n(lease.id), status: s(lease.status, 'UNKNOWN'),
        rentCents: n(lease.rent_cents, 0)
      } : null,
    });
  } catch (e: any) { fail(res, 500, e?.message || 'server error'); }
});

// ---------- LEASE ----------
rpc.get('/get_lease_card', async (req, res) => {
  try {
    const supabase = getServerClient();
    const id = s(req.query.id ?? '').trim();
    if (!id) return fail(res, 400, 'missing id');

    const lease = await getOneByMulti(supabase, 'leases', id, ['doorloop_id']);
    if (!lease) return fail(res, 404, 'lease not found');

    const unit = lease?.unit_id
      ? (await supabase.from('units').select('*').eq('id', lease.unit_id).limit(1)).data?.[0] ?? null
      : null;
    const property = lease?.property_id
      ? (await supabase.from('properties').select('*').eq('id', lease.property_id).limit(1)).data?.[0] ?? null
      : null;
    const tenant = lease?.tenant_id
      ? (await supabase.from('tenants').select('*').eq('id', lease.tenant_id).limit(1)).data?.[0] ?? null
      : null;

    return ok(res, {
      lease: {
        id: n(lease.id),
        status: s(lease.status, 'UNKNOWN'),
        rentCents: n(lease.rent_cents, 0),
        start: s(lease.start_date ?? lease.start ?? ''),
        end: s(lease.end_date ?? lease.end ?? ''),
      },
      unit: unit ? { id: n(unit.id), label: s(unit.unit_label ?? unit.unit_number ?? unit.unit_name ?? unit.name) } : null,
      tenant: tenant ? { id: n(tenant.id), display_name: s(tenant.display_name ?? tenant.name) } : null,
      property: property ? { id: n(property.id), name: s(property.name) } : null,
    });
  } catch (e: any) { fail(res, 500, e?.message || 'server error'); }
});

// ---------- OWNER ----------
rpc.get('/get_owner_card', async (req, res) => {
  try {
    const supabase = getServerClient();
    const id = s(req.query.id ?? '').trim();
    if (!id) return fail(res, 400, 'missing id');

    const owner = await getOneByMulti(supabase, 'owners', id, ['doorloop_owner_id']);
    if (!owner) return fail(res, 404, 'owner not found');

    // Try both potential FK variants: owner_id or ownerid
    const p1 = await supabase.from('properties').select('id,name,address1,city,state,zip').eq('owner_id', owner.id);
    const p2 = await supabase.from('properties').select('id,name,address1,city,state,zip').eq('ownerid', owner.id);
    const rows = (p1.data || []).concat(p2.data || []);

    return ok(res, {
      owner: { id: n(owner.id), display_name: s(owner.display_name ?? owner.name) },
      properties: rows.map((p: any) => ({
        id: n(p.id), name: s(p.name), address: addrFrom(p),
      })),
    });
  } catch (e: any) { fail(res, 500, e?.message || 'server error'); }
});

// ---------- TENANT ----------
rpc.get('/get_tenant_card', async (req, res) => {
  try {
    const supabase = getServerClient();
    const id = s(req.query.id ?? '').trim();
    if (!id) return fail(res, 400, 'missing id');

    const tenant = await getOneByMulti(supabase, 'tenants', id, ['doorloop_tenant_id']);
    if (!tenant) return fail(res, 404, 'tenant not found');

    const leases = (await supabase.from('leases')
      .select('id,status,unit_id,property_id,tenant_id,rent_cents,start_date,end_date')
      .eq('tenant_id', tenant.id)).data || [];

    const active = leases.find((x: any) => String(x?.status).toUpperCase() === 'ACTIVE') ?? null;

    return ok(res, {
      tenant: { id: n(tenant.id), display_name: s(tenant.display_name ?? tenant.name) },
      leases: leases.map((L: any) => ({
        id: n(L.id), status: s(L.status, 'UNKNOWN'),
        rentCents: n(L.rent_cents, 0),
        unit_id: n(L.unit_id, 0), property_id: n(L.property_id, 0),
      })),
      activeLease: active ? {
        id: n(active.id), status: s(active.status, 'UNKNOWN'),
        rentCents: n(active.rent_cents, 0)
      } : null,
    });
  } catch (e: any) { fail(res, 500, e?.message || 'server error'); }
});

// ---------- GENERIC POST RPC ----------
rpc.post('/:functionName', async (req, res) => {
  try {
    const { functionName } = req.params;
    const payload = req.body || {};

    if (!process.env.SUPABASE_URL && !process.env.SUPABASE_REST_URL) {
      if (!res.locals.ecc) res.locals.ecc = {};
      res.locals.ecc.handler = 'rpc_guard';
      res.locals.ecc.contract = 'SYSTEM';
      res.locals.ecc.canonical = true;
      return res.status(501).json({ ok: false, error: "supabaseUrl is required" });
    }

    const supabase = getServerClient();

    const { data, error } = await supabase.rpc(functionName, payload);

    setContract(req, res, '/api/rpc/:functionName');

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data || {});
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'rpc error' });
  }
});

export default rpc;