# RFC 0001: GitHub Actions Workflows - DevOps Architecture

- **Status**: Implemented
- **Date**: 2025-10-22
- **Authors**: arolariu
- **Related Components**: `.github/workflows/`, `.github/actions/setup-workspace`

---

## Abstract

This RFC documents the comprehensive DevOps architecture for the arolariu.ro monorepo using GitHub Actions. The system implements a structured approach to CI/CD with distinct workflow patterns: **build-release workflows** for staged deployments with validation gates, and **trigger workflows** for direct build-and-deploy operations. All workflows leverage a centralized composite action (`setup-workspace`) for consistent environment setup, intelligent caching, and enhanced developer experience.

---

## 1. Motivation

### 1.1 Problem Statement

Modern monorepo applications require sophisticated CI/CD pipelines that handle:

1. **Multiple deployment targets**: Website, API, CV site, documentation, each with different tech stacks
2. **Different deployment strategies**: Some need staged deployments (build → test → release), others need direct deployment
3. **Environment setup consistency**: Node.js, .NET, Azure, Playwright setup repeated across workflows
4. **Performance optimization**: Minimizing CI/CD execution time through intelligent caching
5. **Developer experience**: Clear feedback on what's happening during CI/CD runs

### 1.2 Design Goals

- **Standardization**: Consistent patterns across all workflows
- **Modularity**: Reusable components via composite actions
- **Performance**: Intelligent caching to minimize execution time
- **Clarity**: Clear workflow intent and execution feedback
- **Flexibility**: Support for different deployment strategies

---

## 2. DevOps Landscape Overview

### 2.1 Workflow Architecture

The arolariu.ro monorepo implements two primary workflow patterns:

#### **Pattern 1: Build-Release Workflows** (Staged Deployment)
```
Trigger (push/PR) → Build → Test → Validate → [Manual Approval] → Release → Deploy
```

**Characteristics:**
- Separate build and release workflows
- Build artifacts are validated before deployment
- Manual approval gates for production
- Suitable for high-risk deployments (currently website pipeline)

**Examples:**
- `official-website-build.yml` + `official-website-release.yml`

#### **Pattern 2: Trigger Workflows** (Direct Deployment)
```
Trigger (push/PR) → Build → Test → Deploy (all in one)
```

**Characteristics:**
- Single workflow handles build and deploy
- Faster feedback loop
- Suitable for lower-risk deployments (CV site, documentation)

**Examples:**
- `official-api-trigger.yml`
- `official-cv-trigger.yml`
- `official-docs-trigger.yml`

#### **Pattern 3: Validation Workflows** (Continuous Quality)
```
Trigger (push/PR) → Lint → Format → Test → Report
```

**Characteristics:**
- Focus on code quality and standards
- Run on every PR
- Parallel job execution for speed

**Examples:**
- `official-hygiene-check-v2.yml` (stats, format, lint, summary)
- `official-e2e-action.yml` (end-to-end testing)

### 2.2 Workflow Inventory

| Workflow | Pattern | Trigger | Purpose | Tech Stack |
|----------|---------|---------|---------|------------|
| `copilot-setup-steps.yml` | Setup | Workflow changes + Manual | Bootstrap Copilot coding agent workspace | Node.js 24, .NET 10 |
| `official-website-build.yml` | Build-Release | Push to preview + Manual | Build/test website and publish immutable image metadata | Node.js 24, Playwright, Docker Buildx |
| `official-website-release.yml` | Build-Release | workflow_run (preview) + Manual | Deploy website image digest or immutable commit tag | Azure App Service |
| `official-api-trigger.yml` | Trigger | Push to main/preview + Manual | Quality, image build, attestation, and API deploy | .NET 10, Docker Buildx, Azure |
| `official-exp-trigger.yml` | Trigger | Push to main/preview + Manual | Quality, image build, attestation, and experimental API deploy | Python 3.12, Docker Buildx, Azure |
| `official-cv-trigger.yml` | Trigger | Push to main | Build and deploy SvelteKit CV site via reusable SWA workflow | Node.js 24, Azure SWA |
| `official-status-trigger.yml` | Trigger | Push to main | Build and deploy SvelteKit status site via reusable SWA workflow | Node.js 24, Azure SWA |
| `official-docs-trigger.yml` | Trigger | Push to main | Assemble and deploy docs through reusable SWA workflow | Node.js 24, .NET 10, Python 3.12 |
| `official-status-probe.yml` | Data Publisher | Schedule, Manual | Probe live services and publish status-data branch | Node.js 24 |
| `official-hygiene-check-v2.yml` | Validation | PR + Manual | Code quality checks (format, lint, tests, stats) | Node.js 24, ESLint, Prettier |
| `official-e2e-action.yml` | Validation | Schedule, Manual | Live end-to-end target checks and failure issue updates | Node.js 24, Newman |
| `official-security-analysis.yml` | Security | PR, Push, Schedule, Manual | CodeQL, Dependency Review, Scorecard, workflow policy | CodeQL, Scorecard |
| `official-workflow-lint.yml` | Governance | PR, Push, Manual | Workflow inventory and policy validation | Node.js 24 |
| `official-components-publish.yml` | Publish | Tag push (`components-v*`) + Manual | Publish component library to npm with Trusted Publishing | Node.js 24, RSLib |
| `reusable-*.yml` | Reusable | `workflow_call` | Shared quality, container, and SWA primitives | Node.js, .NET, Python, Azure |

