import assert from "node:assert/strict";
import { test } from "node:test";
import { createDocumentReader, isStoreRow } from "../../../server/lib/documents/reader.ts";
import { DENY_ALL_CLASSIFICATIONS } from "../../../server/lib/documents/unbound.ts";
import type { ClassificationPolicy, ContentSource, DocumentStore, ReaderEvent, StoreRow } from "../../../server/lib/documents/ports.ts";
import { checkReceipt, classificationVisible, deliveryStateOf, planVersionRegistration, requiredClassifications, type DeliveryReceipt, type RegisteredVersion, type VersionCandidate } from "../../../shared/documents/model.ts";
import { OWNER_A, OWNER_B, PROP_A1, PROP_A2, SESSION_ID, authState, authority, bytesOf, doc, memoryContent, memoryStore, ownerCtx, propertyCtx, scopeResolver, standardDocs, SCOPES, type Doc } from "./fixtures.ts";

type Over = { policy?: ClassificationPolicy; maxDownloadBytes?: unknown; store?: (s: DocumentStore) => DocumentStore; content?: (c: ContentSource) => ContentSource; owners?: Map<number, string>; properties?: Map<number, string> };
function build(docs: Doc[], o: Over = {}) {
  const auth = authState();
  const base = memoryStore(docs);
  const { content, reads } = memoryContent(docs);
  const scopes = scopeResolver(o.owners ?? new Map(SCOPES.owners), o.properties ?? new Map(SCOPES.properties));
  const events: ReaderEvent[] = [];
  const touched: string[] = [];
  const reader = createDocumentReader({ authority: async (s, r) => { touched.push("authority"); return authority(auth)(s, r); }, scopes, store: o.store ? o.store(base.store) : base.store, content: o.content ? o.content(content) : content,
    classificationPolicy: o.policy ?? DENY_ALL_CLASSIFICATIONS, now: () => auth.nowMs, report: (e) => events.push(e), maxDownloadBytes: o.maxDownloadBytes as number | undefined });
  return { reader, auth, scopes, events, reads, touched, calls: base.calls, content };
}
const ids = (r: { documents?: { id: string }[] }) => (r.documents ?? []).map((d) => d.id);
const dl = (b: ReturnType<typeof build>, ctx = ownerCtx(OWNER_A), documentId = "d3", versionId = `${documentId}-v1`) => b.reader.download({ sessionId: SESSION_ID, context: ctx, documentId, versionId });

// ================= 1. complete revalidation before anything leaves =================
test("REPRODUCED: revoking classification permission during content.read withholds the bytes", async () => {
  let allow = true;
  const b = build(standardDocs(), { policy: (_c, cl) => allow && cl === "financial_tax", content: (c) => ({ read: async (r, m) => { allow = false; return c.read(r, m); } }) });
  assert.deepEqual(await dl(b, ownerCtx(OWNER_A), "d2"), { kind: "stale" });
  assert.ok(b.events.some((e) => e.type === "authority_changed"));
  const ok = build(standardDocs(), { policy: (_c, cl) => cl === "financial_tax" });
  assert.equal((await dl(ok, ownerCtx(OWNER_A), "d2")).kind, "ready", "control: unchanged permission delivers");
});

test("REPRODUCED: removing the target's scope mapping during content.read withholds the bytes", async () => {
  const owners = new Map(SCOPES.owners);
  const b = build(standardDocs(), { owners, content: (c) => ({ read: async (r, m) => { owners.delete(OWNER_A); return c.read(r, m); } }) });
  assert.deepEqual(await dl(b), { kind: "denied" });
  assert.equal((await dl(build(standardDocs()))).kind, "ready", "control");
});

test("re-pointing the target to a different (still authorized) scope during the read is a changed state, not a pass", async () => {
  const owners = new Map(SCOPES.owners);
  const b = build(standardDocs(), { owners, content: (c) => ({ read: async (r, m) => { owners.set(OWNER_A, "scope-b"); return c.read(r, m); } }) });
  b.auth.grantsBody = (await import("../../../shared/authz/conformance.ts")).grantsEnvelope(
    (await import("../../../shared/authz/conformance.ts")).grant(), (await import("../../../shared/authz/conformance.ts")).grant({ grantId: "40000000-0000-4000-8000-000000000299", companyId: "30000000-0000-4000-8000-00000000000b" }));
  const r = await dl(b);
  assert.deepEqual(r, { kind: "stale" });
});

