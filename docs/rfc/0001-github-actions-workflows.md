# RFC 0001: GitHub Actions Workflows - DevOps Architecture

- **Status**: Implemented
- **Date**: 2025-10-22
- **Authors**: arolariu
- **Related Components**: `.github/workflows/`, `.github/actions/setup-tooling`, `.github/actions/setup-workspace`

---

## Abstract

This RFC documents the DevOps architecture for the arolariu.ro monorepo using
GitHub Actions. The system uses **build-release workflows** for staged
deployments, **trigger workflows** for direct build-and-deploy operations,
validation workflows, and stateful scheduled jobs. Build/test jobs generally
reuse `setup-tooling` or `setup-workspace`; release, probe, and other narrow
jobs may not need repository bootstrap.

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

The arolariu.ro monorepo implements three primary workflow patterns:

#### **Pattern 1: Build-Release Workflows** (Staged Deployment)
```
Build trigger (push/manual) → Build → Test → Validate
  → Release trigger (workflow_run/manual)
  → [Environment protection, if configured] → Deploy
```

**Characteristics:**
- Separate build and release workflows
- Build artifacts are validated before deployment
- Supports manual approval when the target GitHub Environment has live
  deployment-protection rules; YAML `environment:` alone is not a gate
- Suitable for high-risk deployments (currently website pipeline)

**Examples:**
- `official-website-build.yml` + `official-website-release.yml`

#### **Pattern 2: Trigger Workflows** (Direct Deployment)
```
Trigger (push/manual) → Build → Test → Deploy (all in one)
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
PR/manual → Detect → Parallel quality providers → Gate/report
Schedule/manual → End-to-end tests → Failure reporting
```

**Characteristics:**
- Focus on code quality and standards
- Run on every PR
- Parallel job execution for speed

**Examples:**
- `official-hygiene-check-v2.yml` (stats, format, lint, summary)
- `official-e2e-action.yml` (end-to-end testing)

### 2.2 Representative Workflow Families

This table illustrates each pattern; it is not a complete workflow inventory.
Discover the current set from `.github/workflows/*.yml` before planning or
reviewing a change.

| Workflow | Pattern | Trigger | Purpose |
|----------|---------|---------|---------|
| `official-website-build.yml` | Build-Release | Push to preview + Manual | Build and test the website |
| `official-website-release.yml` | Build-Release | workflow run + Manual | Deploy the website |
| `official-api-trigger.yml` | Trigger | Push to main + Manual | Build, test, and deploy the API |
| `official-cv-trigger.yml` | Trigger | Push to main | Build and deploy the CV site |
| `official-hygiene-check-v2.yml` | Validation | PR + Manual | Lint, format, test, and report |
| `official-e2e-action.yml` | Validation | Schedule + Manual | Run end-to-end suites |
| `official-components-publish.yml` | Trigger | Version tag + Manual | Publish the component library |

---

## 3. Technical Design

### 3.1 Composite Actions: setup-tooling and setup-workspace

**Purpose:** Centralized environment setup for all workflows

**Location:** `.github/actions/setup-tooling/`, `.github/actions/setup-workspace/`

| Action | Responsibility |
|--------|----------------|
| `setup-tooling` | Installs Node.js / .NET / Python. Repo-agnostic. Caching is delegated to each `setup-*` action's built-in mechanism |
| `setup-workspace` | Invokes `setup-tooling`, then bootstraps the repo: `npm ci`, `dotnet restore`, `pip install`, Playwright, `npm run generate`, `npm run build:components` |

Use `setup-tooling` when a job needs only a binary. Use `setup-workspace` for everything else.

| Cache | Owner | Key |
|-------|-------|-----|
| `~/.npm`, `~/.nuget/packages`, pip | `setup-tooling` (built-in) | lock-file hashes |
| `node_modules` | `setup-workspace` | `<os>-node-modules-<node-version>-<hash(package-lock.json)>` |
| `~/.cache/ms-playwright` | `setup-workspace` | `<os>-playwright-<hash(package-lock.json)>` |

### 3.2 Caching Strategy

**Philosophy:** Hash-based exact matching, no fallback keys

#### **Toolchain Caches (setup-tooling)**

Toolchain caches (`~/.npm`, `~/.nuget/packages`, pip) are delegated entirely to each `actions/setup-*` action's built-in mechanism. The `setup-tooling` action configures each with a `cache-dependency-path` pointing at the relevant lock file:

| Toolchain | Action | `cache-dependency-path` |
|-----------|--------|------------------------|
| Node.js (npm download cache) | `actions/setup-node` (live pinned major) | `package-lock.json`, `.github/scripts/package-lock.json` |
| .NET (NuGet) | `actions/setup-dotnet` (live pinned major) | `**/packages.lock.json` |
| Python (pip) | `actions/setup-python` (live pinned major) | `sites/exp.arolariu.ro/requirements*.txt` |

The exact key strings are generated internally by each `setup-*` action; no per-workflow segment is added.

