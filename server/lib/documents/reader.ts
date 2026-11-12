// D1 protected document reader foundation. Injected ports only; defaults deny. Built on the A1 read decision.
//  - The browser names a native owner/property id and opaque document/version ids. Registered ids resolve server-side; no provider
//    path or shared URL is accepted, stored in a projection or returned.
//  - Authority comes from A1 (`ReadContext`). The owner/property -> scope_ref mapping is an injected port that denies when unbound.
//  - The reader computes an EFFECTIVE AUTHORIZATION STATE (A1 binding + the target's scope + the allowed classifications + the authorized
//    linked owners). Cursors are bound to it, and it is recomputed from scratch immediately before any metadata or byte leaves: a change
//    in permission, mapping, classification policy or linked-owner authorization during the reads withholds the result.
//  - Classification: the store filters by the allowed classes before search/count; the minimum rule (a financial-tax section is financial/tax
//    material whatever it was declared as) is enforced here too. A store that violates its filter, or returns a malformed response, fails closed.
//  - A property context shows an owner agreement only with exact link evidence for THAT document and THAT property, and only when its home
//    owner is also authorized.
//  - Downloads require the current version, a verified delivery and byte integrity (size + SHA-256).
import { CLASSIFICATIONS, DEFAULT_ALLOWED_CLASSIFICATIONS, OWNER_SECTION_IDS, PROPERTY_SECTION_IDS, classificationVisible, clampPageSize, decodeCursor, deliveryStateOf, encodeCursor, isDeliveryReceipt, isIdentifier, isRegisteredVersion, isSafeName, sectionIdsFor, stateFingerprint, validTarget, type Association, type Classification, type DocumentTarget, type ProjectedDocument } from "../../../shared/documents/model";
import type { ReadContext } from "../../../shared/authz/protectedRead";
import { assertContext } from "../../../shared/authz/dbContext";
import { bytesMatch } from "./integrity";
import type { ListFilter, ReaderDeps, StoreRow } from "./ports";

export type FailureKind = "unavailable" | "denied" | "missing" | "stale" | "conflict";
export type ReadFailure = { kind: FailureKind };
export type ListRequest = { sessionId: string | null; context: DocumentTarget; cursor?: string | null; limit?: number | null; search?: string | null; section?: string | null };
export type ListResult = { kind: "ready"; context: DocumentTarget; documents: ProjectedDocument[]; total: number; nextCursor: string | null } | ReadFailure;
export type DownloadRequest = { sessionId: string | null; context: DocumentTarget; documentId: string; versionId: string };
export type DownloadResult = { kind: "ready"; documentId: string; versionId: string; name: string; mediaType: string; byteSize: number; sha256: string; bytes: Uint8Array } | ReadFailure;

const DEFAULT_MAX_DOWNLOAD = 50 * 1024 * 1024;
const MAX_LINKED_OWNERS = 10_000;
const ALL_SECTIONS: readonly string[] = [...OWNER_SECTION_IDS, ...PROPERTY_SECTION_IDS];
const fail = (kind: FailureKind): ReadFailure => ({ kind });
const posInt = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Structural validation of a store row. Total: it never throws, whatever the port returned. */
export function isStoreRow(v: unknown): v is StoreRow {
  if (!isRecord(v)) return false;
  const r = v as Record<string, unknown>;
  const homeOk = (r.homeKind === "owner" && posInt(r.homeOwnerId) && r.homePropertyId === null) || (r.homeKind === "property" && posInt(r.homePropertyId) && r.homeOwnerId === null);
  const linkOk = r.link === null || (isRecord(r.link) && isIdentifier(r.link.documentId) && posInt(r.link.ownerId) && posInt(r.link.propertyId));
  return isIdentifier(r.documentId) && isSafeName(r.name) && typeof r.section === "string" && ALL_SECTIONS.includes(r.section)
    && typeof r.classification === "string" && (CLASSIFICATIONS as readonly string[]).includes(r.classification) && homeOk
    && (r.association === "direct" || r.association === "linked-owner") && linkOk
    && isRegisteredVersion(r.currentVersion) && Array.isArray(r.receipts) && r.receipts.every(isDeliveryReceipt);
}

/**
 * Validate and SNAPSHOT an allowed A1 context at the authority boundary. Reuses A1's own context validation (`assertContext`: a person-UUID
 * actor, a bounded non-empty array of valid scope_refs and a finite positive `validUntilMs`) and additionally requires a non-empty bounded
 * binding and a finite positive session expiry. Returns a frozen copy (later mutation of the port's object cannot change a decision), or
 * null for anything missing, non-finite or malformed.
 */
