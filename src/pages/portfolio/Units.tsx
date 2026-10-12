import React, { useMemo, useRef, useState } from "react";
import { useAllUnits } from "../../lib/ecc-resolvers";
import { formatCurrencyFromCents, BLANK } from "@/lib/format";
import CanonicalDenseTableShell from "@/features/command-surface/CanonicalDenseTableShell";
import EccCommandPalette from "@/features/command-surface/EccCommandPalette";
import TriageBoardShell from "@/features/command-surface/TriageBoardShell";
import { CommandSurfaceConfig, CommandSurfaceRow } from "@/features/command-surface/types";

const UNIT_SURFACE_CONFIG: CommandSurfaceConfig = {
  entityLabel: "Unit",
  entityPluralLabel: "Units",
  routePath: "/portfolio/units",
  title: "Units Command Surface",
  subtitle: "Type A zoning over the existing unit resolver, keeping the rollout route-safe and limited to current resolver fields.",
  searchPlaceholder: "Search unit, property, status, or market rent",
  searchLabel: "Search units",
  tableSummary: "Search current rows and select units for local-only triage without adding persistence.",
  selectedLabel: "selected",
  metricALabel: "Mix",
  metricBLabel: "Market Rent",
  metricBFormat: "currency",
  segmentLabel: "Status",
  segmentSummaryLabel: "statuses",
  triageTitle: "Unit Triage",
  triageEmptyLabel: "Select units from the dense table to start local triage.",
  focusCommandLabel: "Focus Unit Search",
};

export default function Units() {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, isFetching, error } = useAllUnits();

  const rows = useMemo(() => {
    if (!data) return [];

    const mapped: CommandSurfaceRow[] = data.map((unit: any) => ({
      id: String(unit.id),
      primary: unit.label ?? unit.unit_number ?? `Unit ${unit.id}`,
      secondary: unit.property_name ?? BLANK,
      metricA: (unit.beds === null || unit.beds === undefined) && (unit.baths === null || unit.baths === undefined)
        ? BLANK
        : `${unit.beds ?? BLANK} bd / ${unit.baths ?? BLANK} ba`,
      metricB: unit.market_rent_cents !== null && unit.market_rent_cents !== undefined
        ? formatCurrencyFromCents(unit.market_rent_cents)
        : BLANK,
      segment: unit.status ?? BLANK,
    }));

    const needle = q.trim().toLowerCase();
    if (!needle) return mapped;
    return mapped.filter((row) =>
      [row.primary, row.secondary, row.metricB, row.segment].join(" ").toLowerCase().includes(needle),
    );
  }, [data, q]);
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));

  return (
    <section className="ecc-page">
      <div className="ecc-command-surface-layout">
        <div>
          <EccCommandPalette config={UNIT_SURFACE_CONFIG} onFocusSearch={() => searchInputRef.current?.focus()} />
          <CanonicalDenseTableShell
            rows={rows}
            config={UNIT_SURFACE_CONFIG}
            loading={isLoading || (isFetching && rows.length === 0)}
            error={error ? String(error) : undefined}
            search={q}
            onSearchChange={setQ}
            searchInputRef={searchInputRef}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(Array.from(new Set(ids)))}
          />
        </div>
        <TriageBoardShell items={selectedRows} config={UNIT_SURFACE_CONFIG} />
      </div>
    </section>
  );
}