test("linked-owner authorization removed during the provider read withholds a linked agreement", async () => {
  const owners = new Map(SCOPES.owners);
  const b = build(standardDocs(), { owners, content: (c) => ({ read: async (r, m) => { owners.delete(OWNER_A); return c.read(r, m); } }) });
  assert.deepEqual(await dl(b, propertyCtx(PROP_A1), "d1"), { kind: "stale" }, "property scope still maps, but the home owner is no longer authorized");
  assert.equal((await dl(build(standardDocs()), propertyCtx(PROP_A1), "d1")).kind, "ready", "control");
});

test("permission or mapping changing during the LIST reads withholds the metadata", async () => {
  for (const [name, mutate] of [
    ["classification policy flips during count", (o: { allow: boolean; owners: Map<number, string> }) => { o.allow = false; }],
    ["scope mapping removed during count", (o: { allow: boolean; owners: Map<number, string> }) => { o.owners.delete(OWNER_A); }],
  ] as const) {
    const o = { allow: true, owners: new Map(SCOPES.owners) };
    const b = build(standardDocs(), { owners: o.owners, policy: (_c, cl) => o.allow && cl === "financial_tax", store: (s) => ({ ...s, count: async (f) => { const n = await s.count(f); mutate(o); return n; } }) });
    const r = await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
    assert.ok(r.kind === "stale" || r.kind === "denied", `${name}: ${r.kind}`);
    assert.ok(!("documents" in r), name);
  }
  const ok = build(standardDocs(), { policy: (_c, cl) => cl === "financial_tax" });
  assert.equal((await ok.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })).kind, "ready", "control");
});

test("cursors are bound to the EFFECTIVE authorization state: policy, mapping or linked-owner changes make them stale", async () => {
  const many = Array.from({ length: 5 }, (_, i) => doc(`m${i}`, `Statement ${i}`, { homeOwner: OWNER_A, section: "statements-reports" }));
  const state = { allowTax: false, owners: new Map(SCOPES.owners) };
  const b = build(many, { owners: state.owners, policy: (_c, cl) => state.allowTax && cl === "financial_tax" });
  const first = await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 2 });
  assert.ok(first.kind === "ready" && first.nextCursor);
  const cursor = first.kind === "ready" ? first.nextCursor : null;
  assert.equal((await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 2, cursor })).kind, "ready", "control: unchanged state accepts the cursor");
  state.allowTax = true;
  assert.deepEqual(await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 2, cursor }), { kind: "stale" }, "classification policy changed");
  state.allowTax = false;
  state.owners.set(OWNER_A, "scope-b");
  assert.ok(["stale", "denied"].includes((await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 2, cursor })).kind), "mapping changed");
  // linked-owner state for a property context
  const lstate = { owners: new Map(SCOPES.owners) };
  const docsL = [doc("k1", "A", { homeOwner: OWNER_A, section: "management-contracts", linked: [PROP_A1] }), doc("k2", "B", { homeOwner: OWNER_A, section: "management-contracts", linked: [PROP_A1] }), doc("k3", "C", { homeProperty: PROP_A1, section: "legal" })];
  const bl = build(docsL, { owners: lstate.owners });
  const p1 = await bl.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1), limit: 1 });
  assert.ok(p1.kind === "ready" && p1.nextCursor);
  lstate.owners.delete(OWNER_A);
  assert.deepEqual(await bl.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1), limit: 1, cursor: p1.kind === "ready" ? p1.nextCursor : null }), { kind: "stale" }, "linked-owner authorization changed");
});

