import { planningRows, type PlanningRow } from "@/features/renewals/renewalPlanning";
import { vacancyRows } from "@/features/vacancy/VacancyReviewPage";
import type { UnitReviewRow } from "@/pages/portfolio/unitWorkflow";

export type RecordQuery = {
  data?: unknown; isSuccess: boolean; isLoading: boolean; isFetching: boolean;
  isError: boolean; error: unknown; refetch: () => unknown;
};
export function confirmedRows<T>(query: RecordQuery | undefined, parse: (value: unknown) => T[]): T[] | null {
  if (!query || !query.isSuccess || query.isLoading || query.isFetching || query.isError || query.error || query.data === undefined) return null;
  try { return parse(query.data); } catch { return null; }
}
export const confirmedLeases = (query: RecordQuery | undefined, date: string) => confirmedRows(query, value => planningRows(value, date));
export const confirmedUnits = (query: RecordQuery | undefined) => confirmedRows(query, vacancyRows);

export type LeaseWindow = "review" | "past" | "soon" | "next" | "later" | "verify" | "all";
export const LEASE_WINDOWS: { key: LeaseWindow; label: string }[] = [
  { key: "past", label: "Past end date" }, { key: "soon", label: "0–30 days" },
  { key: "next", label: "31–90 days" }, { key: "later", label: "After 90 days" },
];
export function inLeaseWindow(row: PlanningRow, window: LeaseWindow) {
  if (window === "verify") return row.issues.length > 0;
  if (window === "all") return true;
  if (row.classification !== "active" || !row.href || !row.endDate || row.days === null) return false;
  if (window === "past") return row.days < 0;
  if (window === "soon") return row.days >= 0 && row.days <= 30;
  if (window === "next") return row.days >= 31 && row.days <= 90;
  if (window === "later") return row.days > 90;
  return row.days <= 90;
}
export function unitStatusGroups(rows: UnitReviewRow[]) {
  const groups = new Map<string | null, number>();
  for (const row of rows) groups.set(row.status, (groups.get(row.status) ?? 0) + 1);
  return [...groups].map(([status, count]) => ({ status, key: unitStatusKey(status), label: status ?? "Status not supplied", count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
export const unitStatusKey = (status: string | null) => status === null ? "missing" : `reported:${status}`;
