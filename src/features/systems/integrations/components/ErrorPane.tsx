import { X, AlertCircle, Clock, Database } from "lucide-react";

interface ErrorPaneProps {
  isOpen: boolean;
  onClose: () => void;
  runDetails: {
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
    responseBody?: string;
    fullDetails?: any;
  } | null;
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export default function ErrorPane({ isOpen, onClose, runDetails }: ErrorPaneProps) {
  if (!isOpen || !runDetails) return null;

  return (
    <section className="ecc-object" role="region" aria-label="Integration Error Details">
      <div className="ecc-header">
        <div>
          <div className="ecc-title">Sync Run Details</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatTimestamp(runDetails.timestamp)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close sync run details"
          onClick={onClose}
          className="ecc-btn"
          style={{ padding: "8px 12px" }}
          data-testid="button-close-error-pane"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <p>Audit history records reported outcomes; it does not verify persisted operating records.</p>
        {/* Summary */}
        <div className="ecc-object">
          <div className="ecc-header">
            <h3 className="ecc-title">Summary</h3>
          </div>
          <div className="ecc-card__body space-y-3">
            <div className="ecc-field-row">
              <span className="ecc-label">Entity:</span>
              <span className="ecc-badge ecc-badge--secondary capitalize">
                {runDetails.entity}
              </span>
            </div>
            <div className="ecc-field-row">
              <span className="ecc-label">Mode:</span>
              <span className={`ecc-badge ${
                runDetails.mode === 'backfill' 
                  ? 'ecc-badge--warning' 
                  : 'ecc-badge--info'
              }`}>
                {runDetails.mode}
              </span>
            </div>
            <div className="ecc-field-row">
              <span className="ecc-label">Reported rows:</span>
              <span className="ecc-field-value font-mono">
                {runDetails.rows.toLocaleString()}
              </span>
            </div>
            <div className="ecc-field-row">
              <span className="ecc-label">Duration:</span>
              <span className="ecc-field-value font-mono">
                {formatDuration(runDetails.duration)}
              </span>
            </div>
            <div className="ecc-field-row">
              <span className="ecc-label">Reported outcome:</span>
              <span className={`ecc-badge ${
                runDetails.result === 'success' ? 'ecc-badge--success' :
                runDetails.result === 'error' ? 'ecc-badge--error' :
                'ecc-badge--warning'
              }`}>
                {runDetails.dryRun ? (runDetails.result === "error" ? "Preview failed" : "Preview completed") : runDetails.result}
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {runDetails.error && (
          <div className="ecc-object">
            <div className="ecc-header">
              <h3 className="ecc-title flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span>Error Summary</span>
              </h3>
            </div>
            <div className="ecc-card__body">
        <p>Audit history records reported outcomes; it does not verify persisted operating records.</p>
              <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono bg-red-50 dark:bg-red-950 p-3 rounded">
                {runDetails.error}
              </pre>
            </div>
          </div>
        )}

        {/* Full Error Message */}
        {runDetails.fullMessage && runDetails.fullMessage !== runDetails.error && (
          <div className="ecc-object">
            <div className="ecc-header">
              <h3 className="ecc-title">Full Error Message</h3>
            </div>
            <div className="ecc-card__body">
        <p>Audit history records reported outcomes; it does not verify persisted operating records.</p>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded max-h-64 overflow-y-auto">
                {runDetails.fullMessage}
              </pre>
            </div>
          </div>
        )}

        {/* Response Body */}
        {runDetails.responseBody && (
          <div className="ecc-object">
            <div className="ecc-header">
              <h3 className="ecc-title">Response Body (First 2KB)</h3>
            </div>
            <div className="ecc-card__body">
        <p>Audit history records reported outcomes; it does not verify persisted operating records.</p>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded max-h-64 overflow-y-auto">
                {runDetails.responseBody}
              </pre>
            </div>
          </div>
        )}

        {/* Full Details */}
        {runDetails.fullDetails && (
          <div className="ecc-object">
            <div className="ecc-header">
              <h3 className="ecc-title">Raw Details</h3>
            </div>
            <div className="ecc-card__body">
        <p>Audit history records reported outcomes; it does not verify persisted operating records.</p>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800 p-3 rounded max-h-96 overflow-y-auto">
                {JSON.stringify(runDetails.fullDetails, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}