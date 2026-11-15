import assert from "node:assert/strict";
import { test } from "node:test";
import { createDocumentReader } from "../../../server/lib/documents/reader.ts";
import { createUnboundEvidenceReader } from "../../../server/lib/legal/evidenceReaderUnbound.ts";
import { grant, grantsEnvelope, sessionEnvelope } from "../../../shared/authz/conformance.ts";
import { IDS, NOW, OWNER_A, PRIVATE, PROP_A1, PROP_A2, U, addVersion, makeDoc, makeWorld, ownerAgreementWorld, type World } from "./evidence-reader-fixtures.ts";

const decode = (b: Uint8Array) => new TextDecoder().decode(b);
async function ok(w: World) {
  const r = await w.reader().download(w.req());
  assert.equal(r.kind, "ready", JSON.stringify(r));
  return r as Extract<typeof r, { kind: "ready" }>;
}
/** A failure is exactly { kind } and carries no byte, identifier, name or private text. */
function assertFixed(r: unknown, kind: string, w?: World) {
  assert.deepEqual(r, { kind });
  assert.doesNotMatch(JSON.stringify(r), /PRIVATE|bytes|sha256|0000-4000|obj-/);
  if (w) assert.doesNotMatch(JSON.stringify(w.reports), /PRIVATE|0000-4000|obj-|synthetic evidence/);
}
const LATE_MS = 3600_000 + 10;      // beyond the 1-hour synthetic session

// ------------------------------------------------------------------ successful controls
test("control: a direct property document is delivered through every stage in the decided order", async () => {
  const w = makeWorld();
  const r = await ok(w);
  assert.equal(decode(r.bytes), "synthetic evidence bytes v1");
  assert.deepEqual([r.matterId, r.evidenceId, r.versionId], [IDS.matter, IDS.evidence, IDS.v1]);
  assert.equal(r.mediaType, "application/pdf"); assert.equal(r.byteSize, r.bytes.byteLength);
  // order: authority first; matter load before any property/document port; D1 target authority (scope map) before the version is resolved; content read last of the first run
  const first = (name: string) => w.log.indexOf(name);
  assert.equal(w.log[0], "authority");
  assert.ok(first("evidence.load") < first("properties.rows") && first("properties.rows") < first("scopeOfProperty") && first("scopeOfProperty") < first("pinned.resolve")
    && first("pinned.resolve") < first("store.get") && first("store.get") < first("content.read"), w.log.join(","));
  assert.equal(w.reads.length, 1);
});
test("control: an owner agreement is delivered only through the exact owner-document-property link", async () => {
  const w = ownerAgreementWorld();
  const r = await ok(w);
  assert.equal(r.versionId, IDS.ownerV1);
});
test("control: the bytes equal what the D1 reader itself delivers for the planned context (D1 behaviour is reused, not copied)", async () => {
  const w = makeWorld();
  const d1 = createDocumentReader({ authority: w.deps.authority, scopes: w.deps.scopes, store: w.deps.store, content: w.deps.content, classificationPolicy: w.deps.classificationPolicy, now: w.deps.now });
  const viaD1 = await d1.download({ sessionId: "synthetic-session-1", context: { kind: "property", id: PROP_A1 }, documentId: IDS.doc, versionId: IDS.v1 });
  const viaL4 = await ok(w);
  assert.equal(viaD1.kind, "ready");
  if (viaD1.kind === "ready") assert.deepEqual([...viaD1.bytes], [...viaL4.bytes]);
});

