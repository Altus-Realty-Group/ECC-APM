import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { createDocumentReader } from "../../../server/lib/documents/reader.ts";
import { createUnboundDocumentReader, DENY_ALL_CLASSIFICATIONS, UNBOUND_AUTHORITY } from "../../../server/lib/documents/unbound.ts";
import type { ReaderDeps, ReaderEvent } from "../../../server/lib/documents/ports.ts";
import { COMPANY_B, SESSION_ID, NOW, OWNER_A, OWNER_B, PROP_A1, PROP_A2, PROP_B1, authState, authority, bytesOf, doc, memoryContent, memoryStore, ownerCtx, propertyCtx, scopeResolver, standardDocs, type Doc } from "./fixtures.ts";
import { grant, grantsEnvelope, sessionEnvelope } from "../../../shared/authz/conformance.ts";

function setup(opts: { docs?: Doc[]; companies?: string[]; policy?: ReaderDeps["classificationPolicy"]; ignoreFilter?: boolean; tamper?: Record<string, (b: Uint8Array) => Uint8Array>; owners?: Map<number, string>; maxDownloadBytes?: number } = {}) {
  const docs = opts.docs ?? standardDocs();
  const auth = authState(opts.companies);
  const { store, calls } = memoryStore(docs, { ignoreFilter: opts.ignoreFilter });
  const { content, reads } = memoryContent(docs, opts.tamper);
  const scopes = scopeResolver(opts.owners);
  const events: ReaderEvent[] = [];
  const reader = createDocumentReader({ authority: authority(auth), scopes, store, content, classificationPolicy: opts.policy ?? DENY_ALL_CLASSIFICATIONS,
    now: () => auth.nowMs, report: (e) => events.push(e), maxDownloadBytes: opts.maxDownloadBytes });
  return { reader, auth, calls, reads, events, scopes, docs };
}
const ids = (r: { documents?: { id: string }[] }) => (r.documents ?? []).map((d) => d.id);

// ---- default-unbound ----
test("default-unbound: every request is unavailable and no store, scope or content port is touched", async () => {
  const touched: string[] = [];
  const spy = (n: string) => async (): Promise<never> => { touched.push(n); throw new Error(n); };
  const reader = createDocumentReader({ authority: UNBOUND_AUTHORITY, scopes: { scopeOfOwner: spy("scopeOfOwner"), scopeOfProperty: spy("scopeOfProperty") },
    store: { linkedOwnerIds: spy("linkedOwnerIds"), count: spy("count"), list: spy("list"), get: spy("get"), getVersion: spy("getVersion") },
    content: { read: spy("content") }, classificationPolicy: DENY_ALL_CLASSIFICATIONS, now: () => NOW });
  assert.deepEqual(await reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "unavailable" });
  assert.deepEqual(await reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d1", versionId: "d1-v1" }), { kind: "unavailable" });
  assert.deepEqual(touched, []);
  const bare = createUnboundDocumentReader(() => NOW);
  assert.deepEqual(await bare.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1) }), { kind: "unavailable" });
  assert.deepEqual(await bare.download({ sessionId: null, context: propertyCtx(PROP_A1), documentId: "d6", versionId: "d6-v1" }), { kind: "unavailable" });
});

test("an unmapped owner/property (no verified scope mapping) is denied even for an authorized session", async () => {
  const s = setup({ owners: new Map() });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "denied" });
  assert.equal(s.calls.filter((c) => c.op === "list" || c.op === "count").length, 0, "no registry query without a verified scope mapping");
});

// ---- authorization ----
test("allowed: an authorized owner context lists its documents; default-deny classifications are absent", async () => {
  const s = setup();
  const r = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
  assert.equal(r.kind, "ready");
  if (r.kind !== "ready") return;
  assert.deepEqual(ids(r), ["d1", "d3", "d8", "d9", "da"], "financial_tax (d2) and restricted (d4) are not returned");
  assert.equal(r.total, 5);
  assert.equal(r.nextCursor, null);
  assert.deepEqual(r.documents.map((d) => d.delivery), ["verified", "verified", "verified", "pending", "failed"]);
});

test("cross-company: another company's owner, property and documents are denied before any registry query", async () => {
  const s = setup({ companies: [] });
  s.auth.grantsBody = grantsEnvelope(grant());                // authorized for company A only
  for (const ctx of [ownerCtx(OWNER_B), propertyCtx(PROP_B1)]) {
    assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ctx }), { kind: "denied" });
    assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ctx, documentId: "d5", versionId: "d5-v1" }), { kind: "denied" });
  }
  assert.equal(s.calls.filter((c) => c.op !== "linkedOwnerIds").length, 0, "no list/count/get ran for a denied context");
  assert.deepEqual(s.reads, [], "no bytes were read");
  const b = setup({ companies: [COMPANY_B] });
  assert.deepEqual(await b.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "denied" }, "company B cannot read company A's owner");
});

