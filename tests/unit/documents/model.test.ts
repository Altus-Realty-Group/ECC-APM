import assert from "node:assert/strict";
import { test } from "node:test";
import { checkReceipt, clampPageSize, decodeCursor, deliveryStateOf, encodeCursor, isIdentifier, isSafeName, planVersionRegistration, sectionIdsFor, validTarget, type DeliveryReceipt, type RegisteredVersion, type VersionCandidate } from "../../../shared/documents/model.ts";

const H1 = "a".repeat(64), H2 = "b".repeat(64);
const v = (n: number, over: Partial<RegisteredVersion> = {}): RegisteredVersion => ({ versionId: `v${n}`, documentId: "d", versionNumber: n, byteSize: 10 * n, sha256: n === 1 ? H1 : H2, mediaType: "application/pdf", provider: "p", providerObjectRef: "obj", providerRevision: `r${n}`, ...over });
const cand = (n: number, over: Partial<VersionCandidate> = {}): VersionCandidate => ({ versionNumber: n, byteSize: 10 * n, sha256: n === 1 ? H1 : H2, mediaType: "application/pdf", provider: "p", providerObjectRef: "obj", providerRevision: `r${n}`, ...over });

test("version registration: the first and next versions are created, in order", () => {
  assert.deepEqual(planVersionRegistration([], cand(1)), { action: "create", versionNumber: 1 });
  assert.deepEqual(planVersionRegistration([v(1)], cand(2)), { action: "create", versionNumber: 2 });
});
test("version registration: a retry of an identical registered version is a no-op that returns the existing id", () => {
  assert.deepEqual(planVersionRegistration([v(1), v(2)], cand(2)), { action: "noop", versionId: "v2" });
});
test("version registration: the same number with different content, size or provider identity is a conflict, never an edit", () => {
  for (const over of [{ sha256: "c".repeat(64) }, { byteSize: 999 }, { providerRevision: "other" }, { providerObjectRef: "other" }, { provider: "q" }] as Partial<VersionCandidate>[])
    assert.deepEqual(planVersionRegistration([v(1)], cand(1, over)), { action: "conflict", reason: "SAME_NUMBER_DIFFERENT_CONTENT" }, JSON.stringify(over));
});
test("version registration: a provider revision cannot be registered twice (no duplicate storage), and gaps are rejected", () => {
  assert.deepEqual(planVersionRegistration([v(1)], cand(2, { providerRevision: "r1" })), { action: "conflict", reason: "PROVIDER_REVISION_ALREADY_REGISTERED" });
  assert.deepEqual(planVersionRegistration([v(1)], cand(3)), { action: "reject", reason: "VERSION_GAP" });
  assert.deepEqual(planVersionRegistration([], cand(2)), { action: "reject", reason: "VERSION_GAP" });
});
test("version registration: invalid candidates are rejected", () => {
  for (const over of [{ versionNumber: 0 }, { versionNumber: 1.5 }, { sha256: "xyz" }, { sha256: H1.toUpperCase() }, { byteSize: -1 }, { byteSize: 1.5 }, { provider: "" }, { providerObjectRef: "" }, { providerRevision: "" }] as Partial<VersionCandidate>[])
    assert.deepEqual(planVersionRegistration([], cand(1, over)), { action: "reject", reason: "INVALID_CANDIDATE" }, JSON.stringify(over));
});

