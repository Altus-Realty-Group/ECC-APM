// Single navigation source for ECC.
//
// Rules:
//  - Every entry in NAV_SECTIONS must resolve to a route registered in src/App.tsx
//    (enforced by tests/unit/navigation.test.ts). Do not add a link before its page exists.
//  - Destinations that are known but not yet built live in PLANNED_DESTINATIONS. They are
//    an inventory for planning, are never rendered, and must not be routed to stub pages.
//  - Registered routes that must not be linked yet (Admin, owner transfer) are listed in
//    HIDDEN_ROUTES with the reason; they stay reachable by direct URL only.

export type IconName =
  | "LayoutDashboard"
  | "Boxes"
  | "BarChart3"
  | "Database"
  | "Link2"
  | "Building2"
  | "Package"
  | "FileSpreadsheet"
  | "Users"
  | "IdCard"
  | "FileText"
  | "Settings";

export type NavLeaf = { title: string; path: string; icon?: IconName };
export type NavSection = {
  title: string;
  icon: IconName;
  /** Direct link (no children). */
  path?: string;
  children?: NavLeaf[];
};

export const NAV_SECTIONS: NavSection[] = [
  { title: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
  {
    title: "Portfolio",
    icon: "Boxes",
    children: [
      { title: "Properties", path: "/portfolio/properties", icon: "Building2" },
      { title: "Units", path: "/portfolio/units", icon: "Package" },
      { title: "Leases", path: "/portfolio/leases", icon: "FileSpreadsheet" },
      { title: "Tenants", path: "/portfolio/tenants", icon: "Users" },
      { title: "Owners", path: "/portfolio/owners", icon: "IdCard" },
    ],
  },
  {
    title: "Reports",
    icon: "BarChart3",
    children: [
      { title: "Create", path: "/reports/create", icon: "FileText" },
      { title: "Saved", path: "/reports/saved", icon: "FileText" },
      { title: "Templates", path: "/reports/templates", icon: "FileText" },
    ],
  },
  { title: "Data Hub", icon: "Database", path: "/data" },
  {
    title: "Systems",
    icon: "Settings",
    children: [{ title: "Integrations", path: "/systems/integrations", icon: "Link2" }],
  },
];

export type HiddenRoute = { path: string; reason: string };

/**
 * Routes that are registered in App.tsx but deliberately NOT linked from navigation.
 * Re-link only after the reason is resolved and the owner approves.
 */
export const HIDDEN_ROUTES: HiddenRoute[] = [
  {
    path: "/owners/transfer",
    reason:
      "Page crashes on load (references the removed Section component) and, once repaired, exposes an immediate " +
      "Execute owner-transfer action with no confirmation. Needs an owner decision and a verified transfer contract.",
  },
  { path: "/owners/transfer/detail", reason: "Detail view of the owner-transfer workflow above." },
  { path: "/admin/sync", reason: "Admin surface; Dion-only gating is not implemented in the frontend." },
  { path: "/admin/geocode", reason: "Admin surface; Dion-only gating is not implemented in the frontend." },
  { path: "/admin/transfers", reason: "Admin surface; Dion-only gating is not implemented in the frontend." },
];

export type PlannedDestination = {
  title: string;
  path: string;
  group: string;
  /** Why this is not linked yet. */
  dependency: string;
};

const STUB = "Page is a stub; no workflow or verified backend contract yet.";

/** Known-but-unbuilt destinations. Inventory only; never rendered. */
export const PLANNED_DESTINATIONS: PlannedDestination[] = [
  ...[
    ["Overview", "overview"], ["Rent Collection", "rent-collection"], ["Expenses", "expenses"],
    ["Financial Reports", "financial-reports"], ["Tenant Ledgers", "tenant-ledgers"],
    ["Collections Dashboard", "collections-dashboard"], ["Collections Log", "collections-log"],
    ["Payment Plans", "payment-plans"], ["Deposits", "deposits"], ["Transfers", "transfers"],
    ["Subsidized Housing", "subsidized-housing"], ["Assistance Programs", "assistance-programs"],
  ].map(([title, slug]) => ({
    title, path: `/ops/accounting/${slug}`, group: "Accounting",
    dependency: "Needs an accounting data contract from the verified backend owner. " + STUB,
  })),
  ...[
    ["Risk Summary", "risk-summary"], ["Renewal Forecasting", "renewal-forecasting"],
    ["Vacancy Analytics", "vacancy-analytics"], ["ML Leasing Logs", "ml-leasing-logs"],
  ].map(([title, slug]) => ({
    title, path: `/ops/ai/${slug}`, group: "AI Analytics",
    dependency: "Needs an approved analytics source. " + STUB,
  })),
  ...[
    ["Case Manager", "case-manager"], ["Advanced Legal Ops", "advanced"],
    ["Legal Docs", "docs"], ["Attorney Reports", "attorney-reports"],
  ].map(([title, slug]) => ({
    title, path: `/ops/legal/${slug}`, group: "Legal Tracker",
    dependency: "Needs a legal case contract and access rules. " + STUB,
  })),
  ...[
    ["Queue", "queue"], ["Templates", "templates"], ["Logs", "logs"],
  ].map(([title, slug]) => ({
    title, path: `/ops/comms/${slug}`, group: "Communication",
    dependency: "Needs an approved communications provider and send policy. " + STUB,
  })),
  ...[
    ["Work Orders", "work-orders"], ["Vendors", "vendors"],
    ["Materials & Inventory", "materials-inventory"], ["Smart Routing", "smart-routing"],
    ["AI Intelligence", "ai-intelligence"], ["Build/Repair Projects", "build-repair-projects"],
    ["Capital Projects", "capital-projects"],
  ].map(([title, slug]) => ({
    title, path: `/ops/maintenance/${slug}`, group: "Construction & Repair",
    dependency: "Needs a real work-order contract; current server handlers return constructed data. " + STUB,
  })),
  { title: "Reports Home", path: "/ops/reports", group: "Reports", dependency: STUB },
  { title: "Marketing", path: "/growth/marketing", group: "Growth", dependency: STUB },
  { title: "Automation", path: "/system/automation", group: "System", dependency: STUB },
  { title: "Settings", path: "/system/settings", group: "System", dependency: STUB },
  ...[
    ["Sync Audit", "sync-audit"], ["Sync Management", "sync-management"], ["Raw Data", "raw"],
    ["Sync Logs", "sync-logs"], ["System Settings", "system-settings"],
  ].map(([title, slug]) => ({
    title, path: `/data/${slug}`, group: "Data Management",
    dependency: "Needs sync-status contract from the verified backend owner. " + STUB,
  })),
  ...[
    ["Dashboard", "dashboard"], ["Portfolio Analytics", "portfolio-analytics"],
    ["Financial Reports", "financial-reports"],
  ].map(([title, slug]) => ({
    title, path: `/investor/${slug}`, group: "Investor Portal",
    dependency: "Needs investor-scoped access rules and data contract. " + STUB,
  })),
  ...[
    ["Dropbox Files", "dropbox"], ["CoreLogic / MLS Grid", "corelogic"],
    ["Field App Link", "field-app"], ["Deal Room Link", "deal-room"],
  ].map(([title, slug]) => ({
    title, path: `/integrations/${slug}`, group: "Integrations",
    dependency: "Needs provider connection and credentials owned outside this repo. " + STUB,
  })),
];

/** Every link the shell can render, in display order. */
export function navLeafPaths(sections: NavSection[] = NAV_SECTIONS): string[] {
  const out: string[] = [];
  for (const s of sections) {
    if (s.path) out.push(s.path);
    for (const c of s.children ?? []) out.push(c.path);
  }
  return out;
}

/** Segment-aware match: "/data" matches "/data" and "/data/x" but not "/database". */
export function isPathActive(location: string, path?: string): boolean {
  if (!path) return false;
  return location === path || location.startsWith(path + "/");
}

/** The section that owns the current location, or null. Longest matching path wins. */
export function activeSectionTitle(location: string, sections: NavSection[] = NAV_SECTIONS): string | null {
  let best: { title: string; len: number } | null = null;
  for (const s of sections) {
    const candidates = [s.path, ...(s.children ?? []).map((c) => c.path)];
    for (const p of candidates) {
      if (p && isPathActive(location, p) && (!best || p.length > best.len)) {
        best = { title: s.title, len: p.length };
      }
    }
  }
  return best?.title ?? null;
}
