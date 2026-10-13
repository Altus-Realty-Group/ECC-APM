import { useRoute } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CardShell } from "@/components/cardkit/CardShell";
import RightRailPanel from "@/components/cardkit/RightRailPanel";
import HeroBlock from "./HeroBlock";
import Overview from "./Overview";
import { useOwnerCard } from "@/lib/ecc-resolvers";
import { BLANK, formatNumber } from "@/lib/format";

export default function OwnerCardPage() {
  const [, routeParams] = useRoute("/card/owner/:id");
  const params: { id?: string } | null = routeParams;
  const idNum = Number(params?.id);
  const q = useOwnerCard(idNum);
  if (!Number.isFinite(idNum)) return <div data-testid="owner-invalid">Invalid owner id</div>;

  const { data } = q;
  const owner = data?.owner;
  const properties = data?.properties || [];

  const breadcrumbs = ["Portfolio", "Owners", owner?.display_name ?? `Owner #${idNum}`];
  const actions = [
    { label: "Export PDF", testid: "action-export-pdf" },
    { label: "Edit", testid: "action-edit" },
  ];

  const tabs = [
    { id: "overview", title: "Overview", element: <Overview data={data} />, testid: "tab-overview" },
    { id: "financials", title: "Financials", lazy: () => import("./Financials"), props: { data }, testid: "tab-financials" },
    { id: "legal", title: "Legal", lazy: () => import("./Legal"), props: { data }, testid: "tab-legal" },
    { id: "files", title: "Files", lazy: () => import("./Files"), props: { data }, testid: "tab-files" },
  ];

  const rightRail = (
    <div className="space-y-4">
      <RightRailPanel title="Portfolio" data-testid="rr-portfolio">
        <div className="text-sm text-neutral-300">Properties: {data ? formatNumber(properties.length) : BLANK}</div>
      </RightRailPanel>
    </div>
  );

  return (
    <ErrorBoundary>
      <CardShell
        title={owner?.display_name ?? `Owner #${idNum}`}
        hero={<HeroBlock data={data} isLoading={q.isLoading} />}
        tabs={tabs}
        breadcrumbs={breadcrumbs}
        actions={actions}
        rightRail={rightRail}
      />
    </ErrorBoundary>
  );
}
