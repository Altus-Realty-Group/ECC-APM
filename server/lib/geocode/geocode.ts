import fetch from "node-fetch";
import { GeocodeResponse } from "../vendorResponseContracts";
import crypto from "crypto";
import { sbAdmin } from "../supabaseAdmin";
import { recordAudit } from "../audit";
const PROVIDER = process.env.GEOCODER_PROVIDER || "google";
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}
function addrKey(addr: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string }) {
  const base = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code].filter(Boolean).map(norm).join(", ");
  return crypto.createHash("sha256").update(base).digest("hex");
}

async function getFromCache(hash: string) {
  const { data, error } = await sbAdmin
    .from("geocode_cache")
    .select("lat,lng,normalized")
    .eq("address_hash", hash)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
async function putInCache(hash: string, normalized: string, lat: number, lng: number) {
  const { error } = await sbAdmin.from("geocode_cache").upsert({ address_hash: hash, normalized, lat, lng });
  if (error) throw error;
}

async function googleGeocode(q: string): Promise<{ lat: number; lng: number; normalized: string } | null> {
  if (!API_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = GeocodeResponse.parse(await res.json());
  const hit = j?.results?.[0];
  if (!hit) return null;
  const lat = hit.geometry?.location?.lat;
  const lng = hit.geometry?.location?.lng;
  const normalized = hit.formatted_address || q;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng, normalized };
}

// very light 2 rps governor
let last = 0;
async function throttle() {
  const now = Date.now();
  const delta = now - last;
  const minGap = 500; // ms => 2 req/sec
  if (delta < minGap) await new Promise(r => setTimeout(r, minGap - delta));
  last = Date.now();
}

export type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string };

export async function geocodeAddress(addr: Address): Promise<{ lat: number; lng: number } | null> {
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code].filter(Boolean);
  if (!parts.length) return null;
  const query = parts.join(", ");
  const hash = addrKey(addr);

  // cache
  const cached = await getFromCache(hash);
  if (cached) return { lat: cached.lat, lng: cached.lng };

  await throttle();
  let result: { lat: number; lng: number; normalized: string } | null = null;
  if (PROVIDER === "google") result = await googleGeocode(query);

  if (result) {
    await putInCache(hash, result.normalized, result.lat, result.lng);
    await recordAudit({
      event_type: "GEOCODE_AUTO",
      label: "GEOCODE_AUTO",
      ref_table: "properties",
      payload: { provider: PROVIDER, query, normalized: result.normalized }
    });
    return { lat: result.lat, lng: result.lng };
  }
  return null;
}
