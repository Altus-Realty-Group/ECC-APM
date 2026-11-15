/**
 * SYNTHETIC REVIEW FIXTURE — NOT OPERATING DATA.
 * Reuses accepted L1 / L5 / L6 types exactly. Joint awards counted once via totalAwards.
 */
import type { LegalAward, LegalMatter } from "../../../shared/legal/contracts.ts";
import type { LedgerProjection } from "../../../shared/legal/ledger/model.ts";
import type { WorkflowProjection, ProjectionOutcome } from "../../../shared/legal/workflow/projections.ts";

export const populatedMatter: LegalMatter = {
  id: "matter-synth-001",
  scopeRef: "scope-synth-a",
  caseType: "eviction",
  lifecycle: "filed",
  courtRef: "court-synth-1",
  docketNumber: "2026-CV-001",
  revision: 1,
};

export const jointAward: LegalAward = {
  id: "award-synth-joint-001",
  matterId: "matter-synth-001",
  kind: "rent",
  amount: { cents: 150_000, currency: "USD" },
  judgmentVerification: "verified",
  collectionReadiness: "ready",
  revision: 1,
  obligors: [
    { partyId: "party-synth-1", liability: "joint" },
    { partyId: "party-synth-2", liability: "joint" },
  ],
};

export const zeroAward: LegalAward = {
  id: "award-synth-zero-001",
  matterId: "matter-synth-001",
  kind: "fees",
  amount: { cents: 0, currency: "USD" },
  judgmentVerification: "verified",
  collectionReadiness: "not_ready",
  revision: 1,
  obligors: [{ partyId: "party-synth-1", liability: "sole" }],
};

export const unknownAward: LegalAward = {
  id: "award-synth-unknown-001",
  matterId: "matter-synth-001",
  kind: "damages",
  amount: null,
  judgmentVerification: "unverified",
  collectionReadiness: "not_ready",
  revision: 1,
  obligors: [],
};

export const secondMatterAward: LegalAward = {
  id: "award-synth-other-001",
  matterId: "matter-synth-002",
  kind: "costs",
  amount: { cents: 25_000, currency: "USD" },
  judgmentVerification: "verified",
  collectionReadiness: "ready",
  revision: 1,
  obligors: [{ partyId: "party-synth-3", liability: "sole" }],
};

/** Typed L5 LedgerProjection fixture (known, no entries). */
export const knownLedgerProjection: LedgerProjection = {
  awardId: jointAward.id,
  matterId: jointAward.matterId,
  status: "known",
  conflict: null,
  review: [],
  currency: "USD",
  principal: jointAward.amount,
  principalVerified: true,
  chargedCents: 0,
  satisfiedCents: 0,
  netCents: 150_000,
  outstandingCents: 150_000,
  unknownEntryIds: [],
  lastSeq: 0,
  ledgerDigest: "synth-digest-001",
  awardRevision: jointAward.revision,
  creditorPartyId: "party-synth-creditor",
  obligors: jointAward.obligors,
  reconciliation: {
    state: "none",
    asOf: null,
    unreconciledEntryIds: [],
    staleReasons: [],
  },
};

/** Typed L6 WorkflowProjection and ready ProjectionOutcome. */
export const readyWorkflowProjection: WorkflowProjection = {
  matter: populatedMatter,
  evidence: [],
  requirements: [],
  courtEvents: [],
  awards: [jointAward],
};

export const readyProjectionOutcome: ProjectionOutcome = {
  kind: "ready",
  projection: readyWorkflowProjection,
  summary: {
    publicEvidence: 0,
    openRequirements: 0,
    unassignedOpenRequirements: 0,
    unknownAwards: 0,
    verifiedMonetaryAwards: 1,
  },
};