export function snapshotContext(raw: unknown): ReadContext | null {
  if (!isRecord(raw)) return null;
  try { assertContext({ actor: raw.actor, scopeRefs: raw.scopeRefs, validUntilMs: raw.validUntilMs }); } catch { return null; }
  if (typeof raw.binding !== "string" || raw.binding === "" || raw.binding.length > 2048) return null;
  if (typeof raw.sessionExpiresAtMs !== "number" || !Number.isFinite(raw.sessionExpiresAtMs) || raw.sessionExpiresAtMs <= 0) return null;
  return Object.freeze({
    actor: raw.actor as string, scopeRefs: Object.freeze([...(raw.scopeRefs as string[])]), binding: raw.binding,
    sessionExpiresAtMs: raw.sessionExpiresAtMs, validUntilMs: raw.validUntilMs as number,
  });
}

type Authorized = { ctx: ReadContext; filter: Omit<ListFilter, "search" | "section">; stateKey: string };

export function createDocumentReader(deps: ReaderDeps) {
  const configured = deps.maxDownloadBytes === undefined ? DEFAULT_MAX_DOWNLOAD : deps.maxDownloadBytes;
  const boundValid = typeof configured === "number" && Number.isSafeInteger(configured) && configured >= 1;
  const maxBytes = boundValid ? configured : 0;

  /** Admission + company scope + classification + linked-owner authorization for a target. Any doubt returns a failure. */
  async function authorize(sessionId: string | null, target: DocumentTarget): Promise<Authorized | ReadFailure> {
    if (sessionId !== null && typeof sessionId !== "string") return fail("denied");
    let auth;
    try { auth = await deps.authority(sessionId, null); } catch { return fail("unavailable"); }
    if (!auth || typeof auth.allowed !== "boolean") return fail("unavailable");
    if (!auth.allowed) return fail(auth.reason === "AUTHORITY_UNAVAILABLE" || auth.reason === "CLOCK_INVALID" ? "unavailable" : "denied");
    const ctx = snapshotContext(auth.context);
    if (!ctx) { deps.report?.({ type: "invalid_authority_context", detail: "malformed" }); return fail("unavailable"); }
    const t0 = deps.now();
    if (typeof t0 !== "number" || !Number.isFinite(t0)) return fail("unavailable");
    if (t0 >= ctx.validUntilMs) return fail("denied");
    try {
      const scope = target.kind === "owner" ? await deps.scopes.scopeOfOwner(target.id) : await deps.scopes.scopeOfProperty(target.id);
      if (typeof scope !== "string" || scope === "" || !ctx.scopeRefs.includes(scope)) return fail("denied");
      const allowed: Classification[] = [...DEFAULT_ALLOWED_CLASSIFICATIONS];
      for (const c of CLASSIFICATIONS) {
        if (allowed.includes(c)) continue;
        if ((await deps.classificationPolicy(ctx, c, target)) === true) allowed.push(c);
      }
      const linked: number[] = [];
      if (target.kind === "property") {
        const owners = await deps.store.linkedOwnerIds(target.id);
        if (!Array.isArray(owners) || owners.length > MAX_LINKED_OWNERS || !owners.every(posInt)) { deps.report?.({ type: "store_contract_violation", detail: "linkedOwnerIds" }); return fail("unavailable"); }
        for (const ownerId of owners) {
          const s = await deps.scopes.scopeOfOwner(ownerId);
          if (typeof s === "string" && s !== "" && ctx.scopeRefs.includes(s)) linked.push(ownerId);
        }
      }
      const sortedAllowed = [...allowed].sort();
      const sortedLinked = [...new Set(linked)].sort((a, b) => a - b);
      const stateKey = `${ctx.binding}|${target.kind}:${target.id}|${scope}|${sortedAllowed.join(",")}|${sortedLinked.join(",")}`;
      return { ctx, filter: { context: { ...target }, allowedClassifications: sortedAllowed, authorizedLinkedOwnerIds: sortedLinked }, stateKey };
    } catch { return fail("unavailable"); }
  }

  /**
   * Immediately before anything leaves: recompute the COMPLETE authorization (A1 decision, target scope mapping, classification policy and
   * linked-owner authorization) and require it to equal the state the work was done under, and still be unexpired. Revoked => denied;
   * changed => stale; unreadable => unavailable. Returns the fresh authorization on success so callers can re-verify the row under it.
   */
  async function reauthorize(sessionId: string | null, target: DocumentTarget, before: Authorized, documentId?: string): Promise<Authorized | ReadFailure> {
    const again = await authorize(sessionId, target);
    const t = deps.now();
    if ("kind" in again) { deps.report?.({ type: "authority_changed", documentId }); return again; }
    if (again.stateKey !== before.stateKey || !Number.isFinite(t) || t >= before.ctx.validUntilMs || t >= again.ctx.validUntilMs) {
      deps.report?.({ type: "authority_changed", documentId });
      return fail("stale");
    }
    return again;
  }

  /** True when the row must NOT be shown under this filter. Total: never throws; a malformed row violates. */
  function rowViolatesFilter(row: unknown, filter: ListFilter): boolean {
    if (!isStoreRow(row)) return true;
    if (row.currentVersion.documentId !== row.documentId) return true;
    if (!classificationVisible(row.section, row.classification, filter.allowedClassifications)) return true;
    if (filter.section !== null && row.section !== filter.section) return true;
    if (filter.search !== null && !row.name.toLowerCase().includes(filter.search.toLowerCase())) return true;
    const { context } = filter;
    if (!sectionIdsFor(row.association, context.kind).includes(row.section)) return true;
    if (context.kind === "owner") return !(row.association === "direct" && row.homeKind === "owner" && row.homeOwnerId === context.id && row.link === null);
    if (row.association === "direct") return !(row.homeKind === "property" && row.homePropertyId === context.id && row.link === null);
    // linked-owner under a property: the home owner must be authorized AND the exact link row for this document and this property must be present.
    return !(row.homeKind === "owner" && row.homeOwnerId !== null && filter.authorizedLinkedOwnerIds.includes(row.homeOwnerId)
      && row.link !== null && row.link.documentId === row.documentId && row.link.ownerId === row.homeOwnerId && row.link.propertyId === context.id);
  }

  const project = (row: StoreRow): ProjectedDocument => ({
    id: row.documentId, versionId: row.currentVersion.versionId, name: row.name, section: row.section,
    association: row.association as Association, delivery: deliveryStateOf(row.currentVersion, row.receipts),
  });

  async function readInner(req: ListRequest): Promise<ListResult> {
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
    const binding = stateFingerprint(a.stateKey);           // the EFFECTIVE authorization state, not only the A1 binding
    let after: string | null = null;
    if (req.cursor !== undefined && req.cursor !== null) {
      const c = decodeCursor(req.cursor);
      if (!c || c.kind !== target.kind || c.id !== target.id || c.filterKey !== filterKey || c.binding !== binding) return fail("stale");
      after = c.after;
    }

    let total: unknown, rows: unknown;
    try {
      total = await deps.store.count(filter);
      rows = await deps.store.list(filter, after, limit + 1);
    } catch { return fail("unavailable"); }
    if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0 || !Array.isArray(rows) || rows.length > limit + 1
      || rows.some((r) => rowViolatesFilter(r, filter)) || new Set((rows as StoreRow[]).map((r) => r.documentId)).size !== rows.length
      || total < Math.min(rows.length, limit)) {
      deps.report?.({ type: "store_contract_violation", detail: "list" });
      return fail("unavailable");
    }
    const typed = rows as StoreRow[];
    const page = typed.slice(0, limit);
    const nextCursor = typed.length > limit ? encodeCursor({ kind: target.kind, id: target.id, after: page[page.length - 1].documentId, filterKey, binding }) : null;
    // The last asynchronous step is the final authorization decision. Everything after it is synchronous.
    const again = await reauthorize(req.sessionId, target, a);
    if ("kind" in again) return again;
    // The rows were validated above under a filter whose effective state `reauthorize` has just proven identical to the fresh one, so no
    // second validation is needed here (it could not differ). Only the immediate expiry check remains.
    const documents = page.map(project);                  // synchronous projection happens AFTER the final decision ...
    const tNow = deps.now();                               // ... so expiry is read again immediately before returning
    if (!Number.isFinite(tNow) || tNow >= again.ctx.validUntilMs || tNow >= a.ctx.validUntilMs) { deps.report?.({ type: "authority_changed" }); return fail("stale"); }
    return { kind: "ready", context: target, documents, total, nextCursor };
  }

  async function downloadInner(req: DownloadRequest): Promise<DownloadResult> {
    // The configured bound is validated before ANY port is touched.
    if (!boundValid) { deps.report?.({ type: "invalid_configuration", detail: "maxDownloadBytes" }); return fail("unavailable"); }
    if (!req || !validTarget(req.context) || !isIdentifier(req.documentId) || !isIdentifier(req.versionId)) return fail("missing");
    const target: DocumentTarget = { kind: req.context.kind, id: req.context.id };
    const a = await authorize(req.sessionId, target);
    if ("kind" in a) return a;
    const filter: ListFilter = { ...a.filter, search: null, section: null };

    let row: unknown, requested: unknown = null;
    try {
      row = await deps.store.get(filter, req.documentId);
      if (row !== null && (rowViolatesFilter(row, filter) || (row as StoreRow).documentId !== req.documentId)) { deps.report?.({ type: "store_contract_violation", detail: "get" }); return fail("unavailable"); }
      if (row !== null && (row as StoreRow).currentVersion.versionId !== req.versionId) {
        requested = await deps.store.getVersion(req.documentId, req.versionId);
        if (requested !== null && !isRegisteredVersion(requested)) { deps.report?.({ type: "store_contract_violation", detail: "getVersion" }); return fail("unavailable"); }
      }
    } catch { return fail("unavailable"); }
    // Not visible in THIS authorized context (absent, unlinked, other owner/property, or filtered classification) is indistinguishable from absent.
    if (row === null || row === undefined) return fail("missing");
    const found = row as StoreRow;
    const current = found.currentVersion;
    if (current.versionId !== req.versionId) return requested && (requested as { documentId: string }).documentId === req.documentId ? fail("stale") : fail("missing");
    if (deliveryStateOf(current, found.receipts) !== "verified") return fail("unavailable");
    if (current.byteSize > maxBytes) return fail("unavailable");

    let bytes: Uint8Array;
    try { bytes = await deps.content.read({ provider: current.provider, objectRef: current.providerObjectRef, revision: current.providerRevision }, current.byteSize); }
    catch { return fail("unavailable"); }
    if (!(bytes instanceof Uint8Array) || !bytesMatch(bytes, current)) {
      deps.report?.({ type: "integrity_mismatch", documentId: found.documentId, versionId: current.versionId });
      return fail("conflict");
    }
    // FINAL REGISTRY READ first, then the FINAL authorization decision as the last asynchronous step. Nothing asynchronous follows the decision:
    // the row is validated against the FRESH authorization synchronously and expiry is checked immediately before returning.
    let recheck: unknown;
    try { recheck = await deps.store.get({ ...a.filter, search: null, section: null }, req.documentId); } catch { return fail("unavailable"); }
    const again = await reauthorize(req.sessionId, target, a, found.documentId);
    if ("kind" in again) return again;
    if (recheck === null || recheck === undefined) { deps.report?.({ type: "authority_changed", documentId: found.documentId }); return fail("stale"); }
    const rc = recheck as StoreRow;
    const fresh: ListFilter = { ...again.filter, search: null, section: null };
    if (rowViolatesFilter(rc, fresh) || rc.documentId !== found.documentId) { deps.report?.({ type: "store_contract_violation", detail: "recheck" }); return fail("unavailable"); }
    if (rc.currentVersion.versionId !== current.versionId || rc.currentVersion.sha256 !== current.sha256 || rc.currentVersion.byteSize !== current.byteSize
      || deliveryStateOf(rc.currentVersion, rc.receipts) !== "verified") { deps.report?.({ type: "authority_changed", documentId: found.documentId }); return fail("stale"); }
    const tNow = deps.now();
    if (!Number.isFinite(tNow) || tNow >= again.ctx.validUntilMs || tNow >= a.ctx.validUntilMs) { deps.report?.({ type: "authority_changed", documentId: found.documentId }); return fail("stale"); }
    return {
      kind: "ready", documentId: found.documentId, versionId: current.versionId, name: found.name,
      mediaType: current.mediaType.toLowerCase(), byteSize: current.byteSize, sha256: current.sha256, bytes,
    };
  }

  // A thrown exception from any port can never escape or leak: it becomes a bounded failure.
  const guard = <A, R extends ReadFailure | { kind: "ready" }>(inner: (a: A) => Promise<R>) => async (a: A): Promise<R | ReadFailure> => {
    try { return await inner(a); } catch { deps.report?.({ type: "store_contract_violation", detail: "unexpected" }); return fail("unavailable"); }
  };
  return { read: guard(readInner) as (req: ListRequest) => Promise<ListResult>, download: guard(downloadInner) as (req: DownloadRequest) => Promise<DownloadResult> };
}
export type DocumentReader = ReturnType<typeof createDocumentReader>;
