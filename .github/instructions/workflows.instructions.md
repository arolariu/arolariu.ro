---
applyTo: '.github/workflows/*.yml'
description: 'GitHub Actions workflow development guidelines for the arolariu.ro monorepo. Covers workflow patterns, composite actions, caching strategy, OIDC authentication, and deployment patterns.'
---

# GitHub Actions Workflow Development Guidelines

This document provides guidelines for developing and maintaining GitHub Actions workflows in the arolariu.ro monorepo. All workflows must follow established patterns documented in RFC 0001.

---

## TL;DR - Quick Reference

| Workflow | Purpose | Trigger | Pattern |
|----------|---------|---------|---------|
| `official-website-build.yml` | Build & test Next.js website | Push to main/preview | Build-Release |
| `official-website-release.yml` | Deploy website container | workflow_run (after build) | Build-Release |
| `official-api-trigger.yml` | Build, test & deploy .NET API | Push to main/preview | Trigger |
| `official-hygiene-check.yml` | Format, lint, test validation | PR, Push | Validation |
| `official-e2e-action.yml` | Newman E2E API tests | Manual, Schedule | E2E Testing |
| `official-cv-trigger.yml` | Deploy SvelteKit CV site | Push to main | Trigger |
| `official-docs-trigger.yml` | Deploy DocFX documentation | Push to main | Trigger |
| `official-components-publish.yml` | Publish npm package | Tag push, Manual | Publish |

**Key Patterns:**
- Use `setup-workspace` composite action for all workspace setup
- OIDC for Azure authentication - NO long-lived secrets
- Hash-based caching only - NO fallback keys (intentional)
- Progress emojis: 📥 🔐 🚀 🏗️ 🧪 ✅ ⚠️

---

## Architecture Overview

### Workflow Patterns

We use two primary workflow patterns (see RFC 0001):

#### Build-Release Pattern (Staged Deployment)

Used for: **Website deployments** (high-risk, requires validation gates)

```
official-website-build.yml          official-website-release.yml
┌─────────────────────────┐        ┌─────────────────────────┐
│ Trigger: Push main      │───────>│ Trigger: workflow_run   │
│                         │        │                         │
│ Job: test               │        │ Job: deploy             │
│  └─ Run Playwright/Jest │        │  └─ Pull container      │
│                         │        │  └─ Deploy to App Svc   │
│ Job: build              │        │                         │
│  └─ Docker build        │        │ Manual approval gate    │
│  └─ Push to ACR         │        │                         │
└─────────────────────────┘        └─────────────────────────┘
```

**Why separate?**
- Build can be automated on every push
- Release requires validation gate for production
- Enables testing in preview before production

#### Trigger Pattern (Direct Deployment)

Used for: **API, CV, Docs** (lower risk, faster feedback)

```
official-api-trigger.yml
┌─────────────────────────┐
│ Trigger: Push main      │
│                         │
│ Job: test               │
│  └─ Run xUnit tests     │
│                         │
│ Job: build-and-deploy   │
│  └─ Build .NET app      │
│  └─ Docker build/push   │
│  └─ Deploy to App Svc   │
└─────────────────────────┘
```

**Why combined?**
- Lower risk deployments
- Faster feedback loop
- Preview environment validates changes

---

## Composite Action: setup-workspace

**Location:** `.github/actions/setup-workspace/action.yml`

All workflows MUST use this composite action for workspace setup. It ensures consistency across all CI/CD pipelines.

### Inputs

```yaml
inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '24'
  dotnet-version:
    description: '.NET SDK version'
    required: false
    default: '10.0.x'
  cache-key-prefix:
    description: 'Prefix for cache keys (workflow scope)'
    required: false
    default: 'default'
  setup-azure:
    description: 'Configure Azure CLI'
    required: false
    default: 'false'
  playwright:
    description: 'Install Playwright browsers'
    required: false
    default: 'false'
  generate:
    description: 'Run npm run generate (GraphQL, i18n, env)'
    required: false
    default: 'false'
```

### Outputs

```yaml
outputs:
  node-cache-hit:
    description: 'Whether Node.js dependencies were restored from cache'
  dotnet-cache-hit:
    description: 'Whether .NET packages were restored from cache'
```

### Usage Examples

**Website workflow (full setup):**
```yaml
- name: 🚀 Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    cache-key-prefix: 'website'
    setup-azure: 'true'
    playwright: 'true'
    generate: 'true'
```

