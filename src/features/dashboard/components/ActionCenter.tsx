// ActionCenter.tsx - Genesis specification with actionable items and live data
import React from 'react';
import { fmtDate, fmtMoney } from '../../../utils/format';
import { ActionButton } from './ActionButton';

interface LeaseExpiring {
  leaseId: string;
  tenant: string;
  property: string;
  endDate: string;
}

interface TopDelinquent {
  tenantId: string;
  tenant: string;
  property: string;
  balance: number;
}

interface HighPriorityWO {
  woId: string;
  property: string;
  summary: string;
}

interface ActionCenterProps {
  leasesExpiring: LeaseExpiring[];
  topDelinquents: TopDelinquent[];
  highPriorityWOs: HighPriorityWO[];
}

// Section component for each action category
function ActionSection({ 
  title, 
  items, 
  emptyMessage 
}: { 
  title: string; 
  items: React.ReactNode[];
  emptyMessage: string;
}) {
  return (
    <div className="action-section">
      <h4 className="small-label mb-3">{title}</h4>
      {items.length === 0 ? (
        <div className="action-empty">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {items}
        </div>
      )}
    </div>
  );
}

export function ActionCenter({ leasesExpiring, topDelinquents, highPriorityWOs }: ActionCenterProps) {
  // Lease expiration actions
  const leaseItems = leasesExpiring.slice(0, 3).map((lease) => (
    <div key={lease.leaseId} className="action-item">
      <div className="flex-1 min-w-0">
        <div className="number-sm font-medium truncate">{lease.tenant}</div>
        <div className="text-xs text-[var(--text-dim)]">
          {lease.property} • Expires {fmtDate(lease.endDate)}
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        <ActionButton 
          variant="secondary"
          size="small"
          onClick={() => window.open(`/portfolio/tenants?focus=${lease.leaseId}`, '_blank')}
        >
          Contact Tenant
        </ActionButton>
        <ActionButton
          variant="primary"
          size="small"
          onClick={() => window.open(`/leasing/renewal?lease=${lease.leaseId}`, '_blank')}
        >
          Start Renewal
        </ActionButton>
      </div>
    </div>
  ));

  // Delinquent tenant actions
  const delinquentItems = topDelinquents.slice(0, 3).map((tenant) => (
    <div key={tenant.tenantId} className="action-item">
      <div className="flex-1 min-w-0">
        <div className="number-sm font-medium truncate">{tenant.tenant}</div>
        <div className="text-xs text-[var(--text-dim)]">
          {tenant.property} • Balance: {fmtMoney(tenant.balance)}
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        <ActionButton
          variant="secondary"
          size="small"
          onClick={() => window.open(`/accounting/ledger?tenant=${tenant.tenantId}`, '_blank')}
        >
          View Ledger
        </ActionButton>
        <ActionButton
          variant="primary"
          size="small"
          onClick={() => window.open(`/communications/send?tenant=${tenant.tenantId}&template=payment_reminder`, '_blank')}
        >
          Send Reminder
        </ActionButton>
      </div>
    </div>
  ));

  // Work order actions
  const workOrderItems = highPriorityWOs.slice(0, 3).map((wo) => (
    <div key={wo.woId} className="action-item">
      <div className="flex-1 min-w-0">
        <div className="number-sm font-medium truncate">{wo.summary}</div>
        <div className="text-xs text-[var(--text-dim)]">
          {wo.property} • High Priority
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        <ActionButton
          variant="secondary"
          size="small"
          onClick={() => window.open(`/maintenance/work-orders?focus=${wo.woId}`, '_blank')}
        >
          View Details
        </ActionButton>
        <ActionButton
          variant="primary"
          size="small"
          onClick={() => window.open(`/maintenance/assign-vendor?wo=${wo.woId}`, '_blank')}
        >
          Assign Vendor
        </ActionButton>
      </div>
    </div>
  ));

  return (
    <div className="space-y-6">
      <ActionSection
        title="Leases Expiring Soon"
        items={leaseItems}
        emptyMessage="No leases expiring in the next 45 days. You're in the clear!"
      />
      
      <ActionSection
        title="Delinquent Tenants"
        items={delinquentItems}
        emptyMessage="No delinquent accounts. Great job on collections!"
      />
      
      <ActionSection
        title="High Priority Work Orders"
        items={workOrderItems}
        emptyMessage="No high priority work orders. All systems running smoothly!"
      />
    </div>
  );
}