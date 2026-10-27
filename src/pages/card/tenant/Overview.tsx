import { formatCurrencyFromCents } from "@/lib/format";
import React from 'react';
import { FieldGroup } from "@/components/cardkit/FieldGroup";
// ECC Guardrail compliance
export default function Overview({ tenant, activeLease }:{ tenant?: any|null; activeLease?: any|null }) {
  const rows = [
    { label:'Name', value: tenant?.display_name || tenant?.name || 'Unknown tenant' },
    { label:'Email', value: tenant?.email || 'Not provided' },
    { label:'Phone', value: tenant?.phone || 'Not provided' },
    { label:'Current Balance', value: formatCurrencyFromCents(tenant?.balance_cents) },
    { label:'Active Lease', value: activeLease?.id ? `Lease ${activeLease.doorloop_id || activeLease.id}` : 'No active lease', href: activeLease?`/card/lease/${activeLease.id}`:undefined },
    { label:'Move-in Date', value: activeLease?.start_date || 'Not available' },
    { label:'Status', value: tenant?.status || 'Unknown' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
      {rows.map((row, i) => (
        <FieldGroup key={i} label={row.label} value={row.value} />
      ))}
    </div>
  );
}