// ------------------------------------------------------------------ defaults and request shape
test("defaults: the unbound reader is unavailable and touches nothing", async () => {
  const r = createUnboundEvidenceReader(() => NOW);
  assertFixed(await r.download({ sessionId: "synthetic-session-1", matterId: IDS.matter, evidenceId: IDS.evidence }), "unavailable");
  assertFixed(await r.download({ sessionId: null, matterId: IDS.matter, evidenceId: IDS.evidence }), "unavailable");
});
test("a read plan is never permission: with the authority port unbound every port stays untouched even though the world is fully consistent", async () => {
  const w = makeWorld();
  const r = await w.reader({ authority: async () => ({ allowed: false, reason: "AUTHORITY_UNAVAILABLE" }) }).download(w.req());
  assertFixed(r, "unavailable", w);
  assert.deepEqual(w.log, []);
});
test("browser-supplied permission, scope, version, document, property or revision fields are refused before ANY port is touched", async () => {
  for (const extra of [{ matterAllowed: true }, { documentAllowed: true }, { allowed: true }, { permission: "read" }, { scope: "scope-a" }, { scopeRef: "scope-a" },
    { versionId: IDS.v1 }, { documentId: IDS.doc }, { propertyId: 42 }, { ownerId: 17 }, { classification: "general" }, { revision: 2 }, { context: { kind: "property", id: 42 } }, { matter: {} }]) {
    const w = makeWorld();
    assertFixed(await w.reader().download(w.req(extra)), "denied", w);
    assert.deepEqual(w.log, [], JSON.stringify(extra));
  }
});
test("malformed requests: missing keys, bad ids, wrong types, prototypes and getters are fixed failures with no port touched", async () => {
  const w = makeWorld();
  const bad: unknown[] = [null, undefined, "x", 5, [], { matterId: IDS.matter, evidenceId: IDS.evidence }, { sessionId: 5, matterId: IDS.matter, evidenceId: IDS.evidence },
    { sessionId: null, matterId: "not-a-uuid", evidenceId: IDS.evidence }, { sessionId: null, matterId: IDS.matter, evidenceId: "../../etc" }, { sessionId: null, matterId: IDS.matter, evidenceId: IDS.evidence, extra: undefined },
    Object.create({ sessionId: null, matterId: IDS.matter, evidenceId: IDS.evidence }), { get sessionId() { throw new Error("PRIVATE"); }, matterId: IDS.matter, evidenceId: IDS.evidence }];
  for (const b of bad) { const r = await w.reader().download(b as never); assert.ok(["denied", "missing"].includes((r as { kind: string }).kind), JSON.stringify(r)); assert.deepEqual(Object.keys(r), ["kind"]); }
  assert.deepEqual(w.log, []);
});
test("invalid maxDownloadBytes disables downloads before any port is touched", async () => {
  for (const bad of [0, -1, 1.5, NaN, Infinity, "10" as unknown as number]) {
    const w = makeWorld();
    assertFixed(await w.reader({ maxDownloadBytes: bad }).download(w.req()), "unavailable", w);
    assert.deepEqual(w.log, []);
  }
});

// ------------------------------------------------------------------ session authority
test("A1 denials are fixed failures: no session, revoked, expired, wrong application, developer bypass, no grants, unbound scope, outage", async () => {
  const cases: [string, (w: World) => void, string][] = [
    ["no session presented", () => undefined, "denied"],
    ["central says not allowed", (w) => { w.auth.sessionBody = sessionEnvelope({ allowed: false, reasonCode: "SESSION_REVOKED" }); }, "denied"],
    ["session expired", (w) => { w.auth.sessionBody = sessionEnvelope({ expiresAt: new Date(NOW).toISOString() }); }, "denied"],
    ["wrong application", (w) => { w.auth.sessionBody = sessionEnvelope({ applicationId: "other-app" }); }, "denied"],
    ["developer bypass is not resource authority", (w) => { w.auth.sessionBody = sessionEnvelope({ decisionMode: "developer_bypass", billingMode: "not_applicable_developer", banner: "DEV BYPASS · READ ONLY", capabilities: ["ui.review.read"] }); }, "denied"],
    ["no grants", (w) => { w.auth.grantsBody = grantsEnvelope(); }, "denied"],
    ["grant for an unbound company", (w) => { w.auth.grantsBody = grantsEnvelope(grant({ companyId: "30000000-0000-4000-8000-0000000000ff" })); }, "denied"],
    ["issuer outage", (w) => { w.auth.sessionBody = undefined; }, "denied"],
  ];
  for (const [name, mutate, expected] of cases) {
    const w = makeWorld(); mutate(w);
    const r = await w.reader().download(name === "no session presented" ? w.req({ sessionId: null }) : w.req());
    assertFixed(r, expected, w);
    assert.deepEqual(w.log.filter((x) => x !== "authority"), [], name);   // nothing but the authority port was touched
  }
});
test("authority port failures and malformed authority contexts are unavailable, never a pass", async () => {
  const good = (w: World) => w.deps.authority;
  const contexts: [string, (a: any) => unknown][] = [
    ["not an object", () => ({ allowed: true, context: null })], ["no actor", (a) => ({ allowed: true, context: { ...a.context, actor: "" } })],
    ["empty scopes", (a) => ({ allowed: true, context: { ...a.context, scopeRefs: [] } })], ["NaN validUntil", (a) => ({ allowed: true, context: { ...a.context, validUntilMs: NaN } })],
    ["Infinity validUntil", (a) => ({ allowed: true, context: { ...a.context, validUntilMs: Infinity } })], ["no binding", (a) => ({ allowed: true, context: { ...a.context, binding: "" } })],
    ["comma scope list", (a) => ({ allowed: true, context: { ...a.context, scopeRefs: ["scope-a,scope-b"] } })], ["allowed not boolean", () => ({ allowed: "yes" })], ["undefined", () => undefined],
  ];
  for (const [name, mutate] of contexts) {
    const w = makeWorld();
    const authority: any = async (sid: string | null, sc: string | null) => mutate(await good(w)(sid, sc));
    assertFixed(await w.reader({ authority }).download(w.req()), "unavailable", w);
    assert.equal(w.n.evidence, 0, name);
  }
  const w = makeWorld();
  assertFixed(await w.reader({ authority: async () => { throw new Error("PRIVATE secret"); } }).download(w.req()), "unavailable", w);
});
test("a non-finite clock or an already-expired context denies before any legal port", async () => {
  const w = makeWorld();
  assertFixed(await w.reader({ now: () => NaN }).download(w.req()), "unavailable", w);
  assert.equal(w.n.evidence, 0);
  const x = makeWorld();
  assertFixed(await x.reader({ now: () => NOW + 365 * 86400_000 }).download(x.req()), "denied", x);
});

