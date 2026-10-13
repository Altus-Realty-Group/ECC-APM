import {} from '@/lib/ecc-resolvers';
import CardPanel from "@/components/cardkit/CardPanel";

export default function Financials() {
  return (
    <div className="space-y-3">
      <CardPanel title="Delinquency Summary">
        <div className="text-sm opacity-70">Balances and aging are not available on this card yet.</div>
      </CardPanel>
      <CardPanel title="Transactions">
        <div className="text-sm opacity-70">Transactions are not available on this card yet.</div>
      </CardPanel>
    </div>
  );
}