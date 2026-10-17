import React from "react";
import { Clock } from "lucide-react";
import type { SchedulerDisplay } from "./schedulerDisplay";
import './scheduler.css';

function timestampLabel(value: string) {
  if (!value.endsWith('Z') || !value.includes('T')) return value;
  const [date, clock] = value.split('T');
  return <time dateTime={value}><span className="ecc-scheduler__date">{date}</span>{' '}<span className="ecc-scheduler__date">{clock.replace(/(?:\.000)?Z$/, ' UTC')}</span></time>;
}

/** Presentational Scheduler panel. Receives already-resolved display labels. */
export default function SchedulerPanel({ display }: { display: SchedulerDisplay }) {
  return (
    <div className="ecc-card ecc-scheduler" data-testid="scheduler-panel">
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
            {timestampLabel(display.nextRunLabel)}
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
            <span className="ecc-field-value text-sm">{timestampLabel(display.lastRunLabel)}</span>
          </div>
        )}
      </div>
      <div className="ecc-card__footer">
        <p className="text-sm text-gray-500">Reported settings do not confirm that synchronization is running.</p>
      </div>
    </div>
  );
}
