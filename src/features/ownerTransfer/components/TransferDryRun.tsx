import OwnerTransferUnavailable from "@/features/ownerTransfer/OwnerTransferUnavailable";

export default function Unavailable(_props: { transferId: number | null }) {
  return <OwnerTransferUnavailable />;
}
