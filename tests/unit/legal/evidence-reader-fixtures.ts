// SYNTHETIC fixtures only: no real matters, owners, properties, names, files or provider identities.
// A mutable in-memory "world" behind every injected port, with call logs (to prove WHICH ports were touched and in what order) and hooks that mutate the
// world at a chosen asynchronous step (to prove revocation, remapping, withdrawal, replacement and expiry DURING the work withhold everything).
import { APP, COMPANY_A, NOW, REGISTRY, SESSION_ID, grant, grantsEnvelope, sessionEnvelope } from "../../../shared/authz/conformance.ts";
import { resolveReadAuthority } from "../../../shared/authz/protectedRead.ts";
import { classificationVisible, type Classification, type DeliveryReceipt, type RegisteredVersion } from "../../../shared/documents/model.ts";
import { sha256Hex } from "../../../server/lib/documents/integrity.ts";
import type { ListFilter, StoreRow, DocumentStore, ContentSource, ScopeResolver, ClassificationPolicy } from "../../../server/lib/documents/ports.ts";
import { createEvidenceReader } from "../../../server/lib/legal/evidenceReader.ts";
import type { EvidenceReaderDeps } from "../../../server/lib/legal/evidenceReaderPorts.ts";

export { NOW, SESSION_ID, COMPANY_A, grant, grantsEnvelope, sessionEnvelope };
export const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const IDS = { matter: U(1), evidence: U(2), doc: U(4), v1: U(3), v2: U(5), v3: U(6), ownerDoc: U(14), ownerV1: U(13) };
export const PROP_A1 = 42, PROP_A2 = 43, PROP_B1 = 44, OWNER_A = 17, OWNER_B = 18;
const PRIVATE = "PRIVATE-NAME";

export type Doc = { row: StoreRow; linkedProperties: number[]; versions: RegisteredVersion[]; content: Map<string, Uint8Array>; status: "active" | "retired" };
const bytesOf = (s: string) => new TextEncoder().encode(s);
export function makeDoc(documentId: string, o: { homeProperty?: number; homeOwner?: number; section: string; classification?: Classification; linked?: number[]; delivery?: DeliveryReceipt["status"] | "none"; versionIds?: string[]; content?: string; status?: "active" | "retired" }): Doc {
  const ids = o.versionIds ?? [IDS.v1];
  const content = new Map<string, Uint8Array>(), versions: RegisteredVersion[] = [];
  ids.forEach((versionId, i) => {
    const bytes = bytesOf(`${o.content ?? "synthetic evidence bytes"} v${i + 1}`);
    versions.push({ versionId, documentId, versionNumber: i + 1, byteSize: bytes.byteLength, sha256: sha256Hex(bytes), mediaType: "application/pdf", provider: "synthetic", providerObjectRef: `obj-${documentId}`, providerRevision: `rev-${i + 1}` });
    content.set(versionId, bytes);
  });
  const cur = versions[versions.length - 1], d = o.delivery ?? "verified";
  const row: StoreRow = {
    documentId, name: `${PRIVATE} ${documentId}.pdf`, section: o.section, classification: o.classification ?? "general",
    homeKind: o.homeOwner !== undefined ? "owner" : "property", homeOwnerId: o.homeOwner ?? null, homePropertyId: o.homeProperty ?? null,
    association: "direct", link: null, currentVersion: cur,
    receipts: d === "none" ? [] : [{ seq: 1, versionId: cur.versionId, status: d, verifiedSha256: d === "verified" ? cur.sha256 : null, verifiedByteSize: d === "verified" ? cur.byteSize : null }],
  };
  return { row, linkedProperties: o.linked ?? [], versions, content, status: o.status ?? "active" };
}
/** Replace the document's current version (as a new registered version) and keep receipts verified for it. */
export function addVersion(d: Doc, versionId: string, text = "newer bytes"): void {
  const bytes = bytesOf(text), n = d.versions.length + 1;
  const v: RegisteredVersion = { versionId, documentId: d.row.documentId, versionNumber: n, byteSize: bytes.byteLength, sha256: sha256Hex(bytes), mediaType: "application/pdf", provider: "synthetic", providerObjectRef: `obj-${d.row.documentId}`, providerRevision: `rev-${n}` };
  d.versions.push(v); d.content.set(versionId, bytes); d.row.currentVersion = v;
  d.row.receipts = [{ seq: 2, versionId, status: "verified", verifiedSha256: v.sha256, verifiedByteSize: v.byteSize }];
}

