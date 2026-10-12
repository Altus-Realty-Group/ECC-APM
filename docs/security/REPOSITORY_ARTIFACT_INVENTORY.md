# ECC Repository Artifact Inventory

Status date: 2026-08-06
Baseline: `main` at `5e5bd182f24c997dd743ccc5bca872ae2a64f4ff`

## Removed in this hygiene change

| Path class | Tracked files removed | Reason |
|---|---:|---|
| `.env` | 1 | Local configuration with secret-bearing values must not be tracked. |
| `.env.local` | 1 | Local configuration with secret-bearing values must not be tracked. |
| `.local/**` | 33,844 | Generated pnpm package-store/cache data, not application source. |
| `attached_assets/**` | 363 | Obsolete Replit/chat uploads with no active application-source references. |
| **Total** | **34,209** | |

The removals affect only the current branch snapshot. Git history is not rewritten, and credentials are not rotated by this change.

## Remaining tracked backup and generated artifacts

These files remain tracked for a later, separately reviewed disposition decision:

| Artifact class | Count | Approximate bytes | Examples / scope | Recommended disposition |
|---|---:|---:|---|---|
| `snapshots/*.zip` | 38 | 1,872,115 | Historical ECC UI/navigation recovery archives | Verify whether any snapshot is authoritative; otherwise remove in a dedicated archival PR. |
| `*.bak` / `*.backup` | 7 | Not separately measured | `package.json.bak`, server and script backups, `vite.config.js.backup` | Compare each file to canonical source, retain provenance outside the code tree if needed, then remove. |
| Root `*.tgz` archive | 1 | 358,403 | `estate_backup_20250829_073941.tgz` | Validate ownership and contents without exposing secrets, then archive outside Git or remove. |

## Current controls

- `.env`, `.env.*` (except `.env.example`), `.local/`, package caches, and `attached_assets/` are ignored.
- Common logs, temporary files, backup suffixes, and generated archives are ignored to prevent new accidental additions.
- `.env.example` contains a placeholder only and no runtime value.
- Required runtime values must remain in the approved runtime secret/configuration store.

## Security status

The prior inventory described the removed environment values as placeholders. That historical assertion was not independently revalidated in this PM review; environment values were not read or printed. Snapshot removal is not a secret-clearance finding. Earlier Git history is not rewritten; any credential ever committed there should still be treated as exposed and rotated. Rotation and history cleanup remain outside this PR's authorization.
