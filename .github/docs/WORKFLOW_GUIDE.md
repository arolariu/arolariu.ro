# GitHub Actions Workflow Guide

This guide documents the CI/CD workflows for the arolariu.ro monorepo.
The [workflow definitions](../workflows/) own current triggers, inputs,
conditions, and retention settings.

## Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `official-website-build` | Push to `preview` (website changes), manual | Validate, test, build, and call website release |
| `official-website-release` | Same-run reusable call from website build only | Deploy the exact built website image to Azure |
| `official-api-trigger` | Push to `main` (API changes), manual | Build, test, and deploy API |
| `official-exp-trigger` | Push to `main` (experimental changes), manual | Build, test, and deploy experimental service |
| `official-cv-trigger` | Push to `main` (CV changes), manual | Build and deploy CV site |
| `official-docs-trigger` | Push to `main`, manual | Generate and deploy docs |
| `official-hygiene-check-v2` | Pull requests | Code quality checks |
| `official-e2e-action` | Daily at 06:17 UTC, manual | Live Newman checks |

## Decision Tree: Which Workflow to Use

```
Need to deploy something?
├── Main website (arolariu.ro)?
│   └── Use: official-website-build (manual dispatch, includes release)
├── API (api.arolariu.ro)?
│   └── Use: official-api-trigger (manual dispatch)
├── Experimental service (exp.arolariu.ro)?
│   └── Use: official-exp-trigger (manual dispatch)
├── CV site (cv.arolariu.ro)?
│   └── Use: official-cv-trigger (manual dispatch)
└── Documentation (docs.arolariu.ro)?
    └── Use: official-docs-trigger (manual dispatch)

Need to run tests?
├── Unit/integration tests on PR?
│   └── Automatic: official-hygiene-check-v2
├── E2E tests against production?
│   └── Use: official-e2e-action (manual dispatch)
└── Website build tests?
    └── Use: official-website-build (manual dispatch)
```

## Manual Trigger Instructions

For workflows with a manual entrypoint, use the GitHub UI (the reusable website
release has no **Run workflow** button):

1. Go to **Actions** tab in the repository
2. Select the workflow from the left sidebar
3. Click **Run workflow** button
4. Use the native branch selector and fill in the workflow's inputs
5. Click **Run workflow**

### Common Manual Triggers

**Deploy website to production:**
```
Workflow: official-website-build
Branch: main
Inputs:
  - environment: production
  - commit_sha: (empty for the captured main revision, or a full older commit SHA)
```

**Deploy API:**
```
Workflow: official-api-trigger
Branch: main
Inputs:
  - commit_sha: (optional full older commit SHA)
```

**Deploy website development:**
```
Workflow: official-website-build
Branch: preview (or another repository branch containing the updated workflows)
Inputs:
  - environment: development
  - commit_sha: (optional full commit SHA in that branch's captured history)
```

**Deploy experimental service:**
```
Workflow: official-exp-trigger
Branch: main
Inputs:
  - commit_sha: (optional full older commit SHA)
```

**Run E2E tests:**
```
Workflow: official-e2e-action
Use the default target selection, or choose targets in the dispatch form.
```

### Git-selected Azure deployment contract

Website build, API, and experimental dispatches accept only an optional
`commit_sha` plus the website's required environment choice. There is no custom
branch input: the native **Run workflow** branch selector selects both the
captured event revision and the workflow definition. The selected branch must
contain the updated workflows to expose these inputs.

- Empty `commit_sha` uses the event's captured SHA, **not** a later branch tip.
- A supplied value must be a full 40-hex commit ID (case is normalized), and an
  ancestor of the selected branch's captured commit. Short IDs, tags, branch
  names, fork URLs, unrelated commits, unknown commits, and image references
  are rejected. A commit added after dispatch is not in the captured history.
- Every production dispatch must select `main`; older source must be in that
  captured `main` history. Website development may select another repository
  branch. Automatic website pushes still target development on `preview`;
  API/experimental pushes still target production on `main`. Existing service
  path filters are unchanged.
