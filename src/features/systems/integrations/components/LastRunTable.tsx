import { useState } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

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
  fullDetails?: any;
}

interface LastRunTableProps {
  runs: SyncRun[];
  onRowClick: (run: SyncRun) => void;
}

const ResultIcon = ({ result }: { result: SyncRun['result'] }) => {
  const config = {
    success: { icon: CheckCircle, className: "text-green-500" },
    error: { icon: XCircle, className: "text-red-500" },
    warning: { icon: AlertCircle, className: "text-yellow-500" },
  };
  
  const { icon: Icon, className } = config[result];
  return <Icon className={`w-4 h-4 ${className}`} />;
};

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

export default function LastRunTable({ runs, onRowClick }: LastRunTableProps) {
  return (
    <div className="ecc-card">
      <div className="ecc-card__header">
        <h3 className="ecc-card__title">Reported completion history</h3>
      </div>
      
      <div className="ecc-card__body">
        <p>Audit history records reported outcomes; it does not verify persisted operating records.</p>
        {runs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">No completion history was returned.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ecc-table w-full">
              <thead>
                <tr>
                  <th className="ecc-table__header">Time</th>
                  <th className="ecc-table__header">Entity</th>
                  <th className="ecc-table__header">Mode</th>
                  <th className="ecc-table__header">Reported rows</th>
                  <th className="ecc-table__header">Duration</th>
                  <th className="ecc-table__header">Reported outcome</th>
                  <th className="ecc-table__header">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="ecc-table__row cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => onRowClick(run)}
                    data-testid={`row-sync-run-${run.id}`}
                  >
                    <td className="ecc-table__cell">
                      <span className="text-sm font-mono">
                        {formatTimestamp(run.timestamp)}
                      </span>
                    </td>
                    <td className="ecc-table__cell">
                      <span className="ecc-badge ecc-badge--secondary capitalize">
                        {run.entity}
                      </span>
                    </td>
                    <td className="ecc-table__cell">
                      <span className={`ecc-badge ${
                        run.mode === 'backfill' 
                          ? 'ecc-badge--warning' 
                          : 'ecc-badge--info'
                      }`}>
                        {run.dryRun ? `Read-only preview · ${run.mode}` : run.mode}
                      </span>
                    </td>
                    <td className="ecc-table__cell">
                      <span className="font-mono text-sm">
                        {run.rows.toLocaleString()}
                      </span>
                    </td>
                    <td className="ecc-table__cell">
                      <span className="font-mono text-sm">
                        {formatDuration(run.duration)}
                      </span>
                    </td>
                    <td className="ecc-table__cell">
                      <div className="flex items-center space-x-1">
                        <ResultIcon result={run.result} />
                        <span className="capitalize">{run.dryRun ? (run.result === "error" ? "Preview failed" : "Preview completed") : run.result}</span>
                      </div>
                    </td>
                    <td className="ecc-table__cell">
                      {run.error ? (
                        <span className="text-red-400 text-sm truncate max-w-xs">
                          {run.error}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}