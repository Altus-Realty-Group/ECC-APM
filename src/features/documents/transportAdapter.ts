import { ContractError } from "@/lib/dataState";
import { getSessionEpoch, StaleSessionError } from "@/lib/sessionScope";
import { UNBOUND_DOCUMENT_ADAPTER, type DocumentAdapter } from "./documentAdapter";
import { parseDocumentRead, validContext, type DocumentContext, type RecordDocument } from "./documentModel";

/** Injected application transport, not a URL/path or a grant. A future server binder
 * authenticates the session and uses the protected registered-document reader.
 * No transport is selected from browser input or enabled by this module.
 */
export interface DocumentTransport {
  read(request: { context: DocumentContext; cursor: string | null; limit: number }, signal: AbortSignal): Promise<unknown>;
  download(request: { context: DocumentContext; documentId: string; versionId: string }, signal: AbortSignal): Promise<unknown>;
}
const MAX_DOCUMENTS = 500;
const PAGE_SIZE = 100;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
function check(ok: unknown): asserts ok { if (!ok) throw new ContractError("Document response requires review"); }
function object(value: unknown): Record<string, unknown> {
  check(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function active(signal: AbortSignal, epoch: number) {
  if (signal.aborted) throw new DOMException("Document request cancelled", "AbortError");
  if (epoch !== getSessionEpoch()) throw new StaleSessionError();
}
function contextCopy(context: DocumentContext): DocumentContext {
  check(validContext(context)); return { kind: context.kind, id: context.id };
}

/** Complete bounded record lists for the existing local search/folder UI. A
 * partial, changed or over-limit list is withheld rather than shown as complete.
 * Production remains unbound unless an accepted transport is explicitly injected.
 */
export function createTransportDocumentAdapter(transport?: DocumentTransport): DocumentAdapter {
  if (!transport) return UNBOUND_DOCUMENT_ADAPTER;
  return {
    async read(context, signal) {
      const expected = contextCopy(context), epoch = getSessionEpoch();
      let cursor: string | null = null, total: number | null = null;
      const cursors = new Set<string>(), ids = new Set<string>(), documents: RecordDocument[] = [];
      while (true) {
        active(signal, epoch);
        const raw = await transport.read({ context: { ...expected }, cursor, limit: PAGE_SIZE }, signal);
        active(signal, epoch);
        const parsed = parseDocumentRead(raw, expected);
        if (parsed.kind !== "ready") return parsed; // No earlier-page metadata survives.
        const page = object(raw);
        check(Number.isSafeInteger(page.total) && (page.total as number) >= 0 && (page.total as number) <= MAX_DOCUMENTS);
        const nextCursor = page.nextCursor;
        check(nextCursor === null || (typeof nextCursor === "string" && nextCursor.length > 0 && nextCursor.length <= 1024));
        check(parsed.documents.length <= PAGE_SIZE);
        if (total !== null && total !== page.total) return { kind: "stale" };
        total = page.total as number;
        for (const document of parsed.documents) {
          if (ids.has(document.id)) return { kind: "stale" };
          ids.add(document.id); documents.push(document);
        }
        check(documents.length <= total);
        if (nextCursor === null) return documents.length === total
          ? { kind: "ready", context: expected, documents } : { kind: "stale" };
        check(typeof nextCursor === "string");
        check(parsed.documents.length > 0 && documents.length < total && !cursors.has(nextCursor));
        cursors.add(nextCursor); cursor = nextCursor;
      }
    },
    async download(context, documentId, versionId, signal) {
      const expected = contextCopy(context), epoch = getSessionEpoch();
      check(typeof documentId === "string" && typeof versionId === "string" && IDENTIFIER.test(documentId) && IDENTIFIER.test(versionId));
      active(signal, epoch);
      const raw = object(await transport.download({ context: expected, documentId, versionId }, signal));
      active(signal, epoch);
      if (raw.kind !== "ready") return parseDocumentRead(raw, expected);
      check(raw.documentId === documentId && raw.versionId === versionId);
      check(typeof raw.name === "string" && raw.name.trim() !== "" && raw.name.length <= 255 && !/[\\/\u0000-\u001f\u007f]/.test(raw.name));
      check(typeof raw.mediaType === "string" && /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(raw.mediaType));
      check(typeof raw.sha256 === "string" && /^[0-9a-f]{64}$/.test(raw.sha256));
      check(typeof raw.byteSize === "number" && Number.isSafeInteger(raw.byteSize) && raw.byteSize >= 0 && raw.byteSize <= MAX_DOWNLOAD_BYTES);
      check(raw.bytes instanceof Uint8Array);
      const bytes = new Uint8Array(raw.bytes); // Do not retain mutable transport buffers across hashing.
      check(bytes.byteLength === raw.byteSize && globalThis.crypto?.subtle);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes.buffer);
      active(signal, epoch);
      const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
      check(hex === raw.sha256);
      return { kind: "ready", documentId, versionId, file: new Blob([bytes.buffer], { type: raw.mediaType }) };
    },
  };
}
