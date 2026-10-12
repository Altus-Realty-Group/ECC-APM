import React from 'react';
import { MiniCard } from './CardParts';
// ECC Guardrail compliance
export default function Linked({ property, unit, tenant }:{ property?: any|null; unit?: any|null; tenant?: any|null }) {
  return (
    <div className="grid gap-3">
      <MiniCard title={property?.name || (property ? `Property #${property.id}` : 'No property')} href={property?`/card/property/${property.id}`:undefined}/>
      <MiniCard title={unit ? `Unit ${unit.label || `#${unit.id}`}` : 'No unit'} href={unit?`/card/unit/${unit.id}`:undefined}/>
      <MiniCard title={tenant?.display_name ?? 'No tenant'} href={tenant?`/card/tenant/${tenant.id}`:undefined}/>
    </div>
  );
}