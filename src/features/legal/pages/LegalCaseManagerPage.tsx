import React from "react";
import LegalCommandView from "../components/LegalCommandView";
import { LEGAL_ADAPTER } from "../adapter";

export default function LegalCaseManagerPage() {
  return <LegalCommandView adapter={LEGAL_ADAPTER} />;
}
