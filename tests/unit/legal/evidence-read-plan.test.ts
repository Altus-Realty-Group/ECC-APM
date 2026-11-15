import { test } from "node:test";
import assert from "node:assert/strict";
import { planEvidenceRead } from "../../../server/lib/legal/evidenceReadPlan";
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture(): any {
  return { matterId: U(1), evidenceId: U(2),
    matter: { id: U(1), scopeRef: "synthetic", caseType: "collections", lifecycle: "filed", courtRef: null, docketNumber: null, revision: 1 },
    evidence: { id: U(2), matterId: U(1), requirementId: null, documentVersionId: U(3), withdrawnAt: null, revision: 2, restricted: false, storageRef: "PRIVATE LEGACY POINTER" },
    // Numeric suffix deliberately disagrees: the same-row join must resolve 42.
    propertyRows: [{ id: 42, idUuid: U(99) }, { id: 99, idUuid: U(42) }],
    matterProperties: [{ matterId: U(1), propertyId: U(99) }], documentStatus: "active",
    document: { documentId: U(4), name: "PRIVATE filename", section: "legal", classification: "confidential", homeKind: "property", homePropertyId: 42, homeOwnerId: null, association: "direct", link: null,
      currentVersion: { versionId: U(3), documentId: U(4), versionNumber: 1, byteSize: 10, sha256: "a".repeat(64), mediaType: "application/pdf", provider: "PRIVATE", providerObjectRef: "PRIVATE", providerRevision: "PRIVATE" }, receipts: [] } };
}
test("same-row UUID join chooses native property, never a suffix, and emits only a non-authoritative plan", () => {
  const input = fixture(), before = structuredClone(input), p = planEvidenceRead(input);
  assert.deepEqual(p, { kind: "planned", matterId: U(1), evidenceId: U(2), evidenceRevision: 2, scopeRef: "synthetic", context: { kind: "property", id: 42 }, documentId: U(4), versionId: U(3) });
  assert.doesNotMatch(JSON.stringify(p), /PRIVATE|sha256|receipts|authority|allowed/); assert.deepEqual(input, before);
});
test("wrong requested identities or cross-matter evidence/links conflict", () => {
  for (const mutate of [(x: any) => x.matterId = U(88), (x: any) => x.evidenceId = U(88), (x: any) => x.evidence.matterId = U(88), (x: any) => x.matterProperties[0].matterId = U(88)]) {
    const x = fixture(); mutate(x); assert.equal(planEvidenceRead(x).kind, "conflict");
  }
});
test("old pin is stale, wrong document identity conflicts, unavailable binding never follows storageRef", () => {
  const x = fixture(); x.document.currentVersion.versionId = U(7); assert.equal(planEvidenceRead(x).kind, "stale");
  x.document.currentVersion.versionId = U(3); x.document.currentVersion.documentId = U(8); assert.equal(planEvidenceRead(x).kind, "conflict");
  x.evidence.documentVersionId = null; x.evidence.storageRef = U(3); assert.deepEqual(planEvidenceRead(x), { kind: "unavailable" });
});
test("withdrawn, retired, missing-status and restricted snapshots withhold identity", () => {
  for (const [mutate, expected] of [
    [(x: any) => x.evidence.withdrawnAt = "2026-11-15T10:00:00Z", "missing"],
    [(x: any) => x.documentStatus = "retired", "missing"], [(x: any) => delete x.documentStatus, "unavailable"],
    [(x: any) => x.evidence.restricted = true, "denied"], [(x: any) => x.document.classification = "financial_tax", "denied"],
    [(x: any) => x.document.classification = "restricted", "denied"]
  ] as const) { const x = fixture(); mutate(x); assert.deepEqual(planEvidenceRead(x), { kind: expected }); }
});
test("incomplete mappings, duplicate key families and unsafe numeric IDs conflict", () => {
  for (const mutate of [
    (x: any) => x.propertyRows = [], (x: any) => x.propertyRows.push({ ...x.propertyRows[0] }),
    (x: any) => x.propertyRows[1].id = 42, (x: any) => x.propertyRows[1].idUuid = U(99),
    (x: any) => x.propertyRows[0].id = Number.MAX_SAFE_INTEGER + 1,
    (x: any) => x.propertyRows[0].id = "42", (x: any) => x.propertyRows[0].id = 42n,
  ]) { const x = fixture(); mutate(x); assert.equal(planEvidenceRead(x).kind, "conflict"); }
});
test("unrelated property is denied while multiple unit links for one property stay valid", () => {
  const x = fixture(); x.document.homePropertyId = 99; assert.equal(planEvidenceRead(x).kind, "denied");
  x.document.homePropertyId = 42; x.matterProperties.push({ ...x.matterProperties[0], unitId: U(31) }); assert.equal(planEvidenceRead(x).kind, "planned");
});
test("owner agreements require exact document-owner-property evidence, not just the same owner", () => {
  const x = fixture(); Object.assign(x.document, { homeKind: "owner", homePropertyId: null, homeOwnerId: 17, section: "management-contracts", association: "linked-owner", link: { documentId: U(4), ownerId: 17, propertyId: 42 } });
  assert.equal(planEvidenceRead(x).kind, "planned");
  for (const [key, value, expected] of [["propertyId",99,"denied"],["ownerId",18,"conflict"],["documentId",U(5),"conflict"]] as const) {
    const y = structuredClone(x); y.document.link[key] = value; assert.equal(planEvidenceRead(y).kind, expected);
  }
  x.document.link = null; x.document.association = "direct"; assert.equal(planEvidenceRead(x).kind, "denied");
});
test("financial-tax minimum rule cannot be bypassed by general classification", () => {
  const x = fixture(); Object.assign(x.document, { homeKind: "owner", homePropertyId: null, homeOwnerId: 17, section: "financial-tax", classification: "general", association: "linked-owner", link: { documentId: U(4), ownerId: 17, propertyId: 42 } });
  assert.equal(planEvidenceRead(x).kind, "denied");
});
test("malformed and oversized input is total and non-identifying", () => {
  for (const x of [null, undefined, [], {}, { ...fixture(), propertyRows: [null] }, { ...fixture(), matterProperties: 42 }, { ...fixture(), document: null }, { ...fixture(), propertyRows: Array(1001).fill({}) }]) {
    assert.deepEqual(planEvidenceRead(x), { kind: "conflict" });
  }
  const x = fixture(); delete x.evidence.withdrawnAt; assert.equal(planEvidenceRead(x).kind, "conflict");
});
