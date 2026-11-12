import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { act, create } from "react-test-renderer";
import { QueryClientProvider } from "@tanstack/react-query";
import RecordDocuments from "../../../src/features/documents/RecordDocuments";
import { parseDocumentRead, type DocumentContext } from "../../../src/features/documents/documentModel";
import { UNBOUND_DOCUMENT_ADAPTER, type DocumentAdapter } from "../../../src/features/documents/documentAdapter";
import { documentQueryOptions } from "../../../src/features/documents/documentQuery";
import { createQueryClient } from "../../../src/lib/queryClient";
import { getSessionEpoch, handleSessionBoundary } from "../../../src/lib/sessionScope";
import { HttpError } from "../../../src/lib/http";

const context: DocumentContext = { kind: "owner", id: 17 };
const agreement = { id: "synthetic-agreement", versionId: "v1", name: "SYNTHETIC management agreement.pdf",
  section: "management-contracts", association: "direct", delivery: "verified" };
function ready(ctx = context, documents = [agreement]) { return { kind: "ready", context: ctx, documents }; }
function adapter(read: DocumentAdapter["read"]): DocumentAdapter {
  return { read, download: async () => ({ kind: "unavailable" }) };
}
const flush = () => new Promise(resolve => setTimeout(resolve, 15));
async function mounted(source: DocumentAdapter, ctx = context) {
  const client = createQueryClient(); let tree: any;
  const view = (a: DocumentAdapter, c = ctx) => <QueryClientProvider client={client}><RecordDocuments adapter={a} context={c} /></QueryClientProvider>;
  await act(async () => { tree = create(view(source)); await flush(); });
  return { client, tree, view, text: () => JSON.stringify(tree.toJSON()), close: async () => { await act(async () => tree.unmount()); client.clear(); } };
}