#### **Workspace Caches (setup-workspace)**

Workspace caches use explicit `actions/cache` steps pinned in the live
composite action. The key shapes below come from
`setup-workspace/action.yml`:

**node_modules:**
```yaml
key: ${{ runner.os }}-node-modules-${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}
```
Example: `linux-node-modules-<node-major>-a3f9b2c1d4e5...`

The Node version is part of the key because `node_modules` can contain
natively-compiled addons whose ABI is tied to the runtime. A cache hit skips
`npm ci`, so nothing would rebuild them — bumping Node must invalidate the
cache rather than restore binaries built for the previous runtime.

**Playwright browser bundle (`~/.cache/ms-playwright`):**
```yaml
key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
```
Example: `linux-playwright-b7e4c9a2f1d8...`

The Playwright key omits the Node version deliberately: the cached artifacts
are browser binaries, not Node addons, and the Playwright version that governs
them is already pinned by the lock file.

**Behavior (both caches):**
- **Cache hit**: When `package-lock.json` hasn't changed (and, for
  `node_modules`, the Node version is unchanged)
- **Cache miss**: When `package-lock.json` changes, or — for `node_modules` —
  when the Node version is bumped
- **No fallback**: Prevents a changed lock hash from restoring artifacts
  produced for an older lock state

#### **Why No Fallback Keys?**

**Problem with fallback keys:**
```yaml
# DANGEROUS (what we deliberately do NOT do)
key: ${{ runner.os }}-node-modules-${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}
restore-keys: |
  linux-node-modules-<node-major>-
  linux-node-modules-
```

Note the key itself is the current one — the hazard below comes entirely from
the `restore-keys` stanza, not from the key format.

**Scenario that fails:**
1. Dev pushes feature → Cache created:
   `linux-node-modules-<node-major>-hash123`
2. 3 days later, dev updates dependencies and regenerates
   `package-lock.json`
3. Workflow runs → The new lock hash makes the primary key miss
4. Fallback `linux-node-modules-<node-major>-` hits old cache! ❌
5. Build fails with incompatible dependencies ❌

**Solution (current approach):**
```yaml
# Exact-match current approach
key: ${{ runner.os }}-node-modules-${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}
# NO restore-keys
```

**Benefits:**
- ✅ No fallback to an older lock-file state
- ✅ Forces fresh installation when the lock hash changes
- ✅ Workflows can reuse an exact entry when GitHub cache scope and cache
  version make it accessible
- ✅ Clear: cache hit = exact match, cache miss = fresh install

**Trade-off:**
- More frequent cache misses (but correct behavior)
- Slightly longer execution time on first run after dependency update
- Correctness still depends on manifests and `package-lock.json` remaining
  synchronized

**When cache invalidates (as expected):**
a) Developer deploys new features without version bumps → **Cache HIT** (lock file unchanged)
b) Developer deploys new feature with version bump → Lock file regenerated → **Cache MISS** → Fresh install ✅
c) Developer only bumps versions → Lock file regenerated → **Cache MISS** → Fresh install ✅

**Known limitation:** the current key hashes only `package-lock.json`, and the
workflow skips `npm ci` on a cache hit. A manifest-only change therefore keeps
the same key and can reuse stale dependencies. Omitting fallback keys does not
solve that case. A future approved workflow change should hash the owning
manifests too or run an explicit lock-consistency check before trusting the
cache.

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
        uses: actions/checkout@<live-pinned-major>
      
      - name: 🔐 Azure authentication (if needed)
        uses: azure/login@<live-pinned-major>
        with:
          # ...
      
      - name: 🚀 Setup workspace
        uses: ./.github/actions/setup-workspace
        with:
          node-version: ${{ env.NODE_VERSION }}
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
│  ├─ Setup workspace (Node.js, Playwright, Generate)
│  ├─ Run tests
│  └─ Upload test results
└─ Job: build
   ├─ Setup workspace (Node.js, Playwright, Generate)
   ├─ Build Docker image
   ├─ Push to Azure Container Registry
   └─ Tag with commit SHA
```

**Release Workflow** (`official-website-release.yml`):
```
Trigger: workflow_run from official-website-build on preview (+ manual dispatch)
├─ Azure authentication
└─ Deploy container to Azure App Service
```

**Why separate workflows?**
- Build can be automated on every push
- Release can carry production environment protection independently of the
  build; whether approval is required is a live GitHub setting
- Enables testing in preview environment before production release

### 4.2 Trigger Pattern (API)

**API Trigger** (`official-api-trigger.yml`):
```
Trigger: Push to main (+ manual dispatch)
├─ Job: test
│  ├─ Setup workspace (.NET)
│  ├─ Run unit tests
│  └─ Report coverage
├─ Job: build (needs test)
   ├─ Setup workspace (.NET)
   ├─ Build .NET application
   ├─ Publish artifacts
   └─ Publish deployment artifact/image