---

## 3. Technical Design

### 3.1 Composite Action: `setup-workspace`

**Purpose:** Centralized environment setup for all workflows

**Location:** `.github/actions/setup-workspace/`

**Features:**
- Node.js setup with version control
- .NET setup with version control
- Intelligent dependency caching (hash-based, no fallback)
- Playwright browser installation
- GraphQL artifact generation
- Progress indicators with emojis

**Inputs:**
```yaml
inputs:
  node-version:                    # Node.js version (default: '24')
  dotnet-version:                  # .NET SDK version (default: '10.0.x')
  install-node-dependencies:       # Toggle deterministic npm ci (default: 'true')
  install-dotnet-dependencies:     # Toggle dotnet restore (default: 'true')
  cache-key-prefix:                # Workflow-specific cache key (e.g., 'website', 'api')
  working-directory:               # Custom directory for npm commands (default: '.')
  playwright:                      # Install Playwright browsers (default: 'false')
  generate:                        # Run npm run generate (default: 'false')
```

**Outputs:**
```yaml
outputs:
  node-cache-hit:      # Whether Node.js cache was hit (true/false)
  dotnet-cache-hit:    # Whether .NET cache was hit (true/false)
```

### 3.2 Caching Strategy

**Philosophy:** Hash-based exact matching, no fallback keys, deterministic installs

#### **Node.js Caching**
```yaml
Cache Key: {os}-node-{workflow}-{hash(package-lock.json)}
Example: linux-node-website-a3f9b2c1d4e5...
```

**Behavior:**
- **Cache hit**: When `package-lock.json` hasn't changed and the npm package-manager cache can be reused
- **Cache miss**: When `package-lock.json` changes and the npm package-manager cache must be repopulated
- **Install**: `npm ci --prefer-offline --no-audit` runs on every dependency-enabled job, even on cache hit
- **Cached paths**: `~/.npm` only; `node_modules` is intentionally not cached
- **No fallback**: Ensures dependency changes cannot reuse stale package-manager cache entries through broad prefixes

#### **.NET Caching**
```yaml
Cache Key: {os}-dotnet-{workflow}-{hash(*.csproj, *.slnx, packages.lock.json)}
Example: linux-dotnet-api-b7e4c9a2f1d8...
```

**Behavior:**
- **Cache hit**: When project files and lock files haven't changed
- **Cache miss**: When any .csproj, .slnx, or packages.lock.json changes
- **No fallback**: Ensures fresh restoration when dependencies change

#### **Why No Fallback Keys?**

**Problem with fallback keys:**
```yaml
# DANGEROUS (old approach)
key: linux-node-website-{hash}
restore-keys: |
  linux-node-website-
  linux-node-
```

**Scenario that fails:**
1. Dev pushes feature → Cache created: `linux-node-website-hash123`
2. 3 days later, dev updates `package.json` (version bump)
3. BUT doesn't regenerate `package-lock.json` (edge case)
4. Workflow runs → Primary key misses
5. Fallback `linux-node-website-` hits old cache! ❌
6. Build fails with incompatible dependencies ❌

**Solution (current approach):**
```yaml
# SAFE (current approach)
key: linux-node-website-{hash}
path: ~/.npm
# NO restore-keys
```

**Benefits:**
- ✅ No stale cache reuse when lock files are out of sync
- ✅ Forces lockfile-verified `npm ci` installation on every run
- ✅ Prevents cache pollution between workflows
- ✅ Avoids persisting `node_modules`, which can contain platform-specific or lifecycle-script side effects
- ✅ Clear: cache hit = exact npm download cache match, cache miss = cache repopulation

