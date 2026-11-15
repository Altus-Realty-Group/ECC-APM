// L4 read preparation only. No I/O, authority producer, provider call or browser binding.
// A plan proves consistency of a supplied snapshot, NOT its provenance or access permission.
import { parseMatter } from "../../../shared/legal/contracts";
import { deriveBindingState, parseEvidenceRef, parseUuid } from "../../../shared/legal/evidenceLink";
import { DEFAULT_ALLOWED_CLASSIFICATIONS, classificationVisible, sectionIdsFor, type DocumentTarget } from "../../../shared/documents/model";
import { isStoreRow } from "../documents/reader";

export type EvidenceReadPlan = {
  kind: "planned"; matterId: string; evidenceId: string; evidenceRevision: number;
  scopeRef: string; context: DocumentTarget; documentId: string; versionId: string;
} | { kind: "unavailable" | "denied" | "missing" | "stale" | "conflict" };
const fail = (kind: "unavailable" | "denied" | "missing" | "stale" | "conflict"): EvidenceReadPlan => ({ kind });
const MAX_ROWS = 1000;
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("invalid");
  return v as Record<string, unknown>;
}
function rows(v: unknown): unknown[] {
  if (!Array.isArray(v) || v.length > MAX_ROWS) throw new Error("invalid");
  return v;
}
function nativeId(v: unknown): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v <= 0) throw new Error("invalid");
  return v;
}

/**
 * Expected input: requested matter/evidence UUIDs, parsed-compatible L1 matter/ref,
 * propertyRows [{id,idUuid}] from SAME properties rows, matterProperties
 * [{matterId,propertyId}] from legal_matter_properties, D1 StoreRow `document`,
 * and explicit canonical documentStatus. All inputs are untrusted and whitelisted.
 *
 * Only current-version public/general-confidential evidence is planned here.
 * Unsupported entitlements, missing associations, unbound/withdrawn/retired refs
 * and old pinned versions never become download targets. An eventual reader must
 * independently authenticate matter AND D1 authority, refresh mappings/status,
 * revalidate after async work, and check receipts/bytes. Production is unbound.
 */
export function planEvidenceRead(input: unknown): EvidenceReadPlan {
  try {
    const o = object(input);
    const expectedMatter = parseUuid(o.matterId, "matterId"), expectedEvidence = parseUuid(o.evidenceId, "evidenceId");
    const matter = parseMatter(o.matter), evidence = parseEvidenceRef(o.evidence);
    const matterId = parseUuid(matter.id, "matter.id");
    if (matterId !== expectedMatter || evidence.id !== expectedEvidence || evidence.matterId !== matterId) return fail("conflict");
    const state = deriveBindingState(evidence);
    if (state === "unbound") return fail("unavailable");
    if (state === "withdrawn") return fail("missing");
    if (evidence.restricted) return fail("denied");
    if (o.documentStatus !== "active" && o.documentStatus !== "retired") return fail("unavailable");
    if (o.documentStatus === "retired") return fail("missing");
    if (!isStoreRow(o.document)) return fail("conflict");
    const doc = o.document;
    const documentId = parseUuid(doc.documentId, "documentId"), versionId = parseUuid(doc.currentVersion.versionId, "versionId");
    if (parseUuid(doc.currentVersion.documentId, "version.documentId") !== documentId) return fail("conflict");
    if (versionId !== evidence.documentVersionId) return fail("stale");
    // This initial planner cannot open default-deny classifications. It grants no
    // access to even these default classes; the protected D1 reader must do that.
    if (!classificationVisible(doc.section, doc.classification, DEFAULT_ALLOWED_CLASSIFICATIONS)) return fail("denied");
    const byUuid = new Map<string, number>(), seenNumeric = new Set<number>();
    for (const raw of rows(o.propertyRows)) {
      const row = object(raw), id = nativeId(row.id), uuid = parseUuid(row.idUuid, "property.idUuid");
      if (byUuid.has(uuid) || seenNumeric.has(id)) return fail("conflict");
      byUuid.set(uuid, id); seenNumeric.add(id);
    }
    const linked = new Set<number>();
    for (const raw of rows(o.matterProperties)) {
      const row = object(raw);
      if (parseUuid(row.matterId, "link.matterId") !== matterId) return fail("conflict");
      const id = byUuid.get(parseUuid(row.propertyId, "link.propertyId"));
      if (id === undefined) return fail("conflict");
      // Several unit/lease links may legitimately reference the same property.
      linked.add(id);
    }
    let propertyId: number;
    if (doc.homeKind === "property") {
      if (doc.association !== "direct" || doc.link !== null) return fail("conflict");
      propertyId = nativeId(doc.homePropertyId);
    } else {
      // Owner-only access never establishes a legal association. Require the exact
      // D1 document-owner-property link, then intersect it with matter properties.
      if (doc.association !== "linked-owner" || doc.link === null) return fail("denied");
      if (parseUuid(doc.link.documentId, "link.documentId") !== documentId || doc.link.ownerId !== doc.homeOwnerId) return fail("conflict");
      propertyId = nativeId(doc.link.propertyId);
    }
    if (!linked.has(propertyId)) return fail("denied");
    if (!sectionIdsFor(doc.association, "property").includes(doc.section)) return fail("conflict");
    return {
      kind: "planned", matterId, evidenceId: evidence.id, evidenceRevision: evidence.revision,
      scopeRef: matter.scopeRef, context: { kind: "property", id: propertyId }, documentId, versionId,
    };
  } catch { return fail("conflict"); }
}