// ================= 2. exact document-to-requested-property link evidence =================
test("REPRODUCED: a mistaken store cannot expose a document linked only to ANOTHER property of the same authorized owner", async () => {
  const docs = [doc("l1", "Linked to 42 only", { homeOwner: OWNER_A, section: "management-contracts", linked: [PROP_A1] }), doc("l2", "Linked to 43 only", { homeOwner: OWNER_A, section: "management-contracts", linked: [PROP_A2] })];
  const truthful = build(docs);
  const t42 = await truthful.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1) });
  const t43 = await truthful.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A2) });
  assert.deepEqual([ids(t42), ids(t43)], [["l1"], ["l2"]], "control: a truthful store gives exactly the linked documents");
  const wrongEvidence: Array<[string, (r: StoreRow) => StoreRow]> = [
    ["evidence names the other property", (r) => ({ ...r, association: "linked-owner", link: { documentId: r.documentId, ownerId: OWNER_A, propertyId: PROP_A2 } })],
    ["no evidence at all", (r) => ({ ...r, association: "linked-owner", link: null })],
    ["evidence for another document", (r) => ({ ...r, association: "linked-owner", link: { documentId: "l1", ownerId: OWNER_A, propertyId: PROP_A1 } })],
    ["evidence names another owner", (r) => ({ ...r, association: "linked-owner", link: { documentId: r.documentId, ownerId: OWNER_B, propertyId: PROP_A1 } })],
    ["evidence on a direct row", (r) => ({ ...r, association: "direct", homeKind: "property", homeOwnerId: null, homePropertyId: PROP_A1, section: "legal", link: { documentId: r.documentId, ownerId: OWNER_A, propertyId: PROP_A1 } })],
  ];
  for (const [name, forge] of wrongEvidence) {
    const b = build(docs, { store: (s) => ({ ...s, count: async () => 2, list: async () => docs.map((d) => forge(d.row)), get: async (_f, id) => forge(docs.find((d) => d.row.documentId === id)!.row) }) });
    assert.deepEqual(await b.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1) }), { kind: "unavailable" }, `list: ${name}`);
    assert.deepEqual(await dl(b, propertyCtx(PROP_A1), "l2"), { kind: "unavailable" }, `download: ${name}`);
    assert.deepEqual(b.reads, [], `${name}: no bytes read`);
    assert.ok(b.events.some((e) => e.type === "store_contract_violation"), name);
  }
});

// ================= 3. one minimum-classification rule =================
test("the minimum classification rule: a financial-tax section row needs financial_tax allowed whatever it was declared as", () => {
  assert.deepEqual([...requiredClassifications("financial-tax", "general")], ["general", "financial_tax"]);
  assert.deepEqual([...requiredClassifications("financial-tax", "confidential")], ["confidential", "financial_tax"]);
  assert.deepEqual([...requiredClassifications("financial-tax", "financial_tax")], ["financial_tax"]);
  assert.deepEqual([...requiredClassifications("financial-tax", "restricted")], ["restricted"]);
  assert.deepEqual([...requiredClassifications("correspondence", "general")], ["general"]);
  assert.equal(classificationVisible("financial-tax", "general", ["general", "confidential"]), false, "REPRODUCED: default policy must not open a financial-tax row declared general");
  assert.equal(classificationVisible("financial-tax", "general", ["general", "confidential", "financial_tax"]), true);
  assert.equal(classificationVisible("financial-tax", "restricted", ["general", "confidential", "financial_tax"]), false);
  assert.equal(classificationVisible("correspondence", "general", ["general"]), true);
});

