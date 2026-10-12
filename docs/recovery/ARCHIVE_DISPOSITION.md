# ECC archive disposition

Owner: Grok. Lane: ECC-C5-V1. Baseline: main `7ed2b8c4c5ed6121a9104e7f787e20999f2c4c4a`.  
Final head after this work: (updated on push).

## Measured inventory (current tracked tree)

Historical inventory claimed 38 `snapshots/*.zip` (~1,872,115 bytes), 7 `*.bak`/`*.backup`, and 1 root `*.tgz`. Current tree confirms exactly 38 ZIP files totaling 1,872,115 bytes, 7 code backup files, and 1 TGZ. Counts reconciled.

### Code backups (removed as proven redundant generated/code artifacts)

| Path | Bytes | Blob SHA (pre-removal) | Classification | Disposition | Replacement / notes |
|------|------:|------------------------|----------------|-------------|---------------------|
| package.json.bak | 979 | f99c89867a775da988889baa07ed9a40b10d9aa5 | Code backup | Removed | Differs from current package.json; historical only. Canonical is package.json. |
| vite.config.js.backup | 1195 | 559fd33b00c8baf1e6728c20edddfdce22829b0e | Code backup | Removed | Differs from current vite.config.js. Canonical is vite.config.js. |
| scripts/guardrail-check.mjs.bak | 3634 | 118ba1662979aa94275ad91e9738e638b912bffc | Code backup | Removed | Differs from current. Canonical is scripts/guardrail-check.mjs. |
| server/index.ts.bak | 26328 | b4085eed70087f1ada73c592466eacefe97f0c8d | Code backup | Removed | Differs from current server/index.ts. |
| server/index.ts.backup | 1621 | b1a9c50d9aa6e3557a9ab32f66cd03fb7d7a5730 | Code backup | Removed | Differs from current. |
| server/lib/mapping.ts.bak | 1471 | 2dfd282f298728137c44b29301c9024cf8c65b6c | Code backup | Removed | Identical to current server/lib/mapping.ts. |
| server/routes/rpc.ts.bak | 7184 | 0d0fcca3e2bd7d6cd6aaeede1eb5d9908814edb3 | Code backup | Removed | Differs from current server/routes/rpc.ts. |

Blob SHAs recorded. Git history preserves the blobs. No business, legal, or financial originals in these files.

### Retained recovery archives (uncertain / unique recovery originals)

All 38 `snapshots/*.zip` and root `estate_backup_20250829_073941.tgz` retained. These are historical UI/navigation recovery snapshots and a full Replit-era backup. Member names inspected safely (src components, .local state, attached_assets, etc.). No private business records printed. Provenance: recovery/snapshot scripts and Replit exports. Source references limited to snapshot scripts and .gitignore. Next action: owner decision to move to external archival storage or remove in a future dedicated PR after confirming no unique recovery value. Uncertain material left tracked.

## Source-reference checks

`git grep` found references only in `.gitignore`, `scripts/guardrail-check.mjs`, and `scripts/snapshot.cjs`. No active application source depends on the removed backups or the retained archives for runtime.

## Validation

Guardrail and build to be run on final head. Runtime/database validation not performed.

## Rollback

Revert this commit. Removed files can be restored from the recorded blob SHAs via `git cat-file` or history. Archives remain. No history rewrite.
