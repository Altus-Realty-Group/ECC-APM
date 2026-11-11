// D1 protected document reader foundation. Injected ports only; defaults deny. Built on the A1 read decision.
//  - The browser names a native owner/property id and opaque document/version ids. Registered ids resolve server-side; no provider
//    path or shared URL is accepted, stored in a projection or returned.
//  - Authority comes from A1 (`ReadContext`). The owner/property -> scope_ref mapping is an injected port that denies when unbound.
//  - Restricted/financial classifications are filtered by the STORE before any search hit or count; a store that violates its filter
//    fails closed. Property contexts expose an owner agreement only when it is explicitly linked AND its home owner is authorized.
//  - Downloads re-authorize, require the CURRENT version with a VERIFIED delivery, validate delivered bytes, and are withheld if the
//    A1 authority changed or ended during the reads.
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, DEFAULT_ALLOWED_CLASSIFICATIONS, CLASSIFICATIONS, OWNER_SECTION_IDS, PROPERTY_SECTION_IDS, clampPageSize, decodeCursor, deliveryStateOf, encodeCursor, isIdentifier, isSafeName, sectionIdsFor, validTarget, type Association, type Classification, type DocumentTarget, type ProjectedDocument } from "../../../shared/documents/model";
import type { ReadContext } from "../../../shared/authz/protectedRead";
import { bytesMatch } from "./integrity";
import type { ListFilter, ReaderDeps, StoreRow } from "./ports";

export type FailureKind = "unavailable" | "denied" | "missing" | "stale" | "conflict";
export type ReadFailure = { kind: FailureKind };
export type ListRequest = { sessionId: string | null; context: DocumentTarget; cursor?: string | null; limit?: number | null; search?: string | null; section?: string | null };
export type ListResult = { kind: "ready"; context: DocumentTarget; documents: ProjectedDocument[]; total: number; nextCursor: string | null } | ReadFailure;
export type DownloadRequest = { sessionId: string | null; context: DocumentTarget; documentId: string; versionId: string };
export type DownloadResult = { kind: "ready"; documentId: string; versionId: string; name: string; mediaType: string; byteSize: number; sha256: string; bytes: Uint8Array } | ReadFailure;

const DEFAULT_MAX_DOWNLOAD = 50 * 1024 * 1024;
const ALL_SECTIONS: readonly string[] = [...OWNER_SECTION_IDS, ...PROPERTY_SECTION_IDS];
const MEDIA_TYPE = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i;
const fail = (kind: FailureKind): ReadFailure => ({ kind });

type Authorized = { ctx: ReadContext; filter: Omit<ListFilter, "search" | "section"> };

