# ECC Repository Artifact Inventory

Status date: 2026-10-12  
Baseline (this disposition): main `7ed2b8c4c5ed6121a9104e7f787e20999f2c4c4a` / branch head after ECC-C5-V1.

## Prior hygiene removals (historical, from #104)

| Path class | Tracked files removed | Reason |
|---|---:|---|
| `.env` / `.env.local` | 2 | Local configuration; placeholders only, not revalidated as secrets. |
| `.local/**` | 33,844 | Generated pnpm package-store/cache. |
| `attached_assets/**` | 363 | Obsolete Replit/chat uploads; no active source references. |
| **Total** | **34,209** | Snapshot-only; history not rewritten. |

## Current measured remaining artifacts (ECC-C5-V1)

Historical counts reconciled: 38 ZIP + 7 bak/backup + 1 TGZ.

### Removed in ECC-C5-V1 (proven redundant code backups)

See `docs/recovery/ARCHIVE_DISPOSITION.md` for per-file bytes and blob SHAs. Files: package.json.bak, vite.config.js.backup, scripts/guardrail-check.mjs.bak, server/index.ts.bak, server/index.ts.backup, server/lib/mapping.ts.bak, server/routes/rpc.ts.bak.

### Retained (recovery originals)

- 38 files under `snapshots/*.zip` (total 1,872,115 bytes). Historical ECC UI/navigation recovery archives. Member names are source-tree fragments.  
- Root `estate_backup_20250829_073941.tgz` (358,403 bytes). Full backup containing .local state, attached_assets, and project files.  

Disposition: retained pending owner external-archive or future removal decision. No unique business/legal/financial records identified in safe member-name inspection; still preserved as recovery material.

## Current controls

- `.env`, `.env.*` (except `.env.example`), `.local/`, package caches, and `attached_assets/` are ignored.  
- Common logs, temporary files, backup suffixes, and generated archives are ignored to prevent new accidental additions.  
- `.env.example` contains a placeholder only.  
- Required runtime values remain in approved secret stores.

## Security status

No environment values or secrets were read or printed. Snapshot and archive removal/retention is not a secret-clearance finding. Earlier Git history is not rewritten; any credential ever committed should still be treated as exposed and rotated outside this authorization.
