import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { useToast } from "../../../hooks/use-toast";
import { fetchJSON } from "@/lib/http";
import Typeahead from "../../../components/ui/Typeahead";
import { searchOwners, createOwner, Owner } from "../api/ownerTransfer";

interface IntegrationsConfig {
  ok?: boolean;
  integrations?: { admin?: { available?: boolean } };
}

interface OwnerTransferFormProps {
  ownerId: string;
  transferId?: string | null;
  onTransferCreated?: (transferId: string) => void;
}

interface TransferFormData {
  sourceOwnerId: string;
  targetOwnerId: string;
  effectiveDate: string;
  include: {
    properties: boolean;
    units: boolean;
    leases: boolean;
    tenants: boolean;
    files: boolean;
    workOrders: boolean;
    comms: boolean;
    financials: boolean;
  };
  notes: string;
}

export default function OwnerTransferForm({ ownerId, transferId, onTransferCreated }: OwnerTransferFormProps) {
  const [formData, setFormData] = useState<TransferFormData>({
    sourceOwnerId: ownerId,
    targetOwnerId: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    include: {
      properties: true,
      units: true,
      leases: true,
      tenants: false,
      files: false,
      workOrders: false,
      comms: false,
      financials: false,
    },
    notes: ""
  });

  const [selectedSourceOwner, setSelectedSourceOwner] = useState<Owner | null>(null);
  const [selectedTargetOwner, setSelectedTargetOwner] = useState<Owner | null>(null);

  // Admin token removed for security - server handles authentication
  const { addToast: toast } = useToast();
  const hasAdminToken = false; // Removed for security - server handles authentication

  // Feature flag check
  const { data: config } = useQuery({
    queryKey: ["/api/config/integrations"],
    queryFn: ({ signal }) => fetchJSON<IntegrationsConfig>("/api/config/integrations", { signal }),
  });

  const transferEnabled = config?.ok && config?.integrations?.admin?.available;

  const mInitiate = useMutation({
    mutationFn: async () => {
      return await api("/api/owners/initiateTransfer", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
          // x-admin-token removed - server handles authentication
        },
        body: JSON.stringify(formData),
      });
    },
    onSuccess: (result) => {
      toast({ type: "success", title: "Transfer initiated successfully", message: `Transfer ID: ${result?.id}` });
      if (result?.id && onTransferCreated) {
        onTransferCreated(result.id);
      }
    },
    onError: (error) => {
      toast({ type: "error", title: "Failed to initiate transfer", message: error.message });
    },
  });

  const mApprove = useMutation({
    mutationFn: async () => {
      if (!transferId) {
        throw new Error("Transfer ID is required for approval");
      }
      return await api(`/api/owners/approveTransfer?id=${encodeURIComponent(transferId)}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
          // x-admin-token removed - server handles authentication
        },
      });
    },
    onSuccess: () => {
      toast({ type: "success", title: "Transfer approved", message: "Transfer has been approved by accounting" });
    },
    onError: (error) => {
      toast({ type: "error", title: "Failed to approve transfer", message: error.message });
    },
  });

  const mAuthorize = useMutation({
    mutationFn: async () => {
      if (!transferId) {
        throw new Error("Transfer ID is required for authorization");
      }
      return await api(`/api/owners/authorizeTransfer?id=${encodeURIComponent(transferId)}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
          // x-admin-token removed - server handles authentication
        },
      });
    },
    onSuccess: () => {
      toast({ type: "success", title: "Transfer authorized", message: "Transfer has been authorized for execution" });
    },
    onError: (error) => {
      toast({ type: "error", title: "Failed to authorize transfer", message: error.message });
    },
  });

  const mExecute = useMutation({
    mutationFn: async () => {
      if (!transferId) {
        throw new Error("Transfer ID is required for execution");
      }
      return await api(`/api/owners/executeTransfer?id=${encodeURIComponent(transferId)}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
          // x-admin-token removed - server handles authentication
        },
      });
    },
    onSuccess: () => {
      toast({ type: "success", title: "Transfer executed", message: "Transfer has been completed successfully" });
    },
    onError: (error) => {
      toast({ type: "error", title: "Failed to execute transfer", message: error.message });
    },
  });

  const updateInclude = (key: keyof TransferFormData['include'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      include: { ...prev.include, [key]: value }
    }));
  };

  const canSubmit = hasAdminToken && transferEnabled && formData.sourceOwnerId && formData.targetOwnerId && formData.effectiveDate;

  return (
    <div className="owner-transfer-form">
      <div className="bg-[var(--ecc-gray-850,#f8f9fa)] border border-[var(--ecc-gray-700,#dee2e6)]" style={{
        borderRadius: "var(--radius-lg, 12px)",
        padding: "var(--space-2xl, 24px)"
      }}>
        <h3 style={{
          color: "var(--brand-gold, #f2c86a)",
          fontSize: "var(--font-size-xl, 18px)",
          fontWeight: "var(--font-weight-semibold, 600)",
          marginBottom: "var(--space-lg, 16px)"
        }}>
          Transfer Configuration
        </h3>

        {/* Admin Token Warning */}
        {!hasAdminToken && (
          <div style={{
            backgroundColor: "var(--brand-red, #f16a6a)",
            border: "1px solid var(--brand-red, #f16a6a)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "var(--space-md, 12px)",
            marginBottom: "var(--space-lg, 16px)",
            opacity: "0.1"
          }} data-testid="warning-admin-token">
            <p style={{ color: "var(--brand-red, #f16a6a)", fontSize: "var(--font-size-sm, 14px)", margin: 0 }}>
              ADMIN_SYNC_TOKEN required for transfers
            </p>
          </div>
        )}

        {/* Feature Flag Warning */}
        {!transferEnabled && (
          <div style={{
            backgroundColor: "var(--brand-amber, #ffd479)",
            border: "1px solid var(--brand-amber, #ffd479)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "var(--space-md, 12px)",
            marginBottom: "var(--space-lg, 16px)",
            opacity: "0.1"
          }} data-testid="warning-feature-flag">
            <p style={{ color: "var(--brand-amber, #ffd479)", fontSize: "var(--font-size-sm, 14px)", margin: 0 }}>
              Transfer feature not enabled
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg, 16px)" }}>
          {/* Source Owner */}
          <Typeahead
            value={selectedSourceOwner?.name || ""}
            onChange={(value, option) => {
              if (option) {
                setSelectedSourceOwner(option);
                setFormData(prev => ({ ...prev, sourceOwnerId: option.id }));
              }
            }}
            onSearch={searchOwners}
            onCreate={async (query) => {
              const newOwner = await createOwner({ name: query });
              return newOwner;
            }}
            label="Source Owner"
            placeholder="Search for source owner..."
            testId="typeahead-source-owner"
          />

          {/* Target Owner */}
          <Typeahead
            value={selectedTargetOwner?.name || ""}
            onChange={(value, option) => {
              if (option) {
                setSelectedTargetOwner(option);
                setFormData(prev => ({ ...prev, targetOwnerId: option.id }));
              }
            }}
            onSearch={searchOwners}
            onCreate={async (query) => {
              const newOwner = await createOwner({ name: query });
              return newOwner;
            }}
            label="Target Owner"
            placeholder="Search for target owner..."
            testId="typeahead-target-owner"
          />

          {/* Effective Date */}
          <div>
            <label style={{
              display: "block",
              color: "var(--text-secondary, #dfe2ea)",
              fontSize: "var(--font-size-sm, 14px)",
              fontWeight: "var(--font-weight-medium, 500)",
              marginBottom: "var(--space-sm, 8px)"
            }}>
              Effective Date
            </label>
            <input
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
              data-testid="input-effective-date"
              style={{
                width: "100%",
                padding: "var(--space-md, 12px)",
                backgroundColor: "var(--bg-primary, #0b0c0f)",
                border: "1px solid var(--border-primary, #1b1f28)",
                borderRadius: "var(--radius-md, 8px)",
                color: "var(--text-primary, #f7f8fb)",
                fontSize: "var(--font-size-sm, 14px)"
              }}
            />
          </div>

          {/* Asset Groups */}
          <div>
            <label style={{
              display: "block",
              color: "var(--text-secondary, #dfe2ea)",
              fontSize: "var(--font-size-sm, 14px)",
              fontWeight: "var(--font-weight-medium, 500)",
              marginBottom: "var(--space-md, 12px)"
            }}>
              Include Asset Groups
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-sm, 8px)" }} data-testid="asset-groups">
              {Object.entries(formData.include).map(([key, checked]) => (
                <label key={key} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm, 8px)",
                  color: "var(--text-secondary, #dfe2ea)",
                  fontSize: "var(--font-size-xs, 13px)",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => updateInclude(key as keyof TransferFormData['include'], e.target.checked)}
                    data-testid={`checkbox-${key}`}
                    style={{ accentColor: "var(--brand-gold, #f2c86a)" }}
                  />
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{
              display: "block",
              color: "var(--text-secondary, #dfe2ea)",
              fontSize: "var(--font-size-sm, 14px)",
              fontWeight: "var(--font-weight-medium, 500)",
              marginBottom: "var(--space-sm, 8px)"
            }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes for accounting and audit purposes..."
              rows={3}
              data-testid="textarea-notes"
              style={{
                width: "100%",
                padding: "var(--space-md, 12px)",
                backgroundColor: "var(--bg-primary, #0b0c0f)",
                border: "1px solid var(--border-primary, #1b1f28)",
                borderRadius: "var(--radius-md, 8px)",
                color: "var(--text-primary, #f7f8fb)",
                fontSize: "var(--font-size-sm, 14px)",
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "var(--space-md, 12px)",
            borderTop: "1px solid var(--border-primary, #1b1f28)",
            paddingTop: "var(--space-lg, 16px)",
            marginTop: "var(--space-sm, 8px)"
          }}>
            <button
              onClick={() => mInitiate.mutate()}
              disabled={!canSubmit || mInitiate.isPending}
              data-testid="button-initiate"
              style={{
                padding: "var(--space-md, 12px) var(--space-lg, 16px)",
                backgroundColor: canSubmit && !mInitiate.isPending ? "var(--brand-gold, #f2c86a)" : "var(--bg-tertiary, #151821)",
                color: canSubmit && !mInitiate.isPending ? "var(--bg-primary, #0b0c0f)" : "var(--text-muted, #8891a3)",
                border: "none",
                borderRadius: "var(--radius-md, 8px)",
                fontSize: "var(--font-size-sm, 14px)",
                fontWeight: "var(--font-weight-semibold, 600)",
                cursor: canSubmit && !mInitiate.isPending ? "pointer" : "not-allowed",
                transition: "all 0.2s ease"
              }}
            >
              {mInitiate.isPending ? "Initiating..." : "Initiate Transfer"}
            </button>

            <button
              onClick={() => mApprove.mutate()}
              disabled={!hasAdminToken || mApprove.isPending}
              data-testid="button-approve"
              style={{
                padding: "var(--space-md, 12px) var(--space-lg, 16px)",
                backgroundColor: hasAdminToken && !mApprove.isPending ? "var(--brand-green, #64d2a3)" : "var(--bg-tertiary, #151821)",
                color: hasAdminToken && !mApprove.isPending ? "var(--bg-primary, #0b0c0f)" : "var(--text-muted, #8891a3)",
                border: "none",
                borderRadius: "var(--radius-md, 8px)",
                fontSize: "var(--font-size-xs, 13px)",
                fontWeight: "var(--font-weight-medium, 500)",
                cursor: hasAdminToken && !mApprove.isPending ? "pointer" : "not-allowed"
              }}
            >
              {mApprove.isPending ? "Approving..." : "Approve"}
            </button>

            <button
              onClick={() => mAuthorize.mutate()}
              disabled={!hasAdminToken || mAuthorize.isPending}
              data-testid="button-authorize"
              style={{
                padding: "var(--space-md, 12px) var(--space-lg, 16px)",
                backgroundColor: hasAdminToken && !mAuthorize.isPending ? "var(--brand-amber, #ffd479)" : "var(--bg-tertiary, #151821)",
                color: hasAdminToken && !mAuthorize.isPending ? "var(--bg-primary, #0b0c0f)" : "var(--text-muted, #8891a3)",
                border: "none",
                borderRadius: "var(--radius-md, 8px)",
                fontSize: "var(--font-size-xs, 13px)",
                fontWeight: "var(--font-weight-medium, 500)",
                cursor: hasAdminToken && !mAuthorize.isPending ? "pointer" : "not-allowed"
              }}
            >
              {mAuthorize.isPending ? "Authorizing..." : "Authorize"}
            </button>

            <button
              onClick={() => mExecute.mutate()}
              disabled={!hasAdminToken || mExecute.isPending}
              data-testid="button-execute"
              style={{
                padding: "var(--space-md, 12px) var(--space-lg, 16px)",
                backgroundColor: hasAdminToken && !mExecute.isPending ? "var(--brand-red, #f16a6a)" : "var(--bg-tertiary, #151821)",
                color: hasAdminToken && !mExecute.isPending ? "white" : "var(--text-muted, #8891a3)",
                border: "none",
                borderRadius: "var(--radius-md, 8px)",
                fontSize: "var(--font-size-xs, 13px)",
                fontWeight: "var(--font-weight-medium, 500)",
                cursor: hasAdminToken && !mExecute.isPending ? "pointer" : "not-allowed"
              }}
            >
              {mExecute.isPending ? "Executing..." : "Execute"}
            </button>
          </div>

          {/* Error Messages */}
          {(mInitiate.error || mApprove.error || mAuthorize.error || mExecute.error) && (
            <div style={{
              backgroundColor: "var(--brand-red, #f16a6a)",
              border: "1px solid var(--brand-red, #f16a6a)",
              borderRadius: "var(--radius-md, 8px)",
              padding: "var(--space-md, 12px)",
              marginTop: "var(--space-sm, 8px)",
              opacity: "0.1"
            }} data-testid="error-message">
              <p style={{ color: "var(--brand-red, #f16a6a)", fontSize: "var(--font-size-sm, 14px)", margin: 0 }}>
                {(mInitiate.error || mApprove.error || mAuthorize.error || mExecute.error)?.toString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}