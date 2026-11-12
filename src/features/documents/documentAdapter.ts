import type { DocumentContext } from "./documentModel";

// Proposed frontend dependency, not an installed endpoint or resource grant.
// An accepted binder must authorize each document/version and deliver bytes
// with validated integrity. No legacy provider/path/shared-link client is used.
export interface DocumentAdapter {
  read(context: DocumentContext, signal: AbortSignal): Promise<unknown>;
  download(context: DocumentContext, documentId: string, versionId: string, signal: AbortSignal): Promise<unknown>;
}
export const UNBOUND_DOCUMENT_ADAPTER: DocumentAdapter = {
  read: async () => ({ kind: "unavailable" }),
  download: async () => ({ kind: "unavailable" }),
};