test("a document that is not part of the authorized context is indistinguishable from a missing one", async () => {
  const s = setup();
  const other = await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d3", versionId: "d3-v1" });
  assert.equal(other.kind, "ready");
  for (const [documentId, versionId] of [["d6", "d6-v1"], ["d7", "d7-v1"], ["d5", "d5-v1"], ["nope", "nope-v1"]]) {
    assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId, versionId }), { kind: "missing" }, documentId);
  }
});

// ---- classification: filtered before search and count ----
test("restricted/financial metadata is filtered BEFORE search and count", async () => {
  const s = setup();
  const hit = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), search: "secret-term" });
  assert.deepEqual(hit, { kind: "ready", context: ownerCtx(OWNER_A), documents: [], total: 0, nextCursor: null }, "a search that only matches a restricted record yields nothing, not a count of one");
  const tax = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), section: "financial-tax" });
  assert.equal(tax.kind === "ready" && tax.total, 0);
  const queries = s.calls.filter((c) => c.filter);
  assert.ok(queries.length >= 4 && queries.every((c) => !c.filter!.allowedClassifications.includes("restricted") && !c.filter!.allowedClassifications.includes("financial_tax")),
    "every count/list query carried the filter, never including default-deny classes");
});

test("an explicit classification policy can allow financial_tax; restricted stays denied", async () => {
  const s = setup({ policy: (_ctx, c) => c === "financial_tax" });
  const r = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
  assert.ok(r.kind === "ready" && ids(r).includes("d2") && !ids(r).includes("d4") && r.total === 6);
  const d = await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d2", versionId: "d2-v1" });
  assert.equal(d.kind, "ready");
  assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d4", versionId: "d4-v1" }), { kind: "missing" });
});

test("financial/tax and restricted downloads are default-deny without accepted authority", async () => {
  const s = setup();
  for (const [id, v] of [["d2", "d2-v1"], ["d4", "d4-v1"]]) {
    assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: id, versionId: v }), { kind: "missing" }, id);
  }
  assert.deepEqual(s.reads, [], "the provider was never read for a default-deny document");
});

test("a store that ignores the filter fails closed instead of leaking rows or counts", async () => {
  const s = setup({ ignoreFilter: true });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "unavailable" });
  assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d4", versionId: "d4-v1" }), { kind: "unavailable" });
  assert.ok(s.events.some((e) => e.type === "store_contract_violation"));
  assert.deepEqual(s.reads, []);
});

// ---- linked agreements ----
test("one owner agreement covers several properties without duplicate storage; property access exposes only linked documents", async () => {
  const s = setup();
  const p1 = await s.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1) });
  const p2 = await s.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A2) });
  assert.ok(p1.kind === "ready" && p2.kind === "ready");
  if (p1.kind !== "ready" || p2.kind !== "ready") return;
  assert.deepEqual(ids(p1), ["d1", "d6"]);
  assert.deepEqual(ids(p2), ["d1"]);
  assert.equal(p1.documents.find((d) => d.id === "d1")!.association, "linked-owner");
  assert.equal(p1.documents.find((d) => d.id === "d6")!.association, "direct");
  assert.equal(p1.documents.find((d) => d.id === "d1")!.versionId, p2.documents.find((d) => d.id === "d1")!.versionId, "the SAME registered version is shown under both properties");
  assert.equal(new Set(s.docs.filter((d) => d.row.documentId === "d1").map((d) => d.row.currentVersion.providerObjectRef)).size, 1, "one stored object");
  for (const leaked of ["d3", "d8", "d9", "da", "d2", "d4", "d5"]) assert.ok(!ids(p1).includes(leaked) && !ids(p2).includes(leaked), `unrelated owner document ${leaked} must not be exposed`);
});

test("a linked agreement is withheld when its home owner is not authorized, while the property's own documents remain", async () => {
  const s = setup({ owners: new Map([[OWNER_A, "scope-b"], [OWNER_B, "scope-b"]]) });   // owner A's mapped scope is NOT granted
  const r = await s.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1) });
  assert.ok(r.kind === "ready");
  assert.deepEqual(ids(r), ["d6"]);
  assert.equal(r.kind === "ready" && r.total, 1);
  assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1), documentId: "d1", versionId: "d1-v1" }), { kind: "missing" });
});

