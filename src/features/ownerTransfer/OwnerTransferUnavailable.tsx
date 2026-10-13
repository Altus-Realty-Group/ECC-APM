import StateNotice from "@/components/ui/StateNotice";

/** Preserve recovery routes without exposing unverified ownership-changing actions. */
export default function OwnerTransferUnavailable() {
  return <main className="ecc-page" data-testid="owner-transfer-unavailable">
    <h1>Owner transfers</h1>
    <StateNotice kind="partial" title="Owner transfers are unavailable"
      detail="Transfer approvals and ownership changes are not available in ECC yet. Contact Altus Property Management to arrange a transfer." />
  </main>;
}
