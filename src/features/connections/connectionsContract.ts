import { ContractError } from "@/lib/dataState";

export const APPLICATIONS = [
  { key: "field-app", title: "Field App", path: "/properties", action: "Open field properties",
    purpose: "Capture inspections, measurements, photos and onsite findings.",
    next: "Choose the property in Field App, then open its inspection or capture workflow.",
    owner: "Field App preserves the original onsite observations and evidence." },
  { key: "construction-manager", title: "Construction Manager", path: "/projects", action: "Open construction projects",
    purpose: "Review projects, planned work, estimates and construction follow-up.",
    next: "Choose the project in Construction Manager and review the next work or missing evidence.",
    owner: "Construction Manager owns construction planning and project records." },
  { key: "deal-room", title: "Deal Room", path: "/", action: "Open Deal Room",
    purpose: "Review deal collaboration, approved documents and investor-facing evidence.",
    next: "Choose the deal in Deal Room and confirm which documents or evidence belong there.",
    owner: "Deal Room controls deal membership, document approval and publication." },
  { key: "property-intelligence", title: "Property Intelligence", path: null, action: "",
    purpose: "Review property facts with their source, date and supporting evidence.",
    next: "Continue with recorded ECC property details while access to shared property facts is arranged.",
    owner: "Property Intelligence owns shared property facts and their provenance." },
] as const;
export type ApplicationKey = typeof APPLICATIONS[number]["key"];
export type ApplicationLink = { key: ApplicationKey; navigationUrl: string | null };
export type Connections = { applications: ApplicationLink[] };

function fail(): never { throw new ContractError("Unexpected application links response"); }
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

/** Server attestation/allowlist owns origins; client independently rejects unsafe/list-mismatched links. */
export function safeNavigationUrl(key: ApplicationKey, value: unknown): string | null {
  if (value === null) return null;
  const app = APPLICATIONS.find(item => item.key === key);
  if (!app || app.path === null || typeof value !== "string" || value !== value.trim() || /[\u0000-\u0020\\]/.test(value)) return fail();
  let url: URL;
  try { url = new URL(value); } catch { return fail(); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
    || !host.includes(".") || host.endsWith(".") || host.startsWith("[") || /^[\d.]+$/.test(host)
    || host === "localhost" || /\.(localhost|local|internal|test|invalid)$/.test(host)
    || url.pathname !== app.path) return fail();
  return url.href;
}

/** Exact four application keys, no omissions/duplicates/extra fields or fabricated fallback links. */
export function parseConnections(raw: unknown): Connections {
  if (!object(raw) || Object.keys(raw).length !== 1 || !Array.isArray(raw.applications) || raw.applications.length !== APPLICATIONS.length) return fail();
  const byKey = new Map<ApplicationKey, ApplicationLink>();
  for (const value of raw.applications) {
    if (!object(value) || Object.keys(value).length !== 2 || !Object.prototype.hasOwnProperty.call(value, "key") || !Object.prototype.hasOwnProperty.call(value, "navigationUrl")) return fail();
    const key = value.key;
    if (typeof key !== "string" || !APPLICATIONS.some(app => app.key === key) || byKey.has(key as ApplicationKey)) return fail();
    byKey.set(key as ApplicationKey, { key: key as ApplicationKey, navigationUrl: safeNavigationUrl(key as ApplicationKey, value.navigationUrl) });
  }
  return { applications: APPLICATIONS.map(app => byKey.get(app.key) ?? fail()) };
}
