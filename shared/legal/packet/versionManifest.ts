// Internal private version-manifest primitive for legal packets.
// Validates supplied RegisteredVersion metadata only. Proves neither authorization, current-version status,
// byte delivery, nor packet completeness. Performs no export or persistence.
// Reuses document/version identity from D1; invents none.
// Never returns provider references, paths, URLs, filenames, or raw errors.

import { isRegisteredVersion, type RegisteredVersion } from "../../documents/model.ts";

export const MAX_MANIFEST_ROWS = 500;

export type ManifestEntry = {
  documentId: string;
  versionId: string;
  versionNumber: number;
  byteSize: number;
  sha256: string;
  mediaType: string;
};

export type VersionManifest = {
  entries: readonly ManifestEntry[];
  manifestSha256: string;
};

export type ManifestReason =
  | "input_too_large"
  | "invalid_entry"
  | "conflicting_identity"
  | "ambiguous_selection"
  | "unavailable";

export type ManifestResult =
  | { ok: true; manifest: VersionManifest }
  | { ok: false; reason: ManifestReason };

function hasSubtleDigest(): boolean {
  return typeof globalThis.crypto?.subtle?.digest === "function";
}

async function sha256HexUtf8(text: string): Promise<string | null> {
  if (!hasSubtleDigest()) return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Stable canonical serialization: sorted by documentId then versionId; fixed field order as array of tuples. */
export function canonicalSerialize(entries: readonly ManifestEntry[]): string {
  const sorted = [...entries].sort((a, b) =>
    a.documentId.localeCompare(b.documentId) || a.versionId.localeCompare(b.versionId)
  );
  const tuples = sorted.map((e) => [
    e.documentId,
    e.versionId,
    e.versionNumber,
    e.byteSize,
    e.sha256,
    e.mediaType,
  ]);
  return JSON.stringify(tuples);
}

function extractWhitelist(v: RegisteredVersion): ManifestEntry {
  return {
    documentId: v.documentId,
    versionId: v.versionId,
    versionNumber: v.versionNumber,
    byteSize: v.byteSize,
    sha256: v.sha256,
    mediaType: v.mediaType,
  };
}

function isExactRepeat(a: RegisteredVersion, b: RegisteredVersion): boolean {
  return (
    a.versionId === b.versionId &&
    a.documentId === b.documentId &&
    a.versionNumber === b.versionNumber &&
    a.byteSize === b.byteSize &&
    a.sha256 === b.sha256 &&
    a.mediaType === b.mediaType &&
    a.provider === b.provider &&
    a.providerObjectRef === b.providerObjectRef &&
    a.providerRevision === b.providerRevision
  );
}

/**
 * Builds an internal version manifest from unknown input.
 * Bounds at 500 rows. Deduplicates exact repeats. Rejects conflicting identities
 * and ambiguous multiple selected versions of one document.
 * Returns fresh whitelisted metadata only. Computes actual SHA-256 of the UTF-8 canonical form.
 * Returns unavailable when cryptographic support is missing. Preserves input immutability.
 * Handles prototype-like keys safely via Map.
 */
export async function buildPrivateVersionManifest(input: unknown): Promise<ManifestResult> {
  if (!hasSubtleDigest()) return { ok: false, reason: "unavailable" };

  if (!Array.isArray(input)) return { ok: false, reason: "invalid_entry" };
  if (input.length > MAX_MANIFEST_ROWS) return { ok: false, reason: "input_too_large" };

  const byVersionId = new Map<string, RegisteredVersion>();
  const byDocumentId = new Map<string, string>(); // documentId -> versionId

  for (const raw of input) {
    if (!isRegisteredVersion(raw)) return { ok: false, reason: "invalid_entry" };
    const v = raw as RegisteredVersion;

    const existing = byVersionId.get(v.versionId);
    if (existing) {
      if (!isExactRepeat(existing, v)) return { ok: false, reason: "conflicting_identity" };
      // exact repeat: skip
      continue;
    }

    const priorVersionForDoc = byDocumentId.get(v.documentId);
    if (priorVersionForDoc !== undefined && priorVersionForDoc !== v.versionId) {
      return { ok: false, reason: "ambiguous_selection" };
    }

    byVersionId.set(v.versionId, v);
    byDocumentId.set(v.documentId, v.versionId);
  }

  const entries: ManifestEntry[] = [];
  for (const v of byVersionId.values()) {
    entries.push(extractWhitelist(v));
  }
  entries.sort((a, b) =>
    a.documentId.localeCompare(b.documentId) || a.versionId.localeCompare(b.versionId)
  );

  const canonical = canonicalSerialize(entries);
  const digest = await sha256HexUtf8(canonical);
  if (digest === null) return { ok: false, reason: "unavailable" };

  return {
    ok: true,
    manifest: {
      entries,
      manifestSha256: digest,
    },
  };
}
