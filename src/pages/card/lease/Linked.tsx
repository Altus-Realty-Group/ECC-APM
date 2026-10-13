import type { z } from "zod";
import { LeaseCard } from "@/shared/card-contracts";
import RelatedRecord from "@/components/recovery/RelatedRecord";

export default function Linked({ data }: { data: z.infer<typeof LeaseCard> }) {
  return <section aria-label="Related records" className="space-y-3">
    <h2 className="text-lg font-semibold">Related records</h2>
    <ul className="grid gap-3">
      <li>{data.property ? <RelatedRecord kind="property" id={data.property.id} title={`Property #${data.property.id}`} /> : <p>No property was reported for this lease.</p>}</li>
      <li>{data.unit ? <RelatedRecord kind="unit" id={data.unit.id} title={`Unit #${data.unit.id}`} /> : <p>No unit was reported for this lease.</p>}</li>
      <li>{data.tenant ? <RelatedRecord kind="tenant" id={data.tenant.id} title={data.tenant.display_name.trim() || `Tenant #${data.tenant.id}`} /> : <p>No tenant was reported for this lease.</p>}</li>
    </ul>
  </section>;
}
