import React from 'react';
import StateNotice from '@/components/ui/StateNotice';
import { errorKind } from '@/lib/dataState';
import LastRunTable from './LastRunTable';
import { readyHistoryRows, type HistoryQuery, type SyncHistoryRun } from '../syncHistory';
export default function RunHistoryBoundary({
  enabled,
  query,
  onRowClick,
}: {
  enabled: boolean;
  query: HistoryQuery;
  onRowClick: (run: SyncHistoryRun) => void;
}) {
  const rows = readyHistoryRows(query, enabled);
  if (rows) return <LastRunTable runs={rows} onRowClick={onRowClick} />;
  const failed =
    query.isError || !!query.error || (query.isSuccess && !query.isFetching && !query.isPending);
  const loading = enabled && !failed && (query.isPending || query.isFetching);
  return (
    <section aria-label="Completion history">
      <StateNotice
        kind={
          !enabled
            ? 'partial'
            : failed
              ? errorKind(query.error) === 'denied'
                ? 'denied'
                : 'error'
              : loading
                ? 'loading'
                : 'partial'
        }
        title={
          !enabled
            ? 'Completion history is unavailable.'
            : failed
              ? 'Completion history could not be loaded.'
              : loading
                ? 'Loading completion history...'
                : 'Completion history has not been confirmed.'
        }
        detail="No previous history is shown until the current access-scoped read succeeds."
        onRetry={
          enabled && !loading
            ? () => {
                void query.refetch();
              }
            : undefined
        }
      />
    </section>
  );
}