test("REPRODUCED: a financial-tax section row declared general is not listed or downloadable under the default policy", async () => {
  const docs = [doc("f1", "Tax return", { homeOwner: OWNER_A, section: "financial-tax", classification: "general" }), doc("f2", "Tax note", { homeOwner: OWNER_A, section: "financial-tax", classification: "confidential" }), doc("c1", "Letter", { homeOwner: OWNER_A, section: "correspondence" })];
  const b = build(docs);
  const r = await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
  assert.ok(r.kind === "ready" && JSON.stringify(ids(r)) === '["c1"]' && r.total === 1, "neither the rows nor the count include them");
  for (const id of ["f1", "f2"]) assert.deepEqual(await dl(b, ownerCtx(OWNER_A), id), { kind: "missing" }, id);
  assert.deepEqual(b.reads, []);
  // a store that applies only the declared class would leak them: the reader refuses it
  const leaky = build(docs, { store: (s) => ({ ...s, count: async () => 3, list: async () => docs.map((d) => d.row), get: async (_f, id) => docs.find((d) => d.row.documentId === id)!.row }) });
  assert.deepEqual(await leaky.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "unavailable" });
  assert.deepEqual(await dl(leaky, ownerCtx(OWNER_A), "f1"), { kind: "unavailable" });
  assert.deepEqual(leaky.reads, []);
  // explicit financial_tax authority opens them; restricted stays closed
  const open = build(docs, { policy: (_c, cl) => cl === "financial_tax" });
  assert.equal((await dl(open, ownerCtx(OWNER_A), "f1")).kind, "ready");
  const onlyRestricted = build(docs, { policy: (_c, cl) => cl === "restricted" });
  assert.deepEqual(await dl(onlyRestricted, ownerCtx(OWNER_A), "f1"), { kind: "missing" }, "restricted allow does not open a financial/tax row");
});

