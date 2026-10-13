import StateNotice from "@/components/ui/StateNotice";

/**
 * Preserve recovery routes without exposing unverified ownership-changing actions.
 * A <section>, not <main>: App.tsx already provides the page's single <main id="main"> landmark.
 */
export default function OwnerTransferUnavailable() {
  return <section className="ecc-page" data-testid="owner-transfer-unavailable">
    <h1>Owner transfers</h1>
    <StateNotice kind="partial" title="Owner transfers are unavailable"
      detail="Transfer approvals and ownership changes are not available in ECC yet. Contact Altus Property Management to arrange a transfer." />
  </section>;
}
