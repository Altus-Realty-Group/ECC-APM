import type { UnitOut } from '../mappings';

export const UNIT_COLUMNS =
  'id,property_id,unit_number,unit_label,name,beds,baths,sqft,status,market_rent';
export const UNIT_READ_LIMIT = 5000;
const PROPERTY_COLUMNS = 'id,name';
const PROPERTY_BATCH_SIZE = 250;
const UNIT_KEYS = UNIT_COLUMNS.split(',');
const PROPERTY_KEYS = PROPERTY_COLUMNS.split(',');
const UNAVAILABLE = '—';

function invalid(): never {
  throw new Error('Unit records could not be loaded.');
}
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).length !== keys.length ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(row, key))
  )
    return invalid();
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
function numeric(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return invalid();
  return value;
}
function unitInputs(value: unknown) {
  if (!Array.isArray(value) || value.length > UNIT_READ_LIMIT) return invalid();
  const seen = new Set<number>();
  return value.map((item) => {
    const row = object(item, UNIT_KEYS);
    const unitId = id(row.id);
    if (seen.has(unitId)) return invalid();
    seen.add(unitId);
    return {
      id: unitId,
      propertyId: row.property_id === null ? null : id(row.property_id),
      unitNumber: text(row.unit_number),
      unitLabel: text(row.unit_label),
      name: text(row.name),
      beds: numeric(row.beds),
      baths: numeric(row.baths),
      sqft: numeric(row.sqft),
      status: text(row.status),
      // Preserve the legacy wire field without claiming the raw column's dollar/cents lineage.
      marketRent: numeric(row.market_rent),
    };
  });
}

/** Pure projection of explicitly selected, validated unit/property rows; no provider-ID joins. */
export function projectUnits(unitData: unknown, propertyData: unknown): UnitOut[] {
  const units = unitInputs(unitData);
  if (!Array.isArray(propertyData)) return invalid();
  const requested = new Set(
    units.flatMap((row) => (row.propertyId === null ? [] : [row.propertyId])),
  );
  const properties = new Map<number, string | null>();
  for (const item of propertyData) {
    const row = object(item, PROPERTY_KEYS);
    const propertyId = id(row.id);
    if (!requested.has(propertyId) || properties.has(propertyId)) return invalid();
    properties.set(propertyId, text(row.name));
  }
  if (properties.size !== requested.size) return invalid();
  return units.map((row) => ({
    id: row.id,
    propertyName:
      row.propertyId === null ? UNAVAILABLE : (properties.get(row.propertyId) ?? UNAVAILABLE),
    unitLabel: row.unitLabel ?? row.unitNumber ?? row.name ?? UNAVAILABLE,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    status: row.status,
    marketRent: row.marketRent,
  }));
}

type ReadResult = { data: unknown; error: unknown; count?: number | null };
type ReadQuery = PromiseLike<ReadResult> & {
  in(column: string, values: number[]): ReadQuery;
  limit(value: number): ReadQuery;
  order(column: string, options: { ascending: boolean }): ReadQuery;
};
export type UnitReadClient = {
  from(table: string): { select(columns: string, options?: { count: 'exact' }): ReadQuery };
};

/** Called by the existing units handler; injectable client permits isolated query/projection proof. */
export async function readUnitCollection(
  client: UnitReadClient,
  tables: { units: string; properties: string },
) {
  const result = await client
    .from(tables.units)
    .select(UNIT_COLUMNS, { count: 'exact' })
    .order('id', { ascending: true })
    .limit(UNIT_READ_LIMIT);
  if (result.error) return invalid();
  const units = unitInputs(result.data);
  if (
    !Number.isSafeInteger(result.count) ||
    result.count! < units.length ||
    result.count! < 0 ||
    (units.length === 0 && result.count !== 0)
  )
    return invalid();
  const propertyIds = [
    ...new Set(units.flatMap((row) => (row.propertyId === null ? [] : [row.propertyId]))),
  ];
  const properties: unknown[] = [];
  for (let start = 0; start < propertyIds.length; start += PROPERTY_BATCH_SIZE) {
    const batch = propertyIds.slice(start, start + PROPERTY_BATCH_SIZE);
    const joined = await client
      .from(tables.properties)
      .select(PROPERTY_COLUMNS)
      .in('id', batch)
      .limit(batch.length);
    if (joined.error || !Array.isArray(joined.data)) return invalid();
    // Validate each batch against its own requested keys, not just the final combined set.
    const returned = new Set<number>();
    for (const item of joined.data) {
      const row = object(item, PROPERTY_KEYS),
        propertyId = id(row.id);
      if (!batch.includes(propertyId) || returned.has(propertyId)) return invalid();
      returned.add(propertyId);
    }
    if (returned.size !== batch.length) return invalid();
    properties.push(...joined.data);
  }
  const projected = projectUnits(result.data, properties);
  return {
    data: projected,
    meta: {
      totalCount: result.count!,
      returned: projected.length,
      limit: UNIT_READ_LIMIT,
      truncated: result.count! > projected.length,
    },
  };
}