**API workflow (.NET only):**
```yaml
- name: 🚀 Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: ''  # Skip Node.js
    dotnet-version: '10.0.x'
    cache-key-prefix: 'api'
    setup-azure: 'true'
```

**Hygiene workflow (Node.js only):**
```yaml
- name: 🚀 Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    dotnet-version: ''  # Skip .NET
    cache-key-prefix: 'hygiene'
```

---

## Caching Strategy

### Philosophy: Hash-Based Only, NO Fallback Keys

**This is intentional and documented in RFC 0001.**

```yaml
# ✅ CORRECT: Hash-based exact match only
key: ${{ runner.os }}-node-${{ inputs.cache-key-prefix }}-${{ hashFiles('**/package-lock.json') }}
# NO restore-keys!

# ❌ WRONG: Fallback keys enable stale cache issues
restore-keys: |
  ${{ runner.os }}-node-${{ inputs.cache-key-prefix }}-
  ${{ runner.os }}-node-
```

### Why No Fallback Keys?

From RFC 0001:
> "The 'restore-keys' approach that most projects use can cause stale dependency issues. When a developer adds a new package but the workflow uses a fallback cache from before that package was added, the build might fail or behave unexpectedly."

**Cache Invalidation Scenarios:**
| Scenario | Lock File | Cache Result | Outcome |
|----------|-----------|--------------|---------|
| No dependency changes | Unchanged | HIT ✅ | Fast build |
| New package added | Changed | MISS → Fresh install | Correct deps |
| Package version bump | Changed | MISS → Fresh install | Correct deps |
| Only code changes | Unchanged | HIT ✅ | Fast build |

### Cache Key Structure

```yaml
# Node.js cache key
${{ runner.os }}-node-${{ inputs.cache-key-prefix }}-${{ hashFiles('**/package-lock.json') }}
# Example: linux-node-website-7f3e9a2c1b5d4...

# .NET cache key  
${{ runner.os }}-dotnet-${{ inputs.cache-key-prefix }}-${{ hashFiles('**/*.csproj') }}
# Example: linux-dotnet-api-a1b2c3d4e5f6...
```

**Key Components:**
- `runner.os`: OS isolation (linux, windows, macos)
- `cache-key-prefix`: Workflow isolation (website, api, hygiene)
- `hashFiles()`: Content-based invalidation

---

## OIDC Authentication

### Azure OIDC Pattern

All workflows use OIDC for Azure authentication - **NO long-lived secrets**.

```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  deploy:
    steps:
      - name: 🔐 Azure authentication
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

**Why OIDC?**
- No secret rotation needed
- No long-lived credentials to leak
- Token scoped to specific workflow run
- Audit trail in Azure AD

### npm Trusted Publishing (Components)

The `official-components-publish.yml` uses npm Trusted Publishing:

```yaml
permissions:
  id-token: write      # OIDC for npm
  contents: read
  attestations: write  # Provenance attestations

- name: 🚀 Publish to npm
  run: npm publish --provenance --tag ${{ inputs.tag || 'latest' }} --access public
  # No NODE_AUTH_TOKEN needed - using Trusted Publishing
```

---

## Workflow Inventory

### 1. Website Build (`official-website-build.yml`)

**Purpose:** Build and test the Next.js website, push container to ACR

**Phases:**
1. **Test Phase**
   - Setup workspace with Playwright
   - Run `npm run test:website` (Vitest + Playwright)
   - Upload test results as artifacts

2. **Build Phase**
   - Setup workspace with Azure, generate
   - Build Docker image
   - Push to Azure Container Registry
   - Tag with commit SHA

**Key Configuration:**
```yaml
on:
  push:
    branches: [main, preview]
    paths:
      - 'sites/arolariu.ro/**'
      - 'packages/components/**'
      - 'package.json'
      - 'package-lock.json'
```

### 2. Website Release (`official-website-release.yml`)

**Purpose:** Deploy website container to Azure App Service

**Trigger:** `workflow_run` after website-build completes

**Key Feature:** Manual approval via GitHub Environment

```yaml
on:
  workflow_run:
    workflows: ["official-website-build"]
    types: [completed]
    branches: [main]

environment:
  name: production
  url: https://arolariu.ro
```

### 3. API Trigger (`official-api-trigger.yml`)

**Purpose:** Build, test, and deploy .NET API in single workflow

**Phases:**
1. **Test Phase**
   - Setup .NET 10
   - Run `dotnet test` with coverage
   - Upload coverage report

2. **Build Phase**
   - Build and publish .NET app
   - Docker build and push to ACR
   - Deploy to Azure App Service

**Key Configuration:**
```yaml
on:
  push:
    branches: [main, preview]
    paths:
      - 'sites/api.arolariu.ro/**'
      - 'infra/containers/Dockerfile.backend'
