// SYNTHETIC fixtures only: no real owners, properties, names, files or provider identities.
import { APP, COMPANY_A, COMPANY_B, NOW, PERSON, REGISTRY, SESSION_ID, grant, grantsEnvelope, sessionEnvelope } from "../../../shared/authz/conformance.ts";
import { resolveReadAuthority } from "../../../shared/authz/protectedRead.ts";
import { classificationVisible, deliveryStateOf, type Classification, type DeliveryReceipt, type DocumentTarget, type RegisteredVersion } from "../../../shared/documents/model.ts";
import { sha256Hex } from "../../../server/lib/documents/integrity.ts";
import type { ContentSource, DocumentStore, ListFilter, ProviderRef, ReaderDeps, ScopeResolver, StoreRow } from "../../../server/lib/documents/ports.ts";

export { APP, COMPANY_A, COMPANY_B, NOW, SESSION_ID, PERSON };
export const OWNER_A = 17, OWNER_B = 18, PROP_A1 = 42, PROP_A2 = 43, PROP_B1 = 44;

export const bytesOf = (s: string) => new TextEncoder().encode(s);
export function version(documentId: string, n: number, content: string, extra: Partial<RegisteredVersion> = {}): { v: RegisteredVersion; bytes: Uint8Array } {
  const bytes = bytesOf(content);
  return { bytes, v: { versionId: `${documentId}-v${n}`, documentId, versionNumber: n, byteSize: bytes.byteLength, sha256: sha256Hex(bytes), mediaType: "application/pdf",
    provider: "synthetic", providerObjectRef: `obj-${documentId}`, providerRevision: `rev-${n}`, ...extra } };
}
export const receipt = (v: RegisteredVersion, status: DeliveryReceipt["status"], seq = 1, over: Partial<DeliveryReceipt> = {}): DeliveryReceipt =>
  ({ seq, versionId: v.versionId, status, verifiedSha256: status === "verified" ? v.sha256 : null, verifiedByteSize: status === "verified" ? v.byteSize : null, ...over });

export type Doc = { row: StoreRow; linkedProperties: number[]; allVersions: RegisteredVersion[]; content: Map<string, Uint8Array> };
let seq = 0;
export function doc(id: string, name: string, opts: { homeOwner?: number; homeProperty?: number; section: string; classification?: Classification; linked?: number[]; delivery?: DeliveryReceipt["status"] | "none"; content?: string; versions?: number }): Doc {
  const n = opts.versions ?? 1;
  const content = new Map<string, Uint8Array>();
  const all: RegisteredVersion[] = [];
  for (let i = 1; i <= n; i++) { const { v, bytes } = version(id, i, `${opts.content ?? "synthetic bytes"} v${i}`); all.push(v); content.set(v.versionId, bytes); }
  const current = all[all.length - 1];
  const delivery = opts.delivery ?? "verified";
  const row: StoreRow = {
    documentId: id, name, section: opts.section, classification: opts.classification ?? "general",
    homeKind: opts.homeOwner !== undefined ? "owner" : "property", homeOwnerId: opts.homeOwner ?? null, homePropertyId: opts.homeProperty ?? null,
    association: "direct", link: null, currentVersion: current, receipts: delivery === "none" ? [] : [receipt(current, delivery, ++seq)],
  };
  return { row, linkedProperties: opts.linked ?? [], allVersions: all, content };
}

export function standardDocs(): Doc[] {
  return [
    doc("d1", "Agreement A", { homeOwner: OWNER_A, section: "management-contracts", linked: [PROP_A1, PROP_A2] }),
    doc("d2", "Tax summary", { homeOwner: OWNER_A, section: "financial-tax", classification: "financial_tax" }),
    doc("d3", "Statement 2026", { homeOwner: OWNER_A, section: "statements-reports", classification: "confidential" }),
    doc("d4", "Sealed secret-term memo", { homeOwner: OWNER_A, section: "correspondence", classification: "restricted" }),
    doc("d5", "Agreement B", { homeOwner: OWNER_B, section: "management-contracts", linked: [PROP_B1] }),
    doc("d6", "Tenant file", { homeProperty: PROP_A1, section: "tenant-documents" }),
    doc("d7", "Legal notice B", { homeProperty: PROP_B1, section: "legal" }),
    doc("d8", "Entity record", { homeOwner: OWNER_A, section: "entity-records", versions: 2 }),
    doc("d9", "Pending statement", { homeOwner: OWNER_A, section: "statements-reports", delivery: "pending" }),
    doc("da", "Failed copy", { homeOwner: OWNER_A, section: "correspondence", delivery: "failed" }),
  ];
}