// ------------------------------------------------------------------ matter scope and the version-existence oracle
test("matter scope: an out-of-scope matter is indistinguishable from an absent one, and NO property, document or content port is touched", async () => {
  const outOfScope = makeWorld(); outOfScope.matter.scopeRef = "scope-b";
  const absent = makeWorld(); absent.evidence.id = U(777);
  const r1 = await outOfScope.reader().download(outOfScope.req()), r2 = await absent.reader().download(absent.req());
  assertFixed(r1, "missing", outOfScope); assertFixed(r2, "missing", absent);
  assert.deepEqual(r1, r2);
  for (const w of [outOfScope, absent]) assert.deepEqual(w.log.filter((x) => !["authority", "evidence.load"].includes(x)), []);
});
test("matter scope is enforced by the reader even if the evidence port ignores the context", async () => {
  const w = makeWorld({ portFiltersScope: false }); w.matter.scopeRef = "scope-b";
  assertFixed(await w.reader().download(w.req()), "missing", w);
  assert.deepEqual(w.log.filter((x) => !["authority", "evidence.load"].includes(x)), []);
});
test("oracle: a caller with matter authority but NO D1 target authority gets the same `denied` whether the pinned version exists, is missing or is replaced; version resolution never runs", async () => {
  const outcomes: unknown[] = [];
  for (const mutate of [() => undefined, (w: World) => { w.evidence.documentVersionId = U(555); }, (w: World) => { addVersion(w.docs[0], IDS.v2); }, (w: World) => { w.docs.length = 0; }]) {
    const w = makeWorld(); w.propertyScopes.set(PROP_A1, "scope-b");      // property maps to a scope the caller's grants do not cover
    mutate(w);
    outcomes.push(await w.reader().download(w.req()));
    assert.equal(w.n.pinned, 0); assert.equal(w.n.get, 0); assert.equal(w.n.read, 0);
  }
  for (const o of outcomes) assertFixed(o, "denied");
});
test("oracle: the pinned version id is never accepted from the browser, only read from the authorized evidence row", async () => {
  const w = makeWorld();
  assertFixed(await w.reader().download(w.req({ versionId: IDS.v1 })), "denied", w);
  assert.equal(w.n.pinned, 0);
});

