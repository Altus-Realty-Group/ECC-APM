import {} from '@/lib/ecc-resolvers';
import CardPanel from "@/components/cardkit/CardPanel";

export default function Financials(){
  return (
    <div className="space-y-3">
      <CardPanel title="Unit Ledger"><div className="text-sm opacity-70">Ledger records are not available on this card yet.</div></CardPanel>
    </div>
  );
}