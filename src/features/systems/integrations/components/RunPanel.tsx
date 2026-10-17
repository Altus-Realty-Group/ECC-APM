import { useState } from "react";
import { Play, Square, RefreshCw, Database, TestTube, Calendar, BarChart3, Clock, Activity } from "lucide-react";

interface ProgressInfo {
  entity: string;
  page: number;
  rows: number;
  totalPages?: number;
  completedPages?: number;
  rps?: number; // Rows per second
  eta?: number; // Estimated time to completion in milliseconds
  startTime?: number;
}

interface RunOptions {
  mode: "delta" | "backfill";
  dryRun?: boolean;
  since?: string; // ISO string for delta mode
}

interface RunPanelProps {
  entities: string[];
  selectedEntities: string[];
  onEntitiesChange: (entities: string[]) => void;
  isRunning: boolean;
  currentProgress?: ProgressInfo;
  onRun: (options: RunOptions) => Promise<void>;
  onStop: () => Promise<void>;
}

// Utility functions
const formatETA = (etaMs: number) => {
  if (etaMs < 60000) return `${Math.ceil(etaMs / 1000)}s`;
  if (etaMs < 3600000) return `${Math.ceil(etaMs / 60000)}m`;
  return `${Math.ceil(etaMs / 3600000)}h`;
};

const formatRPS = (rps: number) => {
  if (rps < 1) return `${(rps * 1000).toFixed(0)} rows/s`;
  if (rps < 1000) return `${rps.toFixed(1)} rows/s`;
  return `${(rps / 1000).toFixed(1)}k rows/s`;
};

const getDefaultSinceDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 16); // Format for datetime-local input
};

