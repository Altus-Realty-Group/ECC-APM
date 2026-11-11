// D1 injected ports for the protected document reader. NOTHING here is bound to a database, provider or session store: every default
// in ./unbound.ts denies. A future binder implements these against the accepted registry, the accepted resource-grant producer and
// a provider that supports verified delivery. The browser never supplies a provider path or URL: it names a native owner/property
// id and opaque document/version ids only.
import type { ReadAuthority, ReadContext } from "../../../shared/authz/protectedRead";
import type { Association, Classification, DeliveryReceipt, DocumentTarget, RegisteredVersion, TargetKind } from "../../../shared/documents/model";

/** The visibility filter every store call must apply BEFORE searching, counting or paging. */
export type ListFilter = {
  context: DocumentTarget;
  /** Only these classifications may appear in any row, search hit or count. */
  allowedClassifications: readonly Classification[];
  /** Property contexts only: home owners whose linked agreements the caller is authorized to see. Owner contexts pass []. */
  authorizedLinkedOwnerIds: readonly number[];
  search: string | null;
  section: string | null;
};

export type StoreRow = {
  documentId: string;
  name: string;
  section: string;
  classification: Classification;
  homeKind: TargetKind;
  homeOwnerId: number | null;
  homePropertyId: number | null;
  association: Association;
  /** Highest registered version. A record with no version is never returned. */
  currentVersion: RegisteredVersion;
  /** Receipts for the current version (append-only). */
  receipts: readonly DeliveryReceipt[];
};

export interface DocumentStore {
  /** Distinct home owners of documents linked to this property (ground truth from the registry; carries no authority). */
  linkedOwnerIds(propertyId: number): Promise<number[]>;
  count(filter: ListFilter): Promise<number>;
  /** Ordered by documentId ascending; keyset after `afterId`; at most `limit` rows. */
  list(filter: ListFilter, afterId: string | null, limit: number): Promise<StoreRow[]>;
  /** One row inside the same visibility filter, or null. */
  get(filter: ListFilter, documentId: string): Promise<StoreRow | null>;
  /** Any registered version of a document (used to tell a stale request from a missing one). */
  getVersion(documentId: string, versionId: string): Promise<RegisteredVersion | null>;
}

export type ProviderRef = { provider: string; objectRef: string; revision: string };
export interface ContentSource {
  /** Server-side only. Must read at most `maxBytes` and reject otherwise. */
  read(ref: ProviderRef, maxBytes: number): Promise<Uint8Array>;
}

/** Maps a native owner/property id to its legal/company scope_ref, or null when no VERIFIED mapping exists. This mapping is the unverified gate. */
export interface ScopeResolver {
  scopeOfOwner(ownerId: number): Promise<string | null>;
  scopeOfProperty(propertyId: number): Promise<string | null>;
}

/** Whether a default-deny classification may be read in this authorized context. The default policy allows nothing. */
export type ClassificationPolicy = (ctx: ReadContext, classification: Classification, target: DocumentTarget) => boolean | Promise<boolean>;

/** Fresh A1 decision for a presented session (e.g. a closure over `resolveReadAuthority`). */
export type AuthorityPort = (sessionId: string | null, requestedScope: string | null) => Promise<ReadAuthority>;

export type ReaderEvent =
  | { type: "store_contract_violation"; detail: string }
  | { type: "integrity_mismatch"; documentId: string; versionId: string }
  | { type: "authority_changed"; documentId?: string };

export type ReaderDeps = {
  authority: AuthorityPort;
  scopes: ScopeResolver;
  store: DocumentStore;
  content: ContentSource;
  classificationPolicy: ClassificationPolicy;
  now: () => number;
  maxDownloadBytes?: number;
  /** Optional, content-free operational events (no names, paths or bytes). */
  report?: (e: ReaderEvent) => void;
};
