import React from "react";
import { Clock } from "lucide-react";
import type { SchedulerDisplay } from "./schedulerDisplay";

/** Presentational Scheduler panel. Receives already-resolved display labels. */
export default function SchedulerPanel({ display }: { display: SchedulerDisplay }) {
  return (
    <div className="ecc-card" data-testid="scheduler-panel">
      <div className="ecc-card__header">
        <h3 className="ecc-card__title flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Scheduler</span>
        </h3>
      </div>
      <div className="ecc-card__body space-y-3">
        <div className="ecc-field-row">
          <span className="ecc-field-label">Status:</span>
          <span
            className={`ecc-badge ${
              display.statusKind === "success"
                ? "ecc-badge--success"
                : display.statusKind === "error"
                  ? "ecc-badge--error"
                  : ""
            }`}
            data-testid="scheduler-status"
          >
            {display.statusLabel}
          </span>
        </div>
        <div className="ecc-field-row">
          <span className="ecc-field-label">Interval:</span>
          <span className="ecc-field-value" data-testid="scheduler-interval">
            {display.intervalLabel}
          </span>
        </div>
        <div className="ecc-field-row">
          <span className="ecc-field-label">Next Run:</span>
          <span className="ecc-field-value font-mono text-sm" data-testid="scheduler-next">
            {display.nextRunLabel}
          </span>
        </div>
        <div className="ecc-field-row">
          <span className="ecc-field-label">Nightly Full:</span>
          <span className="ecc-field-value" data-testid="scheduler-nightly">
            {display.nightlyLabel}
          </span>
        </div>
        {display.lastRunLabel && (
          <div className="ecc-field-row">
            <span className="ecc-field-label">Last Run:</span>
            <span className="ecc-field-value text-sm">{display.lastRunLabel}</span>
          </div>
        )}
      </div>
      <div className="ecc-card__footer">
        <p className="text-sm text-gray-500">Configuration is environment-driven</p>
      </div>
    </div>
  );
}