export default function RunPanel({
  entities,
  selectedEntities,
  onEntitiesChange,
  isRunning,
  currentProgress,
  onRun,
  onStop,
}: RunPanelProps) {
  const [mode, setMode] = useState<"delta" | "backfill">("delta");
  const [dryRun, setDryRun] = useState(false);
  const [sinceDate, setSinceDate] = useState(getDefaultSinceDate());
  const [running, setRunning] = useState(false);

  const handleToggleEntity = (entity: string) => {
    if (selectedEntities.includes(entity)) {
      onEntitiesChange(selectedEntities.filter(e => e !== entity));
    } else {
      onEntitiesChange([...selectedEntities, entity]);
    }
  };

  const handleRun = async () => {
    if (dryRun !== true) return;
    if (selectedEntities.length === 0) return;
    
    setRunning(true);
    try {
      const options: RunOptions = {
        mode,
        dryRun,
        since: mode === "delta" ? new Date(sinceDate).toISOString() : undefined
      };
      await onRun(options);
    } finally {
      setRunning(false);
    }
  };

  const getProgressPercentage = () => {
    if (!currentProgress?.totalPages || !currentProgress?.completedPages) return 0;
    return Math.round((currentProgress.completedPages / currentProgress.totalPages) * 100);
  };

  const handleStop = async () => {
    setRunning(true);
    try {
      await onStop();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="ecc-card">
      <div className="ecc-card__header">
        <h3 className="ecc-card__title">Read-only provider preview</h3>
      </div>
      
      <div className="ecc-card__body space-y-4">
        <p>Live sync is unavailable. Select the read-only preview option to inspect provider records without writing operating records.</p>
        {/* Entity Selection */}
        <div>
          <label className="ecc-field-label mb-2 block">Entities:</label>
          <div className="space-y-2">
            {entities.map(entity => (
              <label key={entity} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedEntities.includes(entity)}
                  onChange={() => handleToggleEntity(entity)}
                  className="ecc-checkbox"
                  data-testid={`checkbox-entity-${entity}`}
                />
                <span className="ecc-field-value capitalize">{entity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mode Selection */}
        <div>
          <label className="ecc-field-label mb-2 block">Mode:</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="mode"
                value="delta"
                checked={mode === "delta"}
                onChange={(e) => setMode(e.target.value as "delta")}
                className="ecc-radio"
                data-testid="radio-mode-delta"
              />
              <span className="ecc-field-value">Delta (Recent changes)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="mode"
                value="backfill"
                checked={mode === "backfill"}
                onChange={(e) => setMode(e.target.value as "backfill")}
                className="ecc-radio"
                data-testid="radio-mode-backfill"
              />
              <span className="ecc-field-value">Backfill (All data)</span>
            </label>
          </div>
        </div>

        {/* Since Date Picker for Delta Mode */}
        {mode === "delta" && (
          <div>
            <label className="ecc-field-label mb-2 block flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Since Date (UTC):</span>
            </label>
            <input
              type="datetime-local"
              value={sinceDate}
              onChange={(e) => setSinceDate(e.target.value)}
              className="ecc-input w-full"
              data-testid="input-since-date"
            />
            <p className="text-xs text-gray-500 mt-1">
              Only sync records modified after this date/time
            </p>
          </div>
        )}

        {/* Dry Run Mode Toggle */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="ecc-checkbox"
              data-testid="checkbox-dry-run"
            />
            <span className="ecc-field-label flex items-center space-x-1">
              <TestTube className="w-4 h-4" />
              <span>Read-only provider preview (explicit opt-in)</span>
            </span>
          </label>
          {dryRun && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              This reads actual provider records. It does not write operating records.
            </p>
          )}
        </div>

        {/* Enhanced Progress Display */}
        {(isRunning || currentProgress) && (
          <div className="ecc-card p-4 bg-blue-50 dark:bg-blue-950">
            <div className="space-y-3">
              {/* Status and Entity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span className="ecc-field-label">Status:</span>
                  <span className={`ecc-badge ${isRunning ? 'ecc-badge--info' : 'ecc-badge--secondary'}`}>
                    {isRunning ? (dryRun ? 'Dry Run' : 'Running') : 'Idle'}
                  </span>
                </div>
                
                {currentProgress && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="capitalize font-medium">{currentProgress.entity}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {currentProgress?.totalPages && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="ecc-field-label">Progress:</span>
                    <span className="font-mono text-xs">
                      {currentProgress.completedPages || 0}/{currentProgress.totalPages} pages
                      ({getProgressPercentage()}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Detailed Progress Info */}
              {currentProgress && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Current Page:</span>
                    <span className="ecc-field-value font-mono">{currentProgress.page.toLocaleString()}</span>
                  </div>
                  <div className="ecc-field-row">
                    <span className="ecc-field-label">Rows Processed:</span>
                    <span className="ecc-field-value font-mono">{currentProgress.rows.toLocaleString()}</span>
                  </div>

                  {/* RPS Display */}
                  {currentProgress.rps && (
                    <div className="ecc-field-row">
                      <span className="ecc-field-label flex items-center space-x-1">
                        <BarChart3 className="w-3 h-3" />
                        <span>Rate:</span>
                      </span>
                      <span className="ecc-field-value font-mono text-green-600 dark:text-green-400">
                        {formatRPS(currentProgress.rps)}
                      </span>
                    </div>
                  )}

                  {/* ETA Display */}
                  {currentProgress.eta && (
                    <div className="ecc-field-row">
                      <span className="ecc-field-label flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>ETA:</span>
                      </span>
                      <span className="ecc-field-value font-mono text-blue-600 dark:text-blue-400">
                        {formatETA(currentProgress.eta)}
                      </span>
                    </div>
                  )}

                  {/* Runtime Display */}
                  {currentProgress.startTime && (
                    <div className="ecc-field-row col-span-2">
                      <span className="ecc-field-label">Runtime:</span>
                      <span className="ecc-field-value font-mono">
                        {formatETA(Date.now() - currentProgress.startTime)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ecc-card__footer">
        <div className="flex space-x-2">
          <button
            className="ecc-button ecc-button--primary"
            onClick={handleRun}
            disabled={running || selectedEntities.length === 0 || dryRun !== true}
            data-testid="button-run-sync"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                {mode === "delta" ? <Play className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                Run read-only preview
              </>
            )}
          </button>
          
          {isRunning && (
            <button
              className="ecc-button ecc-button--error"
              onClick={handleStop}
              disabled
              title="Stopping a preview from this screen is unavailable."
              data-testid="button-stop-sync"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}