// Genesis Grade Priority Action Feed - Critical Tasks & Alerts

import React from 'react';
import StateNotice from '@/components/ui/StateNotice';
import { useDashboardData, type FeedItem } from '../hooks/useDashboardData';

// Section Component for each feed category
function FeedSection({ 
  title, 
  items, 
  emptyMessage 
}: { 
  title: string; 
  items: FeedItem[]; 
  emptyMessage: string;
}) {
  return (
    <div className="feed-section">
      <h3 className="feed-section__title">{title}</h3>
      {items.length === 0 ? (
        <div className="feed-empty-state">
          <div className="feed-empty-state__icon">✅</div>
          <div className="feed-empty-state__message">{emptyMessage}</div>
        </div>
      ) : (
        <div className="feed-items">
          {items.map((item) => (
            <div key={item.id} className="feed-item">
              <div className="feed-item__content">
                <div className="feed-item__title">{item.title}</div>
                <div className="feed-item__subtitle">{item.subtitle}</div>
                <div className="feed-item__meta">{item.meta}</div>
              </div>
              <div className="feed-item__actions">
                <button className="feed-action-btn feed-action-btn--primary">
                  Action
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PriorityActionFeed() {
  const { feedData, feedAvailable } = useDashboardData();
  if (!feedAvailable) return <StateNotice kind="partial" title="Priority work is not available yet." detail="Open Operations to review confirmed records. A missing feed does not mean there is no work to do." />;

  return (
    <div className="priority-action-feed">
      <FeedSection
        title="Delinquency Alerts"
        items={feedData.delinquencyAlerts}
        emptyMessage="No delinquencies to report"
      />
      
      <FeedSection
        title="Lease Renewals"
        items={feedData.leaseRenewals}
        emptyMessage="No upcoming lease renewals"
      />
      
      <FeedSection
        title="Maintenance Hotlist"
        items={feedData.maintenanceHotlist}
        emptyMessage="No critical maintenance items"
      />
    </div>
  );
}