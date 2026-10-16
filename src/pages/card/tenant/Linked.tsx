import type { z } from "zod";
import { TenantCard } from "@/shared/card-contracts";
import RelatedRecord from "@/components/recovery/RelatedRecord";

export default function Linked({ data }: { data: z.infer<typeof TenantCard> }) {
  // The explicitly linked current lease can be absent from the reported lease list.
  const leases = data.activeLease
    ? [data.activeLease, ...data.leases.filter(l => l.id !== data.activeLease?.id)]
    : data.leases;
  return <section aria-label="Related leases" className="space-y-3">
    <h2 className="text-lg font-semibold">Related leases</h2>
    {leases.length ? <ul className="grid gap-3">{leases.map(l => <li key={l.id}>
      <RelatedRecord kind="lease" id={l.id} title={`Lease #${l.id}`} detail={`${data.activeLease?.id === l.id ? "Current lease - " : ""}${l.status}`} />
    </li>)}</ul> : <p>No leases were reported for this tenant.</p>}
  </section>;
}
