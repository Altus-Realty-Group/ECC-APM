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
        <div className="text-sm opacity-70">Key dates are not available on this card yet.</div>
      </Section>

      <Section title="Pinned Files">
        <div className="text-sm opacity-70">File listing is not available on this card yet.</div>
      </Section>
    </div>
  );
}