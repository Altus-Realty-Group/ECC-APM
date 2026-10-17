# ECC-APM (v1.0)

Empire Command Center for Altus Property Management. Canonical source: [Altus-Realty-Group/ECC-APM](https://github.com/Altus-Realty-Group/ECC-APM), repository ID 1058195656.

## Fresh Replit import

1. Import this GitHub repository, branch `main`, into a **new** Replit workspace named **ECC-APM (v1.0)**.
2. Click **Run** (the checked-in **ECC-APM** workflow). The checked-in startup installs locked dependencies when necessary and starts the frontend on port 5000, exposed through port 80.
3. Open the preview. No secrets, database, vendor integration or old Replit resources are required for frontend startup.
If Replit retains an import-generated placeholder workflow, open **Tools -> Shell**, run `npm run start:replit`, and open **Preview**. The Console message asking you to configure Workflows means startup was not attempted. Select **ECC-APM** as the Run workflow after synchronizing the reviewed GitHub configuration. Replit Agent does not perform startup under the runtime observation rules.

4. Record the new workspace URL/ID before binding or publishing it. `.altus-project.json` intentionally has no active runtime binding.

The fresh workspace is a frontend foundation. Without a complete reviewed server configuration, `/api` and `/bff` return explicit JSON `503 BACKEND_NOT_CONNECTED`; they do not contact the old staging service or manufacture business data. The protected connection candidate uses central Altus sign-in and checks access on every permitted read. It is not activated. Backend ownership, deployed identity, record authorization and Control Plane registration remain acceptance blockers. See [protected connection readiness](docs/recovery/ECC_PROTECTED_CONNECTION_20261017.md). Historical transfer/accounting/admin placeholders remain quarantined. A successful import is not operational or production acceptance.

Do not import old secrets, restore caches, run legacy repair/snapshot scripts, extract recovery archives or attach old databases. The Run command does not start `server/index.ts`, vendor sync jobs or database clients.

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

`npm run start:replit` exercises the import startup. It uses a lockfile/Node fingerprint under ignored `node_modules` and fails if installation fails; there is no unlocked-install fallback. `npm run dev` is a legacy explicit full-stack developer command, requiring separately approved backend configuration. It is not the Replit startup. `npm run preview` serves the built frontend with the same guarded API boundary; publishing requires separate release approval.

## Standards and preservation

GitHub owns source; Replit runs reviewed source. Use narrow PRs, mandatory full typecheck and existing bounded CI. UI uses black/white/gold, accessible financial information and no invented operational values. Never commit secrets or put credentials in public `VITE_*` variables.

Business originals, 38 snapshot ZIPs and a recovery TGZ are retained as inert historical material; they are not loaded by startup and have not been independently security-cleared. See [artifact inventory](docs/security/REPOSITORY_ARTIFACT_INVENTORY.md), [archive disposition](docs/recovery/ARCHIVE_DISPOSITION.md) and [PR ledger](docs/recovery/PR_DISPOSITION_LEDGER.md). Historical Git evidence is preserved. Revert the fresh-import PR to roll back configuration; never blindly restore removed environment/cache artifacts.
