import React from 'react';
import { Section } from './CardParts';
// ECC Guardrail compliance
export default function Financials(){
  return (
    <div className="space-y-3">
      <Section title="Tenant Ledger"><div className="text-sm opacity-70">Ledger records are not available on this card yet.</div></Section>
    </div>
  );
}