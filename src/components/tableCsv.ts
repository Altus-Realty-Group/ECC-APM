import { safeCsvCell, type CsvCell } from "@/lib/csv";

export function tableCsv(rows: readonly Record<string, unknown>[], columns: readonly { key: string; header: string }[]): string {
  const cell = (value: unknown): CsvCell => value == null ? null
    : typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : String(value);
  return "\ufeff" + [columns.map(c => safeCsvCell(c.header)).join(","),
    ...rows.map(row => columns.map(c => safeCsvCell(cell(row[c.key]))).join(","))].join("\r\n");
}
