import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Route patterns registered in src/App.tsx, e.g. "/card/property/:id". */
export function appRoutePatterns(): string[] {
  const src = read("src/App.tsx");
  return [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
}

/** wouter-style pattern ("/a/:id") -> regex. */
export function patternToRegex(pattern: string): RegExp {
  const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:[A-Za-z0-9_]+/g, "[^/]+");
  return new RegExp(`^${esc}$`);
}

export function routeExists(urlPath: string, patterns = appRoutePatterns()): boolean {
  return patterns.some((p) => patternToRegex(p).test(urlPath));
}
