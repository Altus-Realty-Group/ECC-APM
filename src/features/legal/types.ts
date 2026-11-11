/** Synthetic frontend types. Not an accepted backend contract. */

export type LegalLifecycle = "intake" | "assembly" | "attorney-review" | "filed" | "court-activity" | "disposition" | "closed";
export type JudgmentVerification = "none-known" | "alleged" | "order-located" | "court-verified" | "disputed" | "stayed" | "satisfied";
export type CollectionReadiness = "missing-evidence" | "accounting" | "legal-review" | "approved-referral" | "enforcement" | "payment-plan" | "collected" | "no-further-action";
export type EvidenceConfidence = "filename-hint" | "content-reviewed" | "signed-copy" | "docket-validated" | "attorney-confirmed";

export type LegalMatter = {
  id: string;
  caption: string;
  matterType: string;
  lifecycle: LegalLifecycle;
  verification: JudgmentVerification;
  readiness: CollectionReadiness;
  court: string | null;
  creditor: string | null;
  propertyIds: string[];
  partyIds: string[];
  awardId: string | null;
  awardCents: number | null;
  awardVerified: boolean;
  evidenceConfidence: EvidenceConfidence;
  nextAction: string | null;
  sourceAsOf: string | null;
};

export type LegalDashboardState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "empty" }
  | { kind: "denied" }
  | { kind: "error"; message: string }
  | { kind: "ready"; matters: LegalMatter[]; stale?: boolean };

export type LegalMatterState =
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "denied" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; matter: LegalMatter; stale?: boolean };
