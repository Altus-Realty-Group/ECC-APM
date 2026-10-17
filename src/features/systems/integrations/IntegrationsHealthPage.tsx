import { useState, useEffect } from "react";
import StateNotice from "@/components/ui/StateNotice";
import { errorKind } from "@/lib/dataState";
import { sessionFetchJSON, useSessionEpoch } from "@/lib/sessionScope";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import StatusCard from "./components/StatusCard";
import RunPanel from "./components/RunPanel";
import RunHistoryBoundary from "./components/RunHistoryBoundary";
import { nextHistoryRevision, parseSyncHistory, readyHistoryRows, syncHistoryKey } from "./syncHistory";
import ErrorPane from "./components/ErrorPane";
import LiveLogs from "./components/LiveLogs";
import DLQPanel from "./components/DLQPanel";
import { Clock, Settings, Database, MessageSquare, Shield, AlertTriangle, Send, RefreshCw } from "lucide-react";
import { useShowToast } from "@/features/systems/integrations/useShowToast";
import { schedulerDisplay } from "./schedulerDisplay";

// Define types for API responses
interface SyncRun {
  id: string;
  timestamp: string;
  entity: string;
  mode: "delta" | "backfill";
  dryRun?: boolean;
  rows: number;
  duration: number;
  result: "success" | "error" | "warning";
  error?: string;
  fullMessage?: string;
  fullDetails?: any;
}

/** Shape read from /api/health/sync (fields are optional; the UI falls back when absent). */
interface SyncHealthResponse {
  status?: { last_success_at?: string | null; next_run_at?: string | null; error?: string | null } | null;
  lock?: { locked?: boolean } | null;
  enabled?: boolean;
  intervalMinutes?: number;
  nightlyFullHourUtc?: number | null;
  entities?: string[];
}

/** Shape read from /api/config/integrations; entries may be booleans or objects, only truthiness is used. */
interface IntegrationsConfigResponse {
  integrations?: { doorloop?: unknown; teams?: unknown } | null;
}

