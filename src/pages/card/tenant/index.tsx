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
import { useTenantCard } from "@/lib/ecc-resolvers";
import { BLANK } from "@/lib/format";

export default function TenantCardPage() {
  const [, routeParams] = useRoute("/card/tenant/:id");
  const params: { id?: string } | null = routeParams;
  const idNum = Number(params?.id);
  const q = useTenantCard(idNum);
  if (!Number.isFinite(idNum)) return <div data-testid="tenant-invalid">Invalid tenant id</div>;

  const { data, denied } = accessGuard(q);
  const retry = () => { void q.refetch(); };
  if (!data) return <CardLoadNotice entity="tenant" loading={q.isLoading} denied={denied} error={q.error} retry={retry} retrying={q.isFetching} backPath="/portfolio/tenants" />;
  const tenant = data?.tenant;
  const lease = data?.activeLease ?? null;

  const breadcrumbs = ["Portfolio", "Tenants", tenant?.display_name ?? `Tenant #${idNum}`];
  const tabs = [
    { id: "overview", title: "Overview", element: <Overview tenant={tenant} activeLease={lease} />, testid: "tab-overview" },
    { id: "linked", title: "Related", element: <Linked data={data} />, testid: "tab-linked" },
    { id: "financials", title: "Financials", lazy: () => import("./Financials"), props: { data }, testid: "tab-financials" },
    { id: "legal", title: "Legal", lazy: () => import("./Legal"), props: { data }, testid: "tab-legal" },
    { id: "files", title: "Files", lazy: () => import("./Files"), props: { data }, testid: "tab-files" },
  ];

  const rightRail = (
    <div className="space-y-4">
      <RightRailPanel title="Current Lease" data-testid="rr-lease">
        <div className="text-sm text-neutral-300">Status: {lease?.status ?? BLANK}</div>
      </RightRailPanel>
    </div>
  );

  return (
    <ErrorBoundary>
      {q.isError ? <StateNotice kind="error" title="Showing the last loaded details; the latest refresh failed." onRetry={retry} retrying={q.isFetching} /> : null}
      <CardShell
        title={tenant?.display_name ?? `Tenant #${idNum}`}
        hero={<HeroBlock data={data} isLoading={q.isLoading} />}
        tabs={tabs}
        breadcrumbs={breadcrumbs}
        rightRail={rightRail}
      />
    </ErrorBoundary>
  );
}
