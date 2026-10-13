import React from 'react';
import { Section, MiniCard } from './CardParts';
// ECC Guardrail compliance

export default function RightRail({ activeLease }:{ activeLease?: any|null }) {
  return (
    <div className="space-y-3">
      <Section title="Active Lease">
        {activeLease ? (
          <MiniCard
            title={`Lease #${activeLease.id}`}
            subtitle={activeLease.status || undefined}
            href={`/card/lease/${activeLease.id}`}
          />
        ) : <div className="opacity-70 text-sm">No active lease.</div>}
      </Section>

      <Section title="Contact Methods">
        <div className="text-sm opacity-70">Email, phone, emergency (placeholder).</div>
      </Section>

      <Section title="Pinned Files">
        <ul className="text-sm list-disc pl-5">
          <li>ID copy.pdf</li>
          <li>Reference check.pdf</li>
        </ul>
      </Section>
    </div>
  );
}