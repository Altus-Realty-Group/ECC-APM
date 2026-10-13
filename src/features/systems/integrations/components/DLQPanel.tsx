import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RotateCcw, Trash2, AlertTriangle, Filter, RefreshCw, Clock, Hash, FileX } from "lucide-react";
import { useShowToast } from "@/features/systems/integrations/useShowToast";

interface DLQItem {
  id: string;
  entity: string;
  data: any;
  error: string;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  runId?: string;
  originalOperation: string;
}

interface DLQPanelProps {
  adminToken: string;
}

export default function DLQPanel({ adminToken }: DLQPanelProps) {
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());
  const { showToast } = useShowToast();

  // Fetch DLQ items
  const { data: dlqData, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/sync/dlq'],
    queryFn: async () => {
      if (!adminToken) return { items: [], count: 0 };
      
      return apiRequest('/api/admin/sync/dlq', {
        headers: {
          'X-Admin-Token': adminToken,
        },
      });
    },
    enabled: !!adminToken,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Requeue single item mutation
  const requeueMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest(`/api/admin/sync/dlq/${itemId}/requeue`, {
        method: 'POST',
        headers: {
          'X-Admin-Token': adminToken,
        },
      });
    },
    onSuccess: (_, itemId) => {
      showToast({
        title: "Item requeued",
        description: "The failed item has been requeued for processing",
        variant: "success",
      });
      refetch();
    },
    onError: (error: Error) => {
      showToast({
        title: "Requeue failed",
        description: error.message,
        variant: "error",
      });
    },
  });

  // Delete single item mutation
  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest(`/api/admin/sync/dlq/${itemId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Token': adminToken,
        },
      });
    },
    onSuccess: (_, itemId) => {
      showToast({
        title: "Item deleted",
        description: "The failed item has been removed from the queue",
        variant: "success",
      });
      refetch();
    },
    onError: (error: Error) => {
      showToast({
        title: "Delete failed",
        description: error.message,
        variant: "error",
      });
    },
  });

  // Clear all DLQ items mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/sync/dlq/clear', {
        method: 'POST',
        headers: {
          'X-Admin-Token': adminToken,
        },
      });
    },
    onSuccess: () => {
      showToast({
        title: "DLQ cleared",
        description: "All failed items have been removed from the queue",
        variant: "success",
      });
      refetch();
    },
    onError: (error: Error) => {
      showToast({
        title: "Clear failed",
        description: error.message,
        variant: "error",
      });
    },
  });

  // Requeue all items mutation
  const requeueAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/sync/dlq/requeue-all', {
        method: 'POST',
        headers: {
          'X-Admin-Token': adminToken,
        },
      });
    },
    onSuccess: (data) => {
      showToast({
        title: "All items requeued",
        description: `${data.count} items have been requeued for processing`,
        variant: "success",
      });
      refetch();
    },
    onError: (error: Error) => {
      showToast({
        title: "Requeue all failed",
        description: error.message,
        variant: "error",
      });
    },
  });

  const filteredItems = dlqData?.items?.filter((item: DLQItem) => 
    !selectedEntity || item.entity === selectedEntity
  ) || [];

  const entityCounts: Record<string, number> = dlqData?.items?.reduce((acc: Record<string, number>, item: DLQItem) => {
    acc[item.entity] = (acc[item.entity] || 0) + 1;
    return acc;
  }, {}) || {};

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const toggleDetails = (itemId: string) => {
    const newShowDetails = new Set(showDetails);
    if (newShowDetails.has(itemId)) {
      newShowDetails.delete(itemId);
    } else {
      newShowDetails.add(itemId);
    }
    setShowDetails(newShowDetails);
  };

  const getRetryBadgeColor = (retryCount: number, maxRetries: number) => {
    const ratio = retryCount / maxRetries;
    if (ratio < 0.5) return 'ecc-badge--warning';
    if (ratio < 1) return 'ecc-badge--error';
    return 'ecc-badge--error';
  };

  if (!adminToken) {
    return (
      <div className="ecc-card">
        <div className="ecc-card__body">
          <div className="text-center py-8 text-gray-500">
            <FileX className="w-8 h-8 mx-auto mb-2" />
            <p>Admin token required to view DLQ items</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ecc-card">
      <div className="ecc-card__header">
        <div className="flex items-center justify-between">
          <h3 className="ecc-card__title flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Dead Letter Queue</span>
            {dlqData?.count > 0 && (
              <span className="ecc-badge ecc-badge--error">
                {dlqData.count}
              </span>
            )}
          </h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="ecc-button ecc-button--ghost p-1"
              data-testid="button-refresh-dlq"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <div className="flex items-center space-x-1">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="ecc-input text-sm"
                data-testid="select-dlq-entity-filter"
              >
                <option value="">All Entities ({dlqData?.count || 0})</option>
                {Object.entries(entityCounts).map(([entity, count]) => (
                  <option key={entity} value={entity}>
                    {entity} ({count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="ecc-card__body">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
            <p className="text-gray-500">Loading DLQ items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {dlqData?.count === 0 ? (
              <>
                <FileX className="w-8 h-8 mx-auto mb-2" />
                <p>No failed items in queue</p>
                <p className="text-sm">All syncs are processing successfully!</p>
              </>
            ) : (
              <>
                <Filter className="w-8 h-8 mx-auto mb-2" />
                <p>No items match the selected filter</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item: DLQItem) => (
              <div key={item.id} className="border rounded-lg p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="ecc-badge ecc-badge--secondary capitalize">
                        {item.entity}
                      </span>
                      <span className={`ecc-badge ${getRetryBadgeColor(item.retryCount, item.maxRetries)}`}>
                        Retry {item.retryCount}/{item.maxRetries}
                      </span>
                      {item.runId && (
                        <span className="text-xs text-gray-500 font-mono">
                          Run: {item.runId.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="ecc-field-row">
                        <span className="ecc-field-label">Operation:</span>
                        <span className="ecc-field-value font-mono">{item.originalOperation}</span>
                      </div>
                      <div className="ecc-field-row">
                        <span className="ecc-field-label">Error:</span>
                        <span className="ecc-field-value text-red-600 dark:text-red-400">
                          {item.error}
                        </span>
                      </div>
                      <div className="ecc-field-row">
                        <span className="ecc-field-label">Time:</span>
                        <span className="ecc-field-value">
                          {formatTimestamp(item.timestamp)} ({formatTimeAgo(item.timestamp)})
                        </span>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {item.data && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleDetails(item.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          data-testid={`button-toggle-details-${item.id}`}
                        >
                          {showDetails.has(item.id) ? 'Hide Details' : 'Show Details'}
                        </button>
                        
                        {showDetails.has(item.id) && (
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto max-h-32">
                            {JSON.stringify(item.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => requeueMutation.mutate(item.id)}
                      disabled={requeueMutation.isPending}
                      className="ecc-button ecc-button--secondary text-xs p-2"
                      data-testid={`button-requeue-${item.id}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="ecc-button ecc-button--ghost text-red-600 hover:text-red-700 text-xs p-2"
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with bulk actions */}
      {filteredItems.length > 0 && (
        <div className="ecc-card__footer">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredItems.length} items {selectedEntity && `in ${selectedEntity}`}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => requeueAllMutation.mutate()}
                disabled={requeueAllMutation.isPending}
                className="ecc-button ecc-button--secondary"
                data-testid="button-requeue-all"
              >
                {requeueAllMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Requeue All
              </button>
              
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete all ${filteredItems.length} items? This cannot be undone.`)) {
                    clearAllMutation.mutate();
                  }
                }}
                disabled={clearAllMutation.isPending}
                className="ecc-button ecc-button--error"
                data-testid="button-clear-all"
              >
                {clearAllMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}