import React, { useMemo, useRef, useState } from "react";
import { accessGuard, useResetOnAccessLoss } from "@/lib/useAccessGuard";
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
  title: "Units",
  subtitle: "Search units and open a unit card from any row.",
  searchPlaceholder: "Search unit, property, status, or market rent",
  searchLabel: "Search units",
  tableSummary: "Search units and select rows to review them together.",
  selectedLabel: "selected",
  metricALabel: "Mix",
  metricBLabel: "Market Rent",
  metricBFormat: "currency",
  segmentLabel: "Status",
  segmentSummaryLabel: "statuses",
  triageTitle: "Unit Triage",
  triageEmptyLabel: "Select units from the table to review them here.",
  focusCommandLabel: "Focus Unit Search",
  rowHref: (id) => `/card/unit/${id}`,
};

export default function Units() {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const query = useAllUnits();
  const { isLoading, isFetching, error, refetch } = query;
  // After a 401/403 TanStack keeps the previous rows; they must not be shown, summarized or selectable.
  const { data, denied } = accessGuard(query);
  const epoch = useResetOnAccessLoss(denied, () => setSelectedIds([]));

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
            error={error ?? undefined}
            onRetry={() => { void refetch(); }}
            retrying={isFetching}
            search={q}
            onSearchChange={setQ}
            searchInputRef={searchInputRef}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(Array.from(new Set(ids)))}
          />
        </div>
        <TriageBoardShell key={epoch} items={selectedRows} config={UNIT_SURFACE_CONFIG} />
      </div>
    </section>
  );
}
