import React from 'react';
import { Section } from './CardParts';
// ECC Guardrail compliance

export default function RightRail({ owner, properties }:{ owner?: any|null; properties?: any[]; }) {
  return (
    <div className="space-y-3">
      <Section title="Portfolio Summary">
        <div className="text-sm opacity-70">Property overview (placeholder).</div>
      </Section>

      <Section title="Contact Methods">
        <div className="text-sm opacity-70">Email, phone, address (placeholder).</div>
      </Section>

      <Section title="Pinned Files">
        <ul className="text-sm list-disc pl-5">
          <li>W-9 form.pdf</li>
          <li>Operating agreement.pdf</li>
        </ul>
      </Section>
    </div>
  );
}