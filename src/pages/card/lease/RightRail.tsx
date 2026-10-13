import React from 'react';
import { Section, MiniCard } from './CardParts';
// ECC Guardrail compliance

export default function RightRail({ tenant }:{ tenant?: any|null }) {
  return (
    <div className="space-y-3">
      <Section title="Primary Tenant">
        {tenant ? (
          <MiniCard
            title={tenant.display_name || tenant.name || `Tenant #${tenant.id}`}
            href={`/card/tenant/${tenant.id}`}
          />
        ) : <div className="opacity-70 text-sm">No tenant assigned.</div>}
      </Section>

      <Section title="Key Dates">
        <div className="text-sm opacity-70">Move-in, renewals (placeholder).</div>
      </Section>

      <Section title="Pinned Files">
        <ul className="text-sm list-disc pl-5">
          <li>Lease agreement.pdf</li>
          <li>Security deposit.pdf</li>
        </ul>
      </Section>
    </div>
  );
}