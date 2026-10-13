import { CardPanel } from "@/components/cardkit/CardPanel";
import { FieldGroup } from "@/components/cardkit/FieldGroup";
import { BLANK, formatNumber } from "@/lib/format";
import type { PropertyCardData } from "@/shared/card-contracts";

/**
 * Only fields present in the verified property card contract (property.{type,address}, kpis.{units,activeLeases}).
 * Owner, class, status and DoorLoop id are not returned by the endpoint, so they are not shown.
 */
export default function Overview({ data }: { data: PropertyCardData }) {
  const addr = [data.property.address.line1, data.property.address.city, data.property.address.state, data.property.address.zip]
    .filter(Boolean)
    .join(", ");
  const type = data.property.type && data.property.type !== "UNKNOWN" ? data.property.type : BLANK;

  return (
    <CardPanel>
      <h3>Overview</h3>
      <FieldGroup label="Type" value={type} />
      <FieldGroup label="Address" value={addr || BLANK} />
      <FieldGroup label="Units" value={formatNumber(data.kpis.units)} />
      <FieldGroup label="Active Leases" value={formatNumber(data.kpis.activeLeases)} />
    </CardPanel>
  );
}
