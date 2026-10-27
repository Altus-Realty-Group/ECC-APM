import RelatedRecord from "@/components/recovery/RelatedRecord";
import { BLANK, formatCurrencyFromCents } from "@/lib/format";
export default function Overview({ data }: { data: any }) {
  if (!data) return null; // shell shows skeleton

  const lease = data?.lease;
  const property = data?.property;
  const unit = data?.unit;
  const tenant = data?.tenant;

  const propName = property?.display_name || property?.name || property?.street_1 || null;
  const unitName = unit?.unit_number || unit?.label || null;
  const tenantName = tenant?.display_name || tenant?.name || null;

  const rows = [
    { label:'Property', value: propName ?? (property ? `Property #${property.id}` : null), kind: 'property' as const, id: property?.id },
    { label:'Unit', value: unitName ?? (unit ? `Unit #${unit.id}` : null), kind: 'unit' as const, id: unit?.id },
    { label:'Primary Tenant', value: tenantName ?? (tenant ? `Tenant #${tenant.id}` : null), kind: 'tenant' as const, id: tenant?.id },
    { label:'Status', value: lease?.status || null },
    { label:'Start Date', value: lease?.start_date || null },
    { label:'End Date', value: lease?.end_date || null },
    { label:'Monthly Rent', value: formatCurrencyFromCents(lease?.rent_cents) },
  ];

  return (
    <div className="ecc-record-fields">
      {rows.map(row => (
        <div key={row.label} className="ecc-record-field">
          <span className="font-medium">{row.label}</span>
          {row.kind && typeof row.id === "number" ? (
            <RelatedRecord kind={row.kind} id={row.id} title={String(row.value)} />
          ) : (
            <span>{row.value ?? BLANK}</span>
          )}
        </div>
      ))}
    </div>
  );
}