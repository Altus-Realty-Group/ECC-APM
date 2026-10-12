import React from 'react';
import { KPI, KPIRow } from '@/components/cardkit/KPI';

export default function AtomsGallery() {
  const rows = [
    { label: 'Type', value: 'RESIDENTIAL_SINGLE_FAMILY' },
    { label: 'Status', value: 'Active' },
    { label: 'DoorLoop ID', value: '67506d4611d949701aba9927', copy: true },
    { label: 'Owner', value: '—' },
    { label: 'GIS', value: 'Open parcel', href: '#' },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="atoms-gallery">
      <h1 className="text-lg font-semibold">Atoms Gallery</h1>
      
      {/* FieldRows Preview */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">FieldRows</h2>
        <div>Legacy FieldRows removed for CardKit alignment</div>
      </div>

      {/* KPI Preview */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold mt-8">KPI</h2>
        <KPIRow>
          <KPI label="Units" value="178 (+1.2%)" />
          <KPI label="Active Leases" value="98" />
          <KPI label="Avg Rent" value="$1,245 (-0.4%)" />
          <KPI label="Status" value="Active" />
        </KPIRow>
        <KPIRow>
          <KPI label="Loading KPI" />
          <KPI label="Loading KPI" />
        </KPIRow>
      </div>

      {/* ActionButton and MiniCard atoms were removed from cardkit; previews dropped. */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold mt-8">ActionButton / MiniCard</h2>
        <div>Removed from CardKit; no preview available</div>
      </div>
    </div>
  );
}