import React, { useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Building2, CircleDollarSign, MapPinned, Percent, Rows3 } from "lucide-react";
import { CommandSurfaceConfig, CommandSurfaceRow } from "./types";
import "@/styles/command-surface.css";

type Props = {
  rows: CommandSurfaceRow[];
  config: CommandSurfaceConfig;
  loading?: boolean;
  error?: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
};

export default function CanonicalDenseTableShell({
  rows,
  config,
  loading,
  error,
  search,
  onSearchChange,
  searchInputRef,
  selectedIds,
  onSelectionChange,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "primary", desc: false }]);

  const columns = useMemo<ColumnDef<CommandSurfaceRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={rows.length > 0 && selectedIds.length === rows.length}
            onChange={(event) => onSelectionChange(event.target.checked ? rows.map((row) => row.id) : [])}
            aria-label={`Select all visible ${config.entityPluralLabel.toLowerCase()}`}
          />
        ),
        cell: ({ row }) => {
          const rowId = row.original.id;
          const checked = selectedIds.includes(rowId);
          return (
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) =>
                onSelectionChange(
                  event.target.checked
                    ? [...selectedIds, rowId]
                    : selectedIds.filter((id) => id !== rowId),
                )
              }
              aria-label={`Select ${config.entityLabel.toLowerCase()} ${row.original.primary}`}
            />
          );
        },
        enableSorting: false,
      },
      { accessorKey: "id", header: "ID" },
      { accessorKey: "primary", header: config.entityLabel },
      { accessorKey: "secondary", header: "Context" },
      { accessorKey: "metricA", header: config.metricALabel },
      { accessorKey: "metricB", header: config.metricBLabel },
      { accessorKey: "segment", header: config.segmentLabel },
    ],
    [config, onSelectionChange, rows, selectedIds],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue ?? "").trim().toLowerCase();
      if (!needle) return true;
      const haystack = [
        row.original.id,
        row.original.primary,
        row.original.secondary,
        row.original.metricA,
        row.original.metricB,
        row.original.segment,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
  const metricBNumbers = rows
    .map((row) => Number.parseFloat(row.metricB.replace(/[^0-9.-]/g, "")))
    .filter((value) => Number.isFinite(value));
  const averageMetricB = metricBNumbers.length
    ? Math.round(metricBNumbers.reduce((sum, value) => sum + value, 0) / metricBNumbers.length)
    : 0;
  const averageMetricBDisplay = config.metricBFormat === "currency"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(averageMetricB)
    : config.metricBFormat === "percentage"
      ? `${averageMetricB}%`
      : String(averageMetricB);

  return (
    <section className="ecc-command-surface ecc-object">
      <div className="ecc-command-surface__context">
        <div>
          <p className="ecc-command-surface__eyebrow">T0 Context</p>
          <h1 className="ecc-command-surface__title">{config.title}</h1>
          <p className="ecc-command-surface__subtitle">{config.subtitle}</p>
        </div>
        <div className="ecc-command-surface__stats">
          <div className="ecc-command-stat">
            <Rows3 size={16} />
            <span>{rows.length} loaded</span>
          </div>
          <div className="ecc-command-stat">
            {config.metricBFormat === "currency" ? <CircleDollarSign size={16} /> : <Percent size={16} />}
            <span>{averageMetricBDisplay} avg {config.metricBLabel.toLowerCase()}</span>
          </div>
          <div className="ecc-command-stat">
            <MapPinned size={16} />
            <span>{new Set(rows.map((row) => row.segment)).size} {config.segmentSummaryLabel}</span>
          </div>
        </div>
      </div>

      <div className="ecc-command-surface__toolbar">
        <div className="ecc-command-surface__toolbar-copy">
          <p className="ecc-command-surface__eyebrow">T2 Filters / Search</p>
          <span>{config.tableSummary}</span>
        </div>
        <label className="ecc-command-search">
          <span className="sr-only">{config.searchLabel}</span>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={config.searchPlaceholder}
          />
        </label>
      </div>

      <div className="ecc-command-surface__table-wrap">
        <div className="ecc-command-surface__table-header">
          <div>
            <p className="ecc-command-surface__eyebrow">T3 Dense Table</p>
            <span>TanStack-powered grid with dense ECC spacing and contract-safe columns.</span>
          </div>
          <div className="ecc-command-surface__selected">
            <Building2 size={16} />
            <span>{selectedRows.length} {config.selectedLabel}</span>
          </div>
        </div>

        {loading ? <div className="ecc-command-empty-panel">Loading {config.entityLabel.toLowerCase()} command surface…</div> : null}
        {!loading && error ? <div className="ecc-command-empty-panel">{error}</div> : null}
        {!loading && !error ? (
          <div className="ecc-command-table-shell">
            <table className="ecc-command-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      return (
                        <th key={header.id}>
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              className={canSort ? "ecc-command-table__sort" : "ecc-command-table__static"}
                              onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort ? <ArrowUpDown size={14} /> : null}
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRows.length === 0 ? (
              <div className="ecc-command-empty-panel">No {config.entityPluralLabel.toLowerCase()} match the current search.</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="ecc-command-surface__footer">
        <div>
          <p className="ecc-command-surface__eyebrow">T4 Footer / Summary</p>
          <span>
            {visibleRows.length} visible row{visibleRows.length === 1 ? "" : "s"} across the current filter state.
          </span>
        </div>
        <div className="ecc-command-surface__footer-summary">
          <span>Selected IDs: {selectedRows.map((row) => row.id).join(", ") || "none"}</span>
        </div>
      </div>
    </section>
  );
}
