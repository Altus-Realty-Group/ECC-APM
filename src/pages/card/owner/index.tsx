import { Link, useRoute } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { CardShell } from "@/components/cardkit/CardShell";
import RightRailPanel from "@/components/cardkit/RightRailPanel";
import HeroBlock from "./HeroBlock";
import Overview from "./Overview";
import Linked from "./Linked";
import CardLoadNotice from "@/components/recovery/CardLoadNotice";
import StateNotice from "@/components/ui/StateNotice";
import { accessGuard } from "@/lib/useAccessGuard";
import { useOwnerCard } from "@/lib/ecc-resolvers";
import { BLANK, formatNumber } from "@/lib/format";

export default function OwnerCardPage() {
  const [, routeParams] = useRoute("/card/owner/:id");
  const params: { id?: string } | null = routeParams;
  const idNum = Number(params?.id);
  const q = useOwnerCard(idNum);
  if (!Number.isFinite(idNum)) return <div className="p-6 space-y-3" data-testid="owner-invalid"><StateNotice kind="error" title="That owner link is not valid." /><Link href="/portfolio/owners" className="ecc-btn ecc-touch">Back to owners</Link></div>;

  const { data, denied } = accessGuard(q);
  const retry = () => { void q.refetch(); };
  if (!data) return <CardLoadNotice entity="owner" loading={q.isLoading} denied={denied} error={q.error} retry={retry} retrying={q.isFetching} backPath="/portfolio/owners" />;
  const owner = data?.owner;
  const properties = data?.properties || [];

  const breadcrumbs = ["Portfolio", "Owners", owner?.display_name ?? `Owner #${idNum}`];
  const tabs = [
    { id: "overview", title: "Overview", element: <Overview data={data} />, testid: "tab-overview" },
    { id: "linked", title: "Related", element: <Linked data={data} />, testid: "tab-linked" },
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
      {q.isError ? <StateNotice kind="error" title="Showing the last loaded details; the latest refresh failed." onRetry={retry} retrying={q.isFetching} /> : null}
      <div className="px-6 pt-4">
        <Link href="/portfolio/owners" className="ecc-btn ecc-touch">Back to owners</Link>
      </div>
      <CardShell
        title={owner?.display_name ?? `Owner #${idNum}`}
        hero={<HeroBlock data={data} isLoading={q.isLoading} />}
        tabs={tabs}
        breadcrumbs={breadcrumbs}
        rightRail={rightRail}
      />
    </ErrorBoundary>
  );
}
