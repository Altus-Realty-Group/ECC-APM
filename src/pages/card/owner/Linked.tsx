import React from 'react';
import { MiniCard } from './CardParts';
// ECC Guardrail compliance
export default function Linked({ properties }:{ properties?: any[]|null }) {
  return (
    <div className="grid gap-3">
      {properties && properties.length > 0 ? (
        properties.slice(0, 5).map((p, i) => (
          <MiniCard 
            key={String(p?.id ?? `idx-${i}`)}
            title={p?.name || `Property #${p?.id ?? 'unknown'}`}
            href={p?.id ? `/card/property/${p.id}` : undefined}
          />
        ))
      ) : (
        <div className="text-sm opacity-70">No linked properties.</div>
      )}
    </div>
  );
}