```

### 4. Hygiene Check (`official-hygiene-check.yml`)

**Purpose:** Code quality validation on PRs

**Parallel Jobs:**
- `stats`: Dependency statistics
- `format`: Prettier format check
- `lint`: ESLint validation
- `summary`: Aggregate results

**Concurrency:** Only one run per PR

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 5. E2E Action (`official-e2e-action.yml`)

**Purpose:** Run Newman E2E tests against deployed API

**Key Feature:** Automatic issue creation on failure

```yaml
- name: 🐛 Create issue on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: '🔴 E2E Tests Failed',
        body: '...',
        labels: ['bug', 'e2e-failure']
      });
```

### 6. CV Trigger (`official-cv-trigger.yml`)

**Purpose:** Deploy SvelteKit CV site to Azure Static Web Apps

**Target:** `https://cv.arolariu.ro`

### 7. Docs Trigger (`official-docs-trigger.yml`)

**Purpose:** Generate and deploy DocFX documentation

**Phases:**
1. Generate metadata from .NET projects
2. Build DocFX site
3. Deploy to Azure Static Web Apps

### 8. Components Publish (`official-components-publish.yml`)

**Purpose:** Publish `@arolariu/components` to npm

**Triggers:**
- Manual: `workflow_dispatch` with dry-run option
- Automatic: Tag push `components-v*`

**Features:**
- npm Trusted Publishing (OIDC)
- Provenance attestations
- Version validation (prevent duplicate publishes)
- Distribution tag selection (latest, beta, next, canary)

---

## Workflow Structure Template

All workflows should follow this structure:

```yaml
# =============================================================================
# Workflow Name - Brief Description
# =============================================================================
# Detailed explanation of what this workflow does
# 
# Features:
#   - Feature 1
#   - Feature 2
#
# Prerequisites:
#   - Required secrets
#   - Required infrastructure
# =============================================================================

name: "official-<name>-<action>"

permissions:
  id-token: write  # For OIDC
  contents: read   # Minimum required

on:
  push:
    branches: [main, preview]
    paths:
      - 'relevant/paths/**'

env:
  NODE_VERSION: '24'
  DOTNET_VERSION: '10.0.x'

jobs:
  job-name:
    name: 📋 Job Description
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4

      - name: 🔐 Azure authentication
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: 🚀 Setup workspace
        uses: ./.github/actions/setup-workspace
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache-key-prefix: 'workflow-name'

      - name: 🏗️ Build
        run: npm run build

      - name: 🧪 Test
        run: npm run test

      - name: ✅ Deploy
        run: # deployment commands
```

---

## Progress Indicators (Emoji Convention)

Use consistent emojis for visual feedback in logs:

| Emoji | Meaning | Usage |
|-------|---------|-------|
| 📥 | Download/Checkout | `📥 Checkout repository` |
| 🔐 | Authentication | `🔐 Azure authentication` |
| 🚀 | Setup/Launch | `🚀 Setup workspace` |
| 📦 | Package operations | `📦 Setup Node.js` |
| 💾 | Cache operations | `💾 Cache dependencies` |
| 🏗️ | Build | `🏗️ Build application` |
| 🧪 | Test | `🧪 Run tests` |
| ✅ | Success/Complete | `✅ Deployment successful` |
| ⚠️ | Warning | `⚠️ Cache miss` |
| ❌ | Error/Failure | `❌ Build failed` |
| 🐛 | Bug/Issue | `🐛 Create issue on failure` |
| 🔍 | Validation/Check | `🔍 Validate package` |
| 📋 | Info/List | `📋 Display package info` |
| 🛫 | Start/Begin | `🛫 Checkout repository` |

---

## Security Guidelines

### Secrets Management

**Required Secrets:**
```yaml
# Azure OIDC (all deployment workflows)
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID

# Container Registry
AZURE_ACR_NAME
AZURE_ACR_USERNAME
AZURE_ACR_PASSWORD

# App Service
AZURE_WEBSITE_APP_NAME
AZURE_API_APP_NAME

# Static Web Apps
AZURE_SWA_CV_TOKEN
AZURE_SWA_DOCS_TOKEN
```