// ================= 4. TypeScript and SQL invariants aligned =================
// These two lists are ALSO executed against the SQL CHECKs in tests/documents-db/tests.sql (keep them in sync).
export const BAD_MEDIA_TYPES = ["", "not a type", "text/", "/pdf", "a/b c", "application", "application/pdf;charset=utf-8x ", " application/pdf"];
export const BLANK_FIELDS = ["", " ", "\t", "  \n "];
const H = "a".repeat(64);
const candidate = (over: Partial<VersionCandidate> = {}): VersionCandidate => ({ versionNumber: 1, byteSize: 10, sha256: H, mediaType: "application/pdf", provider: "p", providerObjectRef: "o", providerRevision: "r", ...over });
const regVersion = (over: Partial<RegisteredVersion> = {}): RegisteredVersion => ({ versionId: "v1", documentId: "d", versionNumber: 1, byteSize: 10, sha256: H, mediaType: "application/pdf", provider: "p", providerObjectRef: "o", providerRevision: "r", ...over });
test("version planning rejects invalid media types and blank provider identity fields (as the SQL CHECKs do)", () => {
  for (const mediaType of BAD_MEDIA_TYPES) assert.deepEqual(planVersionRegistration([], candidate({ mediaType })), { action: "reject", reason: "INVALID_CANDIDATE" }, JSON.stringify(mediaType));
  for (const blank of BLANK_FIELDS) for (const field of ["provider", "providerObjectRef", "providerRevision"] as const)
    assert.deepEqual(planVersionRegistration([], candidate({ [field]: blank })), { action: "reject", reason: "INVALID_CANDIDATE" }, `${field}=${JSON.stringify(blank)}`);
  for (const ok of ["application/pdf", "text/plain", "image/svg+xml", "application/vnd.ms-excel", "APPLICATION/PDF"]) assert.equal(planVersionRegistration([], candidate({ mediaType: ok })).action, "create", ok);
});
test("an identical retry is a no-op, but a different media type is a conflict (it is part of an immutable version)", () => {
  assert.deepEqual(planVersionRegistration([regVersion()], candidate()), { action: "noop", versionId: "v1" });
  assert.deepEqual(planVersionRegistration([regVersion()], candidate({ mediaType: "text/plain" })), { action: "conflict", reason: "SAME_NUMBER_DIFFERENT_CONTENT" });
});
test("receipts: a non-verified receipt must not carry a verified digest or size (either one); verified must match", () => {
  const v = { sha256: H, byteSize: 10 };
  for (const status of ["failed", "pending", "reconciliation"] as const) {
    assert.deepEqual(checkReceipt(v, { status, verifiedSha256: null, verifiedByteSize: null }), { ok: true }, status);
    for (const carry of [{ verifiedSha256: H, verifiedByteSize: null }, { verifiedSha256: null, verifiedByteSize: 10 }, { verifiedSha256: H, verifiedByteSize: 10 }])
      assert.deepEqual(checkReceipt(v, { status, ...carry }), { ok: false, reason: "NONVERIFIED_CARRIES_DIGEST" }, `${status} ${JSON.stringify(carry)}`);
  }
  assert.deepEqual(checkReceipt(v, { status: "verified", verifiedSha256: H, verifiedByteSize: 10 }), { ok: true });
  assert.equal(checkReceipt(v, { status: "verified", verifiedSha256: "b".repeat(64), verifiedByteSize: 10 }).ok, false);
});
const rc = (seq: number, status: DeliveryReceipt["status"], over: Partial<DeliveryReceipt> = {}): DeliveryReceipt => ({ seq, versionId: "v1", status, verifiedSha256: status === "verified" ? H : null, verifiedByteSize: status === "verified" ? 10 : null, ...over });
test("REPRODUCED: ambiguous duplicate receipt sequences reconcile, independent of input order", () => {
  const ver = regVersion();
  const a = [rc(5, "verified"), rc(5, "failed")], b = [rc(5, "failed"), rc(5, "verified")];
  assert.equal(deliveryStateOf(ver, a), "reconciliation");
  assert.equal(deliveryStateOf(ver, b), "reconciliation");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified"), rc(5, "failed"), rc(5, "failed")]), "reconciliation", "a duplicate anywhere is corruption");
  assert.equal(deliveryStateOf(ver, [rc(5, "verified"), rc(5, "verified")]), "reconciliation", "even identical duplicates");
  for (const seq of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(deliveryStateOf(ver, [rc(seq as number, "verified")]), "reconciliation", `seq ${seq}`);
  assert.equal(deliveryStateOf(ver, [rc(1, "failed", { verifiedSha256: H })]), "reconciliation", "a failed receipt carrying a digest is malformed");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified"), null as unknown as DeliveryReceipt]), "verified", "controls: a stray null is not a receipt of this version");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified"), rc(2, "failed")]), "failed", "control: distinct sequences still work in any order");
  assert.equal(deliveryStateOf(ver, [rc(2, "failed"), rc(1, "verified")]), "failed");
  assert.equal(deliveryStateOf(ver, [rc(1, "verified")]), "verified");
});
test("a record whose receipts have duplicate sequences lists as reconciliation and never downloads", async () => {
  const d = doc("dup", "Duplicate sequences", { homeOwner: OWNER_A, section: "correspondence" });
  d.row.receipts = [rc(7, "verified", { versionId: d.row.currentVersion.versionId, verifiedSha256: d.row.currentVersion.sha256, verifiedByteSize: d.row.currentVersion.byteSize }), rc(7, "failed", { versionId: d.row.currentVersion.versionId })];
  for (const order of [d.row.receipts, [...d.row.receipts].reverse()]) {
    d.row.receipts = order;
    const b = build([d]);
    const r = await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
    assert.ok(r.kind === "ready" && r.documents[0].delivery === "reconciliation");
    assert.deepEqual(await dl(b, ownerCtx(OWNER_A), "dup"), { kind: "unavailable" });
    assert.deepEqual(b.reads, []);
  }
});

// ================= 5. configured download bound =================
test("REPRODUCED: an invalid maxDownloadBytes disables downloads before any port is touched", async () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -1, 1.5, "10", null, {}, true, 10n]) {
    const b = build(standardDocs(), { maxDownloadBytes: bad });
    assert.deepEqual(await dl(b), { kind: "unavailable" }, String(bad));
    assert.deepEqual(b.touched, [], `${String(bad)}: not even the authority port`);
    assert.deepEqual(b.calls, [], `${String(bad)}: no registry call`);
    assert.deepEqual(b.reads, [], `${String(bad)}: no provider read`);
    assert.ok(b.events.some((e) => e.type === "invalid_configuration"), String(bad));
    assert.equal((await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })).kind, "ready", `${String(bad)}: listing is unaffected`);
  }
  const size = bytesOf("synthetic bytes v1").byteLength;
  assert.equal((await dl(build(standardDocs(), { maxDownloadBytes: size }))).kind, "ready", "control: a bound equal to the size delivers");
  assert.deepEqual(await dl(build(standardDocs(), { maxDownloadBytes: size - 1 })), { kind: "unavailable" }, "one byte under refuses without reading");
  assert.equal((await dl(build(standardDocs()))).kind, "ready", "control: the default bound");
});

