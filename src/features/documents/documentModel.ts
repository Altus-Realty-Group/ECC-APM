import { ContractError } from "@/lib/dataState";

export type DocumentContext = { kind: "owner" | "property"; id: number };
export const OWNER_SECTIONS = [
  { id: "management-contracts", label: "Property Management Contracts" },
  { id: "entity-records", label: "Entity & Ownership Records" },
  { id: "financial-tax", label: "Financial & Tax Documents" },
  { id: "statements-reports", label: "Owner Statements & Reports" },
  { id: "correspondence", label: "Correspondence" },
] as const;
export const PROPERTY_SECTIONS = [
  { id: "tenant-documents", label: "Tenant Documents" },
  { id: "property-media", label: "Property Pics & Video" },
  { id: "construction", label: "Improvements & Construction" },
  { id: "legal", label: "Legal" },
  { id: "insurance", label: "Insurance" },
] as const;
export type RecordDocument = {
  id: string; versionId: string; name: string; section: string;
  association: "direct" | "linked-owner";
  delivery: "verified" | "pending" | "failed" | "reconciliation";
};
export type DocumentRead = { kind: "ready"; context: DocumentContext; documents: RecordDocument[] }
  | { kind: "unavailable" | "denied" | "missing" | "stale" | "conflict" };

export function sectionsFor(kind: DocumentContext["kind"]) {
  return kind === "owner" ? OWNER_SECTIONS : PROPERTY_SECTIONS;
}
export function validContext(context: DocumentContext): boolean {
  return (context.kind === "owner" || context.kind === "property") && Number.isSafeInteger(context.id) && context.id > 0;
}
function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new ContractError("Document records could not be trusted");
}
function object(value: unknown): Record<string, unknown> {
  requireValue(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function identifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

// Frontend projection only: the accepted server must filter grants/classification
// BEFORE it supplies metadata. Folder/card visibility is never authorization.
export function parseDocumentRead(raw: unknown, context: DocumentContext): DocumentRead {
  requireValue(validContext(context));
  const body = object(raw);
  if (["unavailable", "denied", "missing", "stale", "conflict"].includes(body.kind as string))
    return { kind: body.kind as "unavailable" | "denied" | "missing" | "stale" | "conflict" };
  requireValue(body.kind === "ready");
  const received = object(body.context);
  requireValue(received.kind === context.kind && received.id === context.id);
  requireValue(Array.isArray(body.documents) && body.documents.length <= 500);
  const ids = new Set<string>();
  const documents = body.documents.map((rawDocument): RecordDocument => {
    const row = object(rawDocument);
    requireValue(identifier(row.id) && identifier(row.versionId) && !ids.has(row.id));
    ids.add(row.id);
    requireValue(typeof row.name === "string" && row.name.trim().length > 0 && row.name.length <= 255
      && !/[\\/\u0000-\u001f\u007f]/.test(row.name));
    requireValue(row.association === "direct" || (context.kind === "property" && row.association === "linked-owner"));
    const validSections: readonly { id: string }[] = row.association === "linked-owner" ? OWNER_SECTIONS : sectionsFor(context.kind);
    requireValue(validSections.some(section => section.id === row.section));
    requireValue(["verified", "pending", "failed", "reconciliation"].includes(row.delivery as string));
    // URLs and extra backend fields never enter the list projection.
    return { id: row.id, versionId: row.versionId, name: row.name, section: row.section as string,
      association: row.association, delivery: row.delivery as RecordDocument["delivery"] };
  });
  return { kind: "ready", context: { ...context }, documents };
}
