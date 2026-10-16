import type { z } from "zod";
import { OwnerCard } from "@/shared/card-contracts";
import RelatedRecord from "@/components/recovery/RelatedRecord";

export default function Linked({ data }: { data: z.infer<typeof OwnerCard> }) {
  return <section aria-label="Related properties" className="space-y-3">
    <h2 className="text-lg font-semibold">Related properties</h2>
    {data.properties.length ? <ul className="grid gap-3">{data.properties.map(p => <li key={p.id}>
      <RelatedRecord kind="property" id={p.id} title={p.name.trim() || `Property #${p.id}`} />
    </li>)}</ul> : <p>No properties were reported for this owner.</p>}
  </section>;
}
