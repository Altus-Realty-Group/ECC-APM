import CardPanel from "@/components/cardkit/CardPanel";
import { formatCurrencyFromCents } from "@/lib/format";
import type { PropertyCardData } from "@/shared/card-contracts";

export default function Financials({ data }: { data: PropertyCardData }) {
  const rent = data.kpis.avgRentCents;
  return (
    <div className="space-y-3">
      <CardPanel>
        <h3>Rental summary</h3>
        <dl><dt>Average monthly rent</dt><dd data-testid="property-average-rent">{formatCurrencyFromCents(rent)}</dd></dl>
        {rent === null ? <p>Average rent has not been reported.</p> : null}
        <p>Average rent is not collected income. Receipts and expenses are not available on this card yet.</p>
      </CardPanel>
      <CardPanel>
        <h3>Balances and transactions</h3>
        <p>Recorded payments, outstanding balances and transaction history are not available on this card yet.</p>
      </CardPanel>
    </div>
  );
}
