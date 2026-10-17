import React from "react";
import { OperationsRecoveryView } from "./OperationsRecoveryPage";

export default function TenantLedgersPage() {
  return <OperationsRecoveryView domains={["ledgerEntries"]} title="Tenant ledgers"
    description="Find a lease or memo and review its loaded charges, payments, credits and adjustments together. A missing ledger never means a zero balance." />;
}
