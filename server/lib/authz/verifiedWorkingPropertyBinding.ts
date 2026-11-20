import { z } from "zod";
import type { PropertyReadDependencies } from "../../../shared/authz/propertyRead";

const connection = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/);
const providerId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);

const identity = z.object({
  resource: z.literal("properties"),
  native_key: z.string(),
  entity_id: z.string().uuid(),
  connection_ref: connection,
  source_id: providerId,
  native_evidence: z.string().min(1),
  mapping_evidence: z.object({
    evidence_id: z.string().min(1),
    resource: z.literal("properties"),
    result_sha256: digest,
    revoked_at: z.null(),
  }),
});

const companyReceipt = z.object({
  status: z.literal("verified"),
  revokedAt: z.null(),
  receiptSha256: digest,
  propertyId: z.number().int().positive(),
  companyId: z.string().uuid(),
  workingEntityId: z.string().uuid(),
  connectionRef: connection,
  nativeProviderPropertyId: providerId,
});

type Sources = {
  /** All exact property candidates from Working identity links joined to their mapping evidence. */
  loadWorkingIdentities: (nativeKey: string) => Promise<readonly unknown[]>;
  /** All exact property-to-company candidates from ECC's reviewed binding receipts. */
  loadCompanyReceipts: (propertyId: number) => Promise<readonly unknown[]>;
};

/** Only the intersection of independently verified identity and company evidence can request a property grant. */
export function makeVerifiedWorkingPropertyBinding(sources: Sources): PropertyReadDependencies["resolveVerifiedBinding"] {
  return async propertyId => {
    if (!Number.isSafeInteger(propertyId) || propertyId <= 0) return null;
    const nativeKey = String(propertyId);
    const identities = await sources.loadWorkingIdentities(nativeKey);
    if (!Array.isArray(identities) || identities.length !== 1) return null;
    const link = identity.safeParse(identities[0]);
    if (!link.success || link.data.native_key !== nativeKey
      || link.data.native_evidence !== link.data.mapping_evidence.evidence_id) return null;

    const receipts = await sources.loadCompanyReceipts(propertyId);
    if (!Array.isArray(receipts) || receipts.length !== 1) return null;
    const receipt = companyReceipt.safeParse(receipts[0]);
    if (!receipt.success) return null;

    const { companyId, connectionRef, workingEntityId, nativeProviderPropertyId } = receipt.data;
    if (receipt.data.propertyId !== propertyId || workingEntityId !== link.data.entity_id
      || connectionRef !== link.data.connection_ref || nativeProviderPropertyId !== link.data.source_id) return null;

    return { propertyId, companyId, connectionRef, workingEntityId, nativeProviderPropertyId };
  };
}