test("a linked agreement downloads through each covered property and not through an uncovered one", async () => {
  const s = setup();
  assert.equal((await s.reader.download({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1), documentId: "d1", versionId: "d1-v1" })).kind, "ready");
  assert.equal((await s.reader.download({ sessionId: SESSION_ID, context: propertyCtx(PROP_A2), documentId: "d1", versionId: "d1-v1" })).kind, "ready");
  const b = setup({ companies: [COMPANY_B] });
  assert.deepEqual(await b.reader.download({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1), documentId: "d1", versionId: "d1-v1" }), { kind: "denied" });
});

// ---- versions ----
test("stale and missing versions", async () => {
  const s = setup();
  const current = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
  assert.ok(current.kind === "ready" && current.documents.find((d) => d.id === "d8")!.versionId === "d8-v2", "the highest registered version is current");
  assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d8", versionId: "d8-v1" }), { kind: "stale" });
  assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d8", versionId: "d8-v9" }), { kind: "missing" });
  assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d3", versionId: "d8-v1" }), { kind: "missing" }, "a version of another document is not a stale version of this one");
  assert.equal((await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d8", versionId: "d8-v2" })).kind, "ready");
});

test("browser-supplied paths, URLs and malformed identifiers are rejected before any lookup", async () => {
  const s = setup();
  const bad = ["../secret", "/ECC/Production/x.pdf", "https://example.test/f", "a b", "", "x".repeat(129), "d1;drop", "d1\n", "d1/../d2", "d1.pdf"];
  for (const id of bad) {
    assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: id, versionId: "d1-v1" }), { kind: "missing" }, id);
    assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d1", versionId: id }), { kind: "missing" }, id);
  }
  for (const ctx of [{ kind: "owner", id: 0 }, { kind: "owner", id: -3 }, { kind: "owner", id: 1.5 }, { kind: "owner", id: Number.NaN }, { kind: "tenant", id: 5 }, null, { kind: "property" }] as unknown[]) {
    assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ctx as never }), { kind: "missing" });
  }
  assert.equal(s.calls.length, 0, "no registry call for any rejected input");
  assert.equal(s.auth.calls, 0, "not even an authority call");
});

// ---- delivery and byte integrity ----
test("a download requires a verified delivery; pending, failed and reconciliation never return bytes", async () => {
  const s = setup();
  for (const id of ["d9", "da"]) assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: id, versionId: `${id}-v1` }), { kind: "unavailable" }, id);
  assert.deepEqual(s.reads, []);
  const recon = doc("dr", "Receipt disagrees", { homeOwner: OWNER_A, section: "correspondence" });
  recon.row.receipts = [{ ...recon.row.receipts[0], verifiedSha256: "0".repeat(64) }];
  const r = setup({ docs: [recon] });
  const list = await r.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
  assert.ok(list.kind === "ready" && list.documents[0].delivery === "reconciliation");
  assert.deepEqual(await r.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "dr", versionId: "dr-v1" }), { kind: "unavailable" });
});

test("byte integrity: size or checksum mismatch returns no bytes; a good download returns exactly the registered bytes", async () => {
  const flip = (b: Uint8Array) => { const c = new Uint8Array(b); c[0] ^= 0xff; return c; };
  const s = setup({ tamper: { d1: flip, d3: (b) => b.slice(0, b.length - 1), d8: (b) => new Uint8Array([...b, 0]) } });
  for (const id of ["d1", "d3", "d8"]) {
    const v = id === "d8" ? "d8-v2" : `${id}-v1`;
    assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: id, versionId: v }), { kind: "conflict" }, id);
  }
  assert.equal(s.events.filter((e) => e.type === "integrity_mismatch").length, 3);
  const ok = setup();
  const r = await ok.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d3", versionId: "d3-v1" });
  assert.ok(r.kind === "ready");
  if (r.kind === "ready") {
    assert.deepEqual([...r.bytes], [...bytesOf("synthetic bytes v1")]);
    assert.equal(r.byteSize, r.bytes.byteLength);
    assert.match(r.sha256, /^[0-9a-f]{64}$/);
    assert.equal(r.mediaType, "application/pdf");
    assert.equal(r.documentId, "d3");
  }
});

