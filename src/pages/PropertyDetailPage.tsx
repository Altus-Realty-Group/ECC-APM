import { Link, Redirect, useRoute, useSearch } from "wouter";
import StateNotice from "@/components/ui/StateNotice";

/** Keep old property bookmarks on the canonical, contract-backed card journey. */
export default function PropertyDetailPage() {
  const [match, params] = useRoute<{ id: string }>("/portfolio/properties/:id");
  const search = useSearch();
  const id = params?.id;

  if (!match || !id || !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    return (
      <div className="ecc-record-unavailable">
        <h1>Property record</h1>
        <StateNotice kind="error" title="That property link is not valid." testId="prop-invalid" />
        <Link href="/portfolio/properties" className="ecc-btn ecc-touch">Back to properties</Link>
      </div>
    );
  }

  // Replace avoids trapping browser Back on the legacy URL and redirecting again.
  return <Redirect to={`/card/property/${id}${search ? `?${search}` : ""}`} replace />;
}