// ------------------------------------------------------------------ evidence state, document status, version
test("evidence state: unbound, withdrawn and restricted evidence never reaches a document operation", async () => {
  for (const [mutate, kind] of [[(w: World) => { w.evidence.documentVersionId = null; w.evidence.storageRef = IDS.v1; }, "unavailable"],
    [(w: World) => { w.evidence.withdrawnAt = "2026-11-11T11:00:00Z"; }, "missing"], [(w: World) => { w.evidence.restricted = true; }, "denied"]] as const) {
    const w = makeWorld(); mutate(w);
    assertFixed(await w.reader().download(w.req()), kind, w);
    assert.equal(w.n.pinned, 0); assert.equal(w.n.get, 0); assert.equal(w.n.read, 0);
  }
});
test("a legacy storageRef that looks exactly like a registered version id never binds", async () => {
  const w = makeWorld(); w.evidence.documentVersionId = null; w.evidence.storageRef = IDS.v1;
  assertFixed(await w.reader().download(w.req()), "unavailable", w);
  assert.equal(w.n.pinned, 0);
});
test("document status: a retired record is missing and unreadable statuses are unavailable; no content is read", async () => {
  const retired = makeWorld(); retired.docs[0].status = "retired";
  assertFixed(await retired.reader().download(retired.req()), "missing", retired); assert.equal(retired.n.read, 0);
  const weird = makeWorld(); (weird.docs[0] as any).status = "archived";
  assertFixed(await weird.reader().download(weird.req()), "unavailable", weird); assert.equal(weird.n.read, 0);
});
test("pinned version replaced by a newer one: stale, the newer version is NEVER substituted or read", async () => {
  const w = makeWorld(); addVersion(w.docs[0], IDS.v2, "NEWER BYTES");
  assertFixed(await w.reader().download(w.req()), "stale", w);
  assert.equal(w.n.read, 0);
  assert.ok(!w.reads.some((x) => x.endsWith("rev-2")));
});
test("an evidence ref pinned to an unknown version is missing", async () => {
  const w = makeWorld(); w.evidence.documentVersionId = U(555);
  assertFixed(await w.reader().download(w.req()), "missing", w); assert.equal(w.n.read, 0);
});

// ------------------------------------------------------------------ exact association, D1 target and classification authority
test("exact property association: a document on a property the matter does not link is never found (missing)", async () => {
  const w = makeWorld({ docs: [makeDoc(IDS.doc, { homeProperty: PROP_A2, section: "tenant-documents" })] });
  assertFixed(await w.reader().download(w.req()), "missing", w); assert.equal(w.n.read, 0);
});
test("owner agreements need the exact link: another owner, an unlinked property or an unauthorized owner scope is never delivered", async () => {
  const unlinked = ownerAgreementWorld(); unlinked.docs[0].linkedProperties = [PROP_A2];
  assertFixed(await unlinked.reader().download(unlinked.req()), "missing", unlinked); assert.equal(unlinked.n.read, 0);
  const otherScopeOwner = ownerAgreementWorld(); otherScopeOwner.ownerScopes.set(OWNER_A, "scope-b");     // owner's scope not covered by the grants
  assertFixed(await otherScopeOwner.reader().download(otherScopeOwner.req()), "missing", otherScopeOwner); assert.equal(otherScopeOwner.n.read, 0);
});
test("matter with no property link has no association: denied, nothing document-side runs", async () => {
  const w = makeWorld(); w.matterProperties = [];
  assertFixed(await w.reader().download(w.req()), "denied", w); assert.equal(w.n.pinned, 0);
});
test("same-row property keys: a crossed uuid/numeric pair resolves by the row, and duplicate or missing keys conflict", async () => {
  const w = makeWorld();           // property 42 holds uuid ...99 and 43 holds ...98: a suffix guess would pick the wrong property
  assert.equal((await ok(w)).versionId, IDS.v1);
  // a port that over-returns rows must not be able to introduce an ambiguous mapping
  for (const mutate of [(x: World) => { x.propertyRows = []; }, (x: World) => { x.propertyRows.push({ ...x.propertyRows[0] }); }, (x: World) => { x.propertyRows[1].id = PROP_A1; },
    (x: World) => { x.propertyRows[0].id = Number.MAX_SAFE_INTEGER + 1; }, (x: World) => { x.propertyRows[0].idUuid = "x"; }, (x: World) => { x.propertyRows[0].id = "42"; }]) {
    const y = makeWorld(); mutate(y);
    const r = await y.reader({ properties: { rows: async () => structuredClone(y.propertyRows) } }).download(y.req());
    assert.ok(["conflict", "unavailable"].includes((r as { kind: string }).kind), JSON.stringify(r));
    assert.deepEqual(Object.keys(r), ["kind"]); assert.equal(y.n.pinned, 0); assert.equal(y.n.read, 0);
  }
});
test("D1 target authority: an unmapped, wrong-scope or erroring property mapping denies before any document operation", async () => {
  for (const mutate of [(w: World) => w.propertyScopes.delete(PROP_A1), (w: World) => w.propertyScopes.set(PROP_A1, "scope-b"), (w: World) => w.propertyScopes.set(PROP_A1, "")]) {
    const w = makeWorld(); mutate(w);
    assertFixed(await w.reader().download(w.req()), "denied", w);
    assert.equal(w.n.pinned, 0); assert.equal(w.n.get, 0);
  }
  const w = makeWorld();
  assertFixed(await w.reader({ scopes: { scopeOfOwner: async () => null, scopeOfProperty: async () => { throw new Error("PRIVATE"); } } }).download(w.req()), "unavailable", w);
});
test("classification: restricted and financial-tax evidence is unavailable whatever the policy says (the reader is public-only); without a policy allow the row is invisible", async () => {
  for (const [cls, section, home] of [["restricted", "tenant-documents", { homeProperty: PROP_A1 }], ["financial_tax", "financial-tax", { homeOwner: OWNER_A, linked: [PROP_A1] }]] as const) {
    for (const allow of [false, true]) {
      const w = makeWorld({ docs: [makeDoc(IDS.doc, { ...home, section, classification: cls, versionIds: [IDS.v1] })] }); if (allow) w.allowClassifications.add(cls);
      const r = await w.reader().download(w.req());
      assertFixed(r, allow ? "denied" : "missing", w); assert.equal(w.n.read, 0);
    }
  }
});

