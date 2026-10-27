export type LeaseFilterRow = {
  id: string;
  tenants: string;
  property: string;
  status: string;
};

/** Pure search over projected rows. Does not alter the source collection. */
export function filterLeaseRows<T extends LeaseFilterRow>(rows: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) =>
    [r.tenants, r.property, r.status, r.id].join(" ").toLowerCase().includes(needle)
  );
}
