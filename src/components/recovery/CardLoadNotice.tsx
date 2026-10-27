import { Link } from "wouter";
import StateNotice from "@/components/ui/StateNotice";
import { isContractError } from "@/lib/dataState";

export default function CardLoadNotice({ entity, loading, denied, error, retry, retrying, backPath }: {
  entity: string;
  loading: boolean;
  denied: boolean;
  error: unknown;
  retry: () => void;
  retrying: boolean;
  backPath: string;
}) {
  return (
    <div className="ecc-record-unavailable">
      <h1>{entity.charAt(0).toUpperCase() + entity.slice(1)} record</h1>
      <StateNotice
        kind={denied ? "denied" : loading ? "loading" : "error"}
        title={denied ? `You don't have access to this ${entity}.` : loading ? `Loading ${entity}...` : `This ${entity} could not be loaded.`}
        detail={denied ? "No record details are shown. Ask an administrator to confirm your access." : loading ? undefined : isContractError(error) ? "The details came back in an unexpected format, so none are shown. Try again." : "Check your connection and try again."}
        onRetry={loading && !denied ? undefined : retry}
        retrying={retrying}
      />
      <Link href={backPath} className="ecc-btn ecc-touch">Back to {entity === "property" ? "properties" : entity + "s"}</Link>
    </div>
  );
}
