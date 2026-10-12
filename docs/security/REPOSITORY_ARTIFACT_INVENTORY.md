# ECC Repository Artifact Inventory

Status date: 2026-10-12  
Baseline: main `9c1bd5348950aec4f0851149f1fce36f1876a74a` (post-refresh of ECC-C5-V1).

## Prior hygiene removals (historical, from merged #104)

| Path class | Tracked files removed | Reason |
|---|---:|---|
| `.env` / `.env.local` | 2 | Local configuration; placeholders only. |
| `.local/**` | 33,844 | Generated pnpm package-store/cache. |
| `attached_assets/**` | 363 | Obsolete Replit/chat uploads; no active source references. |
| **Total** | **34,209** | Snapshot-only; history not rewritten. |

## ECC-C5-V1 measured remaining artifacts

Historical counts reconciled: 38 ZIP + 7 bak/backup + 1 TGZ.  
After removal of proven redundant code backups and refresh from current main: 38 ZIP + 1 TGZ remain tracked.

### Removed (proven redundant code backups)

See `docs/recovery/ARCHIVE_DISPOSITION.md` for individual bytes and former blob SHAs.  
Files removed: package.json.bak, vite.config.js.backup, scripts/guardrail-check.mjs.bak, server/index.ts.bak, server/index.ts.backup, server/lib/mapping.ts.bak, server/routes/rpc.ts.bak.

### Retained (recovery originals — uncertain unique value)

- 38 files under `snapshots/*.zip` (total 1,872,115 bytes). Historical ECC UI/navigation recovery archives.  
- Root `estate_backup_20250829_073941.tgz` (358,403 bytes). Full Replit-era backup.  

Individual paths, bytes, and blob SHAs are listed in the disposition document.  
Disposition: retained pending owner external-archive or future dedicated removal decision. Safe member-name inspection performed; no secrets or private business records printed. Next action: owner confirmation of unique recovery value.

## Current controls

- `.env`, `.env.*` (except `.env.example`), `.local/`, package caches, and `attached_assets/` are ignored.  
- Common logs, temporary files, backup suffixes, and generated archives are ignored to prevent new accidental additions.  
- `.env.example` contains a placeholder only.  
- Required runtime values remain in approved secret stores.

## Security status

No environment values or secrets were read or printed. Archive retention is not a secret-clearance finding. Earlier Git history is not rewritten; any credential ever committed should still be treated as exposed and rotated outside this authorization.
