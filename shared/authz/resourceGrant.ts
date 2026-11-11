// A1 resource authority: PROPOSED consumer-side shape of a resource grant. No accepted producer exists yet (see
// docs/security/PROTECTED_READ_AND_RESOURCE_AUTHORIZATION_20261111.md). Nothing here fabricates or fetches grants;
// it only validates whatever an accepted producer eventually returns, and drops anything doubtful (dropping only reduces access).
import { UUID } from "./session";

export type ResourceGrant = {
  grantId: string;
  personId: string;
  accountId: string;
  applicationId: string;
  /** Only whole-company grants are modelled in A1. Property/matter grants need their own accepted contract. */
  resourceType: "company";
  /** The central company identifier. NOT accountId, NOT a display name. */
  companyId: string;
  effectiveAtMs: number;
  expiresAtMs: number | null;
  revokedAtMs: number | null;
  revision: number;
};

export type ParsedGrants = { grants: ResourceGrant[]; rejected: number };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const time = (v: unknown): number | null => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);

/** `body` is the producer's `{data:{grants:[...]},error:null,meta}` envelope. A malformed envelope yields zero grants. */
export function parseResourceGrants(body: unknown): ParsedGrants {
  if (!isRecord(body) || body.error != null || !isRecord(body.meta) || body.meta.source !== "control-plane"
    || !isRecord(body.data) || !Array.isArray(body.data.grants)) return { grants: [], rejected: 0 };
  const grants: ResourceGrant[] = [];
  let rejected = 0;
  for (const raw of body.data.grants) {
    const g = parseOne(raw);
    if (g) grants.push(g); else rejected++;
  }
  return { grants, rejected };
}

function parseOne(raw: unknown): ResourceGrant | null {
  if (!isRecord(raw)) return null;
  const { grantId, personId, accountId, applicationId, resourceType, companyId, revision } = raw;
  if (typeof grantId !== "string" || !UUID.test(grantId) || typeof personId !== "string" || !UUID.test(personId)
    || typeof accountId !== "string" || !UUID.test(accountId) || typeof applicationId !== "string" || applicationId === ""
    || resourceType !== "company" || typeof companyId !== "string" || !UUID.test(companyId)
    || typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1) return null;
  const effectiveAtMs = time(raw.effectiveAt);
  if (effectiveAtMs === null) return null;
  const expiresAtMs = raw.expiresAt === null || raw.expiresAt === undefined ? null : time(raw.expiresAt);
  if (raw.expiresAt != null && expiresAtMs === null) return null;
  const revokedAtMs = raw.revokedAt === null || raw.revokedAt === undefined ? null : time(raw.revokedAt);
  if (raw.revokedAt != null && revokedAtMs === null) return null;
  return {
    grantId: grantId.toLowerCase(), personId: personId.toLowerCase(), accountId: accountId.toLowerCase(), applicationId,
    resourceType, companyId: companyId.toLowerCase(), effectiveAtMs, expiresAtMs, revokedAtMs, revision,
  };
}

/** A grant is usable only for exactly this admitted session's person, account and application, inside its window. */
export function grantApplies(g: ResourceGrant, s: { personId: string; accountId: string; applicationId: string }, nowMs: number): boolean {
  return g.personId === s.personId && g.accountId === s.accountId && g.applicationId === s.applicationId
    && g.resourceType === "company" && g.effectiveAtMs <= nowMs
    && (g.expiresAtMs === null || g.expiresAtMs > nowMs) && (g.revokedAtMs === null || g.revokedAtMs > nowMs);
}
