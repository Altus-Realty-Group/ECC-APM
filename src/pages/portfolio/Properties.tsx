import React, { useMemo, useRef, useState } from "react";
import { useAllProperties } from "../../lib/ecc-resolvers";
import { BLANK, formatPercent } from "@/lib/format";
import CanonicalDenseTableShell from "@/features/command-surface/CanonicalDenseTableShell";
import EccCommandPalette from "@/features/command-surface/EccCommandPalette";
import TriageBoardShell from "@/features/command-surface/TriageBoardShell";
import { CommandSurfaceConfig, CommandSurfaceRow } from "@/features/command-surface/types";

const PROPERTY_SURFACE_CONFIG: CommandSurfaceConfig = {
  entityLabel: "Property",
  entityPluralLabel: "Properties",
  routePath: "/portfolio/properties",
  title: "Properties Command Surface",
  subtitle: "Type A zoning over the existing property resolver, using only current ECC collection fields.",
  searchPlaceholder: "Search property, address, id, or market",
  searchLabel: "Search properties",
  tableSummary: "Search current rows and select properties for the optional triage rail.",
  selectedLabel: "selected",
  metricALabel: "Units",
  metricBLabel: "Occupancy",
  metricBFormat: "percentage",
  segmentLabel: "Market",
  segmentSummaryLabel: "markets",
  triageTitle: "Portfolio Triage",
  triageEmptyLabel: "Select properties from the dense table to start local triage.",
  focusCommandLabel: "Focus Property Search",
};

export default function Properties() {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, isFetching, error } = useAllProperties();

  const rows = useMemo(() => {
    if (!data) return [];

    const mapped: CommandSurfaceRow[] = data.map((prop: any) => {
      const address = [prop.street_1, prop.city, prop.state].filter(Boolean).join(", ");
      return {
        id: String(prop.id),
        primary: prop.name ?? prop.label ?? `Property ${prop.id}`,
        secondary: address || BLANK,
        metricA: prop.units !== null && prop.units !== undefined ? String(prop.units) : BLANK,
        metricB: prop.occupancy_pct !== null && prop.occupancy_pct !== undefined
          ? formatPercent(prop.occupancy_pct, 0, "percent")
          : BLANK,
        segment: prop.city ?? prop.state ?? BLANK,
      };
    });

    const needle = q.trim().toLowerCase();
    if (!needle) return mapped;
    return mapped.filter((row) =>
      [row.primary, row.secondary, row.id, row.segment].join(" ").toLowerCase().includes(needle),
    );
  }, [data, q]);
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));

  return (
    <section className="ecc-page">
      <div className="ecc-command-surface-layout">
        <div>
          <EccCommandPalette config={PROPERTY_SURFACE_CONFIG} onFocusSearch={() => searchInputRef.current?.focus()} />
          <CanonicalDenseTableShell
            rows={rows}
            config={PROPERTY_SURFACE_CONFIG}
            loading={isLoading || (isFetching && rows.length === 0)}
            error={error ? String(error) : undefined}
            search={q}
            onSearchChange={setQ}
            searchInputRef={searchInputRef}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(Array.from(new Set(ids)))}
          />
        </div>
        <TriageBoardShell items={selectedRows} config={PROPERTY_SURFACE_CONFIG} />
      </div>
    </section>
  );
}