**Security Rules:**
1. **Never hardcode secrets** - Use `${{ secrets.NAME }}`
2. **Use OIDC** - Prefer OIDC over long-lived credentials
3. **Scope permissions** - Request minimum required permissions
4. **Pin actions** - Use `@v4` tags, not `@main`
5. **Validate inputs** - Sanitize `workflow_dispatch` inputs

### Permission Patterns

```yaml
# Minimum permissions (default for all workflows)
permissions:
  contents: read

# OIDC authentication
permissions:
  id-token: write
  contents: read

# Create issues on failure
permissions:
  id-token: write
  contents: read
  issues: write

# npm publishing with provenance
permissions:
  id-token: write
  contents: read
  attestations: write
```

---

## Concurrency Control

### PR Validation (Cancel Redundant)

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Effect:** New pushes to the same PR cancel in-progress runs.

### Deployments (No Cancel)

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false
```

**Effect:** Deployments queue up, don't cancel in progress.

---

## Path-Based Triggering

### Monorepo Path Filters

```yaml
# Website workflow
paths:
  - 'sites/arolariu.ro/**'
  - 'packages/components/**'  # Shared dependency
  - 'package.json'
  - 'package-lock.json'

# API workflow
paths:
  - 'sites/api.arolariu.ro/**'
  - 'infra/containers/Dockerfile.backend'

# Hygiene workflow
paths:
  - '**/*.ts'
  - '**/*.tsx'
  - '**/*.js'
  - '**/*.jsx'
  - 'package.json'
  - 'eslint.config.ts'
  - 'prettier.config.ts'
```

### Path Ignore (Alternative)

```yaml
paths-ignore:
  - '**.md'
  - 'docs/**'
  - '.github/ISSUE_TEMPLATE/**'
```

---

## Testing in Workflows

### Unit Tests (Vitest)

```yaml
- name: 🧪 Run unit tests
  run: npm run test:unit
  env:
    CI: true

- name: 📊 Upload coverage
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
```

### E2E Tests (Playwright)

```yaml
- name: 🚀 Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    playwright: 'true'

- name: 🧪 Run E2E tests
  run: npm run test:e2e

- name: 📸 Upload test artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

### .NET Tests (xUnit)

```yaml
- name: 🧪 Run tests
  run: dotnet test --configuration Release --logger trx --collect:"XPlat Code Coverage"

- name: 📊 Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: TestResults/
```

---

## Deployment Patterns

### Container Deployment (App Service)

```yaml
- name: 🏗️ Build Docker image
  run: |
    docker build \
      -f infra/containers/Dockerfile.frontend \
      -t ${{ secrets.AZURE_ACR_NAME }}.azurecr.io/arolariu-website:${{ github.sha }} \
      .

- name: 📤 Push to ACR
  run: |
    docker push ${{ secrets.AZURE_ACR_NAME }}.azurecr.io/arolariu-website:${{ github.sha }}

- name: 🚀 Deploy to App Service
  uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ secrets.AZURE_WEBSITE_APP_NAME }}
    images: ${{ secrets.AZURE_ACR_NAME }}.azurecr.io/arolariu-website:${{ github.sha }}
```

### Static Deployment (Static Web Apps)

```yaml
- name: 🚀 Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN }}
    action: 'upload'
    app_location: 'build'
    skip_app_build: true
```

---

## Environment Configuration

### GitHub Environments

Use GitHub Environments for deployment approval gates:

```yaml
jobs:
  deploy-production:
    environment:
      name: production
      url: https://arolariu.ro
    runs-on: ubuntu-latest
    steps:
      # ... deployment steps
```

**Environment Settings (in GitHub):**
- Required reviewers for production
- Branch restrictions (only `main`)
- Environment-specific secrets

### Environment Variables

```yaml
env:
  # Global (workflow-level)
  NODE_VERSION: '24'
  DOTNET_VERSION: '10.0.x'

jobs:
  build:
    env:
      # Job-level
      CI: true
      NODE_ENV: production
    
    steps:
      - name: Build
        env:
          # Step-level
          NEXT_TELEMETRY_DISABLED: '1'
        run: npm run build
```

---

## Artifact Management

### Upload Artifacts

```yaml
- name: 📤 Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: |
      dist/
      !dist/**/*.map
    retention-days: 7
```

### Download Artifacts

```yaml
- name: 📥 Download build artifacts
  uses: actions/download-artifact@v4
  with:
    name: build-output
    path: dist/
```

### Cross-Job Artifact Passing

