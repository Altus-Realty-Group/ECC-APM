import {} from '@/lib/ecc-resolvers';
import CardPanel from "@/components/cardkit/CardPanel";

export default function Legal(){
  return (
    <div className="space-y-3">
      <CardPanel title="Compliance"><div className="text-sm opacity-70">Compliance information is not available on this card yet.</div></CardPanel>
    </div>
  );
}