import type { PropertyOut } from '../mappings';
import type { UnitReadClient } from './unitProjection';

export const PROPERTY_COLUMNS = 'id,name,type,class,active,address_street1,address_city,address_state,address_zip,lat,lng';
export const PROPERTY_READ_LIMIT = 5000;
const UNIT_COLUMNS = 'id,property_id';
const BATCH_SIZE = 250;
function invalid(): never { throw new Error('Property records could not be loaded.'); }
function object(value: unknown, columns: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const row = value as Record<string, unknown>, keys = columns.split(',');
  if (Object.keys(row).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(row, key))) return invalid();
  return row;
}
function id(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid();
  return value;
}
function text(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') return invalid();
  return value.trim() || null;
}
function coordinate(value: unknown, max: number): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > max) return invalid();
  return value;
}
function properties(value: unknown): PropertyOut[] {
  if (!Array.isArray(value) || value.length > PROPERTY_READ_LIMIT) return invalid();
  const seen = new Set<number>();
  return value.map(item => {
    const row = object(item, PROPERTY_COLUMNS), propertyId = id(row.id);
    if (seen.has(propertyId)) return invalid();
    seen.add(propertyId);
    if (row.active !== null && typeof row.active !== 'boolean') return invalid();
    return {
      id: propertyId, name: text(row.name), type: text(row.type), class: text(row.class),
      street_1: text(row.address_street1), city: text(row.address_city), state: text(row.address_state), zip: text(row.address_zip),
      active: row.active as boolean | null, lat: coordinate(row.lat, 90), lng: coordinate(row.lng, 180),
      units: 0, // Internal accumulator only; returned only after every exact-count unit batch succeeds.
      occPct: null, // No verified occupancy/status classification policy exists for this collection.
    };
  });
}
function count(value: unknown, length: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < length || value < 0 || (length === 0 && value !== 0)) return invalid();
  return value;
}

/** Existing portfolio adapter only. No actor, provider-ID mapping, writer or connection is introduced. */
export async function readPropertyCollection(client: UnitReadClient, tables: { properties: string; units: string }) {
  const result = await client.from(tables.properties).select(PROPERTY_COLUMNS, { count: 'exact' })
    .order('id', { ascending: true }).limit(PROPERTY_READ_LIMIT);
  if (result.error) return invalid();
  const rows = properties(result.data), totalCount = count(result.count, rows.length);
  const seenUnits = new Set<number>();
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE), ids = batch.map(row => row.id);
    const units = await client.from(tables.units).select(UNIT_COLUMNS, { count: 'exact' })
      .in('property_id', ids).order('id', { ascending: true }).limit(PROPERTY_READ_LIMIT);
    if (units.error || !Array.isArray(units.data) || units.data.length > PROPERTY_READ_LIMIT) return invalid();
    // A capped/incomplete related collection cannot support any per-property total, including zero.
    if (count(units.count, units.data.length) !== units.data.length) return invalid();
    const byId = new Map(batch.map(row => [row.id, row]));
    for (const item of units.data) {
      const unit = object(item, UNIT_COLUMNS), unitId = id(unit.id), propertyId = id(unit.property_id);
      const property = byId.get(propertyId);
      if (!property || seenUnits.has(unitId)) return invalid();
      seenUnits.add(unitId);
      property.units++;
    }
  }
  return { data: rows, meta: { totalCount, returned: rows.length, limit: PROPERTY_READ_LIMIT, truncated: totalCount > rows.length } };
}
