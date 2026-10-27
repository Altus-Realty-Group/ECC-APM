import { safeCsvCell } from "@/lib/csv";
import { ContractError } from "@/lib/dataState";

export type ReportSource = "properties" | "leases" | "owners";
type Cell = string | number | boolean | null;
export type ReportColumn = { key: string; label: string; kind?: "text" | "number" | "boolean" | "texts" };
export type ReportLayout = { id: string; source: ReportSource; title: string; description: string; columns: readonly ReportColumn[] };
export const SNAPSHOT_SCOPE = "Includes the records loaded for this report; it may not include your entire portfolio.";
export const REPORT_LAYOUTS: readonly ReportLayout[] = [
  { id: "property-register", source: "properties", title: "Property register",
    description: "Review reported property identity, location, type and units.",
    columns: [{ key: "id", label: "Property ID" }, { key: "name", label: "Name", kind: "text" },
      { key: "city", label: "City", kind: "text" }, { key: "state", label: "State", kind: "text" },
      { key: "zip", label: "ZIP", kind: "text" }, { key: "type", label: "Type", kind: "text" },
      { key: "units", label: "Reported units", kind: "number" }] },
  { id: "lease-register", source: "leases", title: "Lease dates and status",
    description: "Review reported lease, property, unit, tenant names, dates and status. No inferred rent or payments.",
    columns: [{ key: "id", label: "Lease ID" }, { key: "propertyName", label: "Property", kind: "text" },
      { key: "unitLabel", label: "Unit", kind: "text" }, { key: "tenants", label: "Tenant names", kind: "texts" },
      { key: "status", label: "Status", kind: "text" }, { key: "start", label: "Start (as reported)", kind: "text" },
      { key: "end", label: "End (as reported)", kind: "text" }] },
  { id: "owner-directory", source: "owners", title: "Owner directory",
    description: "Review reported owner names, companies and contact details.",
    columns: [{ key: "id", label: "Owner ID" }, { key: "name", label: "Name", kind: "text" },
      { key: "company", label: "Company", kind: "text" }, { key: "email", label: "Email", kind: "text" },
      { key: "phone", label: "Phone", kind: "text" }] },
];

export function reportLayout(value: string | null | undefined): ReportLayout {
  return REPORT_LAYOUTS.find(layout => layout.id === value) ?? REPORT_LAYOUTS[0];
}
export function reportSelection(search: string): ReportLayout {
  return reportLayout(new URLSearchParams(search).get("template"));
}
export type PortfolioSnapshot = { layout: ReportLayout; columns: readonly ReportColumn[]; rows: Cell[][] };

function toCell(value: unknown, column: ReportColumn): Cell {
  if (value === null || value === undefined || value === "") return null;
  if (column.kind === "texts") {
    if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new ContractError("Report field has an unexpected shape");
    return value.length ? value.join("; ") : null;
  }
  if (column.kind === "text" && typeof value === "string") return value;
  if (column.kind === "number" && typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (!column.kind && (typeof value === "string" || typeof value === "number" && Number.isSafeInteger(value))) return value;
  throw new ContractError("Report field has an unexpected shape");
}

/** Project only known source fields. No currency/date conversion or inferred values. */
export function prepareSnapshot(layout: ReportLayout, raw: unknown): PortfolioSnapshot {
  if (!Array.isArray(raw)) throw new ContractError("Report collection was not an array");
  const records = raw.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new ContractError("Report contains a malformed row");
    const record = row as Record<string, unknown>;
    const id = record.id;
    if (!(typeof id === "string" && id.trim() !== "" || typeof id === "number" && Number.isSafeInteger(id) && id > 0)) {
      throw new ContractError("Report row has no usable record ID");
    }
    return record;
  });
  const ids = records.map(row => String(row.id));
  if (new Set(ids).size !== ids.length) throw new ContractError("Report contains duplicate record IDs");
  // The hooks discard envelope metadata. Never use a fetch/browser time as a source update.
  // An optional row-level updated_at value is retained verbatim only when actually present.
  const columns: readonly ReportColumn[] = records.some(row => row.updated_at !== undefined && row.updated_at !== null)
    ? [...layout.columns, { key: "updated_at", label: "Source updated_at (as reported)", kind: "text" }]
    : layout.columns;
  return { layout, columns, rows: records.map(row => columns.map(column => toCell(row[column.key], column))) };
}

/** Check cache and session again at the export event; rendered data alone is insufficient. */
export function snapshotAtClick(layout: ReportLayout,
  current: { status: string; fetchStatus: string; data: unknown } | undefined,
  renderedData: unknown, renderedEpoch: number, currentEpoch: number,
): PortfolioSnapshot | null {
  if (renderedEpoch !== currentEpoch || !current || current.status !== "success"
    || current.fetchStatus !== "idle" || current.data !== renderedData) return null;
  return prepareSnapshot(layout, current.data);
}

export { safeCsvCell } from "@/lib/csv";
export function snapshotCsv(snapshot: PortfolioSnapshot): string {
  const lines: Cell[][] = [
    ["Report", snapshot.layout.title], ["Scope", SNAPSHOT_SCOPE],
    ["Loaded records", snapshot.rows.length],
    ["Records last updated", "Not reported; row dates, when supplied, are retained as reported."],
    ["Missing values", "Blank cells mean not reported; they do not mean zero."], [],
    snapshot.columns.map(column => column.label), ...snapshot.rows, [],
    ["Disclosures", "Prepared for operational review of the loaded records. This is not an audited financial statement, appraisal or legal/tax opinion. Confirm material amounts and decisions against the underlying records."],
    ["Forward-looking information", "Future outcomes, forecasts or plans, if discussed, depend on assumptions and uncertainties. Actual results may differ; no future result is guaranteed."],
    ["Rights", `© ${new Date().getFullYear()} Altus Property Management. All rights reserved in original report content. Source facts and third-party materials retain their applicable rights.`],
  ];
  return "\ufeff" + lines.map(line => line.map(safeCsvCell).join(",")).join("\r\n");
}

export function downloadSnapshot(snapshot: PortfolioSnapshot): void {
  const url = URL.createObjectURL(new Blob([snapshotCsv(snapshot)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ecc-${snapshot.layout.source}-loaded-snapshot.csv`;
  document.body.appendChild(anchor);
  try { anchor.click(); }
  finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
}
