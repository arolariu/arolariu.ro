# Cutover runbook: docs.arolariu.ro-v2 → docs.arolariu.ro

Execute these steps as a single PR once the staging slot has been reviewed
and approved for production.

## Pre-cutover checklist
- [ ] Staging slot (`docs-preview.arolariu.ro` or equivalent) has been live for at least 7 days.
- [ ] All 4 doc instances render without broken links: monorepo prose, .NET internals, TypeScript reference, Python experimental.
- [ ] (Optional) .NET API interactive widget works — requires resolving the build-time OpenAPI extraction issue flagged in commit 46eae7f0 before cutover.
- [ ] Local search returns expected results for common queries.
- [ ] No build errors in the latest `official-docs-v2-trigger` workflow run.

## Cutover PR contents
1. Delete `sites/docs.arolariu.ro/` (legacy DocFX).
2. Rename `sites/docs.arolariu.ro-v2/` → `sites/docs.arolariu.ro/`.
3. Update `sites/docs.arolariu.ro/package.json` — change `"name": "@arolariu/docs-v2"` → `"@arolariu/docs"`.
4. Update `sites/docs.arolariu.ro/project.json` — change `"name": "@arolariu/docs-v2"` → `"@arolariu/docs"`.
5. In root `package.json`, rename scripts: `build:docs-v2` → `build:docs`, `dev:docs-v2` → `dev:docs`. Delete the legacy `build:docs` / `dev:docs` entries.
6. Update `scripts/docs-assemble.ts` — change `DOCS_V2_ROOT` constant to point at `sites/docs.arolariu.ro`.
7. Delete `.github/workflows/official-docs-trigger.yml` (legacy DocFX).
8. Rename `.github/workflows/official-docs-v2-trigger.yml` → `.github/workflows/official-docs-trigger.yml`.
9. In the renamed workflow, change the deploy step's `deployment_environment: staging` to `production` (or remove for default prod slot).
10. Update the renamed workflow's path filters: remove `sites/docs.arolariu.ro-v2` since the folder is now `sites/docs.arolariu.ro`.
11. Verify: `npm run build:docs` succeeds locally.

## Post-cutover monitoring
- [ ] Production deploy green.
- [ ] No 404s in Azure SWA logs for previously-working DocFX routes.
- [ ] Clarity traffic continues (project ID `hvhwmt03k3`).

## Open work predating cutover
- **.NET OpenAPI extraction** (see commit `46eae7f0`): `Microsoft.AspNetCore.OpenApi` source-generated interceptors do not emit a build-time spec. The app must be running for `dotnet-getdocument` to harvest the spec, but its startup depends on `ConfigProxyClient` reaching a live `exp.arolariu.ro`. Resolve by: making `ConfigProxyClient` offline-tolerant during `dotnet-getdocument` invocations, OR adding a CI step that runs the app and curls `/openapi/v1.json`, OR checking in a pre-generated `openapi.json` alongside the csproj.

## Rollback
If cutover fails, revert the cutover PR. Both codebases remain in git history during the deprecation window.

## Deprecation window
After 30 days of stable production, delete this `CUTOVER.md` file and close the loop.