- Source validation uses a full-history, read-only checkout before Azure login.
  Every test/build checkout and `COMMIT_SHA` then uses its resolved output.
  Tests and builds must succeed: failed, cancelled, or skipped tests cannot
  authorize deployment. Website `skip_tests` is removed.
- These workflows are Azure-only. Website `container_name` and
  `infrastructure`, and API/experimental `environment` and `infrastructure`,
  are removed. Old dispatch payloads must be updated, not translated to a
  fallback target. There is no direct image/digest deployment mode.

| Service | Environment | Existing image repository | Existing App Service |
|---------|-------------|---------------------------|----------------------|
| Website | development | `frontend/dev.arolariu` | `dev-arolariu-ro` |
| Website | production | `frontend/arolariu` | `www-arolariu-ro` |
| API | production | `backend/api.arolariu` | `api-arolariu-ro` |
| Experimental | production | `exp/exp.arolariu` | `exp-arolariu-ro` |

The image tag is `<resolved-source-sha>-<build-run-id>-<build-run-attempt>`.
The build publishes and hands off the exact repository-and-tag only after
successful checks (including the website runtime smoke test). The registry
address remains the existing environment secret: including a masked registry
value in a cross-job output can cause GitHub to suppress that output. The
deployment applies that same registry binding to the passed image; it never
recalculates the tag from `latest`, the controller SHA, or a release retry's
attempt. An unavailable image stops deployment.

Website release is now a **same-run `workflow_call`**, not the former
`workflow_run` event chain or an independent manual release. The local
`uses: ./.github/workflows/official-website-release.yml` resolves the callee
definition from the caller's workflow commit, even when the application source
checkout is older. The caller passes validated environment/source and the exact
build output, with explicit named existing secret mappings (no blanket
inheritance). The callee owns the GitHub Environment; its environment secrets
take precedence. A required secret declaration checks that a mapping exists,
not that its value is nonempty, so the callee checks required values after
environment selection and before Azure authentication, without printing them.
Caller deployment rights are retained; a reusable workflow cannot elevate them.

Summaries distinguish source SHA from workflow-definition SHA and identify the
effective target and exact registry-relative image without secret values.
Experimental deployment also writes the resolved source to its `COMMIT_SHA`
App Service setting.

### Rollout and rollback checkpoints

Roll out or revert the website caller and callee **together**. Do not leave the
old automatic release trigger active alongside the reusable call. This is an
intentional change from RFC 0001's original cross-run website handoff.

Before any authorized live run, inspect the existing GitHub Environment
protection rules and identity bindings. YAML environment names alone do not
prove that approval gates or Azure permissions are configured. No resources,
identities, secrets, or live protection settings are changed by this package.
Local verification does not authorize a workflow dispatch or deployment.

Rollback means running the current workflow from `main` with a previous allowed
full Git SHA, repeating mandatory tests and build. An older source revision must
work with the current pipeline; failure is not permission to add toolchain
shims or switch revisions. There is no image-only fallback or automatic rollback.
Concurrency/release-ordering redesign is outside this change: overlapping runs
can still deploy in completion order.

## Debugging Failed Workflows

### 1. Check the Logs

1. Go to **Actions** tab
2. Click on the failed workflow run
3. Expand the failed job
4. Review step-by-step logs

### 2. Download Artifacts

Most workflows upload artifacts for debugging:
- Test results (`test-results-*`)
- Coverage reports
- Build logs

Check the upload step for each artifact's retention period.

### 3. Common Issues

