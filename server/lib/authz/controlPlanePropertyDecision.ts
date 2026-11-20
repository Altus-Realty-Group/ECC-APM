import { readProtectedProperty, type PropertyReadDependencies } from "../../../shared/authz/propertyRead";
import { OPAQUE } from "../../../shared/authz/session";

const grantPath = "/api/control/v1/resource-grants/evaluate";
const sessionPath = "/api/control/v1/session/current";
const unavailable = { status: 503, body: null } as const;

type Settings = {
  origin: string;
  clientId: string;
  clientAssertion: string;
};

function makeClientRequest(settings: Settings, request: typeof fetch) {
  const base = new URL(settings.origin);
  if (base.protocol !== "https:" || base.username || base.password || base.href !== base.origin + "/") {
    throw new Error("Control Plane property decisions require a configured HTTPS origin");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(settings.clientId)
    || !/^[\x21-\x7e]{1,512}$/.test(settings.clientAssertion)) {
    throw new Error("Control Plane property decision client is not configured");
  }

  const { clientId, clientAssertion } = settings;
  return (path: typeof grantPath | typeof sessionPath, init: RequestInit) => {
    const headers = new Headers(init.headers);
    headers.set("X-Control-Client-Id", clientId);
    headers.set("X-Control-Client-Assertion", clientAssertion);
    return request(new URL(path, base), {
      ...init,
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  };
}

function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
}

/** Server-only transport for the exact property-read decision. Credentials never enter the card response. */
export function makeControlPlanePropertyDecision(
  settings: Settings,
  request: typeof fetch = fetch,
): PropertyReadDependencies["decide"] {
  const send = makeClientRequest(settings, request);
  return async (input) => {
    const { applicationSessionId, companyId, resourceType, resourceId, action } = input;
    try {
      const response = await send(grantPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationSessionId, companyId, resourceType, resourceId, action }),
      });
      if (response.status !== 200) {
        await response.body?.cancel();
        return { status: response.status, body: null };
      }
      if (!isJson(response)) {
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

/** Resolve a current session supplied by verified server middleware through the registered ECC client. */
export function makeControlPlaneCurrentSession(
  settings: Settings,
  request: typeof fetch = fetch,
): PropertyReadDependencies["resolveSession"] {
  const send = makeClientRequest(settings, request);
  return async (sessionId) => {
    if (!OPAQUE.test(sessionId) || sessionId.trim() !== sessionId) return null;
    try {
      const response = await send(sessionPath, {
        method: "GET",
        headers: { "X-Control-Application-Session": sessionId },
      });
      if (response.status === 401 || response.status === 403) {
        await response.body?.cancel();
        return null;
      }
      if (response.status !== 200 || !isJson(response)) {
        await response.body?.cancel();
        throw new Error("invalid current session response");
      }
      return await response.json();
    } catch {
      throw new Error("Control Plane current session unavailable");
    }
  };
}

/** Bind session and resource checks to the same HTTPS origin and registered client. */
export function makeControlPlaneHttpProtectedPropertyReader(
  settings: Settings,
  dependencies: Omit<PropertyReadDependencies, "resolveSession" | "decide" | "clientId">,
  request: typeof fetch = fetch,
) {
  return makeControlPlaneProtectedPropertyReader(settings, {
    ...dependencies, resolveSession: makeControlPlaneCurrentSession(settings, request),
  }, request);
}
