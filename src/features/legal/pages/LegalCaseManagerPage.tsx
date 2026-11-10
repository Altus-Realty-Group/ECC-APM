import React from "react";
import LegalCommandView from "../components/LegalCommandView";
import { unboundLegalAdapter } from "../adapter";

export default function LegalCaseManagerPage() {
  return <LegalCommandView adapter={unboundLegalAdapter()} />;
}
