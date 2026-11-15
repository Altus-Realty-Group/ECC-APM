// L5 award/payment ledger contracts (issue #218). PURE: no network, filesystem, clock, environment or persistence.
// Reuses the L1 contracts (shared/legal/contracts.ts) without modifying them. Source-only: nothing here is stored, imported or enforced.
//
// One ledger belongs to ONE L1 award identity (`LegalAward.id`), however many obligors it has. The award's own amount is the principal.
// Everything else is an append-only, evidence-referenced entry. Nothing here assumes an interest rate, an accrual, an allocation order,
// enforceability or a legal deadline; unknown amounts stay unknown and recorded zeros stay zero.
import type { LegalAward } from "../contracts";

export const LEDGER_ENTRY_KINDS = ["charge", "payment", "credit", "reversal"] as const;
/** Components that may be charged within an award besides its principal. Principal is the L1 award amount, never an entry. */
export const CHARGE_COMPONENTS = ["fees", "costs", "interest"] as const;
export const REVERSAL_REASONS = ["returned_payment", "entered_in_error", "withdrawn_credit", "vacated_charge"] as const;
export const PROVENANCE_SOURCES = ["court_order", "accounting_record", "creditor_statement", "bank_record", "attorney_confirmation"] as const;

export type LedgerEntryKind = (typeof LEDGER_ENTRY_KINDS)[number];
export type ChargeComponent = (typeof CHARGE_COMPONENTS)[number];
export type ReversalReason = (typeof REVERSAL_REASONS)[number];
export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number];

/** An opaque reference to evidence that belongs to a specific matter (so a wrong-matter reference can be refused). */
export type EvidenceReference = { evidenceId: string; matterId: string };
export type Provenance = { source: ProvenanceSource; recordedBy: string; approvedBy: string | null };

/**
 * An immutable ledger entry in the same wire form as the L1 award (`amountCents` + `currency`, both present or both null).
 * `amountCents === null` means the amount is UNKNOWN (never zero). A reversal carries no amount: it undoes its target exactly.
 */
export type LedgerEntry = {
  entryId: string;
  awardId: string;
  matterId: string;
  /** Position in the append-only ledger; unique per award. */
  seq: number;
  kind: LedgerEntryKind;
  component: ChargeComponent | null;
  targetEntryId: string | null;
  reason: ReversalReason | null;
  amountCents: number | null;
  currency: string | null;
  /** Real calendar date YYYY-MM-DD the entry takes effect. Never inferred. */
  effectiveDate: string;
  evidence: EvidenceReference[];
  provenance: Provenance;
};

/** Accounting reconciliation recorded for the award's ledger. The as-of date is explicit; there is no default and no clock. */
export type Reconciliation = {
  /** Business date of the review. Never compared to a wall clock: there is no expiry threshold. */
  asOf: string;
  reconciledBy: string;
  evidence: EvidenceReference[];
  /** The ledger state that was actually reviewed. Any appended entry (whatever its effectiveDate) makes the reconciliation stale. */
  ledgerSeq: number;
  ledgerDigest: string;
};

/** Award-side inputs. `award` is an L1 award (its `amount` is the principal). The creditor is explicit or unknown. */
export type LedgerAwardContext = { award: LegalAward; creditorPartyId: string | null; reconciliation: Reconciliation | null };

/** An explicit, evidence-backed approval to place THIS award in the collections queue at THIS ledger state. */
export type CollectionApproval = {
  awardId: string;
  matterId: string;
  approvedBy: string;
  approvedOn: string;
  evidence: EvidenceReference[];
  /** The state that was approved. Any change to the award, its parties or the ledger makes the approval stale. */
  currency: string;
  outstandingCents: number;
  ledgerSeq: number;
  ledgerDigest: string;
  awardRevision: number;
  creditorPartyId: string;
  obligors: LegalAward["obligors"];
};

export type ConflictCode =
  | "INVALID_ENTRY" | "INVALID_AWARD" | "INVALID_RECONCILIATION" | "WRONG_ASSOCIATION" | "WRONG_MATTER_EVIDENCE"
  | "DUPLICATE_ENTRY_CONFLICT" | "DUPLICATE_SEQUENCE" | "CURRENCY_MISMATCH" | "UNSAFE_ARITHMETIC"
  | "SEQUENCE_GAP" | "REVERSAL_TARGET_MISSING" | "REVERSAL_TARGET_NOT_EARLIER" | "REVERSAL_PREDATES_TARGET" | "REVERSAL_OF_REVERSAL" | "REVERSAL_OF_SELF"
  | "DOUBLE_REVERSAL" | "REVERSAL_WRONG_AWARD" | "REVERSAL_WRONG_REASON" | "DUPLICATE_AWARD_CONFLICT" | "ORPHAN_ENTRIES";

export type ReviewCode = "OVERPAYMENT" | "UNKNOWN_PRINCIPAL" | "UNKNOWN_ENTRY_AMOUNT";

/**
 * Arithmetic status of ONE award's ledger.
 *  - conflict: fail closed, no numbers at all.
 *  - unknown:  something contributing is unknown; totals are null (never zero, never partial).
 *  - review:   arithmetic is fully known but needs a human decision (an overpayment). `netCents` is the SIGNED truth; nothing is clamped.
 *  - known:    fully known and consistent.
 */
export type LedgerStatus = "conflict" | "unknown" | "review" | "known";

export type LedgerProjection = {
  awardId: string;
  matterId: string;
  status: LedgerStatus;
  conflict: ConflictCode | null;
  review: ReviewCode[];
  /** Explicit currency units, or null when no amount is known. */
  currency: string | null;
  principal: { cents: number; currency: string } | null;
  principalVerified: boolean;
  /** Net of reversals. Null whenever any contribution is unknown. */
  chargedCents: number | null;
  satisfiedCents: number | null;
  /** charged - satisfied. NEGATIVE means overpaid. Never clamped. */
  netCents: number | null;
  /** Only when net >= 0 and fully known. An overpayment has NO outstanding figure; it requires review. */
  outstandingCents: number | null;
  /** Entries whose amount is unknown and which are not reversed. */
  unknownEntryIds: string[];
  /** The highest sequence number in the ledger (0 when empty). */
  lastSeq: number;
  /** Fingerprint of the exact entries behind this projection (integrity, not security). Reconciliations and approvals bind to it. */
  ledgerDigest: string;
  awardRevision: number;
  /** Obligations: the award's obligors (debtors) and the creditor. No amounts live on obligors. */
  creditorPartyId: string | null;
  obligors: LegalAward["obligors"];
  reconciliation: {
    state: "none" | "current" | "stale";
    asOf: string | null;
    /** Entries appended after the reviewed state, or effective after asOf. */
    unreconciledEntryIds: string[];
    staleReasons: ("LEDGER_CHANGED" | "ENTRY_AFTER_AS_OF")[];
  };
};