**Trade-off:**
- More frequent package downloads when lock files change (but correct behavior)
- Slightly longer execution time than restoring a `node_modules` archive
- BUT: Guarantees correctness over speed

**When cache invalidates (as expected):**
a) Developer deploys new features without version bumps → **Cache HIT** (lock file unchanged)
b) Developer deploys new feature with version bump → Lock file regenerated → **Cache MISS** → Fresh install ✅
c) Developer only bumps versions → Lock file regenerated → **Cache MISS** → Fresh install ✅

**Key insight:** When PR merges, lock file hash ALWAYS changes if dependencies changed, guaranteeing fresh cache.

### 3.3 Workflow Structure Pattern

All workflows follow a consistent structure:

```yaml
name: Descriptive Name

on:
  push:
    branches: [main, preview]
    paths: ['relevant/paths/**']
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  job-name:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6
      
      - name: 🔐 Azure authentication (if needed)
        uses: azure/login@532459ea530d8321f2fb9bb10d1e0bcf23869a43 # v3
        with:
          # ...
      
      - name: 🚀 Setup workspace
        uses: ./.github/actions/setup-workspace
        with:
          node-version: '24'
          cache-key-prefix: 'workflow-name'
          # ... other inputs
      
      - name: 🏗️ Build
        run: npm run build
      
      - name: 🧪 Test
        run: npm run test
      
      - name: 🚀 Deploy (if trigger pattern)
        run: # deployment commands
```

---

## 4. Workflow Patterns Explained

### 4.1 Build-Release Pattern (Website)

**Build Workflow** (`official-website-build.yml`):
```
Trigger: Push to preview (+ manual dispatch)
├─ Job: test
│  ├─ Setup workspace (Node.js 24, Playwright, Generate)
│  ├─ Run tests
│  └─ Upload test results
└─ Job: build
   ├─ Setup workspace (Node.js 24, Playwright, Generate)
   ├─ Build and push Docker image with Docker Buildx
   ├─ Publish commit-SHA image tag only
   ├─ Attest image provenance
   └─ Upload website-image metadata artifact
```

**Release Workflow** (`official-website-release.yml`):
```
Trigger: workflow_run from official-website-build on preview (+ manual dispatch)
├─ Download website-image metadata artifact
├─ Verify metadata SHA matches workflow_run head SHA
├─ Deploy digest image to Azure App Service
└─ Fall back to immutable commit tag only when digest deployment is unsupported
```

**Why separate workflows?**
- Build can be automated on every push
- Release requires manual approval for production
- Enables testing in preview environment before production release
- Release uses the image digest produced by the build run instead of mutable tags

**Immutable website handoff:**
- Build workflow path filters include website code, shared components, root package locks, the frontend Dockerfile, and owned CI actions.
- Website images are tagged as `${{ github.sha }}` only; `latest` is not used for CI/CD handoff.
- The build workflow uploads `website-image.json` with image name, tag, digest, source run ID, and source SHA.
- Automatic release reads that artifact from the completed build run and verifies the artifact source SHA matches `workflow_run.head_sha`.
- Manual production releases require an explicit image tag; development manual releases may default to the dispatch commit SHA.

### 4.2 Trigger Pattern (API)

**API Trigger** (`official-api-trigger.yml`):
```
Trigger: Push to main (+ manual dispatch)
├─ Job: test
│  └─ Call reusable-dotnet-quality.yml
├─ Job: build
│  └─ Call reusable-container-build-push.yml
└─ Job: deploy
   └─ Deploy immutable digest/tag via azure-webapp-container-deploy
```

**Why single workflow?**
- API deployments are lower risk
- Faster feedback loop
- Preview environment for testing
- Direct path from build to deploy
- Container build and deploy details stay centralized in reusable workflow/action primitives

### 4.3 Validation Pattern (Hygiene)

**Hygiene Check** (`official-hygiene-check-v2.yml`):
```
Trigger: PR
├─ Job: setup (sequential)
│  ├─ Setup workspace (Node.js 24)
│  └─ Detect changed files
├─ Job: format (parallel)
│  ├─ Setup workspace (Node.js 24)
│  └─ Check code formatting → format-result.json
├─ Job: lint (parallel)
│  ├─ Setup workspace (Node.js 24)
│  └─ Run ESLint → lint-result.json
├─ Job: test (parallel)
│  ├─ Setup workspace (Node.js 24)
│  └─ Run unit tests → test-result.json
├─ Job: stats (parallel)
│  ├─ Setup workspace (Node.js 24)
│  └─ Run dependency stats → stats-result.json
└─ Job: summary (depends on above)
   ├─ Download all result artifacts
   └─ Generate rich PR comment
```

