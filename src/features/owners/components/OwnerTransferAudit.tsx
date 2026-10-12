import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import { fetchJSON } from "@/lib/http";

interface IntegrationsConfig {
  ok?: boolean;
  integrations?: { admin?: { available?: boolean } };
}

interface OwnerTransferAuditProps {
  ownerId: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  status: "pending" | "approved" | "authorized" | "executed" | "failed";
}

export default function OwnerTransferAudit({ ownerId }: OwnerTransferAuditProps) {
  // Feature flag check for admin access
  const { data: config } = useQuery({
    queryKey: ["/api/config/integrations"],
    queryFn: ({ signal }) => fetchJSON<IntegrationsConfig>("/api/config/integrations", { signal }),
  });

  const adminEnabled = config?.ok && config?.integrations?.admin?.available;
  // Admin token removed for security - server handles authentication
  const hasAdminToken = false; // Removed for security - server handles authentication

  // Fetch audit trail for this owner with polling every 5 seconds
  const { data: auditData, isLoading } = useQuery({
    queryKey: ["/api/audit/ownerTransfer", ownerId],
    queryFn: () => api(`/api/audit/ownerTransfer?id=${encodeURIComponent(ownerId)}`),
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: adminEnabled,
  });

  // Use real audit data with proper empty state handling
  const auditEntries = auditData?.entries || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": 
        return { bg: "var(--brand-amber, #ffd479)", border: "var(--brand-amber, #ffd479)", text: "var(--brand-amber, #ffd479)", opacity: "0.1" };
      case "approved": 
        return { bg: "var(--brand-green, #64d2a3)", border: "var(--brand-green, #64d2a3)", text: "var(--brand-green, #64d2a3)", opacity: "0.1" };
      case "authorized": 
        return { bg: "var(--brand-blue, #8fb7ff)", border: "var(--brand-blue, #8fb7ff)", text: "var(--brand-blue, #8fb7ff)", opacity: "0.1" };
      case "executed": 
        return { bg: "var(--brand-green, #64d2a3)", border: "var(--brand-green, #64d2a3)", text: "var(--brand-green, #64d2a3)", opacity: "1" };
      case "failed": 
        return { bg: "var(--brand-red, #f16a6a)", border: "var(--brand-red, #f16a6a)", text: "var(--brand-red, #f16a6a)", opacity: "0.1" };
      default: 
        return { bg: "var(--bg-tertiary, #151821)", border: "var(--border-secondary, #232837)", text: "var(--text-muted, #8891a3)", opacity: "1" };
    }
  };

  return (
    <div className="owner-transfer-audit">
      <div className="bg-[var(--ecc-gray-850,#f8f9fa)] border border-[var(--ecc-gray-700,#dee2e6)]" style={{
        borderRadius: "var(--radius-lg, 12px)",
        padding: "var(--space-2xl, 24px)",
        height: "fit-content"
      }}>
        <h3 style={{
          color: "var(--brand-gold, #f2c86a)",
          fontSize: "var(--font-size-xl, 18px)",
          fontWeight: "var(--font-weight-semibold, 600)",
          marginBottom: "var(--space-lg, 16px)"
        }}>
          Transfer Audit Trail
        </h3>
        
        {!adminEnabled && (
          <div style={{
            backgroundColor: "var(--brand-amber, #ffd479)",
            border: "1px solid var(--brand-amber, #ffd479)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "var(--space-md, 12px)",
            marginBottom: "var(--space-lg, 16px)",
            opacity: "0.1"
          }} data-testid="warning-admin-not-enabled">
            <p style={{ color: "var(--brand-amber, #ffd479)", fontSize: "var(--font-size-sm, 14px)", margin: 0 }}>
              Admin features not enabled
            </p>
          </div>
        )}

        {!hasAdminToken && (
          <div style={{
            backgroundColor: "var(--brand-red, #f16a6a)",
            border: "1px solid var(--brand-red, #f16a6a)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "var(--space-md, 12px)",
            marginBottom: "var(--space-lg, 16px)",
            opacity: "0.1"
          }} data-testid="warning-admin-token-missing">
            <p style={{ color: "var(--brand-red, #f16a6a)", fontSize: "var(--font-size-sm, 14px)", margin: 0 }}>
              Admin token required for audit access
            </p>
          </div>
        )}
        
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md, 12px)" }} data-testid="loading-skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: "60px",
                backgroundColor: "var(--bg-tertiary, #151821)",
                borderRadius: "var(--radius-md, 8px)",
                opacity: "0.3"
              }}></div>
            ))}
          </div>
        ) : auditEntries.length > 0 ? (
          <div style={{
            maxHeight: "500px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-md, 12px)"
          }} data-testid="audit-entries">
            {auditEntries.map((entry) => {
              const statusStyle = getStatusColor(entry.status);
              
              return (
                <div 
                  key={entry.id} 
                  style={{
                    backgroundColor: "var(--bg-primary, #0b0c0f)",
                    border: "1px solid var(--border-primary, #1b1f28)",
                    borderLeft: `3px solid var(--brand-gold, #f2c86a)`,
                    borderRadius: "var(--radius-md, 8px)",
                    padding: "var(--space-lg, 16px)"
                  }}
                  data-testid={`audit-entry-${entry.id}`}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "var(--space-sm, 8px)"
                  }}>
                    <h4 style={{
                      color: "var(--text-primary, #f7f8fb)",
                      fontSize: "var(--font-size-sm, 14px)",
                      fontWeight: "var(--font-weight-semibold, 600)",
                      margin: 0
                    }}>
                      {entry.action}
                    </h4>
                    <span style={{
                      backgroundColor: statusStyle.bg,
                      border: `1px solid ${statusStyle.border}`,
                      color: statusStyle.text,
                      padding: "var(--space-xs, 4px) var(--space-sm, 8px)",
                      borderRadius: "var(--radius-xl, 16px)",
                      fontSize: "var(--font-size-xs, 11px)",
                      fontWeight: "var(--font-weight-medium, 500)",
                      textTransform: "uppercase",
                      opacity: statusStyle.opacity
                    }} data-testid={`status-${entry.status}`}>
                      {entry.status}
                    </span>
                  </div>
                  
                  <p style={{
                    color: "var(--text-secondary, #dfe2ea)",
                    fontSize: "var(--font-size-xs, 13px)",
                    lineHeight: "1.4",
                    margin: "0 0 var(--space-sm, 8px) 0"
                  }}>
                    {entry.details}
                  </p>
                  
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "var(--font-size-xs, 11px)",
                    color: "var(--text-muted, #8891a3)"
                  }}>
                    <span data-testid={`actor-${entry.id}`}>by {entry.actor}</span>
                    <span data-testid={`timestamp-${entry.id}`}>
                      {format(new Date(entry.timestamp), "MMM dd, yyyy 'at' HH:mm")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "var(--space-4xl, 40px) var(--space-lg, 16px)",
            color: "var(--text-muted, #8891a3)"
          }} data-testid="empty-state">
            <div style={{
              fontSize: "48px",
              marginBottom: "var(--space-md, 12px)",
              opacity: "0.3"
            }}>
              📋
            </div>
            <p style={{
              fontSize: "var(--font-size-sm, 14px)",
              margin: "0 0 var(--space-sm, 8px) 0"
            }}>
              No audit entries found
            </p>
            <p style={{
              fontSize: "var(--font-size-xs, 12px)",
              margin: 0
            }}>
              Transfer actions will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}