test("provider failure and oversize registered files are unavailable and oversize files are never read", async () => {
  const s = setup({ maxDownloadBytes: 4 });
  assert.deepEqual(await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d3", versionId: "d3-v1" }), { kind: "unavailable" });
  assert.deepEqual(s.reads, []);
  const gone = setup({ docs: standardDocs().map((d) => (d.row.documentId === "d3" ? { ...d, content: new Map() } : d)) });
  assert.deepEqual(await gone.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d3", versionId: "d3-v1" }), { kind: "unavailable" });
});

// ---- session, revocation and expiry (A1) ----
test("session handling: missing, revoked, wrong-application and expired sessions are denied or unavailable", async () => {
  const s = setup();
  assert.deepEqual(await s.reader.read({ sessionId: null, context: ownerCtx(OWNER_A) }), { kind: "denied" });
  s.auth.sessionBody = sessionEnvelope({ allowed: false });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "denied" });
  s.auth.sessionBody = sessionEnvelope({ applicationId: "other-app" });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "denied" });
  s.auth.sessionBody = sessionEnvelope({ expiresAt: new Date(NOW).toISOString() });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "denied" });
  s.auth.sessionBody = "outage-not-an-envelope";
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) }), { kind: "denied" });
  assert.equal(s.calls.length, 0);
});

test("authority revoked, changed or expired DURING the read withholds the result", async () => {
  for (const [name, change, expected] of [
    ["session revoked mid-read", (a: ReturnType<typeof authState>) => { a.sessionBody = sessionEnvelope({ allowed: false }); }, "denied"],
    ["grant revoked mid-read", (a: ReturnType<typeof authState>) => { a.grantsBody = grantsEnvelope(); }, "denied"],
    ["grant revision changed mid-read", (a: ReturnType<typeof authState>) => { a.grantsBody = grantsEnvelope(grant({ revision: 2 })); }, "stale"],
    ["clock passes the context expiry mid-read", (a: ReturnType<typeof authState>) => { a.nowMs = NOW + 2 * 3600_000; a.sessionBody = sessionEnvelope({ expiresAt: new Date(NOW + 3 * 3600_000).toISOString() }); a.grantsBody = grantsEnvelope(grant({ expiresAt: new Date(NOW + 3 * 3600_000).toISOString() })); }, "stale"],
  ] as const) {
    for (const op of ["read", "download"] as const) {
      const s = setup();
      s.auth.onCall = (n, st) => { if (n === 2) change(st); };       // the second authority call is the post-read re-check
      const r = op === "read" ? await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) })
        : await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d3", versionId: "d3-v1" });
      assert.deepEqual(r, { kind: expected }, `${op}: ${name}`);
      assert.ok(s.events.some((e) => e.type === "authority_changed"), `${op}: ${name}`);
    }
  }
});

test("the clock crossing the grant expiry between the two authority checks withholds the bytes", async () => {
  const s = setup();
  s.auth.grantsBody = grantsEnvelope(grant({ expiresAt: new Date(NOW + 1000).toISOString() }));
  s.auth.onCall = (n, st) => { if (n === 2) st.nowMs = NOW + 1000; };           // exactly at expiry (exclusive)
  const r = await s.reader.download({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), documentId: "d3", versionId: "d3-v1" });
  assert.equal(r.kind, "denied", "the second A1 decision already refuses an expired grant");
});

// ---- bounded pagination ----
test("pagination is bounded, complete, stable and cannot be replayed across contexts, filters or authorization changes", async () => {
  const many = Array.from({ length: 7 }, (_, i) => doc(`p${i}`, `Statement ${i}`, { homeOwner: OWNER_A, section: "statements-reports" }));
  const s = setup({ docs: many });
  const seen: string[] = [];
  let cursor: string | null = null, pages = 0;
  do {
    const r = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 3, cursor });
    assert.ok(r.kind === "ready");
    if (r.kind !== "ready") return;
    assert.ok(r.documents.length <= 3);
    assert.equal(r.total, 7, "total counts authorized matches, not the page");
    seen.push(...ids(r)); cursor = r.nextCursor; pages++;
  } while (cursor && pages < 10);
  assert.equal(pages, 3);
  assert.deepEqual(seen, many.map((d) => d.row.documentId).sort(), "every document exactly once, in order");
  const first = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 3 });
  const c = first.kind === "ready" ? first.nextCursor : null;
  assert.ok(c);
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_B), limit: 3, cursor: c }), { kind: "denied" }, "another owner is denied before the cursor matters");
  const other = setup({ docs: many, companies: [COMPANY_B] });
  other.auth.grantsBody = grantsEnvelope(grant(), grant({ grantId: "40000000-0000-4000-8000-000000000299", companyId: COMPANY_B }));
  assert.deepEqual(await other.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 3, cursor: c }), { kind: "stale" }, "authorization binding changed");
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 3, cursor: c, search: "x" }), { kind: "stale" }, "filter changed");
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 3, cursor: "not-a-cursor!" }), { kind: "stale" });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: propertyCtx(PROP_A1), limit: 3, cursor: c }), { kind: "stale" }, "cursor from an owner context on a property context");
});

