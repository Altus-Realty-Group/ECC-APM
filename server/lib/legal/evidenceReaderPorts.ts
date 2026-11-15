// L4 protected evidence reader: injected ports (ADR-0005). NOTHING here is bound to a database, session store, provider or route.
// The D1 ports (authority, scopes, store, content, classificationPolicy) are reused unchanged from ../documents/ports; this file adds only the three
// legal-side lookups the reader needs. Every default in ./evidenceReaderUnbound.ts denies. Results are UNTRUSTED: the reader validates every shape.
import type { ReadContext } from "../../../shared/authz/protectedRead";
import type { AuthorityPort, ClassificationPolicy, ContentSource, DocumentStore, ScopeResolver } from "../documents/ports";

/**
 * L1 side. Returns `{ matter, evidence, matterProperties }` for the requested ids or null. A real binder runs this under the A1 transaction-local database
 * context (shared/authz/dbContext) so the database itself filters by scope; the reader independently requires `matter.scopeRef` to be one of the context's
 * scopes, so an implementation that ignores the context cannot widen access.
 */
export interface EvidenceSource { load(ctx: ReadContext, matterId: string, evidenceId: string): Promise<unknown> }

/** `[{ id, idUuid }]` from the SAME `properties` rows for exactly the requested property UUIDs (no suffix, ordinal or cast pairs the key families). */
export interface PropertyKeySource { rows(ctx: ReadContext, propertyUuids: readonly string[]): Promise<unknown> }

/**
 * D1 side. Maps the pinned version id (which only ever comes from an evidence row the caller is authorized to read) to `{ documentId, documentStatus }`
 * where documentStatus is the canonical document_records.status. Called only AFTER session, matter, evidence-state and D1 target authority have passed.
 */
export interface PinnedVersionSource { resolve(ctx: ReadContext, versionId: string): Promise<unknown> }

/** Content-free operational events: a fixed code only, never an identifier, name, path, status or byte. */
export type EvidenceReaderEvent =
  | { type: "invalid_configuration" }
  | { type: "invalid_authority_context" }
  | { type: "port_contract_violation" }
  | { type: "withheld_after_delivery" }
  | { type: "d1_event"; d1: string };

export type EvidenceReaderDeps = {
  authority: AuthorityPort;
  scopes: ScopeResolver;
  store: DocumentStore;
  content: ContentSource;
  classificationPolicy: ClassificationPolicy;
  evidence: EvidenceSource;
  properties: PropertyKeySource;
  pinned: PinnedVersionSource;
  now: () => number;
  /** Safe integer >= 1; any other value disables downloads before any port is touched. */
  maxDownloadBytes?: number;
  report?: (e: EvidenceReaderEvent) => void;
};
