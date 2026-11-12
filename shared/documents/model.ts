// D1 document registry contracts. Pure: no network, filesystem, environment or node imports (so the server reader, tests and a
// future binder share one set of rules). Source-only: mirrors docs/documents/schema/001_document_registry.proposal.sql (NOT applied).
// Compatible with the PR #232 projection (e1a5ae2): native integer owner/property ids, opaque string ids, ten fixed sections.

export type TargetKind = "owner" | "property";
/** A requested context. `id` is the NATIVE owners.id / properties.id (positive safe integer), never a path or provider id. */
export type DocumentTarget = { kind: TargetKind; id: number };

export const OWNER_SECTION_IDS = ["management-contracts", "entity-records", "financial-tax", "statements-reports", "correspondence"] as const;
export const PROPERTY_SECTION_IDS = ["tenant-documents", "property-media", "construction", "legal", "insurance"] as const;
export type OwnerSectionId = (typeof OWNER_SECTION_IDS)[number];
export type PropertySectionId = (typeof PROPERTY_SECTION_IDS)[number];

export const CLASSIFICATIONS = ["general", "confidential", "restricted", "financial_tax"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];
/** Readable once the context is authorized. `restricted` and `financial_tax` are default-deny and need an explicit policy allow. */
export const DEFAULT_ALLOWED_CLASSIFICATIONS: readonly Classification[] = ["general", "confidential"];

/**
 * MINIMUM CLASSIFICATION RULE (one rule, used by the reader and mirrored by the SQL CHECK): a document in the `financial-tax` section
 * is financial/tax material whatever it was declared as. Its declared classification must be `financial_tax` or `restricted`; a row that
 * is declared anything else (for example `general`) is treated as `financial_tax` too, so it is never readable under the default policy.
 * Every class returned here must be allowed for the row to be visible. There is no implicit financial/tax access.
 */
export function requiredClassifications(section: string, declared: Classification): readonly Classification[] {
  if (section !== "financial-tax") return [declared];
  return declared === "financial_tax" || declared === "restricted" ? [declared] : [declared, "financial_tax"];
}
export const classificationVisible = (section: string, declared: Classification, allowed: readonly Classification[]): boolean =>
  requiredClassifications(section, declared).every((c) => allowed.includes(c));

export type DeliveryState = "verified" | "pending" | "failed" | "reconciliation";
export type Association = "direct" | "linked-owner";

/** PR #232's opaque identifier rule. It excludes '/', '.', ':' and whitespace, so a path or URL can never be an identifier. */
export const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
export const SHA256_HEX = /^[0-9a-f]{64}$/;
/** Identical to the SQL CHECK on document_versions.media_type. */
export const MEDIA_TYPE = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i;
export const isMediaType = (v: unknown): v is string => typeof v === "string" && MEDIA_TYPE.test(v);
/** Mirrors the SQL `btrim(x) <> ''` checks: a provider identity field must carry non-blank text. */
export const isNonBlank = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
export const MAX_REGISTERED_BYTES = Number.MAX_SAFE_INTEGER;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;

export const isIdentifier = (v: unknown): v is string => typeof v === "string" && IDENTIFIER.test(v);
export const validTarget = (t: unknown): t is DocumentTarget =>
  typeof t === "object" && t !== null && ((t as DocumentTarget).kind === "owner" || (t as DocumentTarget).kind === "property")
  && Number.isSafeInteger((t as DocumentTarget).id) && (t as DocumentTarget).id > 0;
export const isSafeName = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 255 && !/[\\/\u0000-\u001f\u007f]/.test(v);

export function sectionIdsFor(association: Association, kind: TargetKind): readonly string[] {
  return association === "linked-owner" || kind === "owner" ? OWNER_SECTION_IDS : PROPERTY_SECTION_IDS;
}

/** An immutable registered version. Provider identity is opaque and is never projected to a browser. */
export type RegisteredVersion = {
  versionId: string;
  documentId: string;
  versionNumber: number;
  byteSize: number;
  sha256: string;
  mediaType: string;
  provider: string;
  providerObjectRef: string;
  providerRevision: string;
};