export function createDocumentReader(deps: ReaderDeps) {
  const maxBytes = deps.maxDownloadBytes ?? DEFAULT_MAX_DOWNLOAD;

  /** Admission + company scope + classification + linked-owner authorization for a target. Any doubt returns a failure. */
  async function authorize(sessionId: string | null, target: DocumentTarget): Promise<Authorized | ReadFailure> {
    let auth;
    try { auth = await deps.authority(sessionId, null); } catch { return fail("unavailable"); }
    if (!auth.allowed) return fail(auth.reason === "AUTHORITY_UNAVAILABLE" || auth.reason === "CLOCK_INVALID" ? "unavailable" : "denied");
    const ctx = auth.context;
    try {
      const scope = target.kind === "owner" ? await deps.scopes.scopeOfOwner(target.id) : await deps.scopes.scopeOfProperty(target.id);
      if (!scope || !ctx.scopeRefs.includes(scope)) return fail("denied");
      const allowed: Classification[] = [...DEFAULT_ALLOWED_CLASSIFICATIONS];
      for (const c of CLASSIFICATIONS) {
        if (allowed.includes(c)) continue;
        if ((await deps.classificationPolicy(ctx, c, target)) === true) allowed.push(c);
      }
      const linked: number[] = [];
      if (target.kind === "property") {
        for (const ownerId of await deps.store.linkedOwnerIds(target.id)) {
          const s = await deps.scopes.scopeOfOwner(ownerId);
          if (s && ctx.scopeRefs.includes(s)) linked.push(ownerId);
        }
      }
      return { ctx, filter: { context: { ...target }, allowedClassifications: allowed, authorizedLinkedOwnerIds: linked } };
    } catch { return fail("unavailable"); }
  }

  /** Authority must be unchanged and unexpired when the result is about to leave. Returns a failure to withhold it. */
  async function stillAuthorized(sessionId: string | null, before: ReadContext, documentId?: string): Promise<ReadFailure | null> {
    let again;
    try { again = await deps.authority(sessionId, null); } catch { return fail("unavailable"); }
    const t = deps.now();
    if (!again.allowed || again.context.binding !== before.binding || !Number.isFinite(t) || t >= before.validUntilMs || t >= again.context.validUntilMs) {
      deps.report?.({ type: "authority_changed", documentId });
      return fail(again.allowed ? "stale" : "denied");
    }
    return null;
  }

  /** The store must not return anything outside the filter it was given. Returns the association the row actually has, or null. */
  function rowViolatesFilter(row: StoreRow, filter: ListFilter): boolean {
    if (!row.currentVersion || row.currentVersion.documentId !== row.documentId || !isIdentifier(row.documentId) || !isIdentifier(row.currentVersion.versionId)) return true;
    if (!filter.allowedClassifications.includes(row.classification) || !isSafeName(row.name)) return true;
    const { context } = filter;
    const sections = sectionIdsFor(row.association, context.kind);
    if (!sections.includes(row.section)) return true;
    if (context.kind === "owner") return !(row.association === "direct" && row.homeKind === "owner" && row.homeOwnerId === context.id);
    if (row.association === "direct") return !(row.homeKind === "property" && row.homePropertyId === context.id);
    return !(row.homeKind === "owner" && row.homeOwnerId !== null && filter.authorizedLinkedOwnerIds.includes(row.homeOwnerId));
  }

  const project = (row: StoreRow): ProjectedDocument => ({
    id: row.documentId, versionId: row.currentVersion.versionId, name: row.name, section: row.section,
    association: row.association as Association, delivery: deliveryStateOf(row.currentVersion, row.receipts),
  });

  async function read(req: ListRequest): Promise<ListResult> {
    if (!req || !validTarget(req.context)) return fail("missing");
    const target: DocumentTarget = { kind: req.context.kind, id: req.context.id };
    const limit = clampPageSize(req.limit);
    const search = req.search === undefined || req.search === null ? null : req.search;
    const section = req.section === undefined || req.section === null ? null : req.section;
    if (limit === -1 || (search !== null && (typeof search !== "string" || search.length > 100 || /[\u0000-\u001f\u007f]/.test(search)))
      || (section !== null && !ALL_SECTIONS.includes(section as string))) return fail("conflict");

    const a = await authorize(req.sessionId, target);
    if ("kind" in a) return a;
    const filter: ListFilter = { ...a.filter, search: search === null || search.trim() === "" ? null : search.trim(), section };
    const filterKey = `${filter.section ?? ""}|${filter.search ?? ""}`;
    let after: string | null = null;
    if (req.cursor !== undefined && req.cursor !== null) {
      const c = decodeCursor(req.cursor);
      if (!c || c.kind !== target.kind || c.id !== target.id || c.filterKey !== filterKey || c.binding !== a.ctx.binding) return fail("stale");
      after = c.after;
    }

    let total: number, rows: StoreRow[];
    try {
      total = await deps.store.count(filter);
      rows = await deps.store.list(filter, after, limit + 1);
    } catch { return fail("unavailable"); }
    if (!Number.isSafeInteger(total) || total < 0 || !Array.isArray(rows) || rows.length > limit + 1 || rows.some((r) => rowViolatesFilter(r, filter))
      || new Set(rows.map((r) => r.documentId)).size !== rows.length) {
      deps.report?.({ type: "store_contract_violation", detail: "list" });
      return fail("unavailable");
    }
    const page = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? encodeCursor({ kind: target.kind, id: target.id, after: page[page.length - 1].documentId, filterKey, binding: a.ctx.binding }) : null;
    const documents = page.map(project);
    const withheld = await stillAuthorized(req.sessionId, a.ctx);
    if (withheld) return withheld;
    return { kind: "ready", context: target, documents, total, nextCursor };
  }

  async function download(req: DownloadRequest): Promise<DownloadResult> {
    if (!req || !validTarget(req.context) || !isIdentifier(req.documentId) || !isIdentifier(req.versionId)) return fail("missing");
    const target: DocumentTarget = { kind: req.context.kind, id: req.context.id };
    const a = await authorize(req.sessionId, target);
    if ("kind" in a) return a;
    const filter: ListFilter = { ...a.filter, search: null, section: null };

    let row: StoreRow | null, requested = null;
    try {
      row = await deps.store.get(filter, req.documentId);
      if (row && rowViolatesFilter(row, filter)) { deps.report?.({ type: "store_contract_violation", detail: "get" }); return fail("unavailable"); }
      if (row && row.documentId !== req.documentId) { deps.report?.({ type: "store_contract_violation", detail: "get-id" }); return fail("unavailable"); }
      if (row && row.currentVersion.versionId !== req.versionId) requested = await deps.store.getVersion(req.documentId, req.versionId);
    } catch { return fail("unavailable"); }
    // Not visible in THIS authorized context (absent, unlinked, other owner/property, or filtered classification) is indistinguishable from absent.
    if (!row) return fail("missing");
    const current = row.currentVersion;
    if (current.versionId !== req.versionId) return requested && requested.documentId === req.documentId ? fail("stale") : fail("missing");
    if (deliveryStateOf(current, row.receipts) !== "verified") return fail("unavailable");
    if (!Number.isSafeInteger(current.byteSize) || current.byteSize < 0 || current.byteSize > maxBytes) return fail("unavailable");

    let bytes: Uint8Array;
    try { bytes = await deps.content.read({ provider: current.provider, objectRef: current.providerObjectRef, revision: current.providerRevision }, current.byteSize); }
    catch { return fail("unavailable"); }
    if (!(bytes instanceof Uint8Array) || !bytesMatch(bytes, current)) {
      deps.report?.({ type: "integrity_mismatch", documentId: row.documentId, versionId: current.versionId });
      return fail("conflict");
    }
    const withheld = await stillAuthorized(req.sessionId, a.ctx, row.documentId);
    if (withheld) return withheld;
    return {
      kind: "ready", documentId: row.documentId, versionId: current.versionId, name: row.name,
      mediaType: MEDIA_TYPE.test(current.mediaType) ? current.mediaType.toLowerCase() : "application/octet-stream",
      byteSize: current.byteSize, sha256: current.sha256, bytes,
    };
  }

  return { read, download };
}
export type DocumentReader = ReturnType<typeof createDocumentReader>;
