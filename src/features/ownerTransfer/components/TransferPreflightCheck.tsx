import React, { useState, useEffect } from 'react';
import { useOwnerTransfer } from '../hooks/useOwnerTransfer';

interface PreflightCheck {
  level: 'blocker' | 'warning' | 'info';
  message: string;
}

interface TransferPreflightCheckProps {
  transferId: number | null;
  onCheckComplete?: (hasBlockers: boolean, checks: PreflightCheck[]) => void;
}

export default function TransferPreflightCheck({ transferId, onCheckComplete }: TransferPreflightCheckProps) {
  const transferHook = useOwnerTransfer();
  const [checks, setChecks] = useState<PreflightCheck[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (transferId) {
      runPreflightCheck();
    }
  }, [transferId]);

  async function runPreflightCheck() {
    if (!transferId) return;
    
    const result = await transferHook.runPreflightCheck(transferId);
    if (result) {
      const checkResults = result.checks || [];
      setChecks(checkResults);
      setLastChecked(new Date());
      
      const hasBlockers = checkResults.some((check: PreflightCheck) => check.level === 'blocker');
      onCheckComplete?.(hasBlockers, checkResults);
    }
  }

  function getCheckIcon(level: string) {
    switch (level) {
      case 'blocker': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  }

  function getCheckColor(level: string) {
    switch (level) {
      case 'blocker': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-neutral-400';
    }
  }

  const hasBlockers = checks.some(check => check.level === 'blocker');
  const hasWarnings = checks.some(check => check.level === 'warning');

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-neutral-100">Preflight Checks</h3>
        <button
          onClick={runPreflightCheck}
          disabled={transferHook.loading || !transferId}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="run-preflight-check-btn"
        >
          {transferHook.loading ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {lastChecked && (
        <div className="text-xs text-neutral-500 mb-3">
          Last checked: {lastChecked.toLocaleString()}
        </div>
      )}

      {checks.length > 0 ? (
        <div className="space-y-2">
          {checks.map((check, index) => (
            <div 
              key={index}
              className={`flex items-start gap-2 p-2 rounded ${
                check.level === 'blocker' ? 'bg-red-900/20 border border-red-800' :
                check.level === 'warning' ? 'bg-yellow-900/20 border border-yellow-800' :
                'bg-blue-900/20 border border-blue-800'
              }`}
            >
              <span className="text-sm mt-0.5">{getCheckIcon(check.level)}</span>
              <span className={`text-sm ${getCheckColor(check.level)}`}>
                {check.message}
              </span>
            </div>
          ))}
          
          <div className="mt-4 p-3 rounded bg-neutral-800 border border-neutral-700">
            <div className="text-sm font-medium text-neutral-200 mb-1">
              Check Summary
            </div>
            <div className="text-xs text-neutral-400">
              {hasBlockers && (
                <div className="text-red-400">❌ Cannot proceed - blockers detected</div>
              )}
              {!hasBlockers && hasWarnings && (
                <div className="text-yellow-400">⚠️ Proceed with caution - warnings present</div>
              )}
              {!hasBlockers && !hasWarnings && (
                <div className="text-green-400">✅ All checks passed</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-neutral-400 text-sm text-center py-4">
          {transferHook.loading ? 'Running preflight checks...' : 'Click "Run Check" to validate transfer'}
        </div>
      )}
    </div>
  );
}