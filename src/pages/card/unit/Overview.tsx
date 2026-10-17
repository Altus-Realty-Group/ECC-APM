import React from 'react';
import { FieldGroup } from "@/components/cardkit/FieldGroup";
// ECC Guardrail compliance
export default function Overview({ unit, property }:{ unit?: any|null; property?: any|null }) {
  const measurement = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : "Not specified";
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
  const propertyId = property?.id;
  const propName = text(property?.name) ?? text(property?.address_street1) ?? text(property?.street1)
    ?? (typeof propertyId === "number" && Number.isSafeInteger(propertyId) && propertyId > 0 ? `Property #${propertyId}` : "Property not reported");
  const rows = [
    { label:'Property', value: propName },
    { label:'Unit Number', value: text(unit?.unit_label) ?? text(unit?.unit_number) ?? 'Not specified' },
    { label:'Beds', value: measurement(unit?.beds) },
    { label:'Baths', value: measurement(unit?.baths) },
    { label:'Sqft', value: measurement(unit?.sqft) },
    { label:'Market Rent', value: unit?.rent_cents!=null? `$${Math.round(unit.rent_cents/100)}`:'Not set' },
    { label:'Status', value: unit?.status || 'Unknown' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4">
      {rows.map((row, i) => (
        <FieldGroup key={i} label={row.label} value={row.value} />
      ))}
    </div>
  );
}