import React from "react";
import RecordDocuments from "@/features/documents/RecordDocuments";
import type { DocumentAdapter } from "@/features/documents/documentAdapter";
export default function Files({ data, adapter }: { data?: { owner: { id: number } }; adapter?: DocumentAdapter }) {
  if (!data?.owner) return <div data-testid="tab-files">File listing is not available on this card yet.</div>;
  return <div data-testid="tab-files"><RecordDocuments context={{ kind: "owner", id: data.owner.id }} adapter={adapter} /></div>;
}
