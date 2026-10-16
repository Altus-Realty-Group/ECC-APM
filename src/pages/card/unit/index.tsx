import { useRoute } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CardShell } from "@/components/cardkit/CardShell";
import RightRailPanel from "@/components/cardkit/RightRailPanel";
import HeroBlock from "./HeroBlock";
import Overview from "./Overview";
import Linked from "./Linked";
import CardLoadNotice from "@/components/recovery/CardLoadNotice";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard } from "@/lib/useAccessGuard";
import { useUnitCard } from "@/lib/ecc-resolvers";
import { BLANK } from "@/lib/format";

export default function UnitCardPage() {
  const [, routeParams] = useRoute("/card/unit/:id");
  const params: { id?: string } | null = routeParams;
  const idNum = Number(params?.id);
  const q = useUnitCard(idNum);
  if (!Number.isFinite(idNum)) return <div data-testid="unit-invalid">Invalid unit id</div>;

  const { data, denied } = accessGuard(q);
  const retry = () => { void q.refetch(); };
  if (!data) return <CardLoadNotice entity="unit" loading={q.isLoading} denied={denied} error={q.error} retry={retry} retrying={q.isFetching} backPath="/portfolio/units" />;
  const unit = data?.unit;
  const property = data?.property;
  const lease = data?.lease;
  const unitTitle = unit?.unit_label || `Unit #${idNum}`;

  const breadcrumbs = ["Portfolio", "Units", unitTitle];
  const tabs = [
    { id: "overview", title: "Overview", element: <Overview unit={unit} property={property} />, testid: "tab-overview" },
    { id: "linked", title: "Related", element: <Linked data={data} />, testid: "tab-linked" },
    { id: "financials", title: "Financials", lazy: () => import("./Financials"), props: { data }, testid: "tab-financials" },
    { id: "legal", title: "Legal", lazy: () => import("./Legal"), props: { data }, testid: "tab-legal" },
    { id: "files", title: "Files", lazy: () => import("./Files"), props: { data }, testid: "tab-files" },
  ];

  const rightRail = (
    <div className="space-y-4">
      <RightRailPanel title="Unit Details" data-testid="rr-details">
        <div className="text-sm text-neutral-300">Status: {unit?.status ?? BLANK}</div>
        <div className="text-sm text-neutral-300">Lease: {lease?.status ?? BLANK}</div>
      </RightRailPanel>
      <RightRailPanel title="Property" data-testid="rr-property">
        <div className="text-sm text-neutral-300">{property ? `Property #${property.id}` : BLANK}</div>
      </RightRailPanel>
    </div>
  );

  return (
    <ErrorBoundary>
      {q.isError ? <StateNotice kind="error" title="Showing the last loaded details; the latest refresh failed." onRetry={retry} retrying={q.isFetching} /> : null}
      <CardShell
        title={unitTitle}
        hero={<HeroBlock data={data} isLoading={q.isLoading} />}
        tabs={tabs}
        breadcrumbs={breadcrumbs}
        rightRail={rightRail}
      />
    </ErrorBoundary>
  );
}
