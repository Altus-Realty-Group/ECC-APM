import {} from '@/lib/ecc-resolvers';
import CardPanel from "@/components/cardkit/CardPanel";

function joinAddress(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => typeof p === "string" && p.trim() !== "").join(", ");
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function googleMapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

type Property = {
  street_1?: string|null; city?: string|null; state?: string|null; zip?: string|null;
  lat?: number|null; lng?: number|null;
};

export default function RightRail({ property }: { property?: Property | null }) {
  const address = property ? joinAddress([property.street_1, property.city, property.state, property.zip]) : undefined;
  const lat = isFiniteNumber(property?.lat ?? null) ? (property!.lat as number) : null;
  const lng = isFiniteNumber?.(property?.lng ?? null) ? (property!.lng as number) : null;
  const mapsHref = address ? googleMapsHref(address) : undefined;

  return (
    <div className="space-y-3">
      <CardPanel title="Map & Location">
        <div className="text-xs opacity-60 mb-1">{address || 'Address unavailable'}</div>
        <div>
          {address ? <a href={mapsHref} className="underline text-sm">Open in Maps</a> : <div className="opacity-60 text-sm">No location</div>}
        </div>
      </CardPanel>

      <CardPanel title="Key Dates">
        <div className="text-sm opacity-70">Upcoming inspections, renewals, notices will appear here.</div>
      </CardPanel>

      <CardPanel title="Pinned Files">
        <ul className="text-sm list-disc pl-5">
          <li><span className="opacity-70">Insurance policy.pdf</span> (placeholder)</li>
          <li><span className="opacity-70">Mortgage_note.pdf</span> (placeholder)</li>
        </ul>
      </CardPanel>
    </div>
  );
}