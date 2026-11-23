# GitHub Actions Workflow Guide

This guide documents the CI/CD workflows for the arolariu.ro monorepo. The [workflow definitions](../workflows/) own current triggers,
inputs, conditions, and retention settings.

## Workflow Overview

| Workflow                                                         | Trigger                                                                               | Purpose                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `official-website-build`                                         | Push to `preview` (website changes), manual                                           | Build and test main website                                        |
| `official-website-release`                                       | After a successful `preview` build (development only), manual                         | Deploy website to Azure                                            |
| `official-api-trigger`                                           | Push to `main` (API changes), manual                                                  | Build, test, and deploy API                                        |
| `official-cv-trigger`                                            | Push to `main` (CV changes), manual                                                   | Test and package CV; deploy on Azure runs                          |
| `official-docs-trigger`                                          | Push to `main`, manual                                                                | Generate and deploy docs                                           |
| `official-exp-trigger`                                           | Push to `main` (exp changes), manual                                                  | Lint, security-scan, test, build, and deploy the exp service       |
| `official-status-trigger`                                        | Push to `main` (status changes), manual                                               | Test and package status; deploy on Azure runs                      |
| `official-status-probe`                                          | Every 30 minutes (:09 and :39 UTC), manual                                            | Probe services and commit results to the `status-data` branch      |
| `official-components-publish`                                    | Push of a `components-v*` tag, manual (`dry-run`, `tag`)                              | Validate and publish `@arolariu/components` to npm with provenance |
| `official-hygiene-check-v2` (shown as "Code Hygiene Check (v3)") | Pull requests (opened, synchronize, reopened), manual (`scope`: `affected` or `full`) | Plan-driven format, lint, test, and stats checks with a gate       |
| `official-e2e-action`                                            | Daily at 06:17 UTC, manual                                                            | Live Newman checks                                                 |
| `copilot-setup-steps` (shown as "Copilot Setup Steps")           | Push that changes the workflow file, manual                                           | Prepare the Copilot coding agent environment                       |

## Decision Tree: Which Workflow to Use

```
Need to deploy something?
├── Main website (arolariu.ro)?
│   └── Use: official-website-build (environment: production), then official-website-release (manual dispatch)
│       The automatic release after a preview build deploys development only.
├── API (api.arolariu.ro)?
│   └── Use: official-api-trigger (manual dispatch)
├── CV site (cv.arolariu.ro)?
│   └── Use: official-cv-trigger (manual dispatch)
├── Experimental service (exp.arolariu.ro)?
│   └── Use: official-exp-trigger (manual dispatch)
├── Status site (status.arolariu.ro)?
│   └── Use: official-status-trigger (manual dispatch)
├── @arolariu/components npm package?
│   └── Use: official-components-publish (components-v* tag or manual dispatch; dry-run available)
└── Documentation (docs.arolariu.ro)?
    └── Use: official-docs-trigger (manual dispatch)

Need to run tests?
├── Unit/integration tests on PR?
│   └── Automatic: official-hygiene-check-v2 ("Code Hygiene Check (v3)")
├── E2E tests against production?
│   └── Use: official-e2e-action (manual dispatch)
└── Website checks without deploying?
    └── Use: npm run test:website locally; official-website-build pushes an image to ACR
```

## Manual Trigger Instructions

For workflows with a manual entrypoint, use the GitHub UI:

1. Go to **Actions** tab in the repository
2. Select the workflow from the left sidebar
3. Click **Run workflow** button
4. Select branch and fill in any inputs
5. Click **Run workflow**

Selecting a feature or `preview` branch does not make a dispatch a dry run. Verify the target and side effects in the workflow header before
dispatching: deployment jobs can update live services, the status probe writes `status-data`, and live E2E can file issues.

### Common Manual Triggers

**Deploy website to production:**

```
1. Workflow: official-website-build
   Inputs:
     - environment: production
     - infrastructure: azure
     - container_name: frontend/arolariu
2. After it succeeds, from the same branch and commit:
   Workflow: official-website-release
   Inputs:
     - environment: production
     - container_name: frontend/arolariu
```

A production release deploys `frontend/arolariu:<commit SHA>`, which only a production build of that commit pushes; every other build pushes
`:latest`. The automatic release after a `preview` build has no inputs, so it always deploys `frontend/dev.arolariu:latest` to the
development app.

**Deploy API, CV, status, or EXP from a selected revision:**

```
Workflow: official-api-trigger (or official-cv-trigger, official-status-trigger, official-exp-trigger)
Ref: main
Inputs:
  - commit_sha: optional, full 40-character commit SHA reachable from main
  - other inputs: see the selected workflow
```

