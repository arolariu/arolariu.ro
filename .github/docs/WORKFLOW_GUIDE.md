# GitHub Actions Workflow Guide

This guide documents the CI/CD workflows for the arolariu.ro monorepo.

## Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `official-website-build` | Push to `preview`, manual | Build and test main website |
| `official-website-release` | After build, manual | Deploy website to Azure |
| `official-api-trigger` | Push to `main` (API changes), manual | Build, test, and deploy API |
| `official-cv-trigger` | Push to `main` (CV changes), manual | Build and deploy CV site |
| `official-docs-trigger` | Push to `main`, manual | Generate and deploy docs |
| `official-hygiene-check-v2` | Pull requests | Code quality checks |
| `official-e2e-action` | Daily at 6 AM UTC, manual | End-to-end testing |

## Decision Tree: Which Workflow to Use

```
Need to deploy something?
├── Main website (arolariu.ro)?
│   └── Use: official-website-release (manual dispatch)
├── API (api.arolariu.ro)?
│   └── Use: official-api-trigger (manual dispatch)
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

All workflows support manual triggering via GitHub UI:

1. Go to **Actions** tab in the repository
2. Select the workflow from the left sidebar
3. Click **Run workflow** button
4. Select branch and fill in any inputs
5. Click **Run workflow**

### Common Manual Triggers

**Deploy website to production:**
```
Workflow: official-website-release
Inputs:
  - environment: production
  - container_name: frontend/arolariu
```

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
No inputs required
```

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

Artifacts are retained for 7 days.

### 3. Common Issues

| Issue | Workflow | Solution |
|-------|----------|----------|
| Container tag mismatch | website-release | Ensure environment is `production` (lowercase) |
| Tests not running | api-trigger | Check that test steps are uncommented |
| PR comment duplicates | hygiene-check | Fixed - comments now update in place |
| Health check fails | e2e-action | Check if API is running at api.arolariu.ro |
| Build fails | website-build | Run `npm run generate` locally first |

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
┌─────────┐     ┌─────────┐
│  Test   │────►│  Build  │──► Push to ACR
└─────────┘     └─────────┘
                     │
                     ▼ (workflow_run trigger)
              ┌─────────┐
              │ Release │──► Deploy to Azure
              └─────────┘
```

## Environment Variables

Common environment variables used across workflows:

| Variable | Description |
|----------|-------------|
| `NODE_VERSION` | Node.js version (24) |
| `COMMIT_SHA` | Current commit SHA |
| `PRODUCTION` | Boolean for production builds |
| `INFRA` | Infrastructure target (local/azure) |

## Scheduled Workflows

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `official-e2e-action` | Daily 6 AM UTC | Production health checks |

## Dependabot Integration

When Dependabot PRs fail hygiene checks:
- Automatic labels: `breaking-change`, `needs-review`
- Manual review required before merge

## Troubleshooting

### Tests Skipped Warning

If you see "Tests were skipped" warning in the build:
- Check if `skip_tests: true` was set intentionally
- Review the triggering commit/PR
- Ensure tests pass locally before skipping

### Artifact Retention

Artifacts are retained for 7 days by default. For critical debugging:
1. Download artifacts immediately
2. Save locally for longer retention
3. Consider increasing retention for release builds

## Related Documentation

- [Backend Instructions](./../instructions/backend.instructions.md)
- [Frontend Instructions](./../instructions/frontend.instructions.md)
- [Workflows Instructions](./../instructions/workflows.instructions.md)
- [TypeScript Standards](./../instructions/typescript.instructions.md)