// ================= 6. malformed port responses =================
const GOOD = () => standardDocs()[2].row;           // d3
test("REPRODUCED: a null (or otherwise malformed) row from store.list is a bounded failure that leaks nothing", async () => {
  const malformed: [string, unknown][] = [
    ["null", null], ["undefined", undefined], ["number", 42], ["string", "x"], ["empty object", {}], ["array", []],
    ["missing currentVersion", { ...GOOD(), currentVersion: undefined }], ["null currentVersion", { ...GOOD(), currentVersion: null }],
    ["bad currentVersion", { ...GOOD(), currentVersion: { versionId: "v" } }], ["receipts null", { ...GOOD(), receipts: null }], ["receipts with null", { ...GOOD(), receipts: [null] }],
    ["name not a string", { ...GOOD(), name: 7 }], ["unsafe name", { ...GOOD(), name: "a/b" }], ["unknown classification", { ...GOOD(), classification: "secret" }],
    ["unknown section", { ...GOOD(), section: "../etc" }], ["NaN owner", { ...GOOD(), homeOwnerId: Number.NaN }], ["both homes", { ...GOOD(), homePropertyId: PROP_A1 }],
    ["bad association", { ...GOOD(), association: "other" }], ["bad link shape", { ...GOOD(), link: { documentId: 1 } }], ["version id not an identifier", { ...GOOD(), currentVersion: { ...GOOD().currentVersion, versionId: "../x" } }],
    ["invalid media type in version", { ...GOOD(), currentVersion: { ...GOOD().currentVersion, mediaType: "nope" } }], ["blank provider in version", { ...GOOD(), currentVersion: { ...GOOD().currentVersion, provider: "  " } }],
  ];
  for (const [name, row] of malformed) {
    assert.equal(isStoreRow(row), false, `isStoreRow: ${name}`);
    for (const position of ["alone", "after a good row"] as const) {
      const rows = position === "alone" ? [row] : [GOOD(), row];
      const b = build(standardDocs(), { store: (s) => ({ ...s, count: async () => rows.length, list: async () => rows as StoreRow[] }) });
      const r = await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
      assert.equal(JSON.stringify(r), '{"kind":"unavailable"}', `${name} (${position}): bounded failure, no metadata`);
    }
  }
  assert.equal(isStoreRow(GOOD()), true, "control: a well-formed row is accepted");
});
test("malformed responses from every other port are bounded failures that leak nothing", async () => {
  const cases: [string, Over][] = [
    ["list not an array", { store: (s) => ({ ...s, list: async () => null as never }) }],
    ["list is an object", { store: (s) => ({ ...s, list: async () => ({}) as never }) }],
    ["count NaN", { store: (s) => ({ ...s, count: async () => Number.NaN }) }],
    ["count negative", { store: (s) => ({ ...s, count: async () => -1 }) }],
    ["count a string", { store: (s) => ({ ...s, count: async () => "5" as never }) }],
    ["count smaller than the page", { store: (s) => ({ ...s, count: async () => 0 }) }],
    ["list throws synchronously", { store: (s) => ({ ...s, list: () => { throw new Error("boom"); } }) }],
    ["list throws a non-error", { store: (s) => ({ ...s, list: async () => { throw "boom"; } }) }],
    ["list returns too many rows", { store: (s) => ({ ...s, list: async (_f, _a, limit) => Array.from({ length: limit + 5 }, () => GOOD()) }) }],
    ["duplicate documents", { store: (s) => ({ ...s, count: async () => 2, list: async () => [GOOD(), GOOD()] }) }],
  ];
  for (const [name, over] of cases) {
    const b = build(standardDocs(), over);
    assert.equal(JSON.stringify(await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })), '{"kind":"unavailable"}', name);
  }
  const dlCases: [string, Over][] = [
    ["get returns an array", { store: (s) => ({ ...s, get: async () => [] as never }) }],
    ["get returns a malformed row", { store: (s) => ({ ...s, get: async () => ({ documentId: "d3" }) as never }) }],
    ["get returns another document", { store: (s) => ({ ...s, get: async () => standardDocs()[0].row }) }],
    ["get throws", { store: (s) => ({ ...s, get: async () => { throw new Error("x"); } }) }],
    ["content returns a string", { content: () => ({ read: async () => "bytes" as never }) }],
    ["content returns null", { content: () => ({ read: async () => null as never }) }],
    ["content throws", { content: () => ({ read: async () => { throw new Error("x"); } }) }],
  ];
  for (const [name, over] of dlCases) {
    const b = build(standardDocs(), over);
    const r = await dl(b);
    assert.ok(r.kind === "unavailable" || r.kind === "conflict", `${name}: ${r.kind}`);
    assert.ok(!("bytes" in r), name);
  }
  const stale = build(standardDocs(), { store: (s) => ({ ...s, getVersion: async () => ({ versionId: "x" }) as never }) });
  assert.equal((await dl(stale, ownerCtx(OWNER_A), "d8", "d8-v1")).kind, "unavailable", "getVersion malformed");
  const owners = build(standardDocs(), { store: (s) => ({ ...s, linkedOwnerIds: async () => [Number.NaN] }) });
  assert.equal(JSON.stringify(await owners.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1) })), '{"kind":"unavailable"}', "linkedOwnerIds malformed");
  for (const garbage of [null, {}, { allowed: "yes" }, undefined]) {
    const g = createDocumentReader({ authority: async () => garbage as never, scopes: scopeResolver(), store: memoryStore(standardDocs()).store, content: memoryContent(standardDocs()).content, classificationPolicy: DENY_ALL_CLASSIFICATIONS, now: () => 0 });
    assert.equal(JSON.stringify(await g.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })), '{"kind":"unavailable"}', `authority returned ${JSON.stringify(garbage)}`);
  }
});
test("successful controls: the standard fixtures still list and download after every correction", async () => {
  const b = build(standardDocs());
  const r = await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
  assert.ok(r.kind === "ready" && JSON.stringify(ids(r)) === '["d1","d3","d8","d9","da"]' && r.total === 5);
  const p = await b.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1) });
  assert.ok(p.kind === "ready" && JSON.stringify(ids(p)) === '["d1","d6"]');
  const d = await dl(b);
  assert.ok(d.kind === "ready" && d.byteSize === d.bytes.byteLength);
});

