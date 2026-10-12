import { Link, useRoute } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CardShell } from "@/components/cardkit/CardShell";
import RightRailPanel from "@/components/cardkit/RightRailPanel";
import StateNotice from "@/components/ui/StateNotice";
import { BLANK } from "@/lib/format";
import { errorKind } from "@/lib/dataState";
import HeroBlock from "./HeroBlock";
import Overview from "./Overview";
import { usePropertyCard } from "@/lib/ecc-resolvers";

const shown = (v: unknown) => (typeof v === "string" && v.trim() ? v : BLANK);

export default function PropertyCardPage() {
  const [, params] = useRoute("/card/property/:id");
  const idNum = Number(params?.id);
  const q = usePropertyCard(idNum);
  if (!Number.isFinite(idNum)) {
    return (
      <div className="p-6">
        <StateNotice kind="error" title="That property link is not valid." testId="prop-invalid" />
        <Link href="/portfolio/properties" className="ecc-btn ecc-touch">Back to properties</Link>
      </div>
    );
  }

  const retry = () => { void q.refetch(); };
  const backLink = <Link href="/portfolio/properties" className="ecc-btn ecc-touch">Back to properties</Link>;

  if (q.isLoading) {
    return <div className="p-6"><StateNotice kind="loading" title="Loading property…" /></div>;
  }

  const { data } = q;
  if (!data) {
    const denied = errorKind(q.error) === "denied";
    return (
      <div className="p-6 space-y-3">
        <StateNotice
          kind={denied ? "denied" : "error"}
          title={denied ? "You don't have access to this property." : "This property could not be loaded."}
          detail={denied ? "Ask an administrator to confirm your access." : "Check your connection and try again."}
          onRetry={retry}
          retrying={q.isFetching}
        />
        {backLink}
      </div>
    );
  }

  const property = data.property;
  const owner = (data as any).owner;

  const breadcrumbs = ["Portfolio", "Properties", property?.name || `Property #${idNum}`];

  const tabs = [
    { id: "overview", title: "Overview", element: <Overview data={data} />, testid: "tab-overview" },
    { id: "financials", title: "Financials", lazy: () => import("./Financials"), props: { data }, testid: "tab-financials" },
    { id: "legal", title: "Legal", lazy: () => import("./Legal"), props: { data }, testid: "tab-legal" },
    { id: "files", title: "Files", lazy: () => import("./Files"), props: { data }, testid: "tab-files" },
  ];

  const rightRail = (
    <div className="space-y-4">
      <RightRailPanel title="Key Dates" data-testid="rr-dates">
        <div className="text-sm">Created: {shown((property as any)?.created_at)}</div>
        <div className="text-sm">Updated: {shown((property as any)?.updated_at)}</div>
      </RightRailPanel>
      <RightRailPanel title="Contacts" data-testid="rr-contacts">
        <div className="text-sm">{shown(owner?.display_name)}</div>
      </RightRailPanel>
    </div>
  );

  return (
    <ErrorBoundary>
      {q.isError ? (
        <StateNotice kind="error" title="Showing the last loaded details; the latest refresh failed." onRetry={retry} retrying={q.isFetching} />
      ) : null}
      {/* No Export/Edit actions: neither workflow exists yet, so no control is offered. */}
      <CardShell
        title={property?.name || `Property #${idNum}`}
        hero={<HeroBlock data={data} />}
        tabs={tabs}
        breadcrumbs={breadcrumbs}
        rightRail={rightRail}
      />
    </ErrorBoundary>
  );
}
