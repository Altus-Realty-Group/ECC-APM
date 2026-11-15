// Default-unbound L4 evidence ports: every one throws or denies and none performs I/O. Production wiring is a separate, accepted step.
// The D1 defaults (authority unavailable, scopes null, store/content throw, classification denies all) are reused from ../documents/unbound.
import { DENY_ALL_CLASSIFICATIONS, UNBOUND_AUTHORITY, UNBOUND_CONTENT, UNBOUND_SCOPES, UNBOUND_STORE } from "../documents/unbound";
import type { EvidenceSource, PinnedVersionSource, PropertyKeySource } from "./evidenceReaderPorts";
import { createEvidenceReader } from "./evidenceReader";

const unbound = (what: string) => async (): Promise<never> => { throw new Error(`${what} is not bound`); };

export const UNBOUND_EVIDENCE: EvidenceSource = { load: unbound("evidence source") };
export const UNBOUND_PROPERTY_KEYS: PropertyKeySource = { rows: unbound("property key source") };
export const UNBOUND_PINNED_VERSIONS: PinnedVersionSource = { resolve: unbound("pinned version source") };

/** The only evidence reader a caller gets without explicit binding: every request is `unavailable` and no store, scope, content or legal port is touched. */
export function createUnboundEvidenceReader(now: () => number = Date.now) {
  return createEvidenceReader({
    authority: UNBOUND_AUTHORITY, scopes: UNBOUND_SCOPES, store: UNBOUND_STORE, content: UNBOUND_CONTENT, classificationPolicy: DENY_ALL_CLASSIFICATIONS,
    evidence: UNBOUND_EVIDENCE, properties: UNBOUND_PROPERTY_KEYS, pinned: UNBOUND_PINNED_VERSIONS, now,
  });
}
