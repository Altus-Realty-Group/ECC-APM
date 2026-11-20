import { PropertyCard, type PropertyCardData } from "../../src/shared/card-contracts";
import { admitSession, type AdmissionPolicy, OPAQUE, UUID } from "./session";
import { parseRfc3339 } from "./time";

const connectionLabel = /^[A-Za-z0-9][A-Za-z0-9._-]{0,62}$/;
const nativePropertyLabel = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const label = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const validLabel = (v: unknown): v is string => typeof v === "string" && label.test(v);

export type PropertyBinding = {
  propertyId: number;
  companyId: string;
  nativeProviderPropertyId: string;
  workingEntityId: string;
  connectionRef: string;
};

export type PropertyReadDependencies = {
  policy: AdmissionPolicy;
  clientId: string;
  now: () => number;
  resolveSession: (sessionId: string) => Promise<unknown>;
  resolveVerifiedBinding: (propertyId: number) => Promise<PropertyBinding | null>;
  decide: (request: {
    applicationSessionId: string;
    companyId: string;
    resourceType: "ecc.property";
    resourceId: string;
    action: "read";
  }) => Promise<{ status: number; body: unknown }>;
  readCard: (scope: Readonly<PropertyBinding> & { actor: string; validUntilMs: number }) => Promise<unknown>;
};

type Result = { outcome: "ready"; card: PropertyCardData } | { outcome: "denied" | "unavailable" };
const denied = { outcome: "denied" } as const;
const unavailable = { outcome: "unavailable" } as const;

function decisionExpiry(raw: unknown, expected: {
  actor: string; clientId: string; environment: string; companyId: string; resourceId: string;
}): number | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  if (Object.keys(d).length !== 15 || d.contractVersion !== "control.resource.grant.v1" || d.issuer !== "altus-control-plane"
    || d.decision !== "allow" || d.subject !== expected.actor || d.sourceInstance !== expected.clientId
    || d.environment !== expected.environment || d.companyId !== expected.companyId
    || d.resourceType !== "ecc.property" || d.resourceId !== expected.resourceId || d.action !== "read"
    || !validLabel(d.grantId)
    || !validLabel(d.assuranceLevel)
    || typeof d.decisionMaxSeconds !== "number" || !Number.isInteger(d.decisionMaxSeconds)
    || d.decisionMaxSeconds < 1 || d.decisionMaxSeconds > 60
    || d.revocation !== "checked_at_decision_not_recalled") return null;
  return parseRfc3339(d.decisionExpiresAt);
}

/** Server-only consumer. Every call obtains a fresh decision and returns only the existing card projection. */
export async function readProtectedProperty(
  deps: PropertyReadDependencies, sessionId: string | null, propertyId: number,
): Promise<Result> {
  if (!sessionId || !OPAQUE.test(sessionId) || !Number.isSafeInteger(propertyId) || propertyId <= 0
    || deps.policy.applicationId !== "ecc" || deps.policy.environment === "production"
    || !validLabel(deps.clientId)) return denied;

  let last = -Infinity;
  const tick = () => {
    const now = deps.now();
    if (!Number.isFinite(now) || now < last) throw new Error("clock unavailable");
    last = now;
    return now;
  };

  try {
    tick();
    const body = await deps.resolveSession(sessionId);
    const admission = admitSession(body, sessionId, deps.policy, tick());
    if (!admission.admitted || admission.session.decisionMode !== "canonical") return denied;

    const binding = await deps.resolveVerifiedBinding(propertyId);
    const now = tick();
    if (!binding || binding.propertyId !== propertyId || !UUID.test(binding.companyId)
      || !UUID.test(binding.workingEntityId)
      || typeof binding.nativeProviderPropertyId !== "string" || !nativePropertyLabel.test(binding.nativeProviderPropertyId)
      || typeof binding.connectionRef !== "string" || !connectionLabel.test(binding.connectionRef) || now >= admission.session.expiresAtMs) return denied;

    const scope = {
      propertyId,
      companyId: binding.companyId.toLowerCase(),
      nativeProviderPropertyId: binding.nativeProviderPropertyId,
      workingEntityId: binding.workingEntityId.toLowerCase(),
      connectionRef: binding.connectionRef,
    };
    const resourceId = `${scope.connectionRef}:${scope.nativeProviderPropertyId}`;
    const result = await deps.decide({
      applicationSessionId: sessionId,
      companyId: scope.companyId,
      resourceType: "ecc.property",
      resourceId,
      action: "read",
    });
    const receivedAt = tick();
    if (result.status >= 500) return unavailable;
    if (result.status !== 200) return denied;
    const actor = admission.session.personId;
    const expires = decisionExpiry(result.body, {
      actor, clientId: deps.clientId, environment: deps.policy.environment,
      companyId: scope.companyId, resourceId,
    });
    if (expires === null || expires > receivedAt + 60_000 || expires > admission.session.expiresAtMs
      || expires <= receivedAt) return denied;
    const raw = await deps.readCard({ ...scope, actor, validUntilMs: expires });
    if (tick() >= expires) return denied;
    if (raw === null) return denied;
    const card = PropertyCard.safeParse(raw);
    if (!card.success || card.data.property.id !== propertyId) return unavailable;
    return { outcome: "ready", card: card.data };
  } catch {
    return unavailable;
  }
}
