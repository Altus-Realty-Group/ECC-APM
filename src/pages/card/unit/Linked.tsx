import type { z } from "zod";
import { UnitCard } from "@/shared/card-contracts";
import RelatedRecord from "@/components/recovery/RelatedRecord";

export default function Linked({ data }: { data: z.infer<typeof UnitCard> }) {
  return <section aria-label="Related records" className="space-y-3">
    <h2 className="text-lg font-semibold">Related records</h2>
    <ul className="grid gap-3">
      <li>{data.property ? <RelatedRecord kind="property" id={data.property.id} title={`Property #${data.property.id}`} /> : <p>No property was reported for this unit.</p>}</li>
      <li>{data.lease ? <RelatedRecord kind="lease" id={data.lease.id} title={`Lease #${data.lease.id}`} detail={data.lease.status} /> : <p>No lease was reported for this unit.</p>}</li>
    </ul>
  </section>;
}
