import { useState, useEffect, useRef } from "react";
import { Pause, Play, Copy, Trash2, Filter, AlertCircle, Info, Activity, Zap, Download } from "lucide-react";
import { useShowToast } from "@/features/systems/integrations/useShowToast";

interface LogEvent {
  id?: string;
  timestamp: number;
  runId?: string;
  entity?: string;
  type: "info" | "warn" | "error" | "progress";
  message: string;
  details?: any;
}

interface LiveLogsProps {
  adminToken: string;
  autoConnect?: boolean;
  maxLogs?: number;
  filters?: {
    entity?: string;
    level?: string;
    runId?: string;
  };
  onFiltersChange?: (filters: { entity?: string; level?: string; runId?: string }) => void;
}

const LOG_TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950", label: "INFO" },
  warn: { icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-50 dark:bg-yellow-950", label: "WARN" },
  error: { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-950", label: "ERROR" },
  progress: { icon: Activity, color: "text-green-500", bgColor: "bg-green-50 dark:bg-green-950", label: "PROGRESS" }
};

export default function LiveLogs({ 
  adminToken, 
  autoConnect = true, 
  maxLogs = 1000,
  filters = {},
  onFiltersChange 
}: LiveLogsProps) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabled = useRef(!isPaused);
  const { showToast } = useShowToast();

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const base = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `${base}.${String(date.getMilliseconds()).padStart(3, '0')}`;
  };

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    if (localFilters.entity && log.entity !== localFilters.entity) return false;
    if (localFilters.level && log.type !== localFilters.level) return false;
    if (localFilters.runId && log.runId !== localFilters.runId) return false;
    return true;
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScrollEnabled.current && !isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  // Handle SSE connection
  const connect = () => {
    if (!adminToken) {
      setConnectionError('Admin token is required');
      return;
    }

    disconnect(); // Close any existing connection

    try {
      const eventSource = new EventSource(`/api/admin/sync/logs/stream?token=${encodeURIComponent(adminToken)}`);

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        showToast({
          title: "Connected to live logs",
          description: "Real-time log streaming is active",
          variant: "success"
        });
      };

      eventSource.addEventListener('connected', (event) => {
        console.log('SSE Connected:', event.data);
      });

      eventSource.addEventListener('log', (event) => {
        if (isPaused) return;

        try {
          const logEvent: LogEvent = JSON.parse(event.data);
          
          setLogs(prevLogs => {
            const newLogs = [...prevLogs, logEvent];
            // Keep only the most recent logs to prevent memory issues
            return newLogs.length > maxLogs ? newLogs.slice(-maxLogs) : newLogs;
          });
        } catch (err) {
          console.error('Failed to parse log event:', err);
        }
      });

      eventSource.onerror = (event) => {
        console.error('SSE Error:', event);
        setIsConnected(false);
        setConnectionError('Connection lost - attempting to reconnect...');
        
        // Auto-reconnect after a delay
        setTimeout(() => {
          if (autoConnect) connect();
        }, 3000);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      setConnectionError(`Failed to connect: ${err}`);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && adminToken) {
      connect();
    }

    return () => disconnect();
  }, [adminToken, autoConnect]);

  // Handle pause/resume
  const togglePause = () => {
    setIsPaused(!isPaused);
    autoScrollEnabled.current = isPaused; // Will resume auto-scroll when unpausing
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    showToast({
      title: "Logs cleared",
      description: "All log entries have been removed",
      variant: "success"
    });
  };

  // Copy logs to clipboard
  const copyLogs = async () => {
    const logsText = filteredLogs
      .map(log => `[${formatTimestamp(log.timestamp)}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(logsText);
      showToast({
        title: "Logs copied",
        description: `${filteredLogs.length} log entries copied to clipboard`,
        variant: "success"
      });
    } catch (err) {
      showToast({
        title: "Copy failed",
        description: "Failed to copy logs to clipboard",
        variant: "error"
      });
    }
  };

  // Export logs
  const exportLogs = () => {
    const logsText = filteredLogs
      .map(log => `[${formatTimestamp(log.timestamp)}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast({
      title: "Logs exported",
      description: `${filteredLogs.length} log entries exported`,
      variant: "success"
    });
  };

  // Apply filters
  const applyFilters = () => {
    onFiltersChange?.(localFilters);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setLocalFilters({});
    onFiltersChange?.({});
  };

  return (
    <div className="ecc-card">
      <div className="ecc-card__header">
        <div className="flex items-center justify-between">
          <h3 className="ecc-card__title flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Live Logs</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </h3>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {filteredLogs.length} / {logs.length} logs
            </span>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`ecc-button ecc-button--ghost p-1 ${showFilters ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              data-testid="button-toggle-filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="ecc-field-label text-xs">Entity:</label>
                <select
                  value={localFilters.entity || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, entity: e.target.value || undefined })}
                  className="ecc-input text-xs"
                  data-testid="select-filter-entity"
                >
                  <option value="">All</option>
                  <option value="owners">Owners</option>
                  <option value="properties">Properties</option>
                  <option value="units">Units</option>
                  <option value="leases">Leases</option>
                  <option value="tenants">Tenants</option>
                </select>
              </div>
              
              <div>
                <label className="ecc-field-label text-xs">Level:</label>
                <select
                  value={localFilters.level || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, level: e.target.value || undefined })}
                  className="ecc-input text-xs"
                  data-testid="select-filter-level"
                >
                  <option value="">All</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                  <option value="progress">Progress</option>
                </select>
              </div>
              
              <div>
                <label className="ecc-field-label text-xs">Run ID:</label>
                <input
                  type="text"
                  value={localFilters.runId || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, runId: e.target.value || undefined })}
                  placeholder="Filter by run ID"
                  className="ecc-input text-xs"
                  data-testid="input-filter-run-id"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button onClick={applyFilters} className="ecc-button ecc-button--primary text-xs" data-testid="button-apply-filters">
                Apply
              </button>
              <button onClick={resetFilters} className="ecc-button ecc-button--secondary text-xs" data-testid="button-reset-filters">
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Connection Error */}
        {connectionError && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
            <p className="text-sm text-red-600 dark:text-red-400">{connectionError}</p>
          </div>
        )}
      </div>

      <div className="ecc-card__body p-0">
        {/* Logs Container */}
        <div className="h-96 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-sm">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {logs.length === 0 ? 'No logs yet...' : 'No logs match current filters'}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredLogs.map((log, index) => {
                const config = LOG_TYPE_CONFIG[log.type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={index}
                    className={`flex items-start space-x-2 p-2 rounded text-xs ${config.bgColor.replace('50', '900').replace('950', '800')}`}
                    data-testid={`log-entry-${index}`}
                  >
                    <Icon className={`w-3 h-3 mt-0.5 ${config.color}`} />
                    <span className="text-gray-400 min-w-[80px]">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className={`${config.color} font-semibold min-w-[60px]`}>
                      {config.label}
                    </span>
                    {log.entity && (
                      <span className="text-blue-400 min-w-[60px] capitalize">
                        [{log.entity}]
                      </span>
                    )}
                    {log.runId && (
                      <span className="text-purple-400 min-w-[100px] font-mono text-xs">
                        {log.runId.slice(0, 8)}
                      </span>
                    )}
                    <span className="text-gray-100 flex-1">
                      {log.message}
                    </span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="ecc-card__footer">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isConnected ? (
              <button
                onClick={connect}
                disabled={!adminToken}
                className="ecc-button ecc-button--primary"
                data-testid="button-connect"
              >
                <Play className="w-4 h-4" />
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="ecc-button ecc-button--secondary"
                data-testid="button-disconnect"
              >
                Disconnect
              </button>
            )}
            
            <button
              onClick={togglePause}
              className={`ecc-button ${isPaused ? 'ecc-button--warning' : 'ecc-button--secondary'}`}
              disabled={!isConnected}
              data-testid="button-toggle-pause"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyLogs}
              disabled={filteredLogs.length === 0}
              className="ecc-button ecc-button--ghost"
              data-testid="button-copy-logs"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            <button
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className="ecc-button ecc-button--ghost"
              data-testid="button-export-logs"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="ecc-button ecc-button--ghost text-red-600 hover:text-red-700"
              data-testid="button-clear-logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}