```yaml
jobs:
  build:
    outputs:
      artifact-id: ${{ steps.upload.outputs.artifact-id }}
    steps:
      - name: 📤 Upload artifact
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: app-build
          path: dist/

  deploy:
    needs: build
    steps:
      - name: 📥 Download artifact
        uses: actions/download-artifact@v4
        with:
          name: app-build
```

---

## Matrix Strategies

### Multi-Platform Testing

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: ['20', '22', '24']

runs-on: ${{ matrix.os }}
steps:
  - uses: ./.github/actions/setup-workspace
    with:
      node-version: ${{ matrix.node }}
```

### Project-Based Matrix (Monorepo)

```yaml
strategy:
  matrix:
    project:
      - name: website
        path: sites/arolariu.ro
        command: npm run build:website
      - name: cv
        path: sites/cv.arolariu.ro
        command: npm run build:cv

steps:
  - name: Build ${{ matrix.project.name }}
    working-directory: ${{ matrix.project.path }}
    run: ${{ matrix.project.command }}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Cache miss every run | Lock file changes | Check if lockfile is committed |
| OIDC auth fails | Wrong tenant/client ID | Verify Azure AD app registration |
| Path filter not triggering | Wrong glob pattern | Test pattern at [glob tester](https://globster.xyz/) |
| Concurrency not working | Missing `github.ref` | Include ref in group key |
| Action version mismatch | Using `@main` instead of tag | Pin to `@v4` |

### Debug Mode

Enable debug logging for troubleshooting:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Cache Debugging

```yaml
- name: 🔍 Debug cache
  run: |
    echo "Cache key: ${{ runner.os }}-node-${{ inputs.cache-key-prefix }}-${{ hashFiles('**/package-lock.json') }}"
    echo "Lock file hash: $(sha256sum package-lock.json)"
```

### Workflow Run Analysis

Use GitHub CLI to analyze workflow runs:

```bash
# List recent workflow runs
gh run list --workflow=official-website-build.yml

# View specific run details
gh run view <run-id>

# Download run logs
gh run download <run-id> --name logs
```

---

## Naming Conventions

### Workflow Files

```
official-<project>-<action>.yml

Examples:
- official-website-build.yml
- official-api-trigger.yml
- official-hygiene-check.yml
- official-e2e-action.yml
```

### Job Names

```yaml
jobs:
  test:
    name: 🧪 Run Tests
  
  build:
    name: 🏗️ Build Application
  
  deploy-staging:
    name: 🚀 Deploy to Staging
  
  deploy-production:
    name: 🎯 Deploy to Production
```

### Step Names

Use emoji prefix + descriptive action:
```yaml
- name: 📥 Checkout repository
- name: 🔐 Azure authentication
- name: 🚀 Setup workspace
- name: 🏗️ Build Docker image
- name: 🧪 Run unit tests
- name: ✅ Deploy to production
```

---

## Future Evolution

### Planned Enhancements (from RFC 0001)

1. **pnpm Support**: Add pnpm as alternative package manager
2. **Cache Analytics**: Track hit rates across workflows
3. **Performance Metrics**: Built-in execution time tracking
4. **Multi-stage Caching**: Docker layer caching optimization
5. **Conditional Azure Auth**: More granular setup control

### Metrics to Track

- Cache hit rates per workflow
- Average execution time per job
- GitHub Actions minutes consumption
- Build failure rates
- Deployment success rates

---

## References

### Internal Documentation

- **RFC 0001**: `docs/rfc/0001-github-actions-workflows.md` - Architecture decisions
- **Composite Action**: `.github/actions/setup-workspace/action.yml` - Implementation
- **Composite Action README**: `.github/actions/setup-workspace/README.md` - Usage guide

### External Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Composite Actions](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
- [Azure OIDC with GitHub](https://docs.microsoft.com/en-us/azure/developer/github/connect-from-azure)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers)

---

## Checklist for New Workflows

Before creating a new workflow, verify:

- [ ] Uses `setup-workspace` composite action
- [ ] Has proper OIDC authentication (no long-lived secrets)
- [ ] Uses hash-based caching (no fallback keys)
- [ ] Has appropriate path filters for monorepo
- [ ] Uses concurrency control where appropriate
- [ ] Has consistent emoji-prefixed step names
- [ ] Follows `official-<project>-<action>.yml` naming
- [ ] Includes header comment block explaining purpose
- [ ] Has minimum required permissions declared
- [ ] Uses pinned action versions (`@v4`, not `@main`)
- [ ] Uploads relevant artifacts for debugging
- [ ] Has appropriate environment configuration
