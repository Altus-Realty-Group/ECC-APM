// A1 explicit legal scope_ref mapping. A scope_ref is an opaque ECC label; it gains meaning only through a reviewed registry
// entry that names exactly one central company. Never inferred from names, accountId, folders or route parameters.
import { UUID } from "./session";

/** The only characters allowed in a scope_ref. Excludes ',' (the database context list separator), whitespace and controls. */
export const SCOPE_REF = /^[A-Za-z0-9._:-]{1,128}$/;

export type ScopeBinding = {
  scopeRef: string;
  companyId: string;
  status: "verified" | "proposed" | "retired";
  /** Pointer to the review that verified the mapping (an issue/PR/decision id), never a secret. */
  reviewRef: string;
};

export type BindingRegistry = { readonly byScope: ReadonlyMap<string, ScopeBinding>; readonly rejected: readonly string[] };

/** Production default: no bindings, so every legal scope is denied until an accepted, reviewed registry is supplied. */
export const EMPTY_REGISTRY: BindingRegistry = Object.freeze({ byScope: new Map(), rejected: [] });

/** Build a registry; invalid entries and any scope_ref bound to two companies are rejected (and excluded entirely). */
export function buildBindingRegistry(entries: readonly unknown[]): BindingRegistry {
  const byScope = new Map<string, ScopeBinding>();
  const rejected: string[] = [];
  const conflicted = new Set<string>();
  entries.forEach((raw, i) => {
    const e = raw as Partial<ScopeBinding> | null;
    const ok = !!e && typeof e.scopeRef === "string" && SCOPE_REF.test(e.scopeRef) && typeof e.companyId === "string" && UUID.test(e.companyId)
      && (e.status === "verified" || e.status === "proposed" || e.status === "retired")
      && typeof e.reviewRef === "string" && e.reviewRef.trim() !== "";
    if (!ok) { rejected.push(`entry ${i}: invalid`); return; }
    const b: ScopeBinding = { scopeRef: e!.scopeRef!, companyId: e!.companyId!.toLowerCase(), status: e!.status!, reviewRef: e!.reviewRef!.trim() };
    const prior = byScope.get(b.scopeRef);
    if (prior && prior.companyId !== b.companyId) { conflicted.add(b.scopeRef); return; }
    if (prior) { rejected.push(`entry ${i}: duplicate scope_ref`); return; }
    byScope.set(b.scopeRef, b);
  });
  for (const s of conflicted) { byScope.delete(s); rejected.push(`scope_ref ${s}: bound to more than one company`); }
  return { byScope, rejected };
}

/** scope_refs whose VERIFIED binding names one of these companies. Proposed/retired bindings never authorize. */
export function scopesForCompanies(registry: BindingRegistry, companyIds: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const b of registry.byScope.values()) if (b.status === "verified" && companyIds.has(b.companyId)) out.push(b.scopeRef);
  return out.sort();
}
