import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash, webcrypto } from "node:crypto";
import { createTransportDocumentAdapter, type DocumentTransport } from "../../../src/features/documents/transportAdapter";
import { handleSessionBoundary } from "../../../src/lib/sessionScope";
import { createQueryClient } from "../../../src/lib/queryClient";

if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
const context = { kind: "owner" as const, id: 17 };
const signal = () => new AbortController().signal;
const row = (id: string) => ({ id, versionId: id + "-v1", name: "SYNTHETIC " + id + ".pdf", section: "management-contracts", association: "direct", delivery: "verified" });
const page = (ids: string[], total: number, nextCursor: string | null) => ({ kind: "ready", context, documents: ids.map(row), total, nextCursor });
function wireDownload() {
  const bytes = new TextEncoder().encode("SYNTHETIC registered bytes");
  return { kind: "ready", documentId: "d1", versionId: "d1-v1", name: "synthetic.pdf", mediaType: "application/pdf",
    byteSize: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), bytes };
}
function transport(over: Partial<DocumentTransport> = {}): DocumentTransport {
  return { read: async () => page(["d1"], 1, null), download: async () => wireDownload(), ...over };
}

test("no injected transport means unavailable with no manufactured list or download", async () => {
  const a = createTransportDocumentAdapter();
  assert.deepEqual(await a.read(context, signal()), { kind: "unavailable" });
  assert.deepEqual(await a.download(context, "d1", "d1-v1", signal()), { kind: "unavailable" });
});
test("complete paginated reader output becomes one validated UI projection", async () => {
  const calls: unknown[] = [];
  const a = createTransportDocumentAdapter(transport({ read: async req => {
    calls.push(req); return req.cursor === null ? page(["d1"], 2, "next") : page(["d2"], 2, null);
  } }));
  const r: any = await a.read(context, signal());
  assert.equal(r.kind, "ready"); assert.deepEqual(r.documents.map((d: any) => d.id), ["d1", "d2"]);
  assert.deepEqual(calls, [{ context, cursor: null, limit: 100 }, { context, cursor: "next", limit: 100 }]);
  assert.equal(r.total, undefined); assert.equal(r.nextCursor, undefined);
});
test("denied or unavailable later pages discard all earlier-page metadata", async () => {
  for (const kind of ["denied", "unavailable", "stale"] as const) {
    const a = createTransportDocumentAdapter(transport({ read: async req => req.cursor === null ? page(["d1"], 2, "next") : { kind, reason: "PRIVATE", documents: [row("PRIVATE")] } }));
    assert.deepEqual(await a.read(context, signal()), { kind });
  }
});
test("pagination changes, duplicate identities and missing terminal rows never become a complete list", async () => {
  for (const last of [page(["d2"], 3, null), page(["d1"], 2, null), page([], 2, null)]) {
    const a = createTransportDocumentAdapter(transport({ read: async req => req.cursor === null ? page(["d1"], 2, "next") : last }));
    assert.deepEqual(await a.read(context, signal()), { kind: "stale" });
  }
});
test("cursor loops, no progress, over-limit totals and malformed page metadata stop bounded reads", async () => {
  for (const result of [page([], 1, "next"), page(["d1"], 501, null), { ...page(["d1"], 1, null), nextCursor: undefined },
    { ...page(["d1"], 1, null), total: "1" }, page(Array.from({ length: 101 }, (_, i) => "d" + i), 101, null)]) {
    let calls = 0;
    const a = createTransportDocumentAdapter(transport({ read: async () => { calls++; return result; } }));
    await assert.rejects(a.read(context, signal())); assert.equal(calls, 1);
  }
  let calls = 0;
  const loop = createTransportDocumentAdapter(transport({ read: async () => page(["d" + ++calls], 3, "same") }));
  await assert.rejects(loop.read(context, signal())); assert.equal(calls, 2);
});
test("wrong-record pages are refused and an aborted request does not continue paging", async () => {
  const a = createTransportDocumentAdapter(transport({ read: async () => ({ ...page(["d1"], 1, null), context: { ...context, id: 18 } }) }));
  await assert.rejects(a.read(context, signal()));
  let calls = 0; const controller = new AbortController();
  const b = createTransportDocumentAdapter(transport({ read: async () => { calls++; controller.abort(); return page(["d1"], 2, "next"); } }));
  await assert.rejects(b.read(context, controller.signal)); assert.equal(calls, 1);
});
test("old-session page and download responses cannot be released", async () => {
  const client = createQueryClient();
  try {
    const a = createTransportDocumentAdapter(transport({ read: async () => { handleSessionBoundary(client); return page(["d1"], 1, null); },
      download: async () => { handleSessionBoundary(client); return wireDownload(); } }));
    await assert.rejects(a.read(context, signal()), { name: "StaleSessionError" });
    await assert.rejects(a.download(context, "d1", "d1-v1", signal()), { name: "StaleSessionError" });
  } finally { client.clear(); }
});
test("verified reader bytes become an identity-matched Blob after client integrity verification", async () => {
  const expected = wireDownload(), a = createTransportDocumentAdapter(transport({ download: async () => ({ ...expected, url: "https://PRIVATE.invalid", providerObjectRef: "PRIVATE" }) }));
  const r: any = await a.download(context, "d1", "d1-v1", signal());
  assert.equal(r.kind, "ready"); assert.ok(r.file instanceof Blob); assert.equal(r.file.type, "application/pdf");
  assert.deepEqual(new Uint8Array(await r.file.arrayBuffer()), expected.bytes);
  assert.deepEqual(Object.keys(r).sort(), ["documentId", "file", "kind", "versionId"]);
});
test("corrupt, oversized, misidentified or malformed download metadata never creates a Blob result", async () => {
  const valid = wireDownload();
  for (const patch of [{ sha256: "0".repeat(64) }, { byteSize: valid.byteSize + 1 }, { byteSize: 50 * 1024 * 1024 + 1 },
    { documentId: "other" }, { versionId: "other" }, { name: "../private.pdf" }, { name: "private\nname" }, { mediaType: "invalid" },
    { bytes: Array.from(valid.bytes) }, { bytes: new Uint8Array() }]) {
    const a = createTransportDocumentAdapter(transport({ download: async () => ({ ...valid, ...patch }) }));
    await assert.rejects(a.download(context, "d1", "d1-v1", signal()));
  }
});
test("download failures preserve denial and strip private payloads; unsafe IDs never reach transport", async () => {
  const a = createTransportDocumentAdapter(transport({ download: async () => ({ kind: "denied", reason: "PRIVATE", bytes: new Uint8Array([1]) }) }));
  assert.deepEqual(await a.download(context, "d1", "d1-v1", signal()), { kind: "denied" });
  let calls = 0;
  const b = createTransportDocumentAdapter(transport({ download: async () => { calls++; return wireDownload(); } }));
  for (const id of ["../private", "https://private.invalid", "", 42]) await assert.rejects(b.download(context, id as string, "v1", signal()));
  assert.equal(calls, 0);
});