└─ Job: deploy (needs build)
   ├─ Azure authentication
   └─ Deploy to Azure App Service
```

**Why single workflow?**
- API deployments are lower risk
- Faster feedback loop
- Preview environment for testing
- Direct path from build to deploy

### 4.3 Validation Pattern (Hygiene)

**Hygiene Check** (`official-hygiene-check-v2.yml`):
```
Trigger: PR
├─ Job: detect
│  └─ Classify the changed providers
├─ Job: providers (matrix, needs detect)
│  ├─ Provision only the required toolchains
│  ├─ Run the selected format/lint/test/stats provider
│  └─ Upload one provider outcome
└─ Job: gate (needs detect + providers)
   ├─ Download provider outcomes
   └─ Aggregate and enforce the final result
```

**Why parallel jobs?**
- Faster feedback (jobs run simultaneously)
- Independent validation checks
- Matrix entries provision only the toolchains they need
- The gate job aggregates provider outcomes

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
- 🔒 **Security**: Exact lock-hash keys prevent fallback to an older dependency graph
- 📈 **Scalability**: Easy to add new workflows following established patterns

**For the Project:**
- 🎨 **DRY principles**: Eliminated ~150 lines of duplicate code
- 📖 **Maintainability**: Single source of truth for setup logic
- ✅ **Reliability**: No cross-lock fallback; manifest/lock consistency remains an explicit requirement
- 🚀 **Performance**: Cache hits when dependencies unchanged

### 5.2 Trade-offs

**Caching Strategy:**
- ✅ **Pro**: No fallback across distinct lock-file states
- ⚠️ **Con**: No fallback means every dependency change = cache miss
- ⚠️ **Con**: The current lock-only key does not detect manifest-only drift
- **Decision**: Prefer exact restoration now; separately harden
  manifest/lock consistency in an approved workflow change

**Composite Action:**
- ✅ **Pro**: Consistency and reusability
- ⚠️ **Con**: Changes affect all workflows
- **Decision**: Well-tested changes, clear documentation

**Build-Release Separation:**
- ✅ **Pro**: A dedicated release boundary where environment protection can be configured
- ⚠️ **Con**: Requires two workflows for website
- **Decision**: Worth it for critical production deployments; verify live
  environment rules before claiming an approval gate

---

## 6. Implementation Details

### 6.1 Cache Key Generation

**Node.js (node_modules):**
```yaml
key: ${{ runner.os }}-node-modules-${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}
```

**Components:**
- `${{ runner.os }}`: OS-specific (linux, windows, macos)
- `${{ inputs.node-version }}`: guards against restoring native addons built for a different Node ABI
- `${{ hashFiles('package-lock.json') }}`: SHA-256 hash of the root `package-lock.json`

**Example:**
```
linux-node-modules-<node-major>-7f3e9a2c1b5d4...
```

### 6.2 Progress Indicators

The composite action provides clear visual feedback:

```
🚀 Starting workspace setup...
📦 Setup Node.js
💾 Cache Node.js dependencies
  ✅ Using cached Node.js dependencies (cache hit)
  OR
  ⚠️ Cache miss - installing dependencies...
📦 Setup .NET
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
    run-generate: 'true'  # Generates GraphQL types, schemas, etc.

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
- Exact lock-hash keys prevent fallback to a cache created for a different
  lock state.
- Shared un-prefixed keys allow workflows with the same OS/runtime/lock state
  to reuse an entry only when GitHub cache branch/tag scope and cache version
  make that entry accessible.
- Cache keys select artifacts; they do not authenticate cache contents or
  validate manifests on a cache hit.

**Limitations:**
- A contaminated entry can be reused by another workflow that resolves the
  same key and cache scope.
- `setup-workspace` skips `npm ci` on a `node_modules` hit, so that path does
  not independently validate dependencies.
- The current lock-only key does not detect a manifest-only change.
- Treat GitHub cache permissions, workflow trust, and manifest/lock
  consistency as separate controls; the hash is not a poisoning boundary.

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
- ✅ A changed lock hash does not fall back to an older cache
- ⚠️ Manifest/lock consistency is not yet validated before a cache hit is
  trusted; this remains an approved future workflow hardening
- ✅ Shared-cache reuse remains within the intended trust and key scope
- ✅ Clear progress indicators in logs
- ✅ Execution time within acceptable range

---

## 10. Related Documentation

### 10.1 Internal Documentation
- `.github/actions/setup-tooling/readme.md` - setup-tooling usage guide
- `.github/actions/setup-workspace/readme.md` - setup-workspace usage guide
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
- **Exact cache restoration**: No fallback across different lock hashes, with
  separately documented shared-cache and manifest-drift limitations
- **Developer experience**: Progress indicators and clear feedback
- **Flexibility**: Support for different deployment strategies

The system balances performance, correctness, and maintainability. Exact
lock-hash matching prevents fallback to an older dependency graph, but it is
not an integrity boundary: shared-cache trust and manifest/lock consistency
must be validated separately.
