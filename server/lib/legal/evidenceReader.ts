// L4 protected reader for ONE legal evidence download (ADR-0005). Unmounted: no route, handler, producer, grant or provider is bound.
// A plan from planEvidenceRead is a consistency result, NEVER permission. Authority comes only from A1, matter scope, D1 target/classification
// authority and the D1 reader's verified delivery, all through injected ports that deny by default. Every failure is exactly `{ kind }`.
import { CLASSIFICATIONS, DEFAULT_ALLOWED_CLASSIFICATIONS, type Classification, type DocumentTarget } from "../../../shared/documents/model";
import { deriveBindingState, parseEvidenceRef, parseUuid } from "../../../shared/legal/evidenceLink";
import { parseMatter } from "../../../shared/legal/contracts";
import type { ReadContext } from "../../../shared/authz/protectedRead";
import { createDocumentReader, isStoreRow, snapshotContext, type FailureKind } from "../documents/reader";
import type { ListFilter } from "../documents/ports";
import { planEvidenceRead, type EvidenceReadPlan } from "./evidenceReadPlan";
import type { EvidenceReaderDeps } from "./evidenceReaderPorts";

export type EvidenceReadRequest = { sessionId: string | null; matterId: string; evidenceId: string };
export type EvidenceReadFailure = { kind: FailureKind };
export type EvidenceReadResult =
  | { kind: "ready"; matterId: string; evidenceId: string; versionId: string; name: string; mediaType: string; byteSize: number; sha256: string; bytes: Uint8Array }
  | EvidenceReadFailure;

const fail = (kind: FailureKind): EvidenceReadFailure => ({ kind });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const posInt = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const MAX_LINKS = 1000, MAX_CANDIDATES = 25, MAX_LINKED_OWNERS = 10_000;
const DEFAULT_MAX_DOWNLOAD = 50 * 1024 * 1024;
const REQUEST_KEYS = ["sessionId", "matterId", "evidenceId"];

type Planned = Extract<EvidenceReadPlan, { kind: "planned" }>;
type Run = { ctx: ReadContext; plan: Planned; targetKey: string; candidate: number };

