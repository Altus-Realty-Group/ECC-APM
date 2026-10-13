import {} from '@/lib/ecc-resolvers';
import CardPanel from "@/components/cardkit/CardPanel";

export default function Legal() {
  return (
    <div className="space-y-3">
      <CardPanel title="Assessor & APN">
        <div className="text-sm opacity-70">Assessor and parcel details are not available on this card yet.</div>
      </CardPanel>
      <CardPanel title="Linked Cases">
        <div className="text-sm opacity-70">Case information is not available on this card yet.</div>
      </CardPanel>
    </div>
  );
}