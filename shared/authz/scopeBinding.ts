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

export type BindingRegistry = {
  /** Scopes with exactly one valid record. */
  readonly byScope: ReadonlyMap<string, ScopeBinding>;
  /** Scopes that had more than one record, or any malformed record, and are therefore unusable. Order-independent. */
  readonly invalidScopes: ReadonlySet<string>;
  readonly rejected: readonly string[];
};

/** Production default: no bindings, so every legal scope is denied until an accepted, reviewed registry is supplied. */
export const EMPTY_REGISTRY: BindingRegistry = Object.freeze({ byScope: new Map(), invalidScopes: new Set<string>(), rejected: [] });

const claimedScope = (raw: unknown): string | null => {
  const s = (raw as { scopeRef?: unknown } | null)?.scopeRef;
  return typeof s === "string" && SCOPE_REF.test(s) ? s : null;
};

function validBinding(raw: unknown): ScopeBinding | null {
  const e = raw as Partial<ScopeBinding> | null;
  const ok = !!e && typeof e.scopeRef === "string" && SCOPE_REF.test(e.scopeRef) && typeof e.companyId === "string" && UUID.test(e.companyId)
    && (e.status === "verified" || e.status === "proposed" || e.status === "retired")
    && typeof e.reviewRef === "string" && e.reviewRef.trim() !== "";
  return ok ? { scopeRef: e!.scopeRef!, companyId: e!.companyId!.toLowerCase(), status: e!.status!, reviewRef: e!.reviewRef!.trim() } : null;
}

/**
 * Build a registry. The result does not depend on entry order. A scope_ref is usable only if it has EXACTLY ONE record and that
 * record is valid: two records for the same scope (verified+retired, verified+proposed, two companies, or an identical duplicate)
 * or a malformed record that names the scope invalidate the WHOLE scope; nothing is picked "first". Entries whose scope_ref cannot
 * be read are rejected (there is no scope to invalidate).
 */
export function buildBindingRegistry(entries: readonly unknown[]): BindingRegistry {
  const groups = new Map<string, unknown[]>();
  const rejected: string[] = [];
  entries.forEach((raw, i) => {
    const scope = claimedScope(raw);
    if (scope === null) { rejected.push(`entry ${i}: unreadable scope_ref`); return; }
    const g = groups.get(scope) ?? [];
    g.push(raw);
    groups.set(scope, g);
  });
  const byScope = new Map<string, ScopeBinding>();
  const invalidScopes = new Set<string>();
  for (const [scope, records] of groups) {
    const only = records.length === 1 ? validBinding(records[0]) : null;
    if (only) byScope.set(scope, only);
    else { invalidScopes.add(scope); rejected.push(`scope_ref ${scope}: ${records.length > 1 ? "multiple records" : "malformed record"}`); }
  }
  return { byScope, invalidScopes, rejected: rejected.sort() };
}

/** scope_refs whose single VERIFIED binding names one of these companies. Proposed/retired/invalidated bindings never authorize. */
export function scopesForCompanies(registry: BindingRegistry, companyIds: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const b of registry.byScope.values()) {
    if (b.status === "verified" && !registry.invalidScopes.has(b.scopeRef) && companyIds.has(b.companyId)) out.push(b.scopeRef);
  }
  return out.sort();
}
