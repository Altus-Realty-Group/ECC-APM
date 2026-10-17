import {} from '@/lib/ecc-resolvers';
import CardPanel from "@/components/cardkit/CardPanel";

export default function RightRail({ property }:{ property?: any|null }) {
  return (
    <div className="space-y-3">
      <CardPanel title="Parent Property">
        {property ? (
          <div className="p-2 border rounded text-sm">
            <div className="font-medium">{property?.name ?? property?.address_street1 ?? property?.street1 ?? "Unlinked"}</div>
            <div className="opacity-70">{[property.city, property.state].filter(Boolean).join(', ') || ''}</div>
            <a href={`/card/property/${property.id}`} className="text-blue-500 underline">View Property</a>
          </div>
        ) : <div className="opacity-70 text-sm">No property linked.</div>}
      </CardPanel>

      <CardPanel title="Maintenance">
        <div className="text-sm opacity-70">Maintenance information is not available on this card yet.</div>
      </CardPanel>

      <CardPanel title="Pinned Files">
        <div className="text-sm opacity-70">File listing is not available on this card yet.</div>
      </CardPanel>
    </div>
  );
}