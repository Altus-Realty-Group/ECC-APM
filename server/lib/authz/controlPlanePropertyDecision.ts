import { readProtectedProperty, type PropertyReadDependencies } from "../../../shared/authz/propertyRead";

const grantPath = "/api/control/v1/resource-grants/evaluate";
const unavailable = { status: 503, body: null } as const;

type Settings = {
  origin: string;
  clientId: string;
  clientAssertion: string;
};

/** Server-only transport for the exact property-read decision. Credentials never enter the card response. */
export function makeControlPlanePropertyDecision(
  settings: Settings,
  request: typeof fetch = fetch,
): PropertyReadDependencies["decide"] {
  const base = new URL(settings.origin);
  if (base.protocol !== "https:" || base.username || base.password || base.href !== base.origin + "/") {
    throw new Error("Control Plane property decisions require a configured HTTPS origin");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(settings.clientId)
    || !/^[\x21-\x7e]{1,512}$/.test(settings.clientAssertion)) {
    throw new Error("Control Plane property decision client is not configured");
  }

  const endpoint = new URL(grantPath, base);
  const clientId = settings.clientId;
  const clientAssertion = settings.clientAssertion;
  return async (input) => {
    const { applicationSessionId, companyId, resourceType, resourceId, action } = input;
    try {
      const response = await request(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Control-Client-Id": clientId,
          "X-Control-Client-Assertion": clientAssertion,
        },
        body: JSON.stringify({ applicationSessionId, companyId, resourceType, resourceId, action }),
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        return { status: response.status, body: null };
      }
      if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        await response.body?.cancel();
        return unavailable;
      }
      return { status: 200, body: await response.json() };
    } catch {
      return unavailable;
    }
  };
}

/** Bind the consumer and HTTP transport to the same configured client. */
export function makeControlPlaneProtectedPropertyReader(
  settings: Settings,
  dependencies: Omit<PropertyReadDependencies, "decide" | "clientId">,
  request: typeof fetch = fetch,
) {
  const decide = makeControlPlanePropertyDecision(settings, request);
  const deps = { ...dependencies, clientId: settings.clientId, decide };
  return (sessionId: string | null, propertyId: number) => readProtectedProperty(deps, sessionId, propertyId);
}
