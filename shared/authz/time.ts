// Strict RFC3339 instants. Date.parse alone accepts date-only and locale-style strings, so a malformed expiry could be read as a
// valid (or, worse, ignored) value. Only a full timestamp with an explicit offset is accepted; anything else is null.
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

export function parseRfc3339(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = RFC3339.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31 || +h > 23 || +mi > 59 || +s > 59) return null;
  const ms = Date.parse(v);
  if (!Number.isFinite(ms)) return null;
  // Reject calendar overflow such as 2026-02-31 (Date.parse rolls it over silently).
  const day = new Date(Date.UTC(+y, +mo - 1, +d));
  return day.getUTCFullYear() === +y && day.getUTCMonth() === +mo - 1 && day.getUTCDate() === +d ? ms : null;
}
