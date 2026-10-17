export type SyncHistoryRun = {
  id: string;
  timestamp: string;
  entity: string;
  mode: 'delta' | 'backfill';
  rows: number;
  duration: number;
  result: 'success' | 'error' | 'warning';
  dryRun?: boolean;
  error?: string;
  fullMessage?: string;
  fullDetails?: unknown;
};
export function parseSyncHistory(value: unknown): { ok: true; runs: SyncHistoryRun[] } {
  const body = value as { ok?: unknown; runs?: unknown } | null;
  if (!body || body.ok !== true || !Array.isArray(body.runs))
    throw new Error('Run history could not be verified.');
  const seen = new Set<string>();
  for (const row of body.runs) {
    if (
      !row ||
      typeof row !== 'object' ||
      Array.isArray(row) ||
      typeof row.id !== 'string' ||
      !row.id.trim() ||
      typeof row.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(row.timestamp)) ||
      typeof row.entity !== 'string' ||
      !['delta', 'backfill'].includes(row.mode) ||
      !Number.isSafeInteger(row.rows) ||
      row.rows < 0 ||
      typeof row.duration !== 'number' ||
      !Number.isFinite(row.duration) ||
      row.duration < 0 ||
      seen.has(row.id) ||
      (row.error !== undefined && typeof row.error !== 'string') ||
      (row.fullMessage !== undefined && typeof row.fullMessage !== 'string') ||
      !['success', 'error', 'warning'].includes(row.result) ||
      (row.dryRun !== undefined && typeof row.dryRun !== 'boolean')
    )
      throw new Error('Run history could not be verified.');
    seen.add(row.id);
  }
  return { ok: true, runs: body.runs };
}
export type HistoryQuery = {
  data?: unknown;
  isSuccess: boolean;
  isError: boolean;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
};
export function readyHistoryRows(query: HistoryQuery, enabled: boolean): SyncHistoryRun[] | null {
  if (
    !enabled ||
    !query.isSuccess ||
    query.isError ||
    query.isPending ||
    query.isFetching ||
    query.error
  )
    return null;
  try {
    return parseSyncHistory(query.data).runs;
  } catch {
    return null;
  }
}
// Local non-secret scope is unique across remounts and edits; credentials never enter cache keys.
let revision = 0;
export function nextHistoryRevision() {
  return ++revision;
}
export const syncHistoryKey = (scope: number, epoch: number) =>
  ['integration-run-history', scope, epoch] as const;
