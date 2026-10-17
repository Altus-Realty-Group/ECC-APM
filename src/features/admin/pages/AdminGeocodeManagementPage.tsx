import React, { useEffect, useState } from 'react';
import StateNotice from '@/components/ui/StateNotice';
import { sessionFetchJSON, useSessionEpoch } from '@/lib/sessionScope';
import './geocode-management.css';

type GeocodeStats = {
  timestamp: string | null;
  processed: number | null;
  updated: number | null;
  batchSize: number | null;
};
const count = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
export function parseGeocodeStats(value: unknown): GeocodeStats | null {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { events?: unknown }).events))
    throw new Error('Run statistics are unavailable.');
  const events = (value as { events: unknown[] }).events;
  if (!events.length) return null;
  const event = events[0];
  if (!event || typeof event !== 'object' || Array.isArray(event))
    throw new Error('Run statistics are unavailable.');
  const { payload, created_at } = event as { payload?: unknown; created_at?: unknown };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new Error('Run statistics are unavailable.');
  const row = payload as Record<string, unknown>,
    batch = count(row.batch_size);
  return {
    timestamp:
      typeof created_at === 'string' && Number.isFinite(Date.parse(created_at)) ? created_at : null,
    processed: count(row.processed),
    updated: count(row.updated),
    batchSize: batch !== null && batch > 0 ? batch : null,
  };
}
const display = (value: number | null) =>
  value === null ? 'Not reported' : value.toLocaleString('en-US');
export function GeocodeManagementView({
  stats,
  loading,
  failed,
  retry,
}: {
  stats: GeocodeStats | null;
  loading: boolean;
  failed: boolean;
  retry: () => void;
}) {
  return (
    <section className="ecc-page ecc-geocode">
      <h1>Geocode Management</h1>
      <StateNotice
        kind="partial"
        title="Geocode changes are unavailable."
        detail="Batch-size changes and manual runs are not connected to an approved service. These controls cannot change property locations."
      />
      <section aria-labelledby="geocode-controls">
        <h2 id="geocode-controls">Geocode controls</h2>
        <button type="button" className="ecc-btn ecc-touch" disabled>
          Update batch size
        </button>{' '}
        <button type="button" className="ecc-btn ecc-touch" disabled>
          Trigger manual geocode run
        </button>
      </section>
      <section aria-labelledby="geocode-statistics">
        <h2 id="geocode-statistics">Latest reported geocode activity</h2>
        {loading ? (
          <StateNotice kind="loading" title="Loading geocode activity..." />
        ) : failed ? (
          <StateNotice
            kind="error"
            title="Geocode activity could not be loaded."
            detail="No previous counts are shown after a failed read."
            onRetry={retry}
          />
        ) : stats ? (
          <dl>
            <dt>Reported activity time</dt>
            <dd>{stats.timestamp ? new Date(stats.timestamp).toLocaleString() : 'Not reported'}</dd>
            <dt>Processed</dt>
            <dd>{display(stats.processed)}</dd>
            <dt>Updated</dt>
            <dd>{display(stats.updated)}</dd>
            <dt>Batch size</dt>
            <dd>{display(stats.batchSize)}</dd>
          </dl>
        ) : (
          <StateNotice kind="empty" title="No geocode activity was returned." />
        )}
        {!loading ? (
          <button type="button" className="ecc-btn ecc-touch" onClick={retry}>
            Refresh statistics
          </button>
        ) : null}
        <p>
          Reported counts do not establish a success rate or confirm the current schedule, provider
          configuration or write completion.
        </p>
      </section>
    </section>
  );
}
export default function AdminGeocodeManagementPage() {
  const epoch = useSessionEpoch();
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{
    epoch: number;
    refresh: number;
    stats: GeocodeStats | null;
    loading: boolean;
    failed: boolean;
  }>({ epoch, refresh, stats: null, loading: true, failed: false });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ epoch, refresh, stats: null, loading: true, failed: false });
    void sessionFetchJSON('/api/audit?event_type=GEOCODE_AUTO&limit=1', {
      signal: controller.signal,
    })
      .then(parseGeocodeStats)
      .then((stats) => {
        if (active) setState({ epoch, refresh, stats, loading: false, failed: false });
      })
      .catch(() => {
        if (active) setState({ epoch, refresh, stats: null, loading: false, failed: true });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [epoch, refresh]);
  const current =
    state.epoch === epoch && state.refresh === refresh
      ? state
      : { stats: null, loading: true, failed: false };
  return <GeocodeManagementView {...current} retry={() => setRefresh((value) => value + 1)} />;
}
