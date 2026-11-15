// A1 resource authority: PROPOSED consumer-side shape of a resource grant. No accepted producer exists yet (see
// docs/security/PROTECTED_READ_AND_RESOURCE_AUTHORIZATION_20261111.md). Nothing here fabricates or fetches grants;
// it only validates whatever an accepted producer eventually returns, and drops anything doubtful (dropping only reduces access).
import { UUID } from "./session";
import { parseRfc3339 } from "./time";

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
const hasKey = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * `body` is the producer's `{data:{grants:[...]},error:null,meta:{contractVersion:"1.0.0",source:"control-plane"}}` envelope.
 * Any envelope problem (missing/other contract version, wrong source, an error, a non-array) yields ZERO grants, never a partial set.
 * Within a valid envelope a doubtful grant is dropped (dropping only reduces access) and counted. A grantId that appears more
 * than once in ANY entry (including a malformed one) is ambiguous, so every copy is dropped.
 */
export function parseResourceGrants(body: unknown): ParsedGrants {
  if (!isRecord(body) || body.error !== null || !isRecord(body.meta)
    || body.meta.contractVersion !== "1.0.0" || body.meta.source !== "control-plane"
    || !isRecord(body.data) || !Array.isArray(body.data.grants)) return { grants: [], rejected: 0 };
  const raw: unknown[] = body.data.grants;
  const parsed: (ResourceGrant | null)[] = raw.map(parseOne);
  // Ambiguity is judged on the READABLE identity of every raw entry, not only on entries that fully validate: a malformed copy that
  // still carries a readable grantId makes that id ambiguous, so every copy (valid or not) is dropped. Identity is normalized
  // (trimmed, lower-cased) before comparison so case or padding cannot hide a duplicate.
  const counts = new Map<string, number>();
  for (const entry of raw) {
    const id = readableGrantId(entry);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const grants = parsed.filter((g): g is ResourceGrant => g !== null && counts.get(g.grantId) === 1);
  return { grants, rejected: raw.length - grants.length };
}

/** The grant id of a raw entry if it is readable as a UUID after normalization, else null. */
function readableGrantId(entry: unknown): string | null {
  if (!isRecord(entry) || typeof entry.grantId !== "string") return null;
  const id = entry.grantId.trim().toLowerCase();
  return UUID.test(id) ? id : null;
}

/**
 * `expiresAt` and `revokedAt` must be PRESENT: an explicit `null` is the producer's statement "no expiry" / "not revoked";
 * an absent key, `undefined`, an empty string or a non-RFC3339 value is malformed and rejects the grant (never non-expiring).
 */
function nullableInstant(o: Record<string, unknown>, key: string): { ok: true; ms: number | null } | { ok: false } {
  if (!hasKey(o, key)) return { ok: false };
  const v = o[key];
  if (v === null) return { ok: true, ms: null };
  const ms = parseRfc3339(v);
  return ms === null ? { ok: false } : { ok: true, ms };
}

function parseOne(raw: unknown): ResourceGrant | null {
  if (!isRecord(raw)) return null;
  const { grantId, personId, accountId, applicationId, resourceType, companyId, revision } = raw;
  if (typeof grantId !== "string" || !UUID.test(grantId) || typeof personId !== "string" || !UUID.test(personId)
    || typeof accountId !== "string" || !UUID.test(accountId) || typeof applicationId !== "string" || applicationId === ""
    || resourceType !== "company" || typeof companyId !== "string" || !UUID.test(companyId)
    || typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1) return null;
  const effectiveAtMs = parseRfc3339(raw.effectiveAt);
  const expires = nullableInstant(raw, "expiresAt");
  const revoked = nullableInstant(raw, "revokedAt");
  if (effectiveAtMs === null || !expires.ok || !revoked.ok) return null;
  return {
    grantId: grantId.toLowerCase(), personId: personId.toLowerCase(), accountId: accountId.toLowerCase(), applicationId,
    resourceType, companyId: companyId.toLowerCase(), effectiveAtMs, expiresAtMs: expires.ms, revokedAtMs: revoked.ms, revision,
  };
}

/** A grant is usable only for exactly this admitted session's person, account and application, inside its window. */
export function grantApplies(g: ResourceGrant, s: { personId: string; accountId: string; applicationId: string }, nowMs: number): boolean {
  return g.personId === s.personId && g.accountId === s.accountId && g.applicationId === s.applicationId
    && g.resourceType === "company" && g.effectiveAtMs <= nowMs
    && (g.expiresAtMs === null || g.expiresAtMs > nowMs)
    // Any revocation record denies, including one dated in the future: its meaning is ambiguous, so it fails closed.
    && g.revokedAtMs === null;
}
