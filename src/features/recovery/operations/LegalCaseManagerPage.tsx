import React from "react";
import { OperationsRecoveryView } from "./OperationsRecoveryPage";

export default function LegalCaseManagerPage() {
  return <OperationsRecoveryView domains={["legalCases"]} title="Legal case manager"
    description="Find a tenant or property, review the recorded case status and court date, and identify the next case to follow up." />;
}
