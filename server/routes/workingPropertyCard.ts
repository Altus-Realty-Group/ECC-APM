import { makeControlPlaneHttpProtectedPropertyReader } from "../lib/authz/controlPlanePropertyDecision";
import { makeVerifiedWorkingPropertyBinding } from "../lib/authz/verifiedWorkingPropertyBinding";
import { makeWorkingPropertyCardReader } from "../lib/authz/workingPropertyCard";
import { createProtectedPropertyCardRouter } from "./protectedPropertyCard";

type Authority = Parameters<typeof makeControlPlaneHttpProtectedPropertyReader>;
type Ports = Pick<Parameters<typeof createProtectedPropertyCardRouter>[0], "resolveSessionId">
  & Parameters<typeof makeVerifiedWorkingPropertyBinding>[0]
  & Pick<Authority[1], "policy" | "now">
  & { loadWorkingCard: Parameters<typeof makeWorkingPropertyCardReader>[0] };

/** Route for a verified host to mount under /api/rpc in place of its legacy property-card handler. */
export function createWorkingPropertyCardRouter(
  settings: Authority[0],
  ports: Ports,
  request?: Authority[2],
) {
  return createProtectedPropertyCardRouter({
    resolveSessionId: ports.resolveSessionId,
    readProperty: makeControlPlaneHttpProtectedPropertyReader(settings, {
      policy: ports.policy,
      now: ports.now,
      resolveVerifiedBinding: makeVerifiedWorkingPropertyBinding(ports),
      readCard: makeWorkingPropertyCardReader(ports.loadWorkingCard),
    }, request),
  });
}