/** A store that applies ListFilter exactly as the proposal SQL would, and records every query it receives. */
export function memoryStore(docs: Doc[], opts: { ignoreFilter?: boolean } = {}) {
  const calls: { op: string; filter?: ListFilter }[] = [];
  const visible = (d: Doc, f: ListFilter): StoreRow | null => {
    const r = d.row;
    if (!opts.ignoreFilter) {
      if (!classificationVisible(r.section, r.classification, f.allowedClassifications)) return null;
      if (f.section && r.section !== f.section) return null;
      if (f.search && !r.name.toLowerCase().includes(f.search.toLowerCase())) return null;
    }
    const c = f.context;
    if (c.kind === "owner") return r.homeOwnerId === c.id ? { ...r, association: "direct", link: null } : (opts.ignoreFilter ? { ...r, association: "direct", link: null } : null);
    if (r.homePropertyId === c.id) return { ...r, association: "direct", link: null };
    if (r.homeOwnerId !== null && d.linkedProperties.includes(c.id) && (opts.ignoreFilter || f.authorizedLinkedOwnerIds.includes(r.homeOwnerId))) return { ...r, association: "linked-owner", link: { documentId: r.documentId, ownerId: r.homeOwnerId, propertyId: c.id } };
    return null;
  };
  const store: DocumentStore = {
    linkedOwnerIds: async (propertyId) => { calls.push({ op: "linkedOwnerIds" }); return [...new Set(docs.filter((d) => d.linkedProperties.includes(propertyId) && d.row.homeOwnerId !== null).map((d) => d.row.homeOwnerId!))]; },
    count: async (f) => { calls.push({ op: "count", filter: f }); return docs.filter((d) => visible(d, f)).length; },
    list: async (f, after, limit) => { calls.push({ op: "list", filter: f }); return docs.map((d) => visible(d, f)).filter((r): r is StoreRow => !!r).sort((a, b) => (a.documentId < b.documentId ? -1 : 1)).filter((r) => after === null || r.documentId > after).slice(0, limit); },
    get: async (f, id) => { calls.push({ op: "get", filter: f }); const d = docs.find((x) => x.row.documentId === id); return d ? visible(d, f) : null; },
    getVersion: async (documentId, versionId) => { calls.push({ op: "getVersion" }); return docs.find((d) => d.row.documentId === documentId)?.allVersions.find((v) => v.versionId === versionId) ?? null; },
  };
  return { store, calls };
}

export function memoryContent(docs: Doc[], tamper: Record<string, (b: Uint8Array) => Uint8Array> = {}) {
  const reads: ProviderRef[] = [];
  const content: ContentSource = {
    read: async (ref, maxBytes) => {
      reads.push(ref);
      const d = docs.find((x) => `obj-${x.row.documentId}` === ref.objectRef);
      const v = d?.allVersions.find((x) => x.providerRevision === ref.revision);
      const bytes = v ? d!.content.get(v.versionId) : undefined;
      if (!bytes) throw new Error("not found");
      if (bytes.byteLength > maxBytes) throw new Error("too large");
      return tamper[d!.row.documentId] ? tamper[d!.row.documentId](bytes) : bytes;
    },
  };
  return { content, reads };
}

/** owner/property -> scope_ref: the SYNTHETIC verified mapping (the real one is the unbound gate). */
export const SCOPES = { owners: new Map([[OWNER_A, "scope-a"], [OWNER_B, "scope-b"]]), properties: new Map([[PROP_A1, "scope-a"], [PROP_A2, "scope-a"], [PROP_B1, "scope-b"]]) };
export function scopeResolver(owners = SCOPES.owners, properties = SCOPES.properties): ScopeResolver & { calls: string[] } {
  const calls: string[] = [];
  return { calls, scopeOfOwner: async (id) => { calls.push(`o${id}`); return owners.get(id) ?? null; }, scopeOfProperty: async (id) => { calls.push(`p${id}`); return properties.get(id) ?? null; } };
}

/** Real A1 decision over mutable synthetic issuer/grant state. */
export type AuthState = { nowMs: number; sessionBody: unknown; grantsBody: unknown; calls: number; onCall?: (n: number, s: AuthState) => void };
export function authState(companies: string[] = [COMPANY_A]): AuthState {
  return { nowMs: NOW, sessionBody: sessionEnvelope(), grantsBody: grantsEnvelope(...companies.map((c, i) => grant({ grantId: `40000000-0000-4000-8000-00000000020${i}`, companyId: c }))), calls: 0 };
}
export function authority(s: AuthState): ReaderDeps["authority"] {
  return async (sid, scope) => {
    s.calls++; s.onCall?.(s.calls, s);
    return resolveReadAuthority({ policy: { applicationId: APP, environment: "production" }, resolveSession: async () => s.sessionBody, produceGrants: async () => s.grantsBody, registry: REGISTRY, now: () => s.nowMs }, sid, scope);
  };
}

export const ownerCtx = (id: number): DocumentTarget => ({ kind: "owner", id });
export const propertyCtx = (id: number): DocumentTarget => ({ kind: "property", id });
export { deliveryStateOf };