test("unbound owner card exposes folders and unavailable, without fake documents/counts", async () => {
  const m = await mounted(UNBOUND_DOCUMENT_ADAPTER);
  assert.match(m.text(), /Property Management Contracts/); assert.match(m.text(), /Financial & Tax Documents/);
  assert.match(m.text(), /Document storage is not connected/); assert.doesNotMatch(m.text(), /0 documents shown/);
  await m.close();
});
test("owner folders and search filter loaded authorized projection", async () => {
  const second = { ...agreement, id: "synthetic-statement", name: "SYNTHETIC statement.pdf", section: "statements-reports", delivery: "pending" };
  const m = await mounted(adapter(async () => ready(context, [agreement, second])));
  assert.equal(m.tree.root.findByProps({ className: "ecc-docs__count" }).children.join(""), "2 documents shown");
  await act(async () => m.tree.root.findAllByType("button").find((b: any) => b.props.children === "Owner Statements & Reports").props.onClick());
  assert.doesNotMatch(m.text(), /SYNTHETIC management agreement/); assert.match(m.text(), /SYNTHETIC statement/);
  const button = m.tree.root.findAllByType("button").find((b: any) => b.props.children === "Download");
  assert.equal(button.props.disabled, true);
  await act(async () => m.tree.root.findByType("input").props.onChange({ target: { value: "absent" } }));
  assert.match(m.text(), /No documents match/); await m.close();
});
test("property displays familiar folders and linked owner documents only in linked selection", async () => {
  const ctx: DocumentContext = { kind: "property", id: 42 };
  const lease = { ...agreement, id: "synthetic-lease", name: "SYNTHETIC lease.pdf", section: "tenant-documents" };
  const linked = { ...agreement, association: "linked-owner" };
  const m = await mounted(adapter(async () => ready(ctx, [lease, linked])), ctx);
  assert.match(m.text(), /Property Pics & Video/); assert.match(m.text(), /Improvements & Construction/);
  await act(async () => m.tree.root.findAllByType("button").find((b: any) => b.props.children === "Linked ownership documents").props.onClick());
  assert.match(m.text(), /SYNTHETIC management agreement/); assert.doesNotMatch(m.text(), /SYNTHETIC lease/);
  await m.close();
});
test("cross-record, duplicate, unclassified and unsafe metadata fail closed", () => {
  assert.throws(() => parseDocumentRead(ready({ kind: "owner", id: 18 }), context));
  assert.throws(() => parseDocumentRead(ready(context, [agreement, agreement]), context));
  for (const patch of [{ delivery: undefined }, { section: "tenant-documents" }, { name: "../secret.pdf" }, { name: "private\nname" }, { association: "linked-owner" }])
    assert.throws(() => parseDocumentRead(ready(context, [{ ...agreement, ...patch }] as any), context));
  assert.throws(() => parseDocumentRead(ready(context, Array(501).fill(agreement)), context));
});
test("list projection strips raw URLs and denied payload details", () => {
  const parsed = parseDocumentRead(ready(context, [{ ...agreement, url: "https://private.invalid" }] as any), context);
  assert.doesNotMatch(JSON.stringify(parsed), /private.invalid/);
  assert.deepEqual(parseDocumentRead({ kind: "denied", documents: [agreement], reason: "PRIVATE FILENAME" }, context), { kind: "denied" });
});
test("record change clears query, selected folder and previous metadata before replacement resolves", async () => {
  let resolve: (value: unknown) => void = () => {};
  const source = adapter(async ctx => ctx.id === 17 ? ready() : new Promise(r => { resolve = r; }));
  const m = await mounted(source);
  await act(async () => m.tree.root.findByType("input").props.onChange({ target: { value: "management" } }));
  await act(async () => m.tree.update(m.view(source, { kind: "owner", id: 18 })));
  assert.doesNotMatch(m.text(), /SYNTHETIC management agreement/); assert.match(m.text(), /Loading documents/);
  await act(async () => { resolve(ready({ kind: "owner", id: 18 })); await flush(); });
  assert.equal(m.tree.root.findByType("input").props.value, ""); await m.close();
});
test("adapter replacement suppresses old metadata immediately", async () => {
  const m = await mounted(adapter(async () => ready()));
  await act(async () => m.tree.update(m.view(adapter(() => new Promise(() => {})))));
  assert.doesNotMatch(m.text(), /SYNTHETIC management agreement/); await m.close();
});
test("session replacement rejects late old-identity reads", async () => {
  const client = createQueryClient(); let resolve: (value: unknown) => void = () => {};
  const source = adapter(() => new Promise(r => { resolve = r; }));
  const options = documentQueryOptions(source, context, getSessionEpoch());
  const pending = options.queryFn({ signal: new AbortController().signal });
  const rejected = assert.rejects(pending);
  handleSessionBoundary(client); resolve(ready()); await rejected;
  assert.equal(client.getQueryData(options.queryKey), undefined); client.clear();
});
test("document denial purges other private query data", async () => {
  const client = createQueryClient(); client.setQueryData(["private-card"], { private: "old" });
  await assert.rejects(client.fetchQuery(documentQueryOptions(adapter(async () => ({ kind: "denied" })), context, getSessionEpoch())));
  assert.equal(client.getQueryData(["private-card"]), undefined); client.clear();
});
test("denial from another domain clears displayed document metadata", async () => {
  const m = await mounted(adapter(async () => ready()));
  assert.match(m.text(), /SYNTHETIC management agreement/);
  await act(async () => { await assert.rejects(m.client.fetchQuery({ queryKey: ["other-denial"], retry: false, queryFn: async () => { throw new HttpError("denied", 403); } })); await flush(); });
  assert.doesNotMatch(m.text(), /SYNTHETIC management agreement/); await m.close();
});
test("invalid record never requests the adapter", async () => {
  let reads = 0;
  const m = await mounted(adapter(async () => { reads++; return ready(); }), { kind: "owner", id: 0 });
  assert.equal(reads, 0); assert.match(m.text(), /not valid/); await m.close();
});
test("a download with the wrong registered version cannot be opened", async () => {
  const source = adapter(async () => ready());
  source.download = async () => ({ kind: "ready", documentId: agreement.id, versionId: "wrong-version", file: new Blob(["synthetic"]) });
  const m = await mounted(source);
  await act(async () => { await m.tree.root.findAllByType("button").find((b: any) => b.props.children === "Download").props.onClick(); });
  assert.match(m.text(), /Download unavailable/); await m.close();
});
test("download denial removes the list and other cached private data", async () => {
  const source = adapter(async () => ready()); source.download = async () => ({ kind: "denied" });
  const m = await mounted(source); m.client.setQueryData(["other-private"], "private");
  await act(async () => { await m.tree.root.findAllByType("button").find((b: any) => b.props.children === "Download").props.onClick(); await flush(); });
  assert.doesNotMatch(m.text(), /SYNTHETIC management agreement/);
  assert.equal(m.client.getQueryData(["other-private"]), undefined); await m.close();
});
test("session boundary resets document filters and search", async () => {
  const m = await mounted(adapter(async () => ready()));
  await act(async () => m.tree.root.findByType("input").props.onChange({ target: { value: "management" } }));
  await act(async () => { handleSessionBoundary(m.client); await flush(); });
  assert.equal(m.tree.root.findByType("input").props.value, ""); await m.close();
});
test("a download finishing after record replacement cannot create a browser download", async () => {
  let resolve: (value: unknown) => void = () => {};
  const source = adapter(async ctx => ready(ctx));
  source.download = () => new Promise(r => { resolve = r; });
  const original = URL.createObjectURL;
  let created = 0;
  URL.createObjectURL = () => { created++; return "blob:synthetic"; };
  const m = await mounted(source); let pending: Promise<void>;
  try {
    await act(async () => { pending = m.tree.root.findAllByType("button").find((b: any) => b.props.children === "Download").props.onClick(); });
    await act(async () => { m.tree.update(m.view(source, { kind: "owner", id: 18 })); await flush(); });
    await act(async () => { resolve({ kind: "ready", documentId: agreement.id, versionId: agreement.versionId, file: new Blob(["synthetic"]) }); await pending; });
    assert.equal(created, 0);
  } finally { URL.createObjectURL = original; await m.close(); }
});
test("stale, conflict, missing, empty and failed reads stay distinct", async () => {
  for (const kind of ["stale", "conflict", "missing", "denied"] as const) {
    const m = await mounted(adapter(async () => ({ kind })));
    assert.doesNotMatch(m.text(), /SYNTHETIC|0 documents shown/); await m.close();
  }
  const m = await mounted(adapter(async () => ready(context, [])));
  assert.match(m.text(), /No documents were returned/); await m.close();
});