export function createEvidenceReader(deps: EvidenceReaderDeps) {
  const configured = deps.maxDownloadBytes === undefined ? DEFAULT_MAX_DOWNLOAD : deps.maxDownloadBytes;
  const boundValid = typeof configured === "number" && Number.isSafeInteger(configured) && configured >= 1;
  const note = (e: Parameters<NonNullable<typeof deps.report>>[0]) => { try { deps.report?.(e); } catch { /* reporting can never change a decision */ } };

  /** Exactly { sessionId, matterId, evidenceId }: a browser-supplied permission, scope, version, document or property field is refused before any port is touched. */
  function parseRequest(req: unknown): { sessionId: string | null; matterId: string; evidenceId: string } | EvidenceReadFailure {
    if (!isRecord(req) || (Object.getPrototypeOf(req) !== Object.prototype && Object.getPrototypeOf(req) !== null)) return fail("denied");
    const keys = Object.keys(req);
    if (keys.length !== REQUEST_KEYS.length || !REQUEST_KEYS.every((k) => keys.includes(k) && Object.getOwnPropertyDescriptor(req, k)?.get === undefined)) return fail("denied");
    if (req.sessionId !== null && typeof req.sessionId !== "string") return fail("denied");
    try { return { sessionId: req.sessionId as string | null, matterId: parseUuid(req.matterId, "matterId"), evidenceId: parseUuid(req.evidenceId, "evidenceId") }; }
    catch { return fail("missing"); }
  }

  /** Mirrors the D1 reader's target authorization (scope mapping, classification policy, linked owners) WITHOUT touching any document. Returns null when not authorized. */
  async function authorizeTarget(ctx: ReadContext, target: DocumentTarget): Promise<{ filter: Omit<ListFilter, "search" | "section">; stateKey: string } | null> {
    const scope = await deps.scopes.scopeOfProperty(target.id);
    if (typeof scope !== "string" || scope === "" || !ctx.scopeRefs.includes(scope)) return null;
    const allowed: Classification[] = [...DEFAULT_ALLOWED_CLASSIFICATIONS];
    for (const c of CLASSIFICATIONS) {
      if (allowed.includes(c)) continue;
      if ((await deps.classificationPolicy(ctx, c, target)) === true) allowed.push(c);
    }
    const owners = await deps.store.linkedOwnerIds(target.id);
    if (!Array.isArray(owners) || owners.length > MAX_LINKED_OWNERS || !owners.every(posInt)) throw new Error("linkedOwnerIds");
    const linked: number[] = [];
    for (const ownerId of owners) {
      const s = await deps.scopes.scopeOfOwner(ownerId);
      if (typeof s === "string" && s !== "" && ctx.scopeRefs.includes(s)) linked.push(ownerId);
    }
    const sortedAllowed = [...allowed].sort(), sortedLinked = [...new Set(linked)].sort((a, b) => a - b);
    return {
      filter: { context: { ...target }, allowedClassifications: sortedAllowed, authorizedLinkedOwnerIds: sortedLinked },
      stateKey: `${ctx.binding}|${target.kind}:${target.id}|${scope}|${sortedAllowed.join(",")}|${sortedLinked.join(",")}`,
    };
  }

  /**
   * Steps 1-8 of ADR-0005 with fresh reads. Never throws. Each step runs only if every earlier step passed, so no document, version or
   * property operation can run for a caller without session, matter and D1 target authority.
   */
  async function resolveRun(p: { sessionId: string | null; matterId: string; evidenceId: string }): Promise<Run | EvidenceReadFailure> {
    try {
      // 1. session authority (A1)
      let auth;
      try { auth = await deps.authority(p.sessionId, null); } catch { return fail("unavailable"); }
      if (!auth || typeof auth.allowed !== "boolean") return fail("unavailable");
      if (!auth.allowed) return fail(auth.reason === "AUTHORITY_UNAVAILABLE" || auth.reason === "CLOCK_INVALID" ? "unavailable" : "denied");
      const ctx = snapshotContext(auth.context);
      if (!ctx) { note({ type: "invalid_authority_context" }); return fail("unavailable"); }
      const t0 = deps.now();
      if (typeof t0 !== "number" || !Number.isFinite(t0)) return fail("unavailable");
      if (t0 >= ctx.validUntilMs) return fail("denied");

      // 2. matter stage: the matter must be in the context's scopes; out-of-scope, absent matter and absent evidence are all `missing`
      let raw: unknown;
      try { raw = await deps.evidence.load(ctx, p.matterId, p.evidenceId); } catch { return fail("unavailable"); }
      if (raw === null || raw === undefined) return fail("missing");
      if (!isRecord(raw) || !Array.isArray(raw.matterProperties) || raw.matterProperties.length > MAX_LINKS) { note({ type: "port_contract_violation" }); return fail("unavailable"); }
      let matter, evidence;
      try { matter = parseMatter(raw.matter); evidence = parseEvidenceRef(raw.evidence); } catch { return fail("conflict"); }
      if (!ctx.scopeRefs.includes(matter.scopeRef)) return fail("missing");
      if (matter.id !== p.matterId || evidence.id !== p.evidenceId || evidence.matterId !== p.matterId) return fail("conflict");

      // 3. evidence state; the pinned version comes only from this row
      const state = deriveBindingState(evidence);
      if (state === "unbound") return fail("unavailable");
      if (state === "withdrawn") return fail("missing");
      if (evidence.restricted) return fail("denied");
      const versionId = evidence.documentVersionId as string;

      // 4. property keys from the SAME rows
      const propertyUuids = new Set<string>();
      for (const link of raw.matterProperties) {
        if (!isRecord(link)) return fail("conflict");
        if (parseUuid(link.matterId, "link.matterId") !== p.matterId) return fail("conflict");
        propertyUuids.add(parseUuid(link.propertyId, "link.propertyId"));
      }
      if (propertyUuids.size === 0) return fail("denied");
      let rowsRaw: unknown;
      try { rowsRaw = await deps.properties.rows(ctx, [...propertyUuids].sort()); } catch { return fail("unavailable"); }
      if (!Array.isArray(rowsRaw) || rowsRaw.length > MAX_LINKS) { note({ type: "port_contract_violation" }); return fail("unavailable"); }
      const byUuid = new Map<string, number>(), seen = new Set<number>();
      for (const r of rowsRaw) {
        if (!isRecord(r) || !posInt(r.id)) return fail("conflict");
        const uuid = parseUuid(r.idUuid, "property.idUuid");
        if (byUuid.has(uuid) || seen.has(r.id)) return fail("conflict");
        byUuid.set(uuid, r.id); seen.add(r.id);
      }
      const candidates: number[] = [];
      for (const u of propertyUuids) {
        const id = byUuid.get(u);
        if (id === undefined) return fail("conflict");
        candidates.push(id);
      }
      candidates.sort((a, b) => a - b);
      if (candidates.length > MAX_CANDIDATES) return fail("conflict");

      // 5. D1 target authority BEFORE any document operation. No authorized target => denied, whether or not any document or version exists.
      const authorized: { id: number; filter: Omit<ListFilter, "search" | "section">; stateKey: string }[] = [];
      for (const id of candidates) {
        let a;
        try { a = await authorizeTarget(ctx, { kind: "property", id }); } catch { return fail("unavailable"); }
        if (a) authorized.push({ id, ...a });
      }
      if (authorized.length === 0) return fail("denied");

      // 6. version resolution (the oracle step), reachable only for a caller that passed 1-5
      let pinnedRaw: unknown;
      try { pinnedRaw = await deps.pinned.resolve(ctx, versionId); } catch { return fail("unavailable"); }
      if (pinnedRaw === null || pinnedRaw === undefined) return fail("missing");
      if (!isRecord(pinnedRaw)) { note({ type: "port_contract_violation" }); return fail("unavailable"); }
      let documentId: string;
      try { documentId = parseUuid(pinnedRaw.documentId, "documentId"); } catch { note({ type: "port_contract_violation" }); return fail("unavailable"); }
      if (pinnedRaw.documentStatus === "retired") return fail("missing");
      if (pinnedRaw.documentStatus !== "active") return fail("unavailable");

      // 7. the registry row under the D1 visibility filter, first authorized candidate (ascending) that can see the document
      let chosen: { id: number; stateKey: string } | null = null, row: unknown = null;
      for (const a of authorized) {
        let got: unknown;
        try { got = await deps.store.get({ ...a.filter, search: null, section: null }, documentId); } catch { return fail("unavailable"); }
        if (got === null || got === undefined) continue;
        row = got; chosen = { id: a.id, stateKey: a.stateKey }; break;
      }
      if (!chosen) return fail("missing");
      if (!isStoreRow(row) || row.documentId !== documentId) { note({ type: "port_contract_violation" }); return fail("unavailable"); }

      // 8. plan (consistency only; never permission). It must agree with the target that exposed the row.
      const plan = planEvidenceRead({
        matterId: p.matterId, evidenceId: p.evidenceId, matter: raw.matter, evidence: raw.evidence, propertyRows: rowsRaw,
        matterProperties: raw.matterProperties, documentStatus: pinnedRaw.documentStatus, document: row,
      });
      if (plan.kind !== "planned") return fail(plan.kind);
      if (plan.context.kind !== "property" || plan.context.id !== chosen.id || plan.documentId !== documentId || plan.versionId !== versionId) return fail("conflict");
      return { ctx, plan, targetKey: chosen.stateKey, candidate: chosen.id };
    } catch { return fail("unavailable"); }
  }

  /** Fresh A1 decision + the chosen target's authorization state, compared with the first run. Never throws. */
  async function finalAuthorize(sessionId: string | null, first: Run): Promise<{ validUntilMs: number } | EvidenceReadFailure> {
    try {
      let auth;
      try { auth = await deps.authority(sessionId, null); } catch { return fail("unavailable"); }
      if (!auth || typeof auth.allowed !== "boolean") return fail("unavailable");
      if (!auth.allowed) return fail(auth.reason === "AUTHORITY_UNAVAILABLE" || auth.reason === "CLOCK_INVALID" ? "unavailable" : "denied");
      const ctx = snapshotContext(auth.context);
      if (!ctx) { note({ type: "invalid_authority_context" }); return fail("unavailable"); }
      if (ctx.binding !== first.ctx.binding) return fail("stale");
      let target;
      try { target = await authorizeTarget(ctx, { kind: "property", id: first.candidate }); } catch { return fail("unavailable"); }
      if (!target) return fail("denied");
      return target.stateKey === first.targetKey ? { validUntilMs: ctx.validUntilMs } : fail("stale");
    } catch { return fail("unavailable"); }
  }

  const samePlan = (a: Planned, b: Planned) =>
    a.matterId === b.matterId && a.evidenceId === b.evidenceId && a.evidenceRevision === b.evidenceRevision && a.scopeRef === b.scopeRef
    && a.context.kind === b.context.kind && a.context.id === b.context.id && a.documentId === b.documentId && a.versionId === b.versionId;

  // The D1 reader performs verified delivery: its own authorization, current version only, latest verified receipt, bounded provider read, size + SHA-256.
  const d1 = createDocumentReader({
    authority: deps.authority, scopes: deps.scopes, store: deps.store, content: deps.content, classificationPolicy: deps.classificationPolicy,
    now: deps.now, maxDownloadBytes: deps.maxDownloadBytes,
    report: (e) => note({ type: "d1_event", d1: e.type }),
  });

  async function downloadInner(input: EvidenceReadRequest): Promise<EvidenceReadResult> {
    if (!boundValid) { note({ type: "invalid_configuration" }); return fail("unavailable"); }
    const p = parseRequest(input);
    if ("kind" in p) return p;

    const first = await resolveRun(p);
    if ("kind" in first) return first;

    let delivered;
    try { delivered = await d1.download({ sessionId: p.sessionId, context: first.plan.context, documentId: first.plan.documentId, versionId: first.plan.versionId }); }
    catch { return fail("unavailable"); }
    if (!delivered || delivered.kind !== "ready") return fail(delivered && "kind" in delivered ? (delivered.kind as FailureKind) : "unavailable");

    // Revalidate EVERYTHING from scratch after the asynchronous delivery. Revoked => denied; changed => stale; unreadable => unavailable.
    const again = await resolveRun(p);
    if ("kind" in again) { note({ type: "withheld_after_delivery" }); return fail(again.kind === "denied" || again.kind === "unavailable" ? again.kind : "stale"); }
    if (!samePlan(first.plan, again.plan) || first.targetKey !== again.targetKey || first.ctx.binding !== again.ctx.binding
      || delivered.documentId !== again.plan.documentId || delivered.versionId !== again.plan.versionId) { note({ type: "withheld_after_delivery" }); return fail("stale"); }

    // The FINAL authorization decision is the last asynchronous step (the D1 reader's convention): a fresh A1 decision and the target's scope mapping,
    // classification policy and linked owners are recomputed AFTER every record read above, so a revocation or remapping that landed during those reads is caught.
    const last = await finalAuthorize(p.sessionId, first);
    if ("kind" in last) { note({ type: "withheld_after_delivery" }); return fail(last.kind === "denied" || last.kind === "unavailable" ? last.kind : "stale"); }

    // Nothing asynchronous follows this point. Expiry is checked against EVERY authority lifetime immediately before anything leaves.
    const t = deps.now();
    if (typeof t !== "number" || !Number.isFinite(t) || t >= first.ctx.validUntilMs || t >= again.ctx.validUntilMs || t >= last.validUntilMs) { note({ type: "withheld_after_delivery" }); return fail("stale"); }
    return {
      kind: "ready", matterId: again.plan.matterId, evidenceId: again.plan.evidenceId, versionId: delivered.versionId, name: delivered.name,
      mediaType: delivered.mediaType, byteSize: delivered.byteSize, sha256: delivered.sha256, bytes: delivered.bytes,
    };
  }

  // A thrown exception from any port can never escape or leak: it becomes a bounded failure.
  return {
    download: async (req: EvidenceReadRequest): Promise<EvidenceReadResult> => {
      try { return await downloadInner(req); } catch { note({ type: "port_contract_violation" }); return fail("unavailable"); }
    },
  };
}
export type EvidenceReader = ReturnType<typeof createEvidenceReader>;