const rc = (seq: number, status: DeliveryReceipt["status"], over: Partial<DeliveryReceipt> = {}): DeliveryReceipt => ({ seq, versionId: "v1", status, verifiedSha256: status === "verified" ? H1 : null, verifiedByteSize: status === "verified" ? 10 : null, ...over });
test("delivery state: no receipt is pending; the LATEST receipt decides; a verified receipt must match the registered digest and size", () => {
  const ver = v(1);
  assert.equal(deliveryStateOf(ver, []), "pending");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified")]), "verified");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified"), rc(2, "failed")]), "failed", "a later failure supersedes");
  assert.equal(deliveryStateOf(ver, [rc(2, "failed"), rc(1, "verified")]), "failed", "order is by sequence, not array position");
  assert.equal(deliveryStateOf(ver, [rc(1, "failed"), rc(2, "verified")]), "verified");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified", { verifiedSha256: H2 })]), "reconciliation");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified", { verifiedByteSize: 11 })]), "reconciliation");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified", { verifiedSha256: null })]), "reconciliation");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified", { versionId: "other" })]), "pending", "a receipt for another version is ignored");
});
test("receipt check: verified requires the registered digest and size", () => {
  assert.deepEqual(checkReceipt(v(1), { status: "verified", verifiedSha256: H1, verifiedByteSize: 10 }), { ok: true });
  assert.deepEqual(checkReceipt(v(1), { status: "verified", verifiedSha256: H2, verifiedByteSize: 10 }), { ok: false, reason: "VERIFIED_REQUIRES_MATCHING_DIGEST" });
  assert.deepEqual(checkReceipt(v(1), { status: "failed", verifiedSha256: null, verifiedByteSize: null }), { ok: true });
  assert.deepEqual(checkReceipt(v(1), { status: "bogus" as never, verifiedSha256: null, verifiedByteSize: null }), { ok: false, reason: "INVALID_RECEIPT" });
});

test("identifiers can never be paths or URLs; names are safe; targets use native positive integers", () => {
  for (const ok of ["d1", "A-b_9", "x".repeat(128)]) assert.ok(isIdentifier(ok));
  for (const bad of ["", "a/b", "a\\b", "a.b", "https://x", "a b", "x".repeat(129), 5, null, undefined]) assert.ok(!isIdentifier(bad as never), String(bad));
  assert.ok(isSafeName("Agreement 2026.pdf") && !isSafeName("a/b") && !isSafeName("a\u0000b") && !isSafeName("  ") && !isSafeName("x".repeat(256)));
  assert.ok(validTarget({ kind: "owner", id: 17 }) && validTarget({ kind: "property", id: 1 }));
  for (const bad of [{ kind: "owner", id: 0 }, { kind: "owner", id: 1.5 }, { kind: "x", id: 1 }, { kind: "owner", id: "17" }, { kind: "owner", id: Number.MAX_SAFE_INTEGER + 1 }, null]) assert.ok(!validTarget(bad as never));
  assert.deepEqual([...sectionIdsFor("direct", "owner")], ["management-contracts", "entity-records", "financial-tax", "statements-reports", "correspondence"]);
  assert.deepEqual([...sectionIdsFor("linked-owner", "property")], [...sectionIdsFor("direct", "owner")]);
  assert.deepEqual([...sectionIdsFor("direct", "property")], ["tenant-documents", "property-media", "construction", "legal", "insurance"]);
});

test("cursors round-trip, reject malformed input, and carry no authority", () => {
  const c = { kind: "owner" as const, id: 17, after: "d3", filterKey: "|term", binding: "p|a|g@1|scope-a" };
  assert.deepEqual(decodeCursor(encodeCursor(c)), c);
  for (const bad of [null, undefined, "", "!!!", "a".repeat(1025), encodeCursor({ ...c, after: "a/b" }), encodeCursor({ ...c, id: 0 }), btoa("{}"), btoa("not json")]) assert.equal(decodeCursor(bad), null, String(bad).slice(0, 20));
  assert.equal(decodeCursor(encodeCursor({ ...c, binding: "x".repeat(2049) })), null);
});
test("page size is bounded", () => {
  assert.equal(clampPageSize(undefined), 50);
  assert.equal(clampPageSize(null), 50);
  assert.equal(clampPageSize(1), 1);
  assert.equal(clampPageSize(100), 100);
  assert.equal(clampPageSize(101), 100);
  assert.equal(clampPageSize(10 ** 9), 100);
  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "5"]) assert.equal(clampPageSize(bad as never), -1, String(bad));
});
