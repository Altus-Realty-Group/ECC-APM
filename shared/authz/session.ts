// A1 admission: person + account + application only. Pure; no network, env or cookies.
// Mirrors the central Control Plane `GET /api/control/v1/session/current` contract (source reference:
// altus-control-plane docs/contracts/control_session_federation_v1.contract.md at 3d9aaf27) and the validation semantics of the
// retained PR #155 bridge (54e42095). Admission does NOT grant any company, property or matter access.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const OPAQUE = /^[A-Za-z0-9._~-]{1,512}$/;
import { parseRfc3339 } from "./time";

const REVIEW_ENVIRONMENTS: ReadonlySet<string> = new Set(["development", "test", "preview"]);

export type Environment = "production" | "staging" | "preview" | "test" | "development";

export type AdmissionPolicy = {
  /** The one application this server is registered as. A session for any other application is denied. */
  applicationId: string;
  environment: Environment;
  /** Optional pin to one verified person/account (the retained bridge's owner mode). Never inferred from a request. */
  pin?: { personId: string; accountId: string };
};

export type AdmissionDenial =
  | "SESSION_REQUIRED" | "AUTHORITY_UNAVAILABLE" | "ENVELOPE_INVALID" | "NOT_ALLOWED" | "IDENTITY_INVALID"
  | "WRONG_APPLICATION" | "WRONG_PRINCIPAL" | "SESSION_MISMATCH" | "SESSION_EXPIRED" | "MODE_INVALID";

export type AdmittedSession = {
  sessionId: string;
  personId: string;
  accountId: string;
  applicationId: string;
  expiresAtMs: number;
  decisionMode: "canonical" | "developer_bypass";
  capabilities: readonly string[];
};

export type Admission = { admitted: true; session: AdmittedSession } | { admitted: false; reason: AdmissionDenial };

const deny = (reason: AdmissionDenial): Admission => ({ admitted: false, reason });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Validate a central current-session response for the session id the caller presented. Any doubt denies.
 * `body` is the raw parsed JSON envelope `{data,error,meta}`.
 */
export function admitSession(body: unknown, presentedSessionId: string | null, policy: AdmissionPolicy, nowMs: number): Admission {
  if (!presentedSessionId || !OPAQUE.test(presentedSessionId)) return deny("SESSION_REQUIRED");
  if (!isRecord(body) || body.error !== null || !isRecord(body.meta)
    || body.meta.contractVersion !== "1.0.0" || body.meta.source !== "control-plane" || !isRecord(body.data)) return deny("ENVELOPE_INVALID");
  const d = body.data;
  if (d.allowed !== true) return deny("NOT_ALLOWED");
  if (typeof d.personId !== "string" || !UUID.test(d.personId) || typeof d.accountId !== "string" || !UUID.test(d.accountId)) return deny("IDENTITY_INVALID");
  if (d.applicationId !== policy.applicationId) return deny("WRONG_APPLICATION");
  if (policy.pin && (d.personId !== policy.pin.personId || d.accountId !== policy.pin.accountId)) return deny("WRONG_PRINCIPAL");
  if (d.applicationSessionId !== presentedSessionId) return deny("SESSION_MISMATCH");
  const expiresAtMs = parseRfc3339(d.expiresAt);
  if (expiresAtMs === null) return deny("ENVELOPE_INVALID");
  if (expiresAtMs <= nowMs) return deny("SESSION_EXPIRED");
  const capabilities = d.capabilities === undefined ? [] : d.capabilities;
  if (!Array.isArray(capabilities) || !capabilities.every((c) => typeof c === "string")) return deny("ENVELOPE_INVALID");
  if (d.decisionMode === "canonical") {
    if (d.billingMode !== "canonical" || d.banner !== null) return deny("MODE_INVALID");
  } else if (d.decisionMode === "developer_bypass") {
    // Person-scoped review access: only in non-production review environments, exactly one read-only capability.
    if (!REVIEW_ENVIRONMENTS.has(policy.environment) || d.billingMode !== "not_applicable_developer"
      || d.banner !== "DEV BYPASS · READ ONLY" || capabilities.length !== 1 || capabilities[0] !== "ui.review.read") return deny("MODE_INVALID");
  } else {
    return deny("MODE_INVALID");
  }
  return {
    admitted: true,
    session: {
      sessionId: presentedSessionId, personId: d.personId.toLowerCase(), accountId: d.accountId.toLowerCase(),
      applicationId: d.applicationId as string, expiresAtMs, decisionMode: d.decisionMode, capabilities: [...capabilities] as string[],
    },
  };
}
