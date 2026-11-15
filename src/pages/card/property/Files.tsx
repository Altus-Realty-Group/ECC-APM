import React from "react";
import RecordDocuments from "@/features/documents/RecordDocuments";
import type { DocumentAdapter } from "@/features/documents/documentAdapter";
export default function Files({ data, adapter }: { data?: { property: { id: number } }; adapter?: DocumentAdapter }) {
  if (!data?.property) return <div data-testid="tab-files">File listing is not available on this card yet.</div>;
  return <div data-testid="tab-files"><RecordDocuments context={{ kind: "property", id: data.property.id }} adapter={adapter} /></div>;
}
