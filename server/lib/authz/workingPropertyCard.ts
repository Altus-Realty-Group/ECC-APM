import { z } from "zod";
import type { PropertyReadDependencies } from "../../../shared/authz/propertyRead";
import { PropertyCard } from "../../../src/shared/card-contracts";

type WorkingCardReader = PropertyReadDependencies["readCard"];
type Scope = Parameters<WorkingCardReader>[0];

const workingProperty = z.object({
  resource: z.literal("properties"),
  entity_id: z.string().uuid(),
  connection_ref: z.string(),
  source_id: z.string(),
  native_key: z.string(),
  native_evidence: z.string().trim().min(1),
  source_run_ref: z.string().trim().min(1),
  provider_fields: z.object({
    name: z.string().nullish(),
    type: z.string().nullish(),
    address: z.object({
      street1: z.string().nullish(),
      city: z.string().nullish(),
      zip: z.string().nullish(),
    }).nullish(),
  }),
});

/**
 * Map a scoped Working read to the existing card contract. The supplied repository
 * must enforce actor and expiry before reading and return the evidence-backed
 * identity joined to its current projection. This adapter rechecks the returned identity.
 */
export function makeWorkingPropertyCardReader(load: (scope: Scope) => Promise<readonly unknown[]>): WorkingCardReader {
  return async scope => {
    const rows = await load(scope);
    if (!Array.isArray(rows)) throw new Error("invalid Working property response");
    if (rows.length === 0) return null;
    if (rows.length !== 1) throw new Error("ambiguous Working property");
    const row = workingProperty.parse(rows[0]);
    if (row.entity_id !== scope.workingEntityId || row.connection_ref !== scope.connectionRef
      || row.source_id !== scope.nativeProviderPropertyId || row.native_key !== String(scope.propertyId)) {
      throw new Error("Working property identity mismatch");
    }

    const fields = row.provider_fields;
    return PropertyCard.parse({
      property: {
        id: scope.propertyId,
        name: fields.name ?? undefined,
        type: fields.type ?? undefined,
        address: {
          line1: fields.address?.street1 ?? undefined,
          city: fields.address?.city ?? undefined,
          zip: fields.address?.zip ?? undefined,
        },
      },
      kpis: {},
    });
  };
}
