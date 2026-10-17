import React from "react";

export type StateKind = "loading" | "empty" | "error" | "denied" | "stale" | "partial";

type Props = {
  kind: StateKind;
  title: string;
  detail?: string;
  /** Shows a Retry button when provided. */
  onRetry?: () => void;
  retrying?: boolean;
  testId?: string;
};

/** One consistent, accessible notice for non-ready data states. Retry is a 44px touch target. */
export default function StateNotice({ kind, title, detail, onRetry, retrying, testId }: Props) {
  const urgent = kind === "error" || kind === "denied";
  return (
    <div
      className={`ecc-state ecc-state--${kind}`}
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      aria-busy={kind === "loading" ? true : undefined}
      data-testid={testId ?? `state-${kind}`}
    >
      <div>
        <p className="ecc-state__title">{title}</p>
        {detail ? <p className="ecc-state__detail">{detail}</p> : null}
      </div>
      {kind === "denied" ? <a className="ecc-btn ecc-touch" href="/api/access/sign-in">Sign in with Altus</a> : null}
      {onRetry && kind !== "loading" ? (
        <button type="button" className="ecc-btn ecc-touch" onClick={onRetry} disabled={retrying}>
          {retrying ? "Retrying…" : "Retry"}
        </button>
      ) : null}
    </div>
  );
}