Leave `commit_sha` empty to use the `main` commit that triggered the dispatch. Tests and builds use the same validated revision, including
its local actions and scripts. Older revisions without the required setup inputs fail rather than mixing revisions. With
`infrastructure: azure` (the default), API and EXP deploy the image pushed by that manual run. Rebuilding an older commit is not a
byte-for-byte rollback; build inputs may have changed.

CV and status keep their existing single-pending Azure deployment queues. A manual Azure dispatch can replace a pending Azure run before its
SHA is validated; avoid dispatching in Azure mode while a deployment is queued. LOCAL runs use separate concurrency groups.

**Build CV or status without deploying:** Dispatch `official-cv-trigger` or `official-status-trigger` from `main` with
`infrastructure: local` and an optional `commit_sha`. The independent `test` job gates both builds. With LOCAL, `environment` is ignored;
the workflow uploads a build archive with no Azure deployment. `azure` is the default for dispatch and for pushes; `deploy-azure` verifies
and deploys the exact archive from `build-azure` without rebuilding.

Download and unzip the `<site>-local-site-<sha>-<attempt>` artifact within seven days. For CV, run `sha256sum --check cv-site.tar.gz.sha256`
then `tar -xzf cv-site.tar.gz` in a fresh directory. Substitute `status` for `cv` for the status site. `static/` contains the prerendered
site and Static Web Apps configuration. CV also includes its managed Function in `server/`; status only includes `server/` when it builds an
API. Serving the static files does not start the Function, and the status site may still request public status data.

**Build an API or EXP image without Azure:** Dispatch `official-api-trigger` or `official-exp-trigger` from `main` with
`infrastructure: local` and, optionally, `commit_sha`. The `environment` input is ignored. The runner tests the selected source, builds the
image, and uploads a Docker archive instead of pushing or deploying. No Azure credentials or services are used; public base-image and
dependency downloads and GitHub artifact upload still require network access.

Download and unzip the `api-local-image-<sha>-<attempt>` or `exp-local-image-<sha>-<attempt>` Actions artifact within seven days. For API,
verify and load it with the following commands; substitute `exp` for `api` for the EXP image:

```bash
sha256sum --check arolariu-api-local.tar.gz.sha256
docker load -i arolariu-api-local.tar.gz
```

The loaded tag is `arolariu-api-local:<sha>` or `arolariu-exp-local:<sha>` with `INFRA=local`. Loading an image does not start it. Use the
[local environment runbook](../../infra/Local/readme.md) for EXP configuration and the API's supporting services.

**Dry-run components publishing:** Select `official-components-publish`, use an unpublished package version, and enable `dry-run`. The
workflow builds, packs, and tests once. Both dry run and real publish consume the same verified tarball from the validation job. If it has
expired, rerun validation rather than rebuilding in the publish job.

**Run E2E tests:**

```
Workflow: official-e2e-action
Inputs:
  - targets: all (default), frontend, backend, or cv
  - strict_mode: false (default); true enables Newman --bail
```

## Debugging Failed Workflows

### 1. Check the Logs

1. Go to **Actions** tab
2. Click on the failed workflow run
3. Expand the failed job
4. Review step-by-step logs

### 2. Download Artifacts

These workflows upload artifacts for debugging:

- `official-website-build`: `test-report-<environment>-<run_id>` (website `code-cov/` output)
- `official-api-trigger`: `test-results-<run_id>` for Azure, or `api-local-test-results-<attempt>` and `api-local-image-<sha>-<attempt>` for
  LOCAL.
- `official-exp-trigger`: `exp-local-image-<sha>-<attempt>` for LOCAL.
- `official-cv-trigger` and `official-status-trigger`: `<site>-<local|azure>-site-<sha>-<attempt>` (prebuilt site archive and SHA-256).
- `official-e2e-action`: `e2e-reports-<target>` (Newman JSON, JUnit XML, and summary; run log; status and health files)
- `official-hygiene-check-v2`: `hygiene-plan`, `outcome-<provider>`, and `hygiene-report`

The other workflows upload no artifacts; use their job logs. Check each upload step for its retention period.

### 3. Common Issues

| Issue                       | Workflow      | Solution                                                                                                           |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Tests not running           | api-trigger   | Inspect test-job conditions and runner output                                                                      |
| PR comment duplicates       | hygiene-check | Inspect marker lookup and pagination in `.github/scripts/helpers/github/index.ts`                                  |
| Health check fails          | e2e-action    | Check if API is running at api.arolariu.ro                                                                         |
| Missing generated artifacts | website-build | Select the required generator from root `package.json`; for the license manifest, run `npm run generate:artifacts` |

