import { Link, useRoute } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CardShell } from "@/components/cardkit/CardShell";
import StateNotice from "@/components/ui/StateNotice";
import { errorKind, isContractError } from "@/lib/dataState";
import { accessGuard } from "@/lib/useAccessGuard";
import HeroBlock from "./HeroBlock";
import Overview from "./Overview";
import { usePropertyCard } from "@/lib/ecc-resolvers";

export default function PropertyCardPage() {
  const [, routeParams] = useRoute("/card/property/:id");
  // wouter's inferred params type collapses to null here; widen it explicitly (guardrail pins Number(params?.id)).
  const params: { id?: string } | null = routeParams;
  const idNum = Number(params?.id);
  const q = usePropertyCard(idNum);
  const backLink = <Link href="/portfolio/properties" className="ecc-btn ecc-touch">Back to properties</Link>;
  if (!Number.isFinite(idNum)) {
    return (
      <div className="p-6 space-y-3">
        <StateNotice kind="error" title="That property link is not valid." testId="prop-invalid" />
        {backLink}
      </div>
    );
  }

  const retry = () => { void q.refetch(); };
  // After a 401/403 TanStack keeps the previous card; it must not be rendered once access is denied.
  const { data, denied } = accessGuard(q);

  if (q.isLoading && !denied) {
    return <div className="p-6"><StateNotice kind="loading" title="Loading property…" /></div>;
  }

  if (!data) {
    const unreadable = !denied && isContractError(q.error);
    return (
      <div className="p-6 space-y-3">
        <StateNotice
          kind={denied ? "denied" : "error"}
          title={
            denied
              ? "You don't have access to this property."
              : unreadable
                ? "This property came back in an unexpected format."
                : "This property could not be loaded."
          }
          detail={
            denied
              ? "No property details are shown. Ask an administrator to confirm your access."
              : unreadable
                ? "The details could not be trusted, so none are shown. Try again."
                : "Check your connection and try again."
          }
          onRetry={retry}
          retrying={q.isFetching}
        />
        {backLink}
      </div>
    );
  }

  const property = data.property;
  const breadcrumbs = ["Portfolio", "Properties", property.name || `Property #${idNum}`];

  const tabs = [
    { id: "overview", title: "Overview", element: <Overview data={data} />, testid: "tab-overview" },
    { id: "financials", title: "Financials", lazy: () => import("./Financials"), props: { data }, testid: "tab-financials" },
    { id: "legal", title: "Legal", lazy: () => import("./Legal"), props: { data }, testid: "tab-legal" },
    { id: "files", title: "Files", lazy: () => import("./Files"), props: { data }, testid: "tab-files" },
  ];

  return (
    <ErrorBoundary>
      {q.isError && errorKind(q.error) !== "denied" ? (
        <StateNotice kind="error" title="Showing the last loaded details; the latest refresh failed." onRetry={retry} retrying={q.isFetching} />
      ) : null}
      <div className="px-6 pt-4">{backLink}</div>
      {/* No Export/Edit actions (no workflow) and no Contacts/Key Dates panels: the property card
          contract and its server handler return neither owner nor created/updated dates. */}
      <CardShell
        title={property.name || `Property #${idNum}`}
        hero={<HeroBlock data={data} />}
        tabs={tabs}
        breadcrumbs={breadcrumbs}
      />
    </ErrorBoundary>
  );
}
