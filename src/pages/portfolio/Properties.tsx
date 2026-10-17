import React, { useMemo, useRef, useState } from "react";
import { accessGuard, useResetOnAccessLoss } from "@/lib/useAccessGuard";
import { useAllProperties } from "../../lib/ecc-resolvers";
import { BLANK, formatPercent } from "@/lib/format";
import CanonicalDenseTableShell from "@/features/command-surface/CanonicalDenseTableShell";
import EccCommandPalette from "@/features/command-surface/EccCommandPalette";
import StateNotice from "@/components/ui/StateNotice";
import TriageBoardShell from "@/features/command-surface/TriageBoardShell";
import { CommandSurfaceConfig, CommandSurfaceRow } from "@/features/command-surface/types";

const PROPERTY_SURFACE_CONFIG: CommandSurfaceConfig = {
  entityLabel: "Property",
  entityPluralLabel: "Properties",
  routePath: "/portfolio/properties",
  title: "Properties",
  subtitle: "Search the portfolio and open a property card from any row.",
  searchPlaceholder: "Search property, address, id, or market",
  searchLabel: "Search properties",
  tableSummary: "Search properties and select rows to review them together.",
  selectedLabel: "selected",
  metricALabel: "Units",
  metricBLabel: "Occupancy",
  metricBFormat: "percentage",
  segmentLabel: "Market",
  segmentSummaryLabel: "markets",
  triageTitle: "Portfolio Triage",
  triageEmptyLabel: "Select properties from the table to review them here.",
  focusCommandLabel: "Focus Property Search",
  rowHref: (id) => `/card/property/${id}`,
};

type PropertiesQuery = Pick<ReturnType<typeof useAllProperties>,
  "data" | "isLoading" | "isFetching" | "isError" | "isSuccess" | "error" | "refetch">;

/** The routed page and render regressions share this exact presentation boundary. */
export function PropertiesSurface({ query }: { query: PropertiesQuery }) {
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isLoading, isFetching, error, refetch } = query;
  // After a 401/403 TanStack keeps the previous rows; they must not be shown, summarized or selectable.
  const { data, denied } = accessGuard(query);
  // Only a completed successful read can support counts or selectable review rows.
  // A failed refresh may retain cached data; it must not look like a current verified result.
  const ready = query.isSuccess && !query.isError && !isFetching && !denied && !error && Array.isArray(data);
  const epoch = useResetOnAccessLoss(!ready, () => setSelectedIds([]));

  const rows = useMemo(() => {
    if (!ready || !data) return [];

    const mapped: CommandSurfaceRow[] = data.map((prop: any) => {
      const address = [prop.street_1, prop.city, prop.state].filter(Boolean).join(", ");
      return {
        id: String(prop.id),
        primary: prop.name ?? prop.label ?? `Property ${prop.id}`,
        secondary: address || BLANK,
        metricA: prop.units !== null && prop.units !== undefined ? String(prop.units) : BLANK,
        metricB: typeof prop.occPct === "number" && Number.isFinite(prop.occPct) && prop.occPct >= 0 && prop.occPct <= 100
          ? formatPercent(prop.occPct, 0, "percent")
          : BLANK,
        segment: prop.city ?? prop.state ?? BLANK,
      };
    });

    const needle = q.trim().toLowerCase();
    if (!needle) return mapped;
    return mapped.filter((row) =>
      [row.primary, row.secondary, row.id, row.segment].join(" ").toLowerCase().includes(needle),
    );
  }, [data, q, ready]);
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));

  return (
    <section className="ecc-page">
      <div className="ecc-command-surface-layout">
        <div>
          <EccCommandPalette config={PROPERTY_SURFACE_CONFIG} onFocusSearch={() => searchInputRef.current?.focus()} />
          {ready ? <CanonicalDenseTableShell
            rows={rows}
            config={PROPERTY_SURFACE_CONFIG}
            loading={isLoading || (isFetching && rows.length === 0)}
            error={error ?? undefined}
            onRetry={() => { void refetch(); }}
            retrying={isFetching}
            search={q}
            onSearchChange={setQ}
            searchInputRef={searchInputRef}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(Array.from(new Set(ids)))}
          /> : (
            <section className="ecc-command-surface ecc-object">
              <h1 className="ecc-command-surface__title">Properties</h1>
              <StateNotice
                kind={denied ? "denied" : query.isError || error ? "error" : isLoading || isFetching ? "loading" : "partial"}
                title={denied ? "You don't have access to properties."
                  : query.isError || error ? "Properties could not be loaded."
                  : isLoading || isFetching ? "Loading properties..."
                  : "Properties have not been confirmed."}
                detail="Portfolio counts and selection review are unavailable until properties load successfully."
                onRetry={isLoading || isFetching ? undefined : () => { void refetch(); }}
              />
            </section>
          )}
        </div>
        {ready ? <TriageBoardShell key={epoch} items={selectedRows} config={PROPERTY_SURFACE_CONFIG} /> : (
          <aside className="ecc-triage-shell ecc-object">
            <p className="ecc-command-surface__eyebrow">Review</p>
            <p>Selection review is unavailable until properties load successfully.</p>
          </aside>
        )}
      </div>
    </section>
  );
}

export default function Properties() {
  return <PropertiesSurface query={useAllProperties()} />;
}
