/* /src/components/DataTable.tsx
   Genesis-grade table:
   - Sticky header + sticky filter row
   - Banded rows, better contrast (see table.css)
   - Per-column filters (text / enum / number range)
   - Multi-sort (click for primary, Shift+click to add/toggle)
   - Right-align numerics automatically
   - Pagination footer with page-size selector at bottom (25..200)
   - CSV export of current filtered set
   - Row hover + double-click opens Drawer
   - Optional row actions menu
   - Loading skeletons & empty/error states

   ZERO external deps; works with existing column configs & mappers.
*/
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import "../styles/table.css";

type Align = "left" | "right";
type SortDir = "asc" | "desc";
type ColType = "text" | "enum" | "number" | "date";

export type DataColumn<Row = any> = {
  key: string;
  header: string;
  align?: Align;
  type?: ColType;                // optional hint; otherwise inferred
  enumValues?: Array<string | number | boolean>;
  render?: (value: any, row: Row) => React.ReactNode;
};

type SortState = { key: string; dir: SortDir };

export type DataTableProps<Row = any> = {
  columns: DataColumn<Row>[];
  rows: Row[];
  loading?: boolean;
  error?: string | null;

  getRowId?: (row: Row, idx: number) => string | number | undefined;

  // Navigation & actions
  rowHref?: (row: Row) => string;
  onRowDoubleClick?: (row: Row) => void;
  rowActions?: (row: Row) => React.ReactNode;

  // These are passed by portfolio pages; make them optional so TS stops complaining.
  csvName?: string;
  drawerTitle?: (row: Row) => string;

  // Initial sort
  initialSort?: SortState[];
};

const PAGE_OPTIONS = [25, 50, 100, 200];

/* ---------- helpers ---------- */
const isNumber = (v: any) => typeof v === "number" && Number.isFinite(v);
const isBool = (v: any) => typeof v === "boolean";
const isDateish = (v: any) =>
  typeof v === "string" && !Number.isNaN(Date.parse(v));

function inferType(values: any[]): ColType {
  const sample = values.find((v) => v !== null && v !== undefined);
  if (sample == null) return "text";
  if (isNumber(sample)) return "number";
  if (isBool(sample)) return "enum";
  if (isDateish(sample)) return "date";
  return "text";
}

function compare(a: any, b: any, type: ColType): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  if (type === "number") return (a as number) - (b as number);
  if (type === "date") return Date.parse(a) - Date.parse(b);
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

