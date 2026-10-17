// src/features/admin/pages/AdminSyncPage.tsx
import { useState, useEffect } from 'react';

const ALL = ['owners','properties','units','leases','tenants'] as const;
type Entity = typeof ALL[number];

interface SyncHealth {
  enabled: boolean;
  intervalMinutes: number;
  lockTtlMinutes: number;
  hardDeadlineMinutes: number;
  entities: string[];
  nightlyFullHourUtc: string | null;
  lock: {
    locked: boolean;
    holder: string | null;
    expires_at: string | null;
    acquired_at: string | null;
    released_at: string | null;
  };
  status: {
    last_run_at: string | null;
    last_success_at: string | null;
    next_run_at: string | null;
    mode: string | null;
    status: string;
    error: string | null;
  };
}

export default function AdminSyncPage() {
  const [mode, setMode] = useState<'incremental'|'full'>('incremental');
  const [sinceDays, setSinceDays] = useState(30);
  const [selected, setSelected] = useState<Record<Entity, boolean>>(
    { owners:true, properties:true, units:true, leases:true, tenants:true }
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string| null>(null);
  const [token, setToken] = useState('');
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const toggle = (k:Entity) => setSelected(s => ({...s, [k]: !s[k]}));

  // Load health status
  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health/sync');
      if (!res.ok) throw new Error('Failed to fetch health');
      const data = await res.json();
      setHealth(data);
      setHealthError(null);
    } catch (err: any) {
      setHealthError(err.message);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  async function run() {
    setBusy(true); setError(null); setResult(null);
    try {
      const entities = ALL.filter(k => selected[k]);
      const res = await fetch('/api/admin/sync/run', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ entities, mode, sinceDays }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      setResult(json);
      setTimeout(fetchHealth, 1000); // Refresh health after sync
    } catch (e:any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function quickRun() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/admin/sync/quick-run', {
        method: 'POST',
        headers: { 'X-Admin-Token': token },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      setResult(json);
      setTimeout(fetchHealth, 1000);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetLock() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/admin/sync/reset-lock', {
        method: 'POST',
        headers: { 'X-Admin-Token': token },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      setResult(json);
      setTimeout(fetchHealth, 1000);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const diff = Date.now() - Date.parse(isoString);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getStatusColor = (status: string, lastSuccess?: string | null) => {
    if (status === 'running') return 'text-blue-600';
    if (status === 'completed') return 'text-green-600';
    if (status === 'failed') return 'text-red-600';
    if (lastSuccess && Date.now() - Date.parse(lastSuccess) > 30 * 60 * 1000) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto text-[var(--text)]">
      <h1 className="text-2xl mb-6">Admin Sync</h1>
      <p role="status">Live sync and quick-run writes are unavailable. This page cannot persist provider records. Use the explicit read-only preview in Integration health.</p>
      
      {/* Live Status Widget */}
      <div className="mb-6 p-4 bg-[var(--panel-bg)] border border-[var(--line)] rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Auto-Sync Status</h2>
        {healthError ? (
          <div className="text-red-600">Error loading status: {healthError}</div>
        ) : health ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Enabled:</span> {health.enabled ? '✔️' : '❌'}
            </div>
            <div>
              <span className="font-medium">Interval:</span> {health.intervalMinutes}m
            </div>
            <div>
              <span className="font-medium">Entities:</span> {health.entities.join(', ')}
            </div>
            <div>
              <span className="font-medium">Next run:</span> {formatRelativeTime(health.status.next_run_at)}
            </div>
            <div>
              <span className="font-medium">Last run:</span> {formatRelativeTime(health.status.last_run_at)}
            </div>
            <div>
              <span className="font-medium">Last success:</span> 
              <span className={getStatusColor(health.status.status, health.status.last_success_at)}>
                {formatRelativeTime(health.status.last_success_at)}
              </span>
            </div>
            <div>
              <span className="font-medium">Lock:</span> {health.lock.locked ? `🔒 ${health.lock.holder}` : '🔓 Available'}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <span className={getStatusColor(health.status.status, health.status.last_success_at)}>
                {health.status.status}
              </span>
            </div>
            <div>
              <span className="font-medium">Nightly full:</span> {health.nightlyFullHourUtc ? `${health.nightlyFullHourUtc}:00 UTC` : 'Disabled'}
            </div>
            {health.status.error && (
              <div className="col-span-full">
                <span className="font-medium text-red-600">Error:</span> {health.status.error}
              </div>
            )}
          </div>
        ) : (
          <div>Loading status...</div>
        )}
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-1">Admin Token</label>
        <input
          className="w-full rounded px-3 py-2 bg-[var(--panel-bg)] border border-[var(--line)]"
          value={token}
          onChange={e=>setToken(e.target.value)}
          type="password"
          placeholder="Enter ADMIN_SYNC_TOKEN"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1">Mode</label>
        <select
          className="rounded px-3 py-2 bg-[var(--panel-bg)] border border-[var(--line)]"
          value={mode}
          onChange={e=>setMode(e.target.value as any)}
        >
          <option value="incremental">Incremental (since last sync)</option>
          <option value="full">Full (all data)</option>
        </select>
      </div>

      {mode === 'incremental' && (
        <div className="mb-4">
          <label className="block text-sm mb-1">Fallback Window (days)</label>
          <input
            type="number"
            className="rounded px-3 py-2 bg-[var(--panel-bg)] border border-[var(--line)]"
            value={sinceDays}
            onChange={e=>setSinceDays(Number(e.target.value))}
            min={1}
            max={365}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm mb-2">Entities to sync</label>
        <div className="space-y-2">
          {ALL.map(k => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected[k]}
                onChange={()=>toggle(k)}
                className="rounded"
              />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={run}
          disabled
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="run-sync-btn"
        >
          {busy ? 'Running...' : 'Run Sync'}
        </button>
        
        <button
          onClick={quickRun}
          disabled
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="quick-run-btn"
        >
          Quick Run (owners+properties)
        </button>
        
        <button
          onClick={resetLock}
          disabled
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="reset-lock-btn"
        >
          Reset Lock
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded text-green-700">
          <strong>Success!</strong> Mode: {result.mode}
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(result.results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}