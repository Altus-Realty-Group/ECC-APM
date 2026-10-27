export type Density = "comfortable" | "compact";
export const DENSITY_KEY = "ecc.workspace.density";
export function readDensity(): Density {
  try { return localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable"; }
  catch { return "comfortable"; }
}
