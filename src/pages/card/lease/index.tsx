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
import { useLeaseCard } from "@/lib/ecc-resolvers";
import { BLANK } from "@/lib/format";

export default function LeaseCardPage() {
  const [, routeParams] = useRoute("/card/lease/:id");
  const params: { id?: string } | null = routeParams;
  const idNum = Number(params?.id);
  const q = useLeaseCard(idNum);
  if (!Number.isFinite(idNum)) return <div className="p-6 space-y-3" data-testid="lease-invalid"><StateNotice kind="error" title="That lease link is not valid." /><Link href="/portfolio/leases" className="ecc-btn ecc-touch">Back to leases</Link></div>;

  const { data, denied } = accessGuard(q);
  const retry = () => { void q.refetch(); };
  if (!data) return <CardLoadNotice entity="lease" loading={q.isLoading} denied={denied} error={q.error} retry={retry} retrying={q.isFetching} backPath="/portfolio/leases" />;
  const lease = data?.lease;
  const unit = data?.unit;
  const tenant = data?.tenant;

  const breadcrumbs = ["Portfolio", "Leases", `Lease #${idNum}`];
  const tabs = [
    { id: "overview", title: "Overview", element: <Overview data={data} />, testid: "tab-overview" },
    { id: "linked", title: "Related", element: <Linked data={data} />, testid: "tab-linked" },
    { id: "financials", title: "Financials", lazy: () => import("./Financials"), props: { data }, testid: "tab-financials" },
    { id: "legal", title: "Legal", lazy: () => import("./Legal"), props: { data }, testid: "tab-legal" },
    { id: "files", title: "Files", lazy: () => import("./Files"), props: { data }, testid: "tab-files" },
  ];

  const rightRail = (
    <div className="space-y-4">
      <RightRailPanel title="Lease Info" data-testid="rr-lease">
        <div className="text-sm text-neutral-300">Status: {lease?.status ?? BLANK}</div>
      </RightRailPanel>
      <RightRailPanel title="Related" data-testid="rr-related">
        <div className="text-sm text-neutral-300">Unit: {unit ? `#${unit.id}` : BLANK}</div>
        <div className="text-sm text-neutral-300">Tenant: {tenant?.display_name || BLANK}</div>
      </RightRailPanel>
    </div>
  );

  return (
    <ErrorBoundary>
      {q.isError ? <StateNotice kind="error" title="Showing the last loaded details; the latest refresh failed." onRetry={retry} retrying={q.isFetching} /> : null}
      <div className="px-6 pt-4">
        <Link href="/portfolio/leases" className="ecc-btn ecc-touch">Back to leases</Link>
      </div>
      <CardShell
        title={`Lease #${idNum}`}
        hero={<HeroBlock data={data} isLoading={q.isLoading} />}
        tabs={tabs}
        breadcrumbs={breadcrumbs}
        rightRail={rightRail}
      />
    </ErrorBoundary>
  );
}