// ------------------------------------------------------------------ verified delivery and byte identity
test("receipts: pending, failed, reconciliation, absent or mismatching receipts are unavailable and no byte is read", async () => {
  for (const delivery of ["pending", "failed", "reconciliation", "none"] as const) {
    const w = makeWorld({ docs: [makeDoc(IDS.doc, { homeProperty: PROP_A1, section: "tenant-documents", delivery })] });
    assertFixed(await w.reader().download(w.req()), "unavailable", w); assert.equal(w.n.read, 0, delivery);
  }
  const w = makeWorld(); w.docs[0].row.receipts = [{ seq: 1, versionId: IDS.v1, status: "verified", verifiedSha256: "f".repeat(64), verifiedByteSize: w.docs[0].row.currentVersion.byteSize }];
  assertFixed(await w.reader().download(w.req()), "unavailable", w); assert.equal(w.n.read, 0);
});
test("byte integrity: corrupt content, a different size, a non-byte result and a provider error withhold every byte", async () => {
  for (const tamper of [(b: Uint8Array) => b.map((x) => x ^ 1), (b: Uint8Array) => b.slice(1), (b: Uint8Array) => new Uint8Array([...b, 1]), (() => "text") as never]) {
    const w = makeWorld(); w.tamper = tamper;
    assertFixed(await w.reader().download(w.req()), "conflict", w);
  }
  const w = makeWorld();
  assertFixed(await w.reader({ content: { read: async () => { throw new Error("PRIVATE provider detail"); } } }).download(w.req()), "unavailable", w);
});
test("size bound: a version larger than maxDownloadBytes is unavailable and unread", async () => {
  const w = makeWorld();
  assertFixed(await w.reader({ maxDownloadBytes: 3 }).download(w.req()), "unavailable", w); assert.equal(w.n.read, 0);
});

// ------------------------------------------------------------------ change DURING the work withholds everything
test("revocation during the provider read: the grant is revoked, nothing is returned", async () => {
  const w = makeWorld(); w.hooks.onContentRead = () => { w.auth.grantsBody = grantsEnvelope(); };
  assertFixed(await w.reader().download(w.req()), "denied", w);
});
test("session revoked or expired during the provider read: nothing is returned", async () => {
  const revoked = makeWorld(); revoked.hooks.onContentRead = () => { revoked.auth.sessionBody = sessionEnvelope({ allowed: false, reasonCode: "SESSION_REVOKED" }); };
  assertFixed(await revoked.reader().download(revoked.req()), "denied", revoked);
  const expired = makeWorld(); expired.hooks.onContentRead = () => { expired.auth.nowMs = NOW + LATE_MS; };
  const r = await expired.reader().download(expired.req());
  assert.ok(["denied", "stale"].includes((r as { kind: string }).kind)); assert.deepEqual(Object.keys(r), ["kind"]);
});

