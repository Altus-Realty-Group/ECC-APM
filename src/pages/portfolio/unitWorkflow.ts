// UnitOut projection from server/mappings.ts. No aliases, currency conversion or inferred occupancy.
export type UnitReviewRow = {
  key: string;
  id: string | null;
  href?: string;
  unit: string | null;
  property: string | null;
  status: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  marketRent: number | null;
};
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value.trim() !== '—' ? value.trim() : null;
}
function nonnegative(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function mapUnitRows(data: unknown[]): UnitReviewRow[] {
  return data.map((value, index) => {
    const row = value as Record<string, unknown>;
    const id =
      typeof row.id === 'number' && Number.isFinite(row.id) ? String(row.id) : text(row.id);
    const numericId = id && /^\d+$/.test(id) ? Number(id) : NaN;
    const href =
      Number.isSafeInteger(numericId) && numericId > 0 ? `/card/unit/${numericId}` : undefined;
    return {
      key: String(index),
      id,
      href,
      unit: text(row.unitLabel),
      property: text(row.propertyName),
      status: text(row.status),
      beds: nonnegative(row.beds),
      baths: nonnegative(row.baths),
      sqft: nonnegative(row.sqft),
      marketRent: nonnegative(row.marketRent),
    };
  });
}
export function reportedOptions(rows: UnitReviewRow[], field: 'property' | 'status'): string[] {
  return [...new Set(rows.map((row) => row[field]).filter((v): v is string => v !== null))].sort(
    (a, b) => a.localeCompare(b),
  );
}
export function filterUnitRows(
  rows: UnitReviewRow[],
  filters: { search: string; property: string; status: string },
) {
  const needle = filters.search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (!filters.property || row.property === filters.property) &&
      (!filters.status || row.status === filters.status) &&
      (!needle ||
        [row.id, row.unit, row.property, row.status]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)),
  );
}
