import { planningRows, planningSummary } from "@/features/renewals/renewalPlanning";

export function leaseExpiryDistribution(data: unknown, today: string) {
  const rows = planningRows(data, today);
  const eligible = rows.filter(row => row.classification === "active" && row.href && row.endDate);
  const windows = [
    { label: "Past reported end", matches: (days: number) => days < 0 },
    { label: "Ends in 0–30 days", matches: (days: number) => days >= 0 && days <= 30 },
    { label: "Ends in 31–60 days", matches: (days: number) => days >= 31 && days <= 60 },
    { label: "Ends in 61–90 days", matches: (days: number) => days >= 61 && days <= 90 },
    { label: "Ends after 90 days", matches: (days: number) => days > 90 },
  ];
  return { ...planningSummary(rows), datedActive: eligible.length,
    windows: windows.map(({ label, matches }) => ({ label, count: eligible.filter(row => matches(row.days!)).length })) };
}
