import React, { useState } from 'react';
import { useOwnerTransfer } from '../hooks/useOwnerTransfer';

interface DryRunChange {
  property_id: number;
  property_name: string;
  address: string;
  city: string;
  state: string;
  from_owner: number;
  to_owner: number;
}

interface DryRunResult {
  transfer_id: number;
  changes: DryRunChange[];
  summary: { count: number };
}

interface TransferDryRunProps {
  transferId: number | null;
}

export default function TransferDryRun({ transferId }: TransferDryRunProps) {
  const transferHook = useOwnerTransfer();
  const [result, setResult] = useState<DryRunResult | null>(null);

  async function runDryRun() {
    if (!transferId) return;
    
    const dryRunResult = await transferHook.runDryRun(transferId);
    if (dryRunResult) {
      setResult(dryRunResult);
    }
  }

  function downloadCSV() {
    if (!transferId) return;
    window.open(`/api/owner-transfer/${transferId}/accounting.csv`, '_blank');
  }

  function viewHTMLReport() {
    if (!transferId) return;
    window.open(`/api/owner-transfer/${transferId}/report.html`, '_blank');
  }

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-neutral-100">Dry Run Preview</h3>
        <div className="flex gap-2">
          <button
            onClick={runDryRun}
            disabled={transferHook.loading || !transferId}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 text-green-300 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="run-dry-run-btn"
          >
            {transferHook.loading ? 'Running...' : 'Preview Changes'}
          </button>
          {result && (
            <>
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
                data-testid="download-csv-btn"
              >
                CSV Export
              </button>
              <button
                onClick={viewHTMLReport}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                data-testid="view-html-report-btn"
              >
                HTML Report
              </button>
            </>
          )}
        </div>
      </div>

      {transferHook.error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm">
          {transferHook.error}
        </div>
      )}

      {result ? (
        <div className="space-y-4">
          <div className="bg-neutral-800 border border-neutral-700 rounded p-3">
            <div className="text-sm font-medium text-neutral-200 mb-2">Summary</div>
            <div className="text-sm text-neutral-400">
              This transfer will change ownership for <span className="text-green-400 font-medium">{result.summary.count}</span> properties
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-800 border-b border-neutral-700">
                <tr>
                  <th className="text-left p-2 text-neutral-300">Property</th>
                  <th className="text-left p-2 text-neutral-300">Address</th>
                  <th className="text-left p-2 text-neutral-300">Location</th>
                  <th className="text-left p-2 text-neutral-300">Owner Change</th>
                </tr>
              </thead>
              <tbody>
                {result.changes.map((change, index) => (
                  <tr 
                    key={change.property_id}
                    className={`border-b border-neutral-800 hover:bg-neutral-850 ${
                      index % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-875'
                    }`}
                  >
                    <td className="p-2">
                      <div className="text-neutral-200">{change.property_name || `#${change.property_id}`}</div>
                      <div className="text-xs text-neutral-500">ID: {change.property_id}</div>
                    </td>
                    <td className="p-2 text-neutral-300">
                      {change.address}
                    </td>
                    <td className="p-2 text-neutral-300">
                      {change.city}, {change.state}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">{change.from_owner}</span>
                        <span className="text-neutral-500">→</span>
                        <span className="text-green-400">{change.to_owner}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-neutral-400 text-sm text-center py-8">
          {transferHook.loading ? 'Generating preview...' : 'Click "Preview Changes" to see what will be modified'}
        </div>
      )}
    </div>
  );
}