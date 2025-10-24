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
- Suitable for critical applications (website, API)

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
- `official-hygiene-check.yml` (stats, format, lint, summary)
- `official-e2e-action.yml` (end-to-end testing)

### 2.2 Workflow Inventory

| Workflow | Pattern | Trigger | Purpose | Tech Stack |
|----------|---------|---------|---------|------------|
| `official-website-build.yml` | Build-Release | Push to main/preview | Build and test Next.js website | Node.js 24, Playwright |
| `official-website-release.yml` | Build-Release | Manual | Deploy website to Azure | Azure deployment |
| `official-api-trigger.yml` | Trigger | Push to main/preview | Build, test, and deploy .NET API | .NET 10, Azure |
| `official-cv-trigger.yml` | Trigger | Push to main | Build and deploy SvelteKit CV site | Node.js 24, Azure SWA |
| `official-docs-trigger.yml` | Trigger | Push to main | Generate and deploy DocFX docs | .NET 10, DocFX |
| `official-hygiene-check.yml` | Validation | PR, Push | Code quality checks (lint, format) | Node.js 24, ESLint, Prettier |
| `official-e2e-action.yml` | Validation | Schedule, Manual | End-to-end testing | Node.js 24, Playwright |

---

## 3. Technical Design

### 3.1 Composite Action: `setup-workspace`

**Purpose:** Centralized environment setup for all workflows

**Location:** `.github/actions/setup-workspace/`

**Features:**
- Node.js setup with version control
- .NET setup with version control
- Intelligent dependency caching (hash-based, no fallback)
- Azure authentication integration
- Playwright browser installation
- GraphQL artifact generation
- Progress indicators with emojis

**Inputs:**
```yaml
inputs:
  node-version:                    # Node.js version (default: '24')
  dotnet-version:                  # .NET version (default: '10.x')
  install-node-dependencies:       # Toggle npm install (default: 'true')
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

**Philosophy:** Hash-based exact matching, no fallback keys

#### **Node.js Caching**
```yaml
Cache Key: {os}-node-{workflow}-{hash(package-lock.json)}
Example: linux-node-website-a3f9b2c1d4e5...
```

**Behavior:**
- **Cache hit**: When `package-lock.json` hasn't changed
- **Cache miss**: When `package-lock.json` changes (due to package updates)
- **No fallback**: Ensures fresh installation when dependencies change

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
# NO restore-keys
```

**Benefits:**
- ✅ No stale cache reuse when lock files are out of sync
- ✅ Forces fresh installation when dependencies change
- ✅ Prevents cache pollution between workflows
- ✅ Clear: cache hit = exact match, cache miss = fresh install

**Trade-off:**
- More frequent cache misses (but correct behavior)
- Slightly longer execution time on first run after dependency update
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
        uses: actions/checkout@v4
      
      - name: 🔐 Azure authentication (if needed)
        uses: azure/login@v2
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
Trigger: Push to main/preview
├─ Job: test
│  ├─ Setup workspace (Node.js 24, Playwright, Generate)
│  ├─ Run tests
│  └─ Upload test results
└─ Job: build
   ├─ Setup workspace (Node.js 24, Azure, Playwright, Generate)
   ├─ Build Docker image
   ├─ Push to Azure Container Registry
   └─ Tag with commit SHA
```

**Release Workflow** (`official-website-release.yml`):
```
Trigger: Manual (workflow_dispatch)
├─ Input: Environment (production/preview)
├─ Azure authentication
└─ Deploy container to Azure App Service
```

**Why separate workflows?**
- Build can be automated on every push
- Release requires manual approval for production
- Enables testing in preview environment before production release

### 4.2 Trigger Pattern (API)

**API Trigger** (`official-api-trigger.yml`):
```
Trigger: Push to main/preview
├─ Job: test
│  ├─ Setup workspace (.NET 10)
│  ├─ Run unit tests
│  └─ Report coverage
└─ Job: build-and-deploy
   ├─ Setup workspace (.NET 10)
   ├─ Build .NET application
   ├─ Publish artifacts
   ├─ Azure authentication
   └─ Deploy to Azure App Service
```

**Why single workflow?**
- API deployments are lower risk
- Faster feedback loop
- Preview environment for testing
- Direct path from build to deploy

### 4.3 Validation Pattern (Hygiene)

**Hygiene Check** (`official-hygiene-check.yml`):
```
Trigger: PR, Push to main/preview
├─ Job: stats (parallel)
│  ├─ Setup workspace (Node.js 24)
│  └─ Run dependency stats
├─ Job: format (parallel)
│  ├─ Setup workspace (Node.js 24)
│  └─ Check code formatting
├─ Job: lint (parallel)
│  ├─ Setup workspace (Node.js 24)
│  └─ Run ESLint
└─ Job: summary (depends on above)
   ├─ Setup workspace (Node.js 24)
   └─ Generate quality report
```

**Why parallel jobs?**
- Faster feedback (jobs run simultaneously)
- Independent validation checks
- Each job can potentially reuse cache from other jobs running in parallel
- Summary job aggregates results

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
💾 Cache Node.js dependencies
  ✅ Using cached Node.js dependencies (cache hit)
  OR
  ⚠️ Cache miss - installing dependencies...
📦 Setup .NET 10.x
💾 Cache .NET packages
  ✅ Using cached .NET packages (cache hit)
📥 Restore .NET dependencies
  ✅ .NET dependencies restored successfully
⚙️ Setup Azure configuration
  ✅ Azure configuration completed
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
- Azure credentials via GitHub Secrets
- OIDC for Azure authentication (where supported)
- No secrets in cache keys or logs
- Environment-specific secret scoping

---

## 9. Testing & Validation

### 9.1 Workflow Testing

**Before Merge:**
- ✅ YAML syntax validation
- ✅ Composite action syntax validation
- ✅ Cache key generation logic
- ✅ All workflow paths reviewed

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
