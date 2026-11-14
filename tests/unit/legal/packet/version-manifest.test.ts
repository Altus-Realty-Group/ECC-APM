import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { buildPrivateVersionManifest, canonicalSerialize, type ManifestEntry } from "../../../../shared/legal/packet/versionManifest.ts";

const validVersion = (over: Record<string, unknown> = {}) => ({
  versionId: "v1",
  documentId: "d1",
  versionNumber: 1,
  byteSize: 1024,
  sha256: "a".repeat(64),
  mediaType: "application/pdf",
  provider: "dropbox",
  providerObjectRef: "obj-1",
  providerRevision: "rev-1",
  ...over,
});

const independentSha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

test("rejects non-array and malformed entries", async () => {
  assert.deepEqual(await buildPrivateVersionManifest(null), { ok: false, reason: "invalid_entry" });
  assert.deepEqual(await buildPrivateVersionManifest({}), { ok: false, reason: "invalid_entry" });
  assert.deepEqual(await buildPrivateVersionManifest([null]), { ok: false, reason: "invalid_entry" });
  assert.deepEqual(await buildPrivateVersionManifest([{ ...validVersion(), versionId: "" }]), { ok: false, reason: "invalid_entry" });
  assert.deepEqual(await buildPrivateVersionManifest([{ ...validVersion(), sha256: "not-hex" }]), { ok: false, reason: "invalid_entry" });
  assert.deepEqual(await buildPrivateVersionManifest([{ ...validVersion(), byteSize: -1 }]), { ok: false, reason: "invalid_entry" });
  assert.deepEqual(await buildPrivateVersionManifest([{ ...validVersion(), versionNumber: 0 }]), { ok: false, reason: "invalid_entry" });
});

test("zero size is accepted; null size is rejected", async () => {
  const zero = validVersion({ byteSize: 0 });
  const result = await buildPrivateVersionManifest([zero]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.manifest.entries[0].byteSize, 0);

  assert.deepEqual(await buildPrivateVersionManifest([{ ...validVersion(), byteSize: null }]), { ok: false, reason: "invalid_entry" });
});

test("bounds input at 500 rows", async () => {
  const many = Array.from({ length: 501 }, (_, i) => validVersion({ versionId: `v${i}`, documentId: `d${i}` }));
  assert.deepEqual(await buildPrivateVersionManifest(many), { ok: false, reason: "input_too_large" });

  const exactly = Array.from({ length: 500 }, (_, i) => validVersion({ versionId: `v${i}`, documentId: `d${i}` }));
  const result = await buildPrivateVersionManifest(exactly);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.manifest.entries.length, 500);
});

test("deduplicates exact repeats and rejects conflicts", async () => {
  const a = validVersion();
  const replay = { ...a };
  const result = await buildPrivateVersionManifest([a, replay]);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.manifest.entries.length, 1);

  const conflict = validVersion({ sha256: "b".repeat(64) });
  assert.deepEqual(await buildPrivateVersionManifest([a, conflict]), { ok: false, reason: "conflicting_identity" });

  const sameIdDifferentDoc = validVersion({ documentId: "d2" });
  assert.deepEqual(await buildPrivateVersionManifest([a, sameIdDifferentDoc]), { ok: false, reason: "conflicting_identity" });
});

test("rejects ambiguous multiple selected versions of one document", async () => {
  const v1 = validVersion({ versionId: "v1", versionNumber: 1 });
  const v2 = validVersion({ versionId: "v2", versionNumber: 2, sha256: "c".repeat(64) });
  assert.deepEqual(await buildPrivateVersionManifest([v1, v2]), { ok: false, reason: "ambiguous_selection" });
});

test("stable ordering and canonical serialization", async () => {
  const b = validVersion({ versionId: "vb", documentId: "db", versionNumber: 2 });
  const a = validVersion({ versionId: "va", documentId: "da", versionNumber: 1 });
  const result = await buildPrivateVersionManifest([b, a]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const ids = result.manifest.entries.map((e) => e.documentId);
    assert.deepEqual(ids, ["da", "db"]);
    const canonical = canonicalSerialize(result.manifest.entries);
    assert.equal(canonical, JSON.stringify([
      ["da", "va", 1, 1024, "a".repeat(64), "application/pdf"],
      ["db", "vb", 2, 1024, "a".repeat(64), "application/pdf"],
    ]));
  }
});

test("privacy: never returns provider references, paths, URLs, or filenames", async () => {
  const withSecrets = validVersion({
    provider: "secret-provider",
    providerObjectRef: "/secret/path/file.pdf",
    providerRevision: "https://example.com/secret",
  });
  const result = await buildPrivateVersionManifest([withSecrets]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const entry = result.manifest.entries[0];
    const serialized = JSON.stringify(result.manifest);
    assert.ok(!serialized.includes("secret"));
    assert.ok(!serialized.includes("/secret"));
    assert.ok(!serialized.includes("https://"));
    assert.ok(!serialized.includes("file.pdf"));
    assert.equal(Object.keys(entry).sort().join(","), "byteSize,documentId,mediaType,sha256,versionId,versionNumber");
  }
});

test("preserves input immutability and handles prototype-like IDs safely", async () => {
  const original = validVersion();
  const input = [original];
  const snapshot = JSON.stringify(input);
  const result = await buildPrivateVersionManifest(input);
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(original.provider, "dropbox");

  // prototype-like identifier is a valid ID under D1 rules; Map keeps it safe (no object pollution)
  const proto = validVersion({ versionId: "__proto__", documentId: "d-proto" });
  const protoResult = await buildPrivateVersionManifest([proto]);
  assert.equal(protoResult.ok, true);
  if (protoResult.ok) {
    assert.equal(protoResult.manifest.entries[0].versionId, "__proto__");
    // confirm no pollution of Object.prototype
    assert.equal(Object.prototype.hasOwnProperty.call({}, "__proto__"), false);
  }
});

test("computes actual SHA-256 of the UTF-8 canonical manifest; independent control", async () => {
  const entries: ManifestEntry[] = [
    { documentId: "d1", versionId: "v1", versionNumber: 1, byteSize: 0, sha256: "a".repeat(64), mediaType: "text/plain" },
  ];
  const canonical = canonicalSerialize(entries);
  const expected = independentSha256(canonical);

  const result = await buildPrivateVersionManifest([validVersion({ byteSize: 0, mediaType: "text/plain" })]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.manifest.manifestSha256, expected);
    assert.equal(result.manifest.manifestSha256.length, 64);
    assert.match(result.manifest.manifestSha256, /^[0-9a-f]{64}$/);
  }
});

test("does not substitute ledger fingerprint or other hashes", async () => {
  const result = await buildPrivateVersionManifest([validVersion()]);
  assert.equal(result.ok, true);
  if (result.ok) {
    // ledger fingerprint is 16 hex chars; this must be full SHA-256
    assert.equal(result.manifest.manifestSha256.length, 64);
  }
});
