/** Historical writer/export implementation remains recoverable from Git history. */
export type InitiateInput = {
  propertyIds: number[]; newOwnerId: number; effectiveDate: string;
  notes?: string; initiatedBy?: string;
};

export class TransferUnavailableError extends Error {
  readonly status = 503;
  readonly code = "OPERATION_UNAVAILABLE";
  constructor() { super("Owner transfers are unavailable."); this.name = "TransferUnavailableError"; }
}

// Deliberately do not import database, storage, audit or vendor writer clients.
export async function initiateTransfer(_input: InitiateInput): Promise<never> { throw new TransferUnavailableError(); }
export async function generateAccountingReport(_id: number): Promise<never> { throw new TransferUnavailableError(); }
export async function markApprovedByAccounting(_id: number, _actorId?: string): Promise<never> { throw new TransferUnavailableError(); }
export async function authorizeExecution(_id: number, _actorId?: string): Promise<never> { throw new TransferUnavailableError(); }
export async function executeTransfer(_id: number, _opts?: {dryRun?: boolean}): Promise<never> { throw new TransferUnavailableError(); }
export async function getTransferDetails(_id: number): Promise<never> { throw new TransferUnavailableError(); }
