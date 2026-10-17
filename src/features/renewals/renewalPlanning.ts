import { ContractError } from "@/lib/dataState";
import { parseDateOnly } from "@/lib/recovery/operationsContracts";
import { reportedStatus, safeCardHref, summarizeActiveRent, joinTenants } from "@/pages/portfolio/portfolioTruth";

export const EXPIRY_BUCKETS = ["all", "past", "today", "1-30", "31-60", "61-90", "later", "unknown"] as const;
export type ExpiryBucket = typeof EXPIRY_BUCKETS[number];
export type StatusScope = "planning" | "all" | "active" | "uncertain" | "ended";
export const BUCKET_LABELS: Record<ExpiryBucket, string> = {
  all: "All reported end dates", past: "Before planning date", today: "Ends on planning date", "1-30": "Ends in 1–30 days",
  "31-60": "Ends in 31–60 days", "61-90": "Ends in 61–90 days", later: "Ends after 90 days", unknown: "End date needs verification",
};
export type PlanningRow = {
  key: string; label: string; href?: string; property: string | null; unit: string | null; tenants: string | null;
  status: string | null; classification: "active" | "ended" | "uncertain";
  endDate: string | null; reportedEnd: string | null; days: number | null; bucket: ExpiryBucket; issues: string[];
};
const DAY = 86_400_000;
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
export function chicagoPlanningDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Source LeaseOut.end is mapped from DB end_date. Honor explicit end_date without silently overriding conflicts. */
export function reportedLeaseEnd(row: Record<string, unknown>): { date: string | null; reported: string | null; issue: string | null } {
  const hasCanonical = Object.prototype.hasOwnProperty.call(row, "end_date");
  const value = hasCanonical ? row.end_date : row.end;
  const date = parseDateOnly(value);
  const alternate = parseDateOnly(row.end);
  if (hasCanonical && row.end !== undefined && ((date !== alternate) || (value !== row.end && !date && !alternate))) {
    return { date: null, reported: [text(value), text(row.end)].filter((value, index, values) => value !== null && values.indexOf(value) === index).join(" / ") || null, issue: "Reported end dates disagree" };
  }
  const absent = value === undefined || value === null || typeof value === "string" && !value.trim();
  return { date, reported: text(value), issue: absent ? "End date not reported" : date ? null : "End date needs verification" };
}

export function planningRows(raw: unknown, today: string): PlanningRow[] {
  if (parseDateOnly(today) !== today || !Array.isArray(raw)) throw new ContractError("Renewal planning needs a valid date and collection");
  const seen = new Map<string, number>();
  const rows = raw.map((item, index): PlanningRow => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ContractError("Malformed lease collection");
    const row = item as Record<string, unknown>;
    const href = safeCardHref("lease", row.id);
    if (href) seen.set(href, (seen.get(href) ?? 0) + 1);
    const status = reportedStatus(row.status);
    const classificationTest = summarizeActiveRent([{ status: row.status, rent: null }]);
    const classification = classificationTest.activeCount ? "active" : classificationTest.unclassifiedCount ? "uncertain" : "ended";
    const end = reportedLeaseEnd(row);
    const days = end.date ? (Date.parse(`${end.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY : null;
    const bucket: ExpiryBucket = days === null ? "unknown" : days < 0 ? "past" : days === 0 ? "today" : days <= 30 ? "1-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "later";
    const issues = [...(!href ? ["Lease record link unavailable"] : []), ...(classification === "uncertain" ? [status ? "Lease status is unclassified" : "Lease status not reported"] : []), ...(end.issue ? [end.issue] : [])];
    const tenantsValid = typeof row.tenants === "string" || Array.isArray(row.tenants) && row.tenants.every(tenant => typeof tenant === "string");
    return { key: `loaded-${index}`, label: typeof row.id === "number" || typeof row.id === "string" ? `Lease ${String(row.id)}` : "Lease record",
      href, property: text(row.propertyName), unit: text(row.unitLabel), tenants: tenantsValid ? joinTenants(row.tenants) || null : null,
      status, classification, endDate: end.date, reportedEnd: end.reported, days, bucket, issues };
  });
  return rows.map(row => row.href && (seen.get(row.href) ?? 0) > 1 ? { ...row, href: undefined, issues: [...row.issues, "Duplicate lease reference"] } : row)
    .sort((a, b) => a.days === null ? b.days === null ? 0 : 1 : b.days === null ? -1 : a.days - b.days);
}
export function filterPlanningRows(rows: readonly PlanningRow[], search: string, bucket: ExpiryBucket, scope: StatusScope): PlanningRow[] {
  const needle = search.trim().toLowerCase();
  return rows.filter(row => (scope === "all" || scope === "planning" && row.classification !== "ended" || row.classification === scope)
    && (bucket === "all" || row.bucket === bucket)
    && (!needle || [row.label, row.property, row.unit, row.tenants, row.status, row.reportedEnd, ...row.issues].filter(Boolean).join(" ").toLowerCase().includes(needle)));
}
export function planningSummary(rows: readonly PlanningRow[]) {
  const usableActive = rows.filter(row => row.classification === "active" && row.href && row.endDate);
  return { loaded: rows.length, active: rows.filter(row => row.classification === "active").length,
    due30: usableActive.filter(row => row.days! >= 0 && row.days! <= 30).length,
    due31to90: usableActive.filter(row => row.days! >= 31 && row.days! <= 90).length,
    past: usableActive.filter(row => row.days! < 0).length,
    uncertain: rows.filter(row => row.issues.length > 0).length,
    ended: rows.filter(row => row.classification === "ended").length };
}
