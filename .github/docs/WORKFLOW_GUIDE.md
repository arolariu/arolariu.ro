# GitHub Actions Workflow Guide

This guide documents the CI/CD workflows for the arolariu.ro monorepo. The [workflow definitions](../workflows/) own current triggers,
inputs, conditions, and retention settings.

## Workflow Overview

| Workflow                                                         | Trigger                                                                               | Purpose                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `official-website-build`                                         | Push to `preview` (website changes), manual                                           | Build and test main website                                        |
| `official-website-release`                                       | After a successful `preview` build (development only), manual                         | Deploy website to Azure                                            |
| `official-api-trigger`                                           | Push to `main` (API changes), manual                                                  | Build, test, and deploy API                                        |
| `official-cv-trigger`                                            | Push to `main` (CV changes), manual                                                   | Build and deploy CV site                                           |
| `official-docs-trigger`                                          | Push to `main`, manual                                                                | Generate and deploy docs                                           |
| `official-exp-trigger`                                           | Push to `main` (exp changes), manual                                                  | Lint, security-scan, test, build, and deploy the exp service       |
| `official-status-trigger`                                        | Push to `main` (status changes), manual                                               | Test, build, and deploy the status site                            |
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
└── Website build tests?
    └── Use: official-website-build (manual dispatch)
```

## Manual Trigger Instructions

For workflows with a manual entrypoint, use the GitHub UI:

1. Go to **Actions** tab in the repository
2. Select the workflow from the left sidebar
3. Click **Run workflow** button
4. Select branch and fill in any inputs
5. Click **Run workflow**

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

**Deploy API:**

```
Workflow: official-api-trigger
Inputs:
  - environment: production
  - infrastructure: azure
```

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
- `official-api-trigger`: `test-results-<run_id>` (`sites/api.arolariu.ro/TestResults/`)
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

**Note:** Some workflows require secrets that won't be available locally.

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

| Variable       | Set by                                                                | Description                                                                                            |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `COMMIT_SHA`   | Website build and release; API, CV, docs, exp, and status deployments | Workflow event's commit SHA; its meaning depends on the trigger                                        |
| `INFRA`        | Website build, API, exp                                               | Infrastructure target (`local`/`azure`, default `azure`)                                               |
| `SITE_ENV`     | Website build                                                         | `PRODUCTION` or `DEVELOPMENT` image build argument, passed with `SITE_NAME` and `SITE_URL`             |
| `NODE_VERSION` | Hygiene check, components publish                                     | Node.js version passed to setup; other workflows use the setup-workspace default                       |
| `PRODUCTION`   | Website build and release                                             | `true` for production dispatches; only the `env` generator, which these workflows do not run, reads it |

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
