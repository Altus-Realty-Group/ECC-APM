// Default-unbound ports: every one denies or is unavailable and none performs I/O. Production wiring is a separate, accepted step.
import type { ReadAuthority } from "../../../shared/authz/protectedRead";
import type { ClassificationPolicy, ContentSource, DocumentStore, ScopeResolver } from "./ports";

const unbound = (what: string) => async (): Promise<never> => { throw new Error(`${what} is not bound`); };

export const UNBOUND_AUTHORITY = async (): Promise<ReadAuthority> => ({ allowed: false, reason: "AUTHORITY_UNAVAILABLE" });
export const UNBOUND_SCOPES: ScopeResolver = { scopeOfOwner: async () => null, scopeOfProperty: async () => null };
export const UNBOUND_STORE: DocumentStore = {
  linkedOwnerIds: unbound("document store"), count: unbound("document store"), list: unbound("document store"),
  get: unbound("document store"), getVersion: unbound("document store"),
};
export const UNBOUND_CONTENT: ContentSource = { read: unbound("content source") };
/** Default: nothing default-deny may be read. */
export const DENY_ALL_CLASSIFICATIONS: ClassificationPolicy = () => false;

import { createDocumentReader } from "./reader";
/** The only reader a caller gets without explicit binding: every request is unavailable, and no store, scope or content port is touched. */
export function createUnboundDocumentReader(now: () => number = Date.now) {
  return createDocumentReader({
    authority: UNBOUND_AUTHORITY, scopes: UNBOUND_SCOPES, store: UNBOUND_STORE, content: UNBOUND_CONTENT,
    classificationPolicy: DENY_ALL_CLASSIFICATIONS, now,
  });
}
