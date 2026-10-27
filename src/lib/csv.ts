export type CsvCell = string | number | boolean | null;

/** Shared spreadsheet-safe encoding for records and report exports. */
export function safeCsvCell(value: CsvCell): string {
  let text = value === null ? "" : String(value);
  if (typeof value === "string" && (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