function downloadCSV(filename: string, rows: any[], columns: DataColumn[]) {
  const headers = columns.map((c) => c.header);
  const lines = [headers.join(",")];

  for (const r of rows) {
    const line = columns
      .map((c) => {
        const v = (r as any)[c.key];
        const text =
          v == null
            ? ""
            : typeof v === "string"
              ? v
              : typeof v === "number"
                ? String(v)
                : typeof v === "boolean"
                  ? (v ? "true" : "false")
                  : String(v);
        // simple CSV escape
        const needsQuote = /[",\n]/.test(text);
        return needsQuote ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(",");
    lines.push(line);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- component ---------- */
export default function DataTable<Row = any>(props: DataTableProps<Row>) {
  const {
    columns,
    rows,
    loading,
    error,
    getRowId,
    onRowDoubleClick,
    rowHref,
    rowActions,
    initialSort = [],
  } = props;

  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      console.debug("[DataTable] ready", { rows: rows?.length ?? 0 });
    }
  }, [rows?.length, loading]);

  // derive column types & enums
  const colMeta = useMemo(() => {
    return columns.map((c) => {
      const raw = rows.map((r: any) => r?.[c.key]);
      const type = c.type || inferType(raw);
      let enums: Array<string | number | boolean> | undefined = c.enumValues;

      if (!enums && (type === "enum" || isBool(raw.find((v) => v !== null)))) {
        const uniq = new Set(raw.filter((v) => v !== null && v !== undefined));
        // keep the set small & stable
        enums = Array.from(uniq).slice(0, 50);
      }
      return { ...c, type, enumValues: enums };
    });
  }, [columns, rows]);

  // filters
  type TextFilter = { kind: "text"; value: string };
  type EnumFilter = { kind: "enum"; value: string | number | boolean | "__ALL__" };
  type NumFilter = { kind: "number"; min?: number | ""; max?: number | "" };

  type AnyFilter = TextFilter | EnumFilter | NumFilter;

  const [filters, setFilters] = useState<Record<string, AnyFilter>>({});
  const [q, setQ] = useState(""); // global search

  // sorting
  const [sort, setSort] = useState<SortState[]>(initialSort);

  function toggleSort(colKey: string, additive: boolean) {
    setSort((prev) => {
      const idx = prev.findIndex((s) => s.key === colKey);
      if (idx === -1) {
        // add new
        return additive ? [...prev, { key: colKey, dir: "asc" }] : [{ key: colKey, dir: "asc" }];
      }
      // flip dir or remove if already desc
      const next = [...prev];
      const current = next[idx];
      const newDir: SortDir = current.dir === "asc" ? "desc" : "asc";
      next[idx] = { key: current.key, dir: newDir };
      if (!additive) return [next[idx]]; // single sort
      return next;
    });
  }

  // pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(0);

  useEffect(() => {
    // whenever filters or sort changes, reset to page 0
    setPage(0);
  }, [filters, q, sort, pageSize]);

  // apply filters & search
  const filtered = useMemo(() => {
    const textIncludes = (text: string, needle: string) =>
      text.toLowerCase().includes(needle.toLowerCase());

    const passes = (row: any): boolean => {
      // quick global search
      if (q.trim()) {
        const big = colMeta
          .map((c) => {
            const v = row[c.key];
            return v == null ? "" : String(v);
          })
          .join(" • ");
        if (!textIncludes(big, q.trim())) return false;
      }

      // per-column filters
      for (const meta of colMeta) {
        const f = filters[meta.key];
        if (!f) continue;
        const v = row[meta.key];

        if (f.kind === "text") {
          if (!textIncludes(String(v ?? ""), f.value)) return false;
        } else if (f.kind === "enum") {
          if (f.value !== "__ALL__" && v !== f.value) return false;
        } else if (f.kind === "number") {
          const n = v == null ? NaN : Number(v);
          if (f.min !== undefined && f.min !== "" && !(n >= Number(f.min))) return false;
          if (f.max !== undefined && f.max !== "" && !(n <= Number(f.max))) return false;
        }
      }
      return true;
    };

    return rows.filter(passes);
  }, [rows, q, filters, colMeta]);

  // sort
  const sorted = useMemo(() => {
    if (!sort.length) return filtered;
    const withType = (key: string) =>
      colMeta.find((c) => c.key === key)?.type || "text";
    const copy = [...filtered];
    copy.sort((a, b) => {
      for (const s of sort) {
        const t = withType(s.key);
        const cmp = compare((a as any)[s.key], (b as any)[s.key], t);
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return copy;
  }, [filtered, sort, colMeta]);

  // paginate
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = sorted.slice(page * pageSize, page * pageSize + pageSize);

  // Drawer (double-click)
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);
  const closeDrawer = () => setDrawerRow(null);

  function handleDbl(row: Row) {
    // Prefer SPA navigation; fall back to hard nav
    if (rowHref) {
      const href = rowHref(row);
      console.debug("[DT/DBL]", { href, row });
      if (typeof href === "string" && href.length > 0) {
        try { setLocation(href); }
        catch { window.location.assign(href); }
      } else {
        console.error("[DT/DBL] empty href for row", row);
      }
      return;
    }
    if (onRowDoubleClick) onRowDoubleClick(row);
    else setDrawerRow(row);
  }

  // filter setters
  function setTextFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: { kind: "text", value } }));
  }
  function setEnumFilter(key: string, value: any) {
    setFilters((f) => ({ ...f, [key]: { kind: "enum", value } }));
  }
  function setNumFilter(key: string, min?: number | "", max?: number | "") {
    setFilters((f) => ({ ...f, [key]: { kind: "number", min, max } }));
  }

  const rowId = (row: Row, idx: number) =>
    (getRowId?.(row, idx)) ?? (row as any)?.id ?? idx;

  /* ---------- render ---------- */
  return (
    <div className="ecc-table-wrap">
      {/* Toolbar */}
      <div className="ecc-table-toolbar">
        <input
          className="ecc-input"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="ecc-toolbar-spacer" />
        <button
          className="ecc-btn"
          onClick={() =>
            downloadCSV(
              `export_${Date.now()}.csv`,
              sorted,
              colMeta as DataColumn[]
            )
          }
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <table className="ecc-table">
        <thead>
          <tr>
            {colMeta.map((c) => {
              const active = sort.find((s) => s.key === c.key);
              const cls =
                "is-clickable" +
                (active ? " " + active.dir : "");
              return (
                <th
                  key={c.key}
                  className={cls}
                  onClick={(e) => toggleSort(c.key, e.shiftKey)}
                  title="Click to sort, Shift+Click to multi-sort"
                >
                  {c.header}
                </th>
              );
            })}
            {rowActions && <th />}
          </tr>

          {/* Sticky filter row */}
          <tr className="ecc-filter-row">
            {colMeta.map((c) => {
              const f = filters[c.key];
              if (c.type === "number") {
                const nf = (f as any)?.kind === "number" ? (f as NumFilter) : undefined;
                return (
                  <th key={c.key}>
                    <div className="ecc-range">
                      <input
                        className="ecc-input ecc-input--min"
                        placeholder="Min"
                        inputMode="numeric"
                        value={nf?.min ?? ""}
                        onChange={(e) =>
                          setNumFilter(c.key, e.target.value === "" ? "" : Number(e.target.value), nf?.max)
                        }
                      />
                      <input
                        className="ecc-input ecc-input--max"
                        placeholder="Max"
                        inputMode="numeric"
                        value={nf?.max ?? ""}
                        onChange={(e) =>
                          setNumFilter(c.key, nf?.min, e.target.value === "" ? "" : Number(e.target.value))
                        }
                      />
                    </div>
                  </th>
                );
              }

              if (c.type === "enum" && c.enumValues && c.enumValues.length) {
                const ef = (f as any)?.kind === "enum" ? (f as EnumFilter) : undefined;
                const val = ef?.value ?? "__ALL__";
                return (
                  <th key={c.key}>
                    <select
                      className="ecc-select"
                      value={String(val)}
                      onChange={(e) =>
                        setEnumFilter(
                          c.key,
                          e.target.value === "__ALL__" ? "__ALL__" : (e.target.value as any)
                        )
                      }
                    >
                      <option value="__ALL__">All</option>
                      {c.enumValues.map((v) => (
                        <option key={String(v)} value={String(v)}>
                          {String(v)}
                        </option>
                      ))}
                    </select>
                  </th>
                );
              }

              // default: text filter
              const tf = (f as any)?.kind === "text" ? (f as TextFilter) : undefined;
              return (
                <th key={c.key}>
                  <input
                    className="ecc-input"
                    placeholder="Filter…"
                    value={tf?.value ?? ""}
                    onChange={(e) => setTextFilter(c.key, e.target.value)}
                  />
                </th>
              );
            })}
            {rowActions && <th />}
          </tr>
        </thead>

        <tbody>
          {/* loading skeleton */}
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={`sk_${i}`} className="ecc-skel-row">
                {colMeta.map((c) => (
                  <td key={c.key}>
                    <div className="ecc-skel" />
                  </td>
                ))}
                {rowActions && <td />}
              </tr>
            ))}

          {/* error / empty */}
          {!loading && error && (
            <tr>
              <td className="is-empty" colSpan={colMeta.length + (rowActions ? 1 : 0)}>
                <div className="flex flex-col items-center p-8 bg-red-950/20 border border-red-900/50 rounded-lg m-4">
                  <span className="text-red-400 font-bold text-lg mb-2">Error Loading Data</span>
                  <span className="text-red-300/80">{error}</span>
                </div>
              </td>
            </tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr>
              <td className="is-empty" colSpan={colMeta.length + (rowActions ? 1 : 0)}>
                <div className="flex flex-col items-center p-12 text-center bg-white/5 border border-white/10 rounded-lg m-4">
                  <span className="text-neutral-200 font-semibold mb-1">No records found</span>
                  <span className="text-neutral-400 text-sm">The endpoint returned successfully, but there are zero entries to display.</span>
                </div>
              </td>
            </tr>
          )}
          {!loading && !error && rows.length > 0 && current.length === 0 && (
            <tr>
              <td className="is-empty" colSpan={colMeta.length + (rowActions ? 1 : 0)}>
                No results match your current filters.
              </td>
            </tr>
          )}

          {/* rows */}
          {!loading &&
            !error &&
            current.map((row, idx) => (
              <tr
                key={rowId(row, idx)}
                data-testid="datatable-row"
                onDoubleClick={() => handleDbl(row)}
                className="ecc-row cursor-pointer hover:bg-white/5"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") handleDbl(row); }}
              >
                {colMeta.map((c, cellIdx) => {
                  const v = (row as any)[c.key];
                  const content =
                    c.render ? c.render(v, row) : v == null ? "—" : (v as any);
                  const isRight = c.align === "right" || c.type === "number";
                  const isFirstCell = cellIdx === 0;

                  if (isFirstCell) {
                    return (
                      <td key={c.key} className={`min-w-[120px] ${isRight ? "is-right" : ""}`}>
                        <div className="flex items-center gap-2">
                          {rowHref && (
                            <a
                              data-testid="row-link"
                              href={rowHref(row)}
                              onClick={(e) => { e.preventDefault(); handleDbl(row); }}
                              className="underline decoration-dotted underline-offset-4 opacity-70 hover:opacity-100"
                              title="Open card"
                            >
                              Open
                            </a>
                          )}
                          {content}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={c.key} className={isRight ? "is-right" : undefined}>
                      {content}
                    </td>
                  );
                })}
                {rowActions && <td className="is-right">{rowActions(row)}</td>}
              </tr>
            ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="ecc-table-footer">
        <div className="ecc-page">
          {sorted.length.toLocaleString()} result{sorted.length === 1 ? "" : "s"}
        </div>
        <div className="ecc-pager">
          <button
            className="ecc-btn"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <span className="ecc-page"> {page + 1} / {pageCount} </span>
          <button
            className="ecc-btn"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>

          <select
            className="ecc-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Drawer (simple, standards-friendly) */}
      {drawerRow && (
        <div className="ecc-drawer">
          <div className="ecc-drawer__panel">
            <div className="ecc-drawer__head">
              <div className="ecc-drawer__title">Details</div>
              <button className="ecc-btn" onClick={closeDrawer}>Close</button>
            </div>
            <div className="ecc-drawer__body">
              <div className="ecc-grid">
                {colMeta.map((c) => {
                  const v = (drawerRow as any)[c.key];
                  return (
                    <div className="ecc-field" key={c.key}>
                      <div className="ecc-field__label">{c.header}</div>
                      <div className="ecc-field__value">
                        {c.render ? c.render(v, drawerRow) : v == null ? "—" : String(v)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="ecc-drawer__backdrop" onClick={closeDrawer} />
        </div>
      )}
    </div>
  );
}