**Why parallel jobs?**
- Faster feedback (jobs run simultaneously)
- Independent validation checks
- Each job can potentially reuse cache from other jobs running in parallel
- Summary job aggregates results

### 4.4 Reusable Workflow and Composite Action Layers

Job orchestration lives in reusable `workflow_call` workflows; step mechanics live in local composite actions.

| Layer | Files | Responsibility |
|-------|-------|----------------|
| Reusable quality workflows | `reusable-node-quality.yml`, `reusable-dotnet-quality.yml`, `reusable-python-quality.yml` | Build/test/security primitives for project families |
| Reusable deployment workflows | `reusable-container-build-push.yml`, `reusable-static-webapp.yml` | Container image publication and SWA deployment orchestration |
| Composite setup/actions | `.github/actions/setup-workspace`, `.github/actions/setup-ci-scripts`, `.github/actions/azure-*`, `.github/actions/static-web-app-build-deploy` | Deterministic setup and reusable step mechanics |

External actions in all workflows and composite actions must be pinned to full 40-character commit SHAs with a readable version comment. Local actions and local reusable workflows remain path references.

---

## 5. Benefits & Trade-offs

### 5.1 Benefits

**For Developers:**
- ⚡ **Fast feedback**: Parallel job execution, intelligent caching
- 📊 **Clear visibility**: Progress indicators, emojis, grouped logs
- 🎯 **Consistent experience**: Same setup across all workflows
- 🐛 **Easier debugging**: Clear logs, cache hit/miss indicators

**For DevOps:**
- 🔧 **Centralized management**: Update setup logic once, applies everywhere
- 💰 **Cost reduction**: Efficient caching reduces GitHub Actions minutes
- 🔒 **Security**: Hash-based caching prevents stale dependency issues
- 📈 **Scalability**: Easy to add new workflows following established patterns

**For the Project:**
- 🎨 **DRY principles**: Eliminated ~150 lines of duplicate code
- 📖 **Maintainability**: Single source of truth for setup logic
- ✅ **Reliability**: No cache pollution, guaranteed fresh installations when needed
- 🚀 **Performance**: Cache hits when dependencies unchanged

### 5.2 Trade-offs

**Caching Strategy:**
- ✅ **Pro**: Guaranteed correctness (no stale caches)
- ⚠️ **Con**: No fallback means every dependency change = cache miss
- **Decision**: Correctness over speed (prevents mysterious build failures)

**Composite Action:**
- ✅ **Pro**: Consistency and reusability
- ⚠️ **Con**: Changes affect all workflows
- **Decision**: Well-tested changes, clear documentation

**Build-Release Separation:**
- ✅ **Pro**: Manual approval gates for production
- ⚠️ **Con**: Requires two workflows for website
- **Decision**: Worth it for critical production deployments

---

## 6. Implementation Details

### 6.1 Cache Key Generation

**Node.js:**
```yaml
key: ${{ runner.os }}-node-${{ inputs.cache-key-prefix }}-${{ hashFiles('**/package-lock.json') }}
```

**Components:**
- `${{ runner.os }}`: OS-specific (linux, windows, macos)
- `${{ inputs.cache-key-prefix }}`: Workflow identifier (website, api, hygiene, etc.)
- `${{ hashFiles('**/package-lock.json') }}`: SHA-256 hash of all package-lock.json files

**Example:**
```
linux-node-website-7f3e9a2c1b5d4...
linux-node-api-a1b2c3d4e5f6...
linux-node-hygiene-9e8d7c6b5a4...
```

### 6.2 Progress Indicators

The composite action provides clear visual feedback:

```
🚀 Starting workspace setup...
📦 Setup Node.js 24
💾 Cache npm package store
  ✅ npm package cache hit
  OR
  ⚠️ npm package cache miss
📥 Install Node.js dependencies
  ✅ npm ci completed successfully
📦 Setup .NET 10.0.x
💾 Cache .NET packages
  ✅ Using cached .NET packages (cache hit)
📥 Restore .NET dependencies
  ✅ .NET dependencies restored successfully
🎭 Install Playwright browsers
  ✅ Playwright browsers installed
🔨 Generate artifacts (GraphQL schemas, types, etc.)
  ✅ Artifacts generated successfully
✨ Workspace setup complete
📊 Summary:
  - Node.js cache hit: true
  - .NET cache hit: true
```