/** An append-only delivery receipt. `verified*` fields are what delivery actually observed. */
export type DeliveryReceipt = {
  seq: number;
  versionId: string;
  status: DeliveryState;
  verifiedSha256: string | null;
  verifiedByteSize: number | null;
};

const isSafeNonNegative = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const STATES: readonly string[] = ["verified", "pending", "failed", "reconciliation"];
export function isRegisteredVersion(v: unknown): v is RegisteredVersion {
  const o = v as RegisteredVersion;
  return typeof v === "object" && v !== null && isIdentifier(o.versionId) && isIdentifier(o.documentId)
    && Number.isSafeInteger(o.versionNumber) && o.versionNumber >= 1 && isSafeNonNegative(o.byteSize) && typeof o.sha256 === "string" && SHA256_HEX.test(o.sha256)
    && isMediaType(o.mediaType) && isNonBlank(o.provider) && isNonBlank(o.providerObjectRef) && isNonBlank(o.providerRevision);
}
export function isDeliveryReceipt(v: unknown): v is DeliveryReceipt {
  const o = v as DeliveryReceipt;
  return typeof v === "object" && v !== null && Number.isSafeInteger(o.seq) && o.seq >= 1 && isIdentifier(o.versionId) && STATES.includes(o.status)
    && (o.verifiedSha256 === null || (typeof o.verifiedSha256 === "string" && SHA256_HEX.test(o.verifiedSha256)))
    && (o.verifiedByteSize === null || isSafeNonNegative(o.verifiedByteSize));
}

/**
 * Delivery state of a version from its append-only receipts: the latest receipt decides. `verified` counts only if the receipt's
 * recorded SHA-256 and size equal the registered version's. FAIL CLOSED (reconciliation, never verified) whenever the evidence is
 * ambiguous or malformed, independent of input order: a malformed receipt; two receipts for the version sharing a sequence number
 * (sequences are unique in the registry, so a repeat is corruption); a non-verified receipt carrying a verified digest/size; or a
 * "verified" receipt that disagrees with the registered version. No receipt at all is pending.
 */
export function deliveryStateOf(version: Pick<RegisteredVersion, "versionId" | "sha256" | "byteSize">, receipts: readonly DeliveryReceipt[]): DeliveryState {
  const own = receipts.filter((r) => r && r.versionId === version.versionId);
  if (own.length === 0) return "pending";
  if (!own.every(isDeliveryReceipt) || new Set(own.map((r) => r.seq)).size !== own.length) return "reconciliation";
  const latest = own.reduce((a, b) => (b.seq > a.seq ? b : a));
  const carriesDigest = latest.verifiedSha256 !== null || latest.verifiedByteSize !== null;
  if (latest.status !== "verified") return carriesDigest ? "reconciliation" : latest.status;
  return latest.verifiedSha256 === version.sha256 && latest.verifiedByteSize === version.byteSize ? "verified" : "reconciliation";
}

export type VersionPlan =
  | { action: "create"; versionNumber: number }
  | { action: "noop"; versionId: string }
  | { action: "conflict"; reason: "SAME_NUMBER_DIFFERENT_CONTENT" | "PROVIDER_REVISION_ALREADY_REGISTERED" }
  | { action: "reject"; reason: "VERSION_GAP" | "INVALID_CANDIDATE" };

export type VersionCandidate = Pick<RegisteredVersion, "versionNumber" | "byteSize" | "sha256" | "mediaType" | "provider" | "providerObjectRef" | "providerRevision">;

/**
 * Decide how to register a candidate version against the document's existing versions (immutable: nothing is ever edited).
 * A retry of an already-registered version (same number AND identical content, media type and provider identity) is a no-op; the same number with
 * different content is a conflict; the next number is created; a skipped number is rejected. The same provider revision can never be
 * registered twice for a document (no duplicate storage).
 */