`npm run generate` without task names deliberately generates nothing. Select the generator for the missing input; do not run
secret-dependent environment generation for an unrelated artifact failure.

### 4. Re-run Failed Jobs

1. Go to the failed workflow run
2. Click **Re-run failed jobs** or **Re-run all jobs**
3. Optionally enable debug logging

## Local Testing with ACT

You can test workflows locally using [ACT](https://github.com/nektos/act):

```bash
# Install ACT
brew install act  # macOS
# or
choco install act-cli  # Windows

# Run a workflow locally
act -W .github/workflows/official-hygiene-check-v2.yml

# Run with specific event
act pull_request -W .github/workflows/official-hygiene-check-v2.yml

# List available jobs
act -l
```

`act -l` lists the parsed job graph without running jobs. For execution, use an isolated runner and a non-deploying workflow or fixture
without live secrets. Local runs do not establish parity for GitHub-hosted caches, artifact transfers, environment approvals, or OIDC.

## Workflow Architecture

### Code Hygiene Check (PR Workflow)

```
┌──────────┐
│  detect  │──► preparePlan --scope (affected | full) ──► hygiene-plan artifact
└────┬─────┘
     │ provider matrix (fail-fast: false; unselected providers emit planned-skip outcomes)
     ▼
┌────────┬──────┬─────────────────┬─────────────┬─────────────┬───────┐
│ format │ lint │ test-typescript │ test-dotnet │ test-python │ stats │──► outcome-<provider> artifacts
└────┬───┴──────┴─────────────────┴─────────────┴─────────────┴───────┘
     │ (always runs)
     ▼
┌──────────┐
│   gate   │──► hygiene-report artifact, step summary, PR comment, hygiene/<provider> check runs
└──────────┘
```

The [hygiene pipeline contract](../scripts/README.md#hygiene-one-plan-six-named-jobs) owns plan, evidence, and gate semantics.

### Website Build & Release

```
┌─────────┐     ┌─────────┐
│  Test   │────►│  Build  │──► Smoke test image ──► Push to ACR
└─────────┘     └─────────┘
                     │
                     ▼ (workflow_run after a successful preview build; development only)
              ┌─────────┐
              │ Release │──► Deploy to Azure
              └─────────┘
```

A manual build can set `skip_tests` to skip the test phase; the build still runs. For a production release, follow the manual sequence in
[Common Manual Triggers](#common-manual-triggers).

## Environment Variables

Workflow-level environment variables; each workflow's `env:` block is authoritative:

| Variable       | Set by                                                                | Description                                                                                                    |
| -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `COMMIT_SHA`   | Website build and release; API, CV, docs, exp, and status deployments | Workflow event's commit SHA; its meaning depends on the trigger                                                |
| `INFRA`        | Website build, API, exp                                               | Infrastructure target (`local`/`azure`, default `azure`)                                                       |
| `SITE_ENV`     | Website build                                                         | `PRODUCTION` or `DEVELOPMENT` image build argument, passed with `SITE_NAME` and `SITE_URL`                     |
| `NODE_VERSION` | Hygiene check, components publish                                     | Node.js version for jobs opting in via `node-install`; other Node jobs use the setup-workspace version default |
| `PRODUCTION`   | Website build and release                                             | `true` for production dispatches; only the `env` generator, which these workflows do not run, reads it         |

## Scheduled Workflows

| Workflow                | Schedule                          | Purpose                                                |
| ----------------------- | --------------------------------- | ------------------------------------------------------ |
| `official-e2e-action`   | Daily 06:17 UTC                   | Live Newman checks                                     |
| `official-status-probe` | Every 30 minutes, :09 and :39 UTC | Probe services and commit status data to `status-data` |

## Dependabot Integration

[Dependabot configuration](../dependabot.yml) owns update labels, groups, and schedules. For failures, inspect the relevant hygiene
provider's output. Merge requirements depend on live repository rules, not this guide.

## Troubleshooting

### Tests Skipped Warning

If you see "Tests were skipped" warning in the build:

- Check if `skip_tests: true` was set intentionally
- Review the triggering commit/PR
- Ensure tests pass locally before skipping

### Artifact Retention

Retention is configured by each upload step. For critical debugging:

1. Download artifacts immediately
2. Save locally for longer retention
3. Consider increasing retention for release builds

## Related Documentation

- [Backend Instructions](./../instructions/backend.instructions.md)
- [Frontend Instructions](./../instructions/frontend.instructions.md)
- [Workflows Instructions](./../instructions/workflows.instructions.md)
- [TypeScript Standards](./../instructions/typescript.instructions.md)