// ================= 1b. the registry itself changing during the provider read =================
test("a new version, a failed delivery or a retired/removed document appearing during the provider read withholds the bytes", async () => {
  const changes: [string, (d: Doc[]) => void][] = [
    ["a newer version is registered", (docs) => { const d = docs.find((x) => x.row.documentId === "d3")!; const v2 = { ...d.row.currentVersion, versionId: "d3-v2", versionNumber: 2, providerRevision: "rev-2" }; d.row = { ...d.row, currentVersion: v2, receipts: [] }; }],
    ["the delivery is superseded by a failure", (docs) => { const d = docs.find((x) => x.row.documentId === "d3")!; d.row = { ...d.row, receipts: [...d.row.receipts, { seq: Math.max(...d.row.receipts.map((r) => r.seq)) + 1, versionId: d.row.currentVersion.versionId, status: "failed", verifiedSha256: null, verifiedByteSize: null }] }; }],
    ["the document becomes invisible (retired)", (docs) => { docs.splice(docs.findIndex((x) => x.row.documentId === "d3"), 1); }],
  ];
  for (const [name, change] of changes) {
    const docs = standardDocs();
    const b = build(docs, { content: (c) => ({ read: async (r, m) => { const bytes = await c.read(r, m); change(docs); return bytes; } }) });
    const r = await dl(b);
    assert.deepEqual(r, { kind: "stale" }, name);
    assert.ok(!("bytes" in r), name);
  }
  assert.equal((await dl(build(standardDocs()))).kind, "ready", "control: nothing changed");
});
