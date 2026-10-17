import React from "react";
import { OperationsRecoveryView } from "./OperationsRecoveryPage";

export default function WorkOrdersPage() {
  return <OperationsRecoveryView domains={["workOrders"]} title="Work orders"
    description="Find recorded work by property, description or status. Review priority, schedule and reported costs before following up." />;
}
