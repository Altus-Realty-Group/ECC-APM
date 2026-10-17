# ECC backend source reconciliation - 2026-10-17

ECC source baseline: `9f281cd1735910684ed372b8c4ed7700f6baab5b` in
`Altus-Realty-Group/ECC-APM` (repository ID `1058195656`). This record supplements
earlier discovery; it does not certify a deployed backend or authorize activation.

## Source owner and artifact comparison

The existing backend's [repository map](https://github.com/AltusDD/empirecommandcenter-backend/blob/5a571f3bb7f9b314513d4c19f4dcb6821687a478/docs_Altus_Repo_Map.md)
assigns new ECC API/proxy work to `AltusDD/empirecommandcenter-backend` and
DoorLoop ingestion/normalization/KPI work to `doorloop-sync-backend`. ECC retains
its frontend and existing local adapter responsibilities. This is repository
ownership evidence, not proof that any current Azure app runs that source.

Claude's A4 packet supplied a production package manifest: 44 paths, 4,078 bytes,
LF line endings. The preserved [manifest](backend-provenance/production-manifest.sha256)
has SHA-256 `91ede2b9107d2a27c8ef67f1f7ddcf317205d077fc6e0575cc9ef6d367c5c4c5`.
The reported production package is 25,708 bytes, uploaded 2026-02-23, SHA-256
`97cc204b08ea3da65fcc121ee25d692aa3fd4d899ceb08f02b2f11086595aa6f`.
Package metadata and its extraction were reported by Claude; Codex did not download
or execute the deployed package. Codex independently reproduced the manifest hash.

Each manifest path was compared with the GitHub tree and blob content at backend
main `5a571f3bb7f9b314513d4c19f4dcb6821687a478`. Retrieved UTF-8 content was
checked against Git blob SHA-1 before calculating full SHA-256. The
[comparison record](backend-provenance/source-comparison.json) contains paths,
blob identities, hashes and results only; no operating records or credentials.

| Result | Files |
| --- | ---: |
| Exact content matches | 36 |
| Missing from this backend tree | 8 |
| Content mismatches | 0 |
| Retrieval errors | 0 |

The eight absent files are `function.json` and `__init__.py` under each of
`DashboardKpiSummary`, `OpsTasks`, `OpsWorkOrders` and `TriageQueue`. These four
directories were also absent in the earlier review of 35 reachable commit trees.
This is a partial source match, not a complete deployment commit identification.
The package appears to combine known source with unexplained additions; that is
an inference from the manifest comparison. Staging's active source remains unresolved.

Build marker `0f152893e49da7dc5184ee2f434cb17cf45c4cf2` identifies a DoorLoop
Node workflow change targeting `ecc-triage-node-staging`. A copied app setting
does not identify the Python package's source. Do not reactivate an anonymous
handler, deploy the unexplained package, or choose a backend URL from this marker.

## A4 report disposition

The following are Claude-reported Azure results, not independent cloud mutation
or certification by this source-only PR:

- Main-site Deny restrictions remain on the four previously contained hosts.
  SCM and FTP basic publishing authentication were disabled on triage and proxy;
  deployment-endpoint network rules were unchanged.
- The first legacy deployment principal lost subscription Contributor/Reader and
  its pull-request federation. Its existing production-site Website Contributor
  role and main-branch federation remain. Configuration was checked, but no
  authenticated-as-principal deployment/access probe was available. Deployment
  capability is therefore untested. The other five principals were untouched.
- `AppRequests` and `AppTraces` already retain 90 days, with oldest data around
  2026-07-20. Earlier exposure analysis covered only 30 days and must not be
  presented as a full retained-history review. Telemetry gaps also prevent a
  conclusion of no historic exposure.
- New HTTP/Front Door logging was proposed but not enabled. The triage request
  totals are unexplained; a 30-day metric spanning containment cannot establish
  internal traffic or safe business routes. Shared free ingestion allowances and
  estimated volumes are not a spending ceiling.

Control Plane remains parked. Draft PR155 is not a Dion-only bypass independent
of Control Plane, and its upstream fetch is not backend caller authentication.
No frontend-to-backend authenticated binding is claimed. The next backend slice
belongs in the existing backend owner, with verified identity and record scope;
the existing frontend adapter can be corrected independently without deployment.

## Validation and limits

The 44-line manifest byte length/hash and all expected per-path hashes were
checked against the comparison record; all result totals were reconciled. The
backend GitHub recursive tree was not truncated. This PR changes documentation
and hash metadata only. It changes no runtime, workflow, URL, authorization,
schema, operating data, Azure setting or logging. No cloud/provider/database
calls or deployment tests were performed for this PR. Rollback is removal of
these documentation files; it cannot undo the separately reported Azure changes.
