# Private Version Manifest Primitive (ECC-L7)

Internal helper that builds a private version manifest from unknown input using D1 `RegisteredVersion` validation.

## Contract

- Accepts an unknown value expected to be an array of at most 500 objects.
- Each object is validated with `isRegisteredVersion` from `shared/documents/model.ts`. Invalid, non-array, or oversized input is rejected with a closed reason.
- Exact repeats (identical full RegisteredVersion including provider fields) are deduplicated.
- Conflicting identities (same `versionId` with differing fields) are rejected.
- Ambiguous selection (more than one distinct version for the same `documentId`) is rejected.
- Output contains only whitelisted fields: `documentId`, `versionId`, `versionNumber`, `byteSize`, `sha256`, `mediaType`.
- Provider references, paths, URLs, filenames, and raw errors are never returned.
- Entries use locale-independent UTF-16 code-unit order by `documentId` then `versionId`.
- Distinct version identities cannot share a provider/object/revision triple, matching the D1 registry uniqueness rule.
- Canonical form is the JSON array of ordered tuples `[documentId, versionId, versionNumber, byteSize, sha256, mediaType]`.
- The manifest carries the actual SHA-256 (hex) of the UTF-8 encoding of that canonical string, computed via `crypto.subtle.digest`. Ledger fingerprints and other hashes are not substituted.
- If cryptographic support is missing, rejects, throws, or returns an invalid digest, the result is `{ ok: false, reason: "unavailable" }`. No weaker fallback is used.
- Input is never mutated. Prototype-like identifiers are handled safely via `Map`.

## Scope and non-goals

This validates supplied metadata only. It does not prove authorization, current-version status, byte delivery, or packet completeness. It performs no export, persistence, provider calls, or workflow changes.

## Result shape

```ts
{ ok: true; manifest: { entries: ManifestEntry[]; manifestSha256: string } }
| { ok: false; reason: "input_too_large" | "invalid_entry" | "conflicting_identity" | "ambiguous_selection" | "unavailable" }
```

Zero-size versions are accepted; null or negative sizes are rejected by the D1 validator.