### 6.3 GraphQL Artifact Generation

**Feature:** The `generate` input runs `npm run generate` during workspace setup.

**Use Case:** Websites with GraphQL schemas that need to be compiled before build.

**Example:**
```yaml
- name: 🚀 Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    generate: 'true'  # Generates GraphQL types, schemas, etc.
    cache-key-prefix: 'website'

- name: 🏗️ Build website
  run: npm run build  # Can now use generated GraphQL types
```

**Benefits:**
- Generated artifacts persist in runner's disk
- Subsequent steps can use generated code
- No need for separate generation step
- Clear progress indicator

---

## 7. Future Enhancements

### 7.1 Potential Additions

1. **pnpm Support**: Add pnpm as an alternative to npm
2. **Cache Analytics**: Track cache hit rates across workflows
3. **Multi-stage Caching**: Layer caching for Docker builds
4. **Conditional Azure Auth**: More granular Azure setup control
5. **Performance Metrics**: Built-in performance tracking

### 7.2 Monitoring & Optimization

**Metrics to Track:**
- Cache hit rates per workflow
- Average execution time per job
- GitHub Actions minutes consumption
- Build failure rates

**Optimization Opportunities:**
- Adjust cache paths based on actual usage
- Implement selective caching for monorepo paths
- Add cache warming for frequently-used dependencies

---

## 8. Security Considerations

### 8.1 Cache Security

**Current Approach:**
- Hash-based keys prevent cache poisoning
- No cross-workflow cache sharing via fallback keys
- Workflow-scoped prefixes for isolation

**Benefits:**
- Malicious cached dependencies cannot spread between workflows
- Each workflow validates its own dependencies
- Clear cache invalidation when dependencies change

### 8.2 Secret Management

**Approach:**
- Azure App Service and ACR authentication via OIDC-backed GitHub Secrets
- Static Web Apps deployment tokens are an explicit exception because the SWA deploy action requires `azure_static_web_apps_api_token`; tokens must be GitHub Environment-scoped and isolated to SWA workflows
- No secrets in cache keys or logs
- Environment-specific secret scoping
- Artifact attestations are enabled for container images and npm publishing where supported

### 8.3 Workflow Policy Enforcement

The repository enforces workflow policy through `.github/scripts/src/runWorkflowPolicyCheck.ts` and `official-workflow-lint.yml`.

Policy rejects:
- External actions not pinned to full commit SHAs.
- Cache `restore-keys`.
- Top-level `permissions: write-all`.
- Unreviewed `pull_request_target`.
- Deployment workflows without GitHub Environments.
- Azure login workflows without `id-token: write`.
- Top-level `contents: write` outside the allowlisted `official-status-probe.yml` status-data publisher.

---

## 9. Testing & Validation

### 9.1 Workflow Testing

**Before Merge:**
- ✅ YAML syntax validation
- ✅ Composite action syntax validation
- ✅ Cache key generation logic
- ✅ All workflow paths reviewed
- ✅ `.github/scripts` tests pass
- ✅ Workflow inventory generation succeeds
- ✅ Workflow policy check passes

**After Merge:**
- ✅ Monitor first few workflow runs
- ✅ Verify cache behavior
- ✅ Track execution times
- ✅ Collect cache hit rate metrics

### 9.2 Success Criteria

- ✅ All workflows execute successfully
- ✅ Cache hits when dependencies unchanged
- ✅ Fresh installations when dependencies change
- ✅ No cross-workflow cache pollution
- ✅ Clear progress indicators in logs
- ✅ Execution time within acceptable range

---

## 10. Related Documentation

### 10.1 Internal Documentation
- `.github/actions/setup-workspace/README.md` - Composite action usage guide
- `.github/instructions/workflows.instructions.md` - Workflow development guidelines

### 10.2 External References
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Composite Actions](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)

---

## 11. Conclusion

The arolariu.ro GitHub Actions workflows implement a mature DevOps architecture with:

- **Clear patterns**: Build-release, trigger, and validation workflows
- **Centralized setup**: Composite action for consistency
- **Safe caching**: Hash-based only, no fallback to prevent stale cache issues
- **Developer experience**: Progress indicators and clear feedback
- **Flexibility**: Support for different deployment strategies

The system balances performance, correctness, and maintainability, prioritizing reliability over marginal speed gains. The hash-based caching strategy without fallback keys ensures that dependency updates always result in fresh installations, preventing subtle bugs from stale cached dependencies.