| Issue | Workflow | Solution |
|-------|----------|----------|
| Source validation fails | website/API/experimental | Check the selected branch, full SHA, and captured ancestry; production must select `main` |
| Image handoff rejected | website-release/API/experimental | Inspect the successful build output and target; do not reconstruct a tag or select another image |
| Empty required deployment binding | website-release | Check the named caller secret mappings and selected environment secrets; do not print values |
| Tests not running | api-trigger | Inspect test-job conditions and runner output |
| PR comment duplicates | hygiene-check | Inspect marker lookup and pagination in `.github/scripts/helpers/github/index.ts` |
| Health check fails | e2e-action | Check if API is running at api.arolariu.ro |
| Missing generated artifacts | website-build | Select the required generator from root `package.json`; for the license manifest, run `npm run generate:artifacts` |

`npm run generate` without task names deliberately generates nothing. Use the
specific generator for the missing input; do not run secret-dependent environment
generation for an unrelated artifact failure.

### 4. Re-run Failed Jobs

1. Go to the failed workflow run
2. Click **Re-run failed jobs** or **Re-run all jobs**
3. Optionally enable debug logging

Re-running only deployment reuses the successful build's exact image output,
including its original attempt suffix. Re-running the build publishes a new
run-attempt tag. Neither operation changes the captured source SHA.

### Focused local workflow regressions

From the repository root, using already-installed dependencies:

```powershell
Set-Location .github\scripts
node node_modules\vitest\vitest.mjs run helpers\git\index.test.ts --reporter=dot
```

The existing Git test file parses the actual workflow YAML with the root
Prettier YAML parser, executes its embedded validation Bash against isolated
temporary Git histories, and uses command-boundary stubs for build/push/app
settings. Windows uses `C:\Program Files\Git\bin\bash.exe`. It never runs real
workflow cloud steps or authenticates. Do not use ACT to validate deployment
workflows with live secrets.

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
┌─────────┐
│  Setup  │──► Change detection
└────┬────┘
     │ (parallel)
     ├──────────┬──────────┬──────────┐
     ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Format  │ │  Lint   │ │  Test   │ │  Stats  │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │          │          │          │
     └──────────┴──────────┴──────────┘
                    │
                    ▼
              ┌─────────┐
              │ Summary │──► PR Comment
              └─────────┘
```

### Website Build & Release

```
┌──────────┐     ┌─────────┐     ┌─────────┐
│ Validate │────►│  Test   │────►│  Build  │──► Smoke test + push to ACR
└──────────┘     └─────────┘     └────┬────┘
                                    │ exact source / target / image
                                    ▼ (same-run workflow_call)
                              ┌─────────┐
                              │ Release │──► Existing GitHub Environment / Azure
                              └─────────┘
```

## Environment Variables

Common environment variables used across workflows:

| Variable | Description |
|----------|-------------|
| `NODE_VERSION` | Node.js version selected by the workflow |
| `COMMIT_SHA` | Validated source SHA for these Git-selected Azure deployments, not the workflow-definition SHA |
| `PRODUCTION` | Boolean for production builds |
| `INFRA` | Fixed `azure` for these cloud build/deployment paths; experimental unit tests retain isolated `local` mode |

## Scheduled Workflows

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `official-e2e-action` | Daily 06:17 UTC | Live Newman checks |

## Dependabot Integration

[Dependabot configuration](../dependabot.yml) owns update labels, groups, and
schedules. For a failing update, inspect the relevant hygiene provider's output.
Merge requirements depend on live repository rules, not this guide.

## Troubleshooting

### Failed or Skipped Tests

There is no test-skip input on the Git-selected website deployment path.
Fix the failing test/setup or start a valid run; a skipped test job cannot
authorize a build or release. API and experimental deployments have the same
mandatory successful-test dependency.

### Artifact Retention

Retention is configured by each artifact upload step. For critical debugging:
1. Download artifacts immediately
2. Save locally for longer retention
3. Consider increasing retention for release builds

## Related Documentation

- [Backend Instructions](./../instructions/backend.instructions.md)
- [Frontend Instructions](./../instructions/frontend.instructions.md)
- [Workflows Instructions](./../instructions/workflows.instructions.md)
- [TypeScript Standards](./../instructions/typescript.instructions.md)