export default function IntegrationsHealthPage() {
  const historyClient = useQueryClient();
  const sessionEpoch = useSessionEpoch();
  const [historyRevision, setHistoryRevision] = useState(nextHistoryRevision);
  const [selectedHistorySource, setSelectedHistorySource] = useState<unknown>(null);
  const [selectedEntities, setSelectedEntities] = useState(["owners", "properties"]);
  const [selectedRun, setSelectedRun] = useState<SyncRun | null>(null);
  const [isErrorPaneOpen, setIsErrorPaneOpen] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    // Load admin token from localStorage on initial render
    try {
      return localStorage.getItem('ecc-admin-token') || "";
    } catch (err) {
      console.warn('Failed to load admin token from localStorage:', err);
      return "";
    }
  });
  const [activeTab, setActiveTab] = useState<"monitoring" | "logs" | "dlq">("monitoring");
  const { showToast } = useShowToast();

  // Enhanced API endpoints for Genesis v1
  // Fetch comprehensive sync status
  const { data: syncStatusData, refetch: refetchSyncStatus } = useQuery({
    queryKey: ['/api/admin/sync/status'],
    queryFn: async () => {
      if (!adminToken) return null;
      
      return apiRequest('/api/admin/sync/status', {
        headers: {
          'X-Admin-Token': adminToken,
        },
      });
    },
    enabled: !!adminToken,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch sync health status
  const { data: healthData, error: healthError, isPending: healthPending, refetch: refetchHealth } = useQuery<SyncHealthResponse>({
    queryKey: ['/api/health/sync'],
    queryFn: ({ signal }) => sessionFetchJSON<SyncHealthResponse>('/api/health/sync', { signal }),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch integration status
  const { data: configData, error: configError, isPending: configPending, refetch: refetchConfig } = useQuery<IntegrationsConfigResponse>({
    queryKey: ['/api/config/integrations'],
    queryFn: ({ signal }) => sessionFetchJSON<IntegrationsConfigResponse>('/api/config/integrations', { signal }),
  });

  // History is a session-scoped read; token contents are never part of its cache identity.
  const historyKey = syncHistoryKey(historyRevision, sessionEpoch);
  const runsQuery = useQuery({
    queryKey: historyKey,
    queryFn: async ({ signal }) => {
      if (!adminToken) throw new Error('Completion history is unavailable.');
      return parseSyncHistory(await sessionFetchJSON('/api/admin/sync/runs?limit=20', {
        signal, headers: { 'X-Admin-Token': adminToken },
      }));
    },
    enabled: !!adminToken,
  });
  const refetchRuns = runsQuery.refetch;
  const currentHistory = readyHistoryRows(runsQuery, !!adminToken);
  function changeAdminToken(value: string) {
    // Cancel/remove the old scope before replacing it; a late response cannot become the new token's history.
    void historyClient.cancelQueries({ queryKey: historyKey });
    historyClient.removeQueries({ queryKey: historyKey });
    setHistoryRevision(nextHistoryRevision());
    setSelectedRun(null); setSelectedHistorySource(null); setIsErrorPaneOpen(false);
    setAdminToken(value);
  }

  // Enhanced ping with comprehensive response
  const handlePing = async () => {
    if (!adminToken) {
      throw new Error('Admin token is required');
    }
    
    const response = await fetch('/api/admin/integrations/doorloop/ping', {
      headers: {
        'X-Admin-Token': adminToken,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Ping failed: ${response.statusText}`);
    }
    
    return response.json();
  };

  // Circuit breaker reset mutation
  const resetCircuitBreakerMutation = useMutation({
    mutationFn: async () => {
      if (!adminToken) {
        throw new Error('Admin token is required');
      }
      
      return apiRequest('/api/admin/integrations/doorloop/circuit-breaker/reset', {
        method: 'POST',
        headers: {
          'X-Admin-Token': adminToken,
        },
      });
    },
    onSuccess: () => {
      showToast({
        title: "Circuit breaker reset",
        description: "The circuit breaker has been reset successfully",
        variant: "success",
      });
      refetchSyncStatus();
      refetchHealth();
    },
    onError: (error: Error) => {
      showToast({
        title: "Reset failed",
        description: error.message,
        variant: "error",
      });
    },
  });

  // Teams alert test mutation
  const testTeamsAlertMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!adminToken) {
        throw new Error('Admin token is required');
      }
      
      return apiRequest('/api/admin/integrations/teams/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({ message }),
      });
    },
    onSuccess: () => {
      showToast({
        title: "Teams alert sent",
        description: "Test alert sent to Teams channel successfully",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      showToast({
        title: "Teams alert failed",
        description: error.message,
        variant: "error",
      });
    },
  });

  const handleResetCircuitBreaker = async () => {
    await resetCircuitBreakerMutation.mutateAsync();
  };

  const handleTestTeamsAlert = async () => {
    const message = `Test alert from ECC Systems Integration Health at ${new Date().toLocaleString()}`;
    await testTeamsAlertMutation.mutateAsync(message);
  };

  // Enhanced sync run mutation with RunOptions support
  const syncMutation = useMutation({
    mutationFn: async (options: { mode: "delta" | "backfill"; dryRun?: boolean; since?: string }) => {
      if (!adminToken) {
        throw new Error('Admin token is required');
      }
      
      return apiRequest('/api/admin/sync/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({
          entities: selectedEntities,
          mode: options.mode === "delta" ? "incremental" : "backfill",
          dryRun: options.dryRun || false,
          since: options.since,
        }),
      });
    },
    onSuccess: (data, variables) => {
      showToast({
        title: variables.dryRun ? "Dry Run Started" : "Sync Started",
        description: `${selectedEntities.join(', ')} ${variables.dryRun ? 'dry run' : 'sync'} initiated successfully`,
        variant: "success",
      });
      refetchSyncStatus();
      refetchHealth();
      refetchRuns();
    },
    onError: (error: Error) => {
      showToast({
        title: "Sync Failed",
        description: error.message,
        variant: "error",
      });
    },
  });

  const handleRunSync = async (options: { mode: "delta" | "backfill"; dryRun?: boolean; since?: string }) => {
    await syncMutation.mutateAsync(options);
  };

  const handleStopSync = async () => {
    // Implementation would depend on backend support for stopping syncs
    console.log('Stop sync requested');
  };

  const handleRowClick = (run: SyncRun) => {
    setSelectedRun(run);
    setSelectedHistorySource(runsQuery.data);
    setIsErrorPaneOpen(true);
  };

  const getDoorLoopStatus = () => {
    if (!syncStatusData && !healthData) return "failing";
    
    // Use enhanced status data if available
    if (syncStatusData?.integrations?.doorloop?.healthScore !== undefined) {
      const score = syncStatusData.integrations.doorloop.healthScore;
      if (score >= 90) return "healthy";
      if (score >= 70) return "degraded";
      return "failing";
    }
    
    // Fallback to legacy health check
    const lastSuccess = healthData?.status?.last_success_at;
    if (!lastSuccess) return "failing";
    
    const hoursSinceSuccess = (Date.now() - new Date(lastSuccess).getTime()) / (1000 * 60 * 60);
    if (hoursSinceSuccess > 24) return "degraded";
    return "healthy";
  };

  const getEnhancedHealthData = () => {
    return syncStatusData?.integrations?.doorloop || {};
  };

  const getCurrentProgress = () => {
    return syncStatusData?.currentRun?.progress;
  };

  const formatNextRun = () => {
    if (!healthData?.status?.next_run_at) return "Not scheduled";
    const nextRun = new Date(healthData.status.next_run_at);
    const now = new Date();
    const minutes = Math.floor((nextRun.getTime() - now.getTime()) / 60000);
    
    if (minutes < 0) return "Overdue";
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const readError = healthError || configError;
  if (readError || healthPending || configPending) {
    return <section className="ecc-page">
      <h1>Integration health</h1>
      <StateNotice kind={readError ? errorKind(readError) : "loading"}
        title={readError ? "Integration health could not be loaded" : "Loading integration health"}
        detail={readError ? "Connection status and sync controls are unavailable until health information can be verified." : undefined}
        onRetry={readError ? () => { void refetchHealth(); void refetchConfig(); } : undefined} />
    </section>;
  }

  return (
    <div className="ecc-page">
      <div className="ecc-page__header">
        <div className="ecc-page__title-row">
          <h1 className="ecc-page__title">Systems › Integrations › Health</h1>
        </div>
        <p className="ecc-page__subtitle">
          Monitor and control integration health with external services
        </p>
        
        {/* Navigation Tabs */}
        <div className="ecc-tabs-header mt-4">
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`ecc-tab-button ${activeTab === "monitoring" ? "active" : ""}`}
            data-testid="tab-monitoring"
          >
            <Database className="w-4 h-4" />
            Monitoring
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`ecc-tab-button ${activeTab === "logs" ? "active" : ""}`}
            data-testid="tab-logs"
          >
            <Clock className="w-4 h-4" />
            Live Logs
          </button>
          <button
            onClick={() => setActiveTab("dlq")}
            className={`ecc-tab-button ${activeTab === "dlq" ? "active" : ""}`}
            data-testid="tab-dlq"
          >
            <AlertTriangle className="w-4 h-4" />
            DLQ
          </button>
        </div>
      </div>

      <div className="ecc-page__content">
        <div className="ecc-layout ecc-layout--3col">
          {/* Main Column */}
          <div className="ecc-layout__main">
            <div className="space-y-6">
              
              {/* Admin Token Input (always visible if not set) */}
              {(
                <div className="ecc-card">
                  <div className="ecc-card__header">
                    <h3 className="ecc-card__title">Admin Authentication</h3>
                  </div>
                  <div className="ecc-card__body">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Enter admin token to access sync controls and detailed monitoring
                    </p>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Admin token"
                        value={adminToken}
                        onChange={(e) => {
                          const newToken = e.target.value;
                          changeAdminToken(newToken);
                          // Persist to localStorage
                          try {
                            if (newToken) {
                              localStorage.setItem('ecc-admin-token', newToken);
                            } else {
                              localStorage.removeItem('ecc-admin-token');
                            }
                          } catch (err) {
                            console.warn('Failed to save admin token to localStorage:', err);
                          }
                        }}
                        className="ecc-input w-full"
                        data-testid="input-admin-token"
                      />
                      <p className="text-xs text-gray-500">
                        This token is stored locally and used for authenticated API calls
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {activeTab === "monitoring" && (
                <div className="space-y-6">
                  {/* Enhanced DoorLoop Status Card */}
                  <StatusCard
                    title="DoorLoop"
                    status={getDoorLoopStatus()}
                    baseUrl={import.meta.env?.VITE_DOORLOOP_BASE_URL || "Not configured"}
                    authenticated={!!configData?.integrations?.doorloop}
                    healthScore={getEnhancedHealthData().healthScore}
                    rateLimit={getEnhancedHealthData().rateLimit}
                    circuitBreaker={getEnhancedHealthData().circuitBreaker}
                    lastSuccess={healthData?.status?.last_success_at}
                    lastError={healthData?.status?.error}
                    onPing={handlePing}
                    onResetCircuitBreaker={adminToken ? handleResetCircuitBreaker : undefined}
                  />

                  {/* Enhanced Run Panel */}
                  <RunPanel
                    entities={["owners", "properties", "units", "leases", "tenants"]}
                    selectedEntities={selectedEntities}
                    onEntitiesChange={setSelectedEntities}
                    isRunning={syncStatusData?.isRunning || !!healthData?.lock?.locked}
                    currentProgress={getCurrentProgress()}
                    onRun={handleRunSync}
                    onStop={handleStopSync}
                  />

                  {/* Last Run Table */}
                  <RunHistoryBoundary enabled={!!adminToken} query={runsQuery} onRowClick={handleRowClick} />
                </div>
              )}

              {/* Live Logs Tab */}
              {activeTab === "logs" && adminToken && (
                <LiveLogs
                  adminToken={adminToken}
                  autoConnect={true}
                  maxLogs={1000}
                />
              )}

              {/* DLQ Tab */}
              {activeTab === "dlq" && adminToken && (
                <DLQPanel adminToken={adminToken} />
              )}

              {/* Message for tabs requiring admin token */}
              {(activeTab === "logs" || activeTab === "dlq") && !adminToken && (
                <div className="ecc-card">
                  <div className="ecc-card__body">
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="w-8 h-8 mx-auto mb-2" />
                      <p>Admin token required to access {activeTab === "logs" ? "live logs" : "DLQ management"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Rail */}
          <div className="ecc-layout__rail">
            <div className="space-y-6">
              {/* Teams Alert Testing */}
              {adminToken && (
                <div className="ecc-card">
                  <div className="ecc-card__header">
                    <h3 className="ecc-card__title flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5" />
                      <span>Teams Alerts</span>
                    </h3>
                  </div>
                  <div className="ecc-card__body space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Test the Teams integration to ensure alerts are working properly.
                    </p>
                    <div className="ecc-field-row">
                      <span className="ecc-field-label">Status:</span>
                      <span className={`ecc-badge ${
                        configData?.integrations?.teams 
                          ? 'ecc-badge--success' 
                          : 'ecc-badge--warning'
                      }`}>
                        {configData?.integrations?.teams ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                  <div className="ecc-card__footer">
                    <button
                      onClick={handleTestTeamsAlert}
                      disabled={testTeamsAlertMutation.isPending}
                      className="ecc-button ecc-button--primary w-full"
                      data-testid="button-test-teams-alert"
                    >
                      {testTeamsAlertMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Test Alert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Scheduler display — missing/malformed values are Not reported; no invented defaults */}
              {(() => {
                const healthFailed = !!healthError;
                const sched = healthFailed ? null : schedulerDisplay({
                  preferred: syncStatusData?.scheduler ? {
                    enabled: syncStatusData.scheduler.enabled,
                    intervalMinutes: syncStatusData.scheduler.intervalMinutes,
                    nightlyHour: syncStatusData.scheduler.fullSyncHourUTC ?? syncStatusData.scheduler.nightlyFullHourUtc,
                    nextRunAt: syncStatusData.scheduler.nextRun,
                    lastRunAt: syncStatusData.scheduler.lastRun,
                  } : null,
                  fallback: healthData ? {
                    enabled: healthData.enabled,
                    intervalMinutes: healthData.intervalMinutes,
                    nightlyHour: healthData.nightlyFullHourUtc,
                    nextRunAt: healthData.status?.next_run_at,
                  } : null,
                });
                if (!sched) return null;
                return (
              <div className="ecc-card" data-testid="scheduler-panel">
                <div className="ecc-card__header">
                  <h3 className="ecc-card__title flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Scheduler</span>
                  </h3>
                </div>
                <div className="ecc-card__body space-y-3">
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Status:</span>
                    <span className={`ecc-badge ${
                      sched.statusKind === "success" ? "ecc-badge--success"
                        : sched.statusKind === "error" ? "ecc-badge--error"
                        : ""
                    }`} data-testid="scheduler-status">
                      {sched.statusLabel}
                    </span>
                  </div>
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Interval:</span>
                    <span className="ecc-field-value" data-testid="scheduler-interval">
                      {sched.intervalLabel}
                    </span>
                  </div>
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Next Run:</span>
                    <span className="ecc-field-value font-mono text-sm" data-testid="scheduler-next">
                      {sched.nextRunLabel}
                    </span>
                  </div>
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Nightly Full:</span>
                    <span className="ecc-field-value" data-testid="scheduler-nightly">
                      {sched.nightlyLabel}
                    </span>
                  </div>
                  {sched.lastRunLabel && (
                    <div className="ecc-field-row">
                      <span className="ecc-field-label">Last Run:</span>
                      <span className="ecc-field-value text-sm">
                        {sched.lastRunLabel}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ecc-card__footer">
                  <p className="text-sm text-gray-500">
                    Configuration is environment-driven
                  </p>
                </div>
              </div>
                );
              })()}

              {/* Enhanced Configuration */}
              <div className="ecc-card">
                <div className="ecc-card__header">
                  <h3 className="ecc-card__title flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Configuration</span>
                  </h3>
                </div>
                <div className="ecc-card__body space-y-3">
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Base URL:</span>
                    <span className="ecc-field-value font-mono text-xs">
                      {import.meta.env?.VITE_DOORLOOP_BASE_URL?.replace(/\/api$/, '/***') || 'Not set'}
                    </span>
                  </div>
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">API Key:</span>
                    <span className={`ecc-badge ${
                      configData?.integrations?.doorloop 
                        ? 'ecc-badge--success' 
                        : 'ecc-badge--error'
                    }`}>
                      {configData?.integrations?.doorloop ? '***configured***' : 'Missing'}
                    </span>
                  </div>
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Entities:</span>
                    <span className="ecc-field-value text-sm">
                      {syncStatusData?.entities?.join(', ') ?? healthData?.entities?.join(', ') ?? 'All'}
                    </span>
                  </div>
                  {syncStatusData?.version && (
                    <div className="ecc-field-row">
                      <span className="ecc-field-label">API Version:</span>
                      <span className="ecc-field-value font-mono text-sm">
                        {syncStatusData.version}
                      </span>
                    </div>
                  )}
                </div>
                {!configData?.integrations?.doorloop && (
                  <div className="ecc-card__footer">
                    <div className="ecc-banner ecc-banner--warning">
                      ⚠️ DOORLOOP_API_KEY environment variable is missing
                    </div>
                  </div>
                )}
              </div>

              {/* Circuit Breaker Controls */}
              {adminToken && getEnhancedHealthData().circuitBreaker && (
                <div className="ecc-card">
                  <div className="ecc-card__header">
                    <h3 className="ecc-card__title flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Circuit Breaker</span>
                    </h3>
                  </div>
                  <div className="ecc-card__body space-y-3">
                    <div className="ecc-field-row">
                      <span className="ecc-field-label">Status:</span>
                      <span className={`ecc-badge ${
                        getEnhancedHealthData().circuitBreaker?.isOpen 
                          ? 'ecc-badge--error' 
                          : 'ecc-badge--success'
                      }`}>
                        {getEnhancedHealthData().circuitBreaker?.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    {getEnhancedHealthData().circuitBreaker?.failures > 0 && (
                      <div className="ecc-field-row">
                        <span className="ecc-field-label">Failures:</span>
                        <span className="ecc-field-value">
                          {getEnhancedHealthData().circuitBreaker.failures}
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      The circuit breaker protects against cascading failures by temporarily stopping requests after repeated errors.
                    </p>
                  </div>
                  {getEnhancedHealthData().circuitBreaker?.isOpen && (
                    <div className="ecc-card__footer">
                      <button
                        onClick={handleResetCircuitBreaker}
                        disabled={resetCircuitBreakerMutation.isPending}
                        className="ecc-button ecc-button--warning w-full"
                        data-testid="button-reset-circuit-breaker-manual"
                      >
                        {resetCircuitBreakerMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          'Force Reset'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Pane */}
      <ErrorPane
        isOpen={isErrorPaneOpen && currentHistory !== null && selectedHistorySource === runsQuery.data}
        onClose={() => setIsErrorPaneOpen(false)}
        runDetails={currentHistory !== null && selectedHistorySource === runsQuery.data ? selectedRun : null}
      />
    </div>
  );
}