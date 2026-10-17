import React from 'react';
import { Section } from './CardParts';
// ECC Guardrail compliance

export default function RightRail({ owner, properties }:{ owner?: any|null; properties?: any[]; }) {
  return (
    <div className="space-y-3">
      <Section title="Portfolio Summary">
        <div className="text-sm opacity-70">Portfolio summary is not available in this panel yet.</div>
      </Section>

      <Section title="Contact Methods">
        <div className="text-sm opacity-70">Contact information is not available in this panel yet.</div>
      </Section>

      <Section title="Pinned Files">
        <div className="text-sm opacity-70">File listing is not available on this card yet.</div>
      </Section>
    </div>
  );
}