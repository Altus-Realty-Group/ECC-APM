import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import StateNotice from "@/components/ui/StateNotice";
import { sessionFetchJSON, useSessionEpoch } from "@/lib/sessionScope";
import { errorKind } from "@/lib/dataState";
import { APPLICATIONS, parseConnections, type Connections } from "./connectionsContract";
import "./connections.css";

export function useOperationalConnections() {
  const epoch = useSessionEpoch();
  return useQuery({
    queryKey: ["workspace", "connections", epoch],
    queryFn: async ({ signal }): Promise<Connections> => parseConnections(await sessionFetchJSON("/api/workspace/connections", { signal })),
  });
}
type Query = Pick<ReturnType<typeof useOperationalConnections>, "data" | "isSuccess" | "isLoading" | "isFetching" | "isError" | "error" | "refetch">;

export function OperationalConnectionsView({ query }: { query: Query }) {
  const denied = query.isError && errorKind(query.error) === "denied";
  const ready = query.isSuccess && !query.isError && !query.isFetching && !!query.data;
  const loading = !query.isError && (query.isLoading || query.isFetching);
  const links = ready ? query.data!.applications : [];
  return <section className="ecc-connections" aria-labelledby="connections-title">
    <header className="ecc-connections-heading">
      <div><p className="ecc-connections-eyebrow">Operations</p><h1 id="connections-title">Operational connections</h1>
        <p>Move from ECC records to the application where the next part of the work belongs.</p></div>
      <Link className="ecc-connections-primary" href="/ops/maintenance/work-orders">Review ECC work orders</Link>
    </header>
    <div className="ecc-connections-scope">
      <strong>Application navigation</strong>
      <p>Choose the property, project or deal after opening an application. Record matching and evidence delivery need separate confirmation.</p>
    </div>
    {ready ? <div className="ecc-connections-tools"><p>Links open each application's starting page. Access is checked by the application you open.</p>
      <button type="button" onClick={() => { void query.refetch(); }}>Refresh application links</button></div>
      : <StateNotice kind={denied ? "denied" : query.isError ? "error" : loading ? "loading" : "partial"}
        title={denied ? "You don't have access to application links." : query.isError ? "Application links could not be loaded."
          : loading ? "Checking application links…" : "Application links have not been confirmed."}
        detail="You can continue reviewing ECC records while application access is checked."
        onRetry={loading ? undefined : () => { void query.refetch(); }} retrying={query.isFetching} />}
    <div className="ecc-connections-apps">
      {APPLICATIONS.map(app => {
        const href = links.find(link => link.key === app.key)?.navigationUrl ?? null;
        return <article key={app.key} aria-labelledby={`connection-${app.key}`}>
          <div className="ecc-connections-app-heading"><h2 id={`connection-${app.key}`}>{app.title}</h2>
            <span>{href ? "Application link available" : app.key === "property-intelligence" ? "Not available from ECC"
              : loading ? "Checking link" : denied ? "Access required" : query.isError ? "Link not confirmed" : ready ? "Application link unavailable" : "Link not confirmed"}</span></div>
          <p className="ecc-connections-purpose">{app.purpose}</p>
          <div className="ecc-connections-next"><h3>Next step</h3><p>{app.next}</p></div>
          <p className="ecc-connections-owner">{app.owner}</p>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${app.action} (opens in a new tab)`}>{app.action} <span aria-hidden="true">↗</span></a>
            : app.key === "property-intelligence" ? <Link href="/portfolio/properties">Review ECC properties</Link>
              : <p className="ecc-connections-unavailable">Continue in ECC until the application link is available.</p>}
        </article>;
      })}
    </div>
    <p className="ecc-connections-footnote">ECC keeps the source work-order record. Opening another application does not send evidence, dispatch work or change its status.</p>
  </section>;
}

export default function OperationalConnectionsPage() {
  return <OperationalConnectionsView query={useOperationalConnections()} />;
}
