import { BLANK } from "@/lib/format";
export default function Overview({ data }: { data: any }) {
  if (!data) return null; // shell shows skeleton

  const owner = data?.owner;

  const displayName = owner?.display_name || owner?.name || owner?.company_name || null;
  const email = owner?.email || owner?.primary_email || null;
  const phone = owner?.phone || owner?.primary_phone || null;
  const address = owner ? [owner.street_1, owner.city, owner.state].filter(Boolean).join(', ') || null : null;

  const rows = [
    { label:'Name', value: displayName },
    { label:'Email', value: email },
    { label:'Phone', value: phone },
    { label:'Address', value: address },
    { label:'Properties Count', value: owner?.properties_count ?? null },
    { label:'Total Units', value: owner?.total_units ?? null },
    { label:'Status', value: owner?.status || null },
  ];

  return (
    <div className="ecc-record-fields">
      {rows.map(row => (
        <div key={row.label} className="ecc-record-field">
          <span className="font-medium">{row.label}</span>
          <span>{row.value ?? BLANK}</span>
        </div>
      ))}
    </div>
  );
}