export function planVersionRegistration(existing: readonly RegisteredVersion[], c: VersionCandidate): VersionPlan {
  if (!Number.isSafeInteger(c.versionNumber) || c.versionNumber < 1 || typeof c.sha256 !== "string" || !SHA256_HEX.test(c.sha256) || !isSafeNonNegative(c.byteSize)
    || !isMediaType(c.mediaType) || !isNonBlank(c.provider) || !isNonBlank(c.providerObjectRef) || !isNonBlank(c.providerRevision)) return { action: "reject", reason: "INVALID_CANDIDATE" };
  const same = existing.find((v) => v.versionNumber === c.versionNumber);
  if (same) {
    const identical = same.sha256 === c.sha256 && same.byteSize === c.byteSize && same.mediaType === c.mediaType && same.provider === c.provider
      && same.providerObjectRef === c.providerObjectRef && same.providerRevision === c.providerRevision;
    return identical ? { action: "noop", versionId: same.versionId } : { action: "conflict", reason: "SAME_NUMBER_DIFFERENT_CONTENT" };
  }
  if (existing.some((v) => v.provider === c.provider && v.providerObjectRef === c.providerObjectRef && v.providerRevision === c.providerRevision))
    return { action: "conflict", reason: "PROVIDER_REVISION_ALREADY_REGISTERED" };
  const max = existing.reduce((m, v) => Math.max(m, v.versionNumber), 0);
  return c.versionNumber === max + 1 ? { action: "create", versionNumber: c.versionNumber } : { action: "reject", reason: "VERSION_GAP" };
}

export type ReceiptCheck = { ok: true } | { ok: false; reason: "VERIFIED_REQUIRES_MATCHING_DIGEST" | "NONVERIFIED_CARRIES_DIGEST" | "INVALID_RECEIPT" };
/**
 * Same rules as the SQL CHECKs and composite FK: a receipt may say `verified` only with the SHA-256 and size of the registered version,
 * and ONLY a verified receipt may carry a digest/size (a failed, pending or reconciliation receipt that does is rejected).
 */
export function checkReceipt(version: Pick<RegisteredVersion, "sha256" | "byteSize">, r: Pick<DeliveryReceipt, "status" | "verifiedSha256" | "verifiedByteSize">): ReceiptCheck {
  if (!STATES.includes(r.status)) return { ok: false, reason: "INVALID_RECEIPT" };
  if (r.status !== "verified") return r.verifiedSha256 === null && r.verifiedByteSize === null ? { ok: true } : { ok: false, reason: "NONVERIFIED_CARRIES_DIGEST" };
  return r.verifiedSha256 === version.sha256 && r.verifiedByteSize === version.byteSize ? { ok: true } : { ok: false, reason: "VERIFIED_REQUIRES_MATCHING_DIGEST" };
}

/** What the browser may see of a document. No provider reference, path, URL, checksum or classification detail. */
export type ProjectedDocument = { id: string; versionId: string; name: string; section: string; association: Association; delivery: DeliveryState };

/**
 * Compact deterministic fingerprint (53-bit cyrb53) of an authorization-state string. NOT a security primitive: cursors carry no authority
 * and every page re-authorizes, so this only detects that the effective authorization state changed between pages.
 */
export function stateFingerprint(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)}.${text.length}`;
}

// ---- bounded, binding-checked cursors (a cursor carries NO authority: it is only a keyset position) ----
export type CursorState = { kind: TargetKind; id: number; after: string; filterKey: string; binding: string };

export function clampPageSize(v: unknown): number {
  if (v === undefined || v === null) return DEFAULT_PAGE_SIZE;
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 1 ? Math.min(v, MAX_PAGE_SIZE) : -1;
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
export function encodeCursor(c: CursorState): string { return b64(JSON.stringify({ v: 1, ...c })); }
/** Null for anything malformed. The caller must still compare context, filters and authorization binding (stale cursors are refused). */
export function decodeCursor(text: unknown): CursorState | null {
  if (typeof text !== "string" || text.length === 0 || text.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const o = JSON.parse(unb64(text));
    if (!o || o.v !== 1 || (o.kind !== "owner" && o.kind !== "property") || !Number.isSafeInteger(o.id) || o.id <= 0
      || !isIdentifier(o.after) || typeof o.filterKey !== "string" || o.filterKey.length > 256 || typeof o.binding !== "string" || o.binding.length > 2048) return null;
    return { kind: o.kind, id: o.id, after: o.after, filterKey: o.filterKey, binding: o.binding };
  } catch { return null; }
}
