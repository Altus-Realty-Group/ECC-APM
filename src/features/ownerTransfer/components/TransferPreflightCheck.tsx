import OwnerTransferUnavailable from "@/features/ownerTransfer/OwnerTransferUnavailable";

export default function Unavailable(_props: { transferId: number | null; onCheckComplete?: (hasBlockers: boolean, checks: {level: "blocker" | "warning" | "info"; message: string}[]) => void }) {
  return <OwnerTransferUnavailable />;
}