export type Hooks = {
  onEvidenceLoad?: (n: number) => void; onProperties?: (n: number) => void; onPinned?: (n: number) => void;
  onStoreGet?: (n: number) => void; onContentRead?: (n: number) => void; onAuthority?: (n: number) => void; onLinkedOwners?: (n: number) => void;
};

export function makeWorld(opts: { docs?: Doc[]; portFiltersScope?: boolean } = {}) {
  const w = {
    auth: { nowMs: NOW, sessionBody: sessionEnvelope() as unknown, grantsBody: grantsEnvelope(grant()) as unknown },
    matter: { id: IDS.matter, scopeRef: "scope-a", caseType: "collections", lifecycle: "filed", courtRef: null, docketNumber: null, revision: 1 } as Record<string, unknown>,
    evidence: { id: IDS.evidence, matterId: IDS.matter, requirementId: null, documentVersionId: IDS.v1, withdrawnAt: null, revision: 2, restricted: false, storageRef: `${PRIVATE} legacy pointer` } as Record<string, unknown>,
    matterProperties: [{ matterId: IDS.matter, propertyId: U(99) }] as Record<string, unknown>[],
    propertyRows: [{ id: PROP_A1, idUuid: U(99) }, { id: PROP_A2, idUuid: U(98) }, { id: PROP_B1, idUuid: U(97) }] as Record<string, unknown>[],
    docs: opts.docs ?? [makeDoc(IDS.doc, { homeProperty: PROP_A1, section: "tenant-documents" })],
    propertyScopes: new Map<number, string>([[PROP_A1, "scope-a"], [PROP_A2, "scope-a"], [PROP_B1, "scope-b"]]),
    ownerScopes: new Map<number, string>([[OWNER_A, "scope-a"], [OWNER_B, "scope-b"]]),
    allowClassifications: new Set<Classification>(),
    portFiltersScope: opts.portFiltersScope ?? true,
    tamper: undefined as undefined | ((b: Uint8Array) => Uint8Array),
    hooks: {} as Hooks,
    log: [] as string[], n: { auth: 0, evidence: 0, properties: 0, pinned: 0, get: 0, read: 0, owners: 0 }, reads: [] as string[],
    reports: [] as unknown[],
  };
  const tick = (key: keyof typeof w.n, hook?: (n: number) => void) => { w.n[key]++; hook?.(w.n[key]); };
  const docOfVersion = (versionId: string) => w.docs.find((d) => d.versions.some((v) => v.versionId === versionId));

  const authority: EvidenceReaderDeps["authority"] = async (sid, scope) => {
    w.log.push("authority"); tick("auth", w.hooks.onAuthority);
    return resolveReadAuthority({ policy: { applicationId: APP, environment: "production" }, resolveSession: async () => w.auth.sessionBody, produceGrants: async () => w.auth.grantsBody, registry: REGISTRY, now: () => w.auth.nowMs }, sid, scope);
  };
  const scopes: ScopeResolver = {
    scopeOfOwner: async (id) => { w.log.push("scopeOfOwner"); return w.ownerScopes.get(id) ?? null; },
    scopeOfProperty: async (id) => { w.log.push("scopeOfProperty"); return w.propertyScopes.get(id) ?? null; },
  };
  const visible = (d: Doc, f: ListFilter): StoreRow | null => {
    const r = d.row, c = f.context;
    if (!classificationVisible(r.section, r.classification, f.allowedClassifications)) return null;
    if (r.homePropertyId === c.id && c.kind === "property") return { ...r, association: "direct", link: null };
    if (c.kind === "property" && r.homeOwnerId !== null && d.linkedProperties.includes(c.id) && f.authorizedLinkedOwnerIds.includes(r.homeOwnerId))
      return { ...r, association: "linked-owner", link: { documentId: r.documentId, ownerId: r.homeOwnerId, propertyId: c.id } };
    return null;
  };
  const store: DocumentStore = {
    linkedOwnerIds: async (propertyId) => { w.log.push("linkedOwnerIds"); tick("owners", w.hooks.onLinkedOwners); return [...new Set(w.docs.filter((d) => d.linkedProperties.includes(propertyId) && d.row.homeOwnerId !== null).map((d) => d.row.homeOwnerId!))]; },
    count: async () => { throw new Error("listing is not part of this reader"); },
    list: async () => { throw new Error("listing is not part of this reader"); },
    get: async (f, id) => { w.log.push("store.get"); tick("get", w.hooks.onStoreGet); const d = w.docs.find((x) => x.row.documentId === id); return d ? visible(d, f) : null; },
    getVersion: async () => { throw new Error("getVersion is not used by this reader"); },
  };
  const content: ContentSource = {
    read: async (ref, maxBytes) => {
      w.log.push("content.read"); w.reads.push(`${ref.objectRef}@${ref.revision}`); tick("read", w.hooks.onContentRead);
      const d = w.docs.find((x) => `obj-${x.row.documentId}` === ref.objectRef), v = d?.versions.find((x) => x.providerRevision === ref.revision);
      const bytes = v ? d!.content.get(v.versionId) : undefined;
      if (!bytes) throw new Error("not found");
      if (bytes.byteLength > maxBytes) throw new Error("too large");
      return w.tamper ? w.tamper(bytes) : bytes;
    },
  };
  const classificationPolicy: ClassificationPolicy = async (_ctx, c) => { w.log.push("classificationPolicy"); return w.allowClassifications.has(c); };
  const deps: EvidenceReaderDeps = {
    authority, scopes, store, content, classificationPolicy,
    evidence: { load: async (ctx, matterId, evidenceId) => {
      w.log.push("evidence.load"); tick("evidence", w.hooks.onEvidenceLoad);
      if (matterId !== w.matter.id || evidenceId !== w.evidence.id) return null;
      if (w.portFiltersScope && !ctx.scopeRefs.includes(w.matter.scopeRef as string)) return null;
      return structuredClone({ matter: w.matter, evidence: w.evidence, matterProperties: w.matterProperties });
    } },
    properties: { rows: async (_ctx, uuids) => { w.log.push("properties.rows"); tick("properties", w.hooks.onProperties); return structuredClone(w.propertyRows.filter((r) => uuids.includes(r.idUuid as string))); } },
    pinned: { resolve: async (_ctx, versionId) => { w.log.push("pinned.resolve"); tick("pinned", w.hooks.onPinned); const d = docOfVersion(versionId); return d ? { documentId: d.row.documentId, documentStatus: d.status } : null; } },
    now: () => w.auth.nowMs,
    report: (e) => { w.reports.push(e); },
  };
  const reader = (over: Partial<EvidenceReaderDeps> = {}, factory: typeof createEvidenceReader = createEvidenceReader) => factory({ ...deps, ...over });
  const req = (over: Record<string, unknown> = {}) => ({ sessionId: SESSION_ID, matterId: IDS.matter, evidenceId: IDS.evidence, ...over }) as never;
  const clearLogs = () => { w.log.length = 0; w.reads.length = 0; };
  return Object.assign(w, { deps, reader, req, clearLogs, docOfVersion });
}
export type World = ReturnType<typeof makeWorld>;
export const ownerAgreementWorld = () => {
  const w = makeWorld({ docs: [makeDoc(IDS.ownerDoc, { homeOwner: OWNER_A, section: "management-contracts", linked: [PROP_A1], versionIds: [IDS.ownerV1] })] });
  w.evidence.documentVersionId = IDS.ownerV1;
  return w;
};
export { PRIVATE };