// mutations applied while the SECOND (revalidation) run is reading: the first run and the D1 delivery have already passed
const during = (hook: "onEvidenceLoad" | "onProperties" | "onPinned" | "onStoreGet" | "onAuthority", at: number, mutate: (w: World) => void) =>
  (w: World) => { w.hooks[hook] = (n) => { if (n === at) mutate(w); }; };
test("revalidation: evidence withdrawn, rebound or re-versioned after delivery is withheld (stale)", async () => {
  const cases: [string, (w: World) => void][] = [
    ["withdrawn", (w) => { w.evidence.withdrawnAt = "2026-11-11T12:00:30Z"; }],
    ["revision advanced", (w) => { w.evidence.revision = 3; }],
    ["pin moved to another version", (w) => { w.evidence.documentVersionId = IDS.v2; }],
    ["marked restricted", (w) => { w.evidence.restricted = true; }],
  ];
  for (const [name, mutate] of cases) {
    const w = makeWorld(); w.docs.push(makeDoc(U(40), { homeProperty: PROP_A1, section: "tenant-documents", versionIds: [IDS.v2] }));
    during("onEvidenceLoad", 2, mutate)(w);
    const r = await w.reader().download(w.req());
    assert.ok(["stale", "denied"].includes((r as { kind: string }).kind), `${name}: ${JSON.stringify(r)}`);
    assert.deepEqual(Object.keys(r), ["kind"], name);
  }
});
test("revalidation: matter moved to another scope, or its property links changed, after delivery is withheld", async () => {
  for (const mutate of [(w: World) => { w.matter.scopeRef = "scope-b"; }, (w: World) => { w.matterProperties = [{ matterId: IDS.matter, propertyId: U(98) }]; }]) {
    const w = makeWorld(); during("onEvidenceLoad", 2, mutate)(w);
    const r = await w.reader().download(w.req());
    assert.ok(["stale", "denied"].includes((r as { kind: string }).kind), JSON.stringify(r)); assert.deepEqual(Object.keys(r), ["kind"]);
  }
});
test("revalidation: property key mapping changed after delivery is withheld", async () => {
  const w = makeWorld(); during("onProperties", 2, (x) => { x.propertyRows[0].id = 999; })(w);
  const r = await w.reader().download(w.req());
  assert.ok(["stale", "conflict", "denied"].includes((r as { kind: string }).kind), JSON.stringify(r)); assert.deepEqual(Object.keys(r), ["kind"]);
});
test("revalidation: target scope mapping changed after delivery is withheld (denied)", async () => {
  const w = makeWorld(); during("onEvidenceLoad", 2, (x) => x.propertyScopes.set(PROP_A1, "scope-b"))(w);
  assertFixed(await w.reader().download(w.req()), "denied", w);
});
test("revalidation: classification policy changed after delivery is withheld (stale), exactly like the D1 reader", async () => {
  const w = makeWorld(); during("onEvidenceLoad", 2, (x) => x.allowClassifications.add("restricted"))(w);
  assertFixed(await w.reader().download(w.req()), "stale", w);
});
test("revalidation: linked-owner authorization changed after delivery is withheld (stale)", async () => {
  const w = ownerAgreementWorld(); during("onEvidenceLoad", 2, (x) => x.ownerScopes.set(OWNER_A, "scope-b"))(w);
  assertFixed(await w.reader().download(w.req()), "stale", w);
});
test("revalidation: document retired after delivery is withheld (stale)", async () => {
  const w = makeWorld(); during("onPinned", 2, (x) => { x.docs[0].status = "retired"; })(w);
  assertFixed(await w.reader().download(w.req()), "stale", w);
});
test("revalidation: a newer version registered after delivery is withheld (stale) and never delivered in place of the pinned one", async () => {
  const w = makeWorld(); during("onPinned", 2, (x) => addVersion(x.docs[0], IDS.v2, "NEWER BYTES"))(w);
  assertFixed(await w.reader().download(w.req()), "stale", w);
  assert.ok(!w.reads.some((x) => x.endsWith("rev-2")));
});
test("revalidation: the registry stops showing the document after delivery (revoked linked owner, removed row) is withheld", async () => {
  const w = makeWorld(); during("onStoreGet", 4, (x) => { x.docs.length = 0; })(w);
  const r = await w.reader().download(w.req());
  assert.ok(["stale", "missing"].includes((r as { kind: string }).kind), JSON.stringify(r)); assert.deepEqual(Object.keys(r), ["kind"]);
});
test("revalidation: a grant revision change between the runs (same scopes) is binding drift and is withheld (stale)", async () => {
  const w = makeWorld(); during("onEvidenceLoad", 2, (x) => { x.auth.grantsBody = grantsEnvelope(grant({ revision: 2 })); })(w);
  assertFixed(await w.reader().download(w.req()), "stale", w);
});
test("revalidation: authority revoked while the revalidation reads are in flight is withheld (denied)", async () => {
  const w = makeWorld(); during("onEvidenceLoad", 2, (x) => { x.auth.grantsBody = grantsEnvelope(); })(w);
  assertFixed(await w.reader().download(w.req()), "denied", w);
});
test("final authorization is the LAST asynchronous step: a mapping or revocation landing after every record read is still withheld", async () => {
  // the 4th store.get is the last record read of the revalidation run; whatever changes there is only visible to the final authorization
  const mapping = makeWorld(); mapping.hooks.onStoreGet = (n) => { if (n === 4) mapping.propertyScopes.set(PROP_A1, "scope-b"); };
  assertFixed(await mapping.reader().download(mapping.req()), "denied", mapping);
  const revoke = makeWorld(); revoke.hooks.onStoreGet = (n) => { if (n === 4) revoke.auth.grantsBody = grantsEnvelope(); };
  assertFixed(await revoke.reader().download(revoke.req()), "denied", revoke);
  const policy = makeWorld(); policy.hooks.onStoreGet = (n) => { if (n === 4) policy.allowClassifications.add("financial_tax"); };
  assertFixed(await policy.reader().download(policy.req()), "stale", policy);
  const owner = ownerAgreementWorld(); owner.hooks.onStoreGet = (n) => { if (n === 4) owner.ownerScopes.set(OWNER_A, "scope-b"); };
  assertFixed(await owner.reader().download(owner.req()), "stale", owner);
});
test("expiry during the FINAL asynchronous read withholds every byte (checked immediately before delivery)", async () => {
  // advance the clock inside the very last store read of the revalidation run: only the final synchronous expiry check can catch it
  const w = makeWorld(); let armed = false;
  w.hooks.onContentRead = () => { armed = true; };
  w.hooks.onStoreGet = () => { if (armed && w.log.filter((x) => x === "store.get").length >= 4) w.auth.nowMs = NOW + LATE_MS; };
  const r = await w.reader().download(w.req());
  assert.ok(["stale", "denied"].includes((r as { kind: string }).kind), JSON.stringify(r)); assert.deepEqual(Object.keys(r), ["kind"]);
  assert.doesNotMatch(JSON.stringify(r), /synthetic evidence/);
});
test("expiry at the very last authorization read: the clock jumps past the session during the FINAL linked-owner read and only the last synchronous check can catch it", async () => {
  const probe = makeWorld(); await ok(probe);
  const last = probe.n.owners;                                        // the number of linked-owner reads in a complete clean run; the last one is the final authorization's
  const w = makeWorld(); w.hooks.onLinkedOwners = (n) => { if (n === last) w.auth.nowMs = NOW + LATE_MS; };
  const r = await w.reader().download(w.req());
  assertFixed(r, "stale", w);
});
test("a context whose own lifetime ends between the runs is withheld even though the clock never passes the session expiry", async () => {
  const w = makeWorld(); w.auth.grantsBody = grantsEnvelope(grant({ expiresAt: new Date(NOW + 1000).toISOString() }));
  w.hooks.onContentRead = () => { w.auth.nowMs = NOW + 2000; };
  const r = await w.reader().download(w.req());
  assert.ok(["stale", "denied"].includes((r as { kind: string }).kind)); assert.deepEqual(Object.keys(r), ["kind"]);
});

