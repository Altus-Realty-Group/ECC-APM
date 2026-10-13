import React from 'react';
import { MiniCard } from './CardParts';
// ECC Guardrail compliance
export default function Details({ properties }:{ properties?: any[]|null }) {
  return (
    <div className="space-y-3">
      <div className="font-medium">Portfolio</div>
      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {properties.map((p, i) => (
            <MiniCard 
              key={String(p?.id ?? `idx-${i}`)}
              title={p?.name || `Property #${p?.id ?? 'unknown'}`}
              href={p?.id ? `/card/property/${p.id}` : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm opacity-70">No properties found.</div>
      )}
    </div>
  );
}