test("page size is clamped to the maximum and invalid sizes or filters conflict; a forged cursor cannot reach a filtered document", async () => {
  const many = Array.from({ length: 130 }, (_, i) => doc(`q${String(i).padStart(3, "0")}`, `Doc ${i}`, { homeOwner: OWNER_A, section: "correspondence" }));
  const s = setup({ docs: [...many, doc("zz-restricted", "Hidden", { homeOwner: OWNER_A, section: "correspondence", classification: "restricted" })] });
  const big = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit: 100000 });
  assert.ok(big.kind === "ready" && big.documents.length === 100 && big.total === 130 && big.nextCursor);
  const defaulted = await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A) });
  assert.ok(defaulted.kind === "ready" && defaulted.documents.length === 50);
  for (const limit of [0, -1, 1.5, Number.NaN, "5" as unknown as number]) assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), limit }), { kind: "conflict" }, String(limit));
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), section: "../etc" }), { kind: "conflict" });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), search: "x".repeat(101) }), { kind: "conflict" });
  assert.deepEqual(await s.reader.read({ sessionId: SESSION_ID, context: ownerCtx(OWNER_A), search: "bad\u0007" }), { kind: "conflict" });
});

// ---- projection hygiene and PR #232 compatibility ----
/** MIRROR of the PR #232 (e1a5ae2) parseDocumentRead rules, kept here only to prove server output is accepted by them. */
function pr232Accepts(raw: any, context: { kind: string; id: number }): boolean {
  const ID = /^[A-Za-z0-9_-]{1,128}$/;
  const OWNER = ["management-contracts", "entity-records", "financial-tax", "statements-reports", "correspondence"];
  const PROPERTY = ["tenant-documents", "property-media", "construction", "legal", "insurance"];
  if (raw.kind !== "ready" || raw.context.kind !== context.kind || raw.context.id !== context.id || !Array.isArray(raw.documents) || raw.documents.length > 500) return false;
  const seen = new Set<string>();
  return raw.documents.every((d: any) => {
    if (!ID.test(d.id) || !ID.test(d.versionId) || seen.has(d.id)) return false;
    seen.add(d.id);
    if (typeof d.name !== "string" || !d.name.trim() || d.name.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(d.name)) return false;
    if (!(d.association === "direct" || (context.kind === "property" && d.association === "linked-owner"))) return false;
    const sections = d.association === "linked-owner" ? OWNER : context.kind === "owner" ? OWNER : PROPERTY;
    return sections.includes(d.section) && ["verified", "pending", "failed", "reconciliation"].includes(d.delivery);
  });
}
test("server output is accepted by the PR #232 projection rules and exposes only the projected fields", async () => {
  const s = setup();
  for (const ctx of [ownerCtx(OWNER_A), propertyCtx(PROP_A1), propertyCtx(PROP_A2)]) {
    const r = await s.reader.read({ sessionId: SESSION_ID, context: ctx });
    assert.ok(r.kind === "ready" && pr232Accepts(r, ctx), JSON.stringify(ctx));
    if (r.kind === "ready") for (const d of r.documents) assert.deepEqual(Object.keys(d).sort(), ["association", "delivery", "id", "name", "section", "versionId"]);
    const text = JSON.stringify(r);
    assert.doesNotMatch(text, /obj-|rev-|synthetic\b|sha256|provider|https?:|dropbox|classification/i, "no provider reference, path, URL, digest or classification leaks to the list");
  }
});

// ---- immutability / retry / conflict at the contract level and static hygiene ----
test("static hygiene: the document foundation has no provider client, shared-link, overwrite or service-role dependency", () => {
  const dirs = [new URL("../../../shared/documents/", import.meta.url), new URL("../../../server/lib/documents/", import.meta.url)];
  for (const dir of dirs) for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const code = readFileSync(new URL(f, dir), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(code, /dropbox|create_shared_link|shared_link|uploadBufferToDropbox|mode:\s*["']overwrite|SERVICE_ROLE|service_role|createClient|server\/db|supabase-js|process\.env|\bfetch\s*\(|express/i, f);
  }
});