// ------------------------------------------------------------------ malformed ports and privacy
test("malformed port results are fixed, non-identifying failures (never a pass, never a thrown error)", async () => {
  const bad: unknown[] = [undefined, 5, "x", [], { matterProperties: "no" }, { matter: {}, evidence: {}, matterProperties: [] }, { matter: null, evidence: null, matterProperties: [] }];
  for (const value of bad) {
    const w = makeWorld();
    const r = await w.reader({ evidence: { load: async () => value } }).download(w.req());
    assert.ok(["missing", "unavailable", "conflict"].includes((r as { kind: string }).kind), JSON.stringify(r)); assert.deepEqual(Object.keys(r), ["kind"]);
  }
  for (const [name, patch] of [
    ["properties", { properties: { rows: async () => "no" } }], ["properties throws", { properties: { rows: async () => { throw new Error("PRIVATE"); } } }],
    ["pinned garbage", { pinned: { resolve: async () => ({ documentId: "no", documentStatus: "active" }) } }], ["pinned not object", { pinned: { resolve: async () => 5 } }],
    ["pinned throws", { pinned: { resolve: async () => { throw new Error("PRIVATE"); } } }],
    ["store row garbage", { store: { ...makeWorld().deps.store, get: async () => ({ documentId: IDS.doc }) as never } }],
    ["store throws", { store: { ...makeWorld().deps.store, linkedOwnerIds: async () => { throw new Error("PRIVATE"); } } }],
    ["store bad owners", { store: { ...makeWorld().deps.store, linkedOwnerIds: async () => ["x"] as never } }],
    ["classification throws", { classificationPolicy: async () => { throw new Error("PRIVATE"); } }],
  ] as const) {
    const w = makeWorld();
    const r = await w.reader(patch as never).download(w.req());
    assert.ok(["missing", "unavailable", "conflict", "denied"].includes((r as { kind: string }).kind), `${name}: ${JSON.stringify(r)}`);
    assert.deepEqual(Object.keys(r), ["kind"], name); assert.doesNotMatch(JSON.stringify(r) + JSON.stringify(w.reports), /PRIVATE/);
  }
});
test("a store that returns a row from the wrong property context cannot be delivered (planner/D1 filter conflict)", async () => {
  const w = makeWorld();
  const real = w.deps.store.get;
  const r = await w.reader({ store: { ...w.deps.store, get: async (f, id) => { const row = await real(f, id); return row ? { ...row, homePropertyId: PROP_A2 } : row; } } }).download(w.req());
  assert.notEqual((r as { kind: string }).kind, "ready"); assert.deepEqual(Object.keys(r), ["kind"]);
  assert.equal(w.n.read, 0);
});
test("privacy: operational events and every failure carry no names, identifiers, statuses or bytes, and the success result exposes no provider reference", async () => {
  const w = makeWorld(); w.tamper = (b) => b.map((x) => x ^ 1);
  const r = await w.reader().download(w.req());
  assertFixed(r, "conflict", w);
  const ok2 = await ok(makeWorld());
  assert.deepEqual(Object.keys(ok2).sort(), ["byteSize", "bytes", "evidenceId", "kind", "matterId", "mediaType", "name", "sha256", "versionId"]);
  assert.doesNotMatch(JSON.stringify({ ...ok2, bytes: undefined }), /obj-|synthetic"|provider|rev-/);
});
test("ports are called with a frozen context: a mutating port cannot widen what the reader decides", async () => {
  const w = makeWorld();
  const seen: unknown[] = [];
  const evidence = { load: async (ctx: any, m: string, e: string) => { seen.push(ctx); try { ctx.scopeRefs.push("scope-b"); } catch { /* frozen */ } try { ctx.validUntilMs = Infinity; } catch { /* frozen */ } return w.deps.evidence.load(ctx, m, e); } };
  const r = await w.reader({ evidence }).download(w.req());
  assert.equal(r.kind, "ready");
  assert.ok(seen.every((c: any) => Object.isFrozen(c) && Object.isFrozen(c.scopeRefs) && !c.scopeRefs.includes("scope-b")));
});
