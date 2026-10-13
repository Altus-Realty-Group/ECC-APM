# ECC-APM (v1.0): runtime instructions

GitHub repository Altus-Realty-Group/ECC-APM is canonical. This is a fresh frontend workspace, not the historical Replit_Front_End_ECC workspace. Import main and use the checked-in ECC-APM Run workflow (`npm run start:replit`). If an import-generated placeholder workflow is selected, Dion can start the same command from Tools -> Shell and open Preview; the Replit Agent must not be asked to execute startup. Do source changes through reviewed GitHub PRs rather than Replit Agent authoring.

The UI uses React 18, Wouter 3, Vite 7 and TanStack Query 5. Preserve black/white/gold styling and accessibility. Do not claim server-side rendering, working authentication, live financial data or a provisioned database from frontend source alone.

Run serves Vite on 0.0.0.0:5000, with a single public port mapping. It installs from package-lock.json only. No database module, Supabase integration, old staging proxy, vendor calls or legacy backend process is configured by startup. API requests receive honest 503 JSON until an authoritative backend integration is reviewed. Never replace unavailable data with synthetic operational values.

Do not carry over historical workspace secrets/resources, extract archives, or invoke old repair/snapshot/genesis scripts. Retained archives are historical evidence, not bootstrap inputs. Browser VITE_* values are public and must never contain secrets.

The new workspace ID is unknown until Dion imports it; .altus-project.json has no active app binding. Preserve the old ID only as inactive history. After import, verify repository/branch/commit, process and browser behavior before binding. Publication requires explicit exact-release approval after fresh alignment and drift checks; source preparation is not publication authorization.
