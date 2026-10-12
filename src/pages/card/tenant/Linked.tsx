import React from 'react';
import { MiniCard } from './CardParts';
// ECC Guardrail compliance
export default function Linked({ activeLease, property, unit }:{ activeLease?: any|null; property?: any|null; unit?: any|null }) {
  return (
    <div className="grid gap-3">
      <MiniCard title={activeLease ? `Lease #${activeLease.id}` : 'No lease'} href={activeLease?`/card/lease/${activeLease.id}`:undefined}/>
      <MiniCard title={property?.name || (property ? `Property #${property.id}` : 'No property')} href={property?`/card/property/${property.id}`:undefined}/>
      <MiniCard title={unit ? `Unit ${unit.label || `#${unit.id}`}` : 'No unit'} href={unit?`/card/unit/${unit.id}`:undefined}/>
    </div>
  );
}