# ECC-APM (v1.0)

Empire Command Center for Altus Property Management. Canonical source: [Altus-Realty-Group/ECC-APM](https://github.com/Altus-Realty-Group/ECC-APM), repository ID 1058195656.

## ECC delivery plan

The [master execution plan](docs/roadmaps/ECC_APM_MASTER_EXECUTION_PLAN.md) owns the current
sequence for data, writeback, UI, Property Intelligence, Legal and Altus app
handoffs.

## Current Replit workspace

Dion selected [ECC-APM (v1.0)](https://replit.com/@AltusDion/ECC-APM-v10) as the active frontend. The [project manifest](.altus-project.json) records this workspace for read-only runtime diagnosis. The intended branch is `main`. The observed branch remains `VERIFY` until the origin, checked-out commit and running process are verified. Synchronization and publication remain gated on exact release evidence.

The checked-in **ECC-APM** Run workflow starts Vite on port 5000, exposed through port 80. Startup installs locked dependencies when necessary and runs only the frontend. `server/index.ts` and all database and vendor integrations require their own reviewed configuration.

The frontend returns JSON `503 BACKEND_NOT_CONNECTED` for `/api` and `/bff` while no verified backend is mounted. Portfolio records and other data features require the [protected read integration](https://github.com/Altus-Realty-Group/ECC-APM/issues/211), including current-session and resource authorization, and [legacy access containment](https://github.com/Altus-Realty-Group/doorloop-sync-backend/issues/107) before live record promotion. The [release work order](https://github.com/Altus-Realty-Group/ECC-APM/issues/213) tracks exact-source, authorized and denied runtime journeys, and live refresh acceptance. Historical transfer, accounting and admin placeholders remain quarantined.

## Fresh Replit import for an approved replacement

Only use this procedure when a replacement workspace has been authorized.

1. Import this GitHub repository on `main` to the approved replacement workspace.
2. Select the checked-in **ECC-APM** workflow and click **Run**. If the import creates a placeholder workflow, open **Tools → Shell**, run `npm run start:replit` and open **Preview**.
3. Record the replacement workspace URL and ID for review before changing the active binding or publishing.

Keep historical secrets, caches, repair and snapshot scripts, archives and old databases out of the replacement workspace.

## Local development and verification

Use Node `^20.19.0 || >=22.12.0`, npm and `package-lock.json` only.

```sh
npm ci
npm run dev:web
npm run typecheck
npm test
npm run test:dependencies
npm run build
```

`npm run start:replit` exercises the import startup. It uses a lockfile/Node fingerprint under ignored `node_modules` and fails if installation fails; there is no unlocked-install fallback. `npm run dev` is a legacy explicit full-stack developer command, requiring separately approved backend configuration. It is not the Replit startup. `npm run preview` serves the built frontend with the same unavailable API boundary; publishing requires separate release approval.

## Standards and preservation

GitHub owns source; Replit runs reviewed source. Use narrow PRs, mandatory full typecheck and existing bounded CI. UI uses black/white/gold, accessible financial information and no invented operational values. Never commit secrets or put credentials in public `VITE_*` variables.

Business originals, 38 snapshot ZIPs and a recovery TGZ are retained as inert historical material; they are not loaded by startup and have not been independently security-cleared. See [artifact inventory](docs/security/REPOSITORY_ARTIFACT_INVENTORY.md), [archive disposition](docs/recovery/ARCHIVE_DISPOSITION.md) and [PR ledger](docs/recovery/PR_DISPOSITION_LEDGER.md). Historical Git evidence is preserved. Revert the fresh-import PR to roll back configuration; never blindly restore removed environment/cache artifacts.
