# RFC 0001: GitHub Actions Workflows - DevOps Architecture

- **Status**: Implemented
- **Date**: 2025-10-22
- **Authors**: arolariu
- **Related Components**: `.github/workflows/`, `.github/actions/setup-workspace`, `.github/actions/setup-runtime`

---

## Abstract

This RFC documents the DevOps architecture for the arolariu.ro monorepo using GitHub Actions. The system uses **build-release workflows**
for staged deployments, **trigger workflows** for direct build-and-deploy operations, validation workflows, and stateful scheduled jobs.
Build/test jobs generally reuse `setup-workspace`; release and other narrow jobs may not need repository bootstrap.

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
Build trigger (push/manual) → Test → Build → Validate
  → Release trigger (workflow_run/manual)
  → [Environment protection, if configured] → Deploy
```

**Characteristics:**

- Separate build and release workflows
- Build artifacts are validated before deployment
- Supports manual approval when the target GitHub Environment has live deployment-protection rules; YAML `environment:` alone is not a gate
- Suitable for high-risk deployments (currently website pipeline)

**Examples:**

- `official-website-build.yml` + `official-website-release.yml`

#### **Pattern 2: Trigger Workflows** (Direct Deployment)

```
Trigger (push/manual) → Test → Build → Deploy (all in one)
```

**Characteristics:**

- Single workflow handles build and deploy
- API, EXP, CV, and status use `build-azure` and `deploy-azure` for Azure. CV and status keep one `test` job for both modes; Azure deploys
  the verified build artifact, while LOCAL stops after `build-local` uploads it. Docs still uses one `build-and-deploy` job.
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

- `official-hygiene-check-v2.yml` (detect → format, lint, TypeScript/.NET/Python test, and stats providers → gate)
- `official-e2e-action.yml` (end-to-end testing)

### 2.2 Representative Workflow Families

This table illustrates each pattern; it is not a complete workflow inventory. Discover the current set from `.github/workflows/*.yml` before
planning or reviewing a change.

| Workflow                          | Pattern       | Trigger                  | Purpose                         |
| --------------------------------- | ------------- | ------------------------ | ------------------------------- |
| `official-website-build.yml`      | Build-Release | Push to preview + Manual | Build and test the website      |
| `official-website-release.yml`    | Build-Release | workflow run + Manual    | Deploy the website              |
| `official-api-trigger.yml`        | Trigger       | Push to main + Manual    | Build, test, and deploy the API |
| `official-cv-trigger.yml`         | Trigger       | Push to main + Manual    | Build and deploy the CV site    |
| `official-hygiene-check-v2.yml`   | Validation    | PR + Manual              | Lint, format, test, and report  |
| `official-e2e-action.yml`         | Validation    | Schedule + Manual        | Run end-to-end suites           |
| `official-components-publish.yml` | Trigger       | Version tag + Manual     | Publish the component library   |

---

## 3. Technical Design

### 3.1 Workspace Setup

Workflows call [`setup-workspace`](../../.github/actions/setup-workspace/readme.md) after checkout. It validates inputs before delegating
Node.js, .NET SDK, or Python provisioning to its internal `setup-runtime` composite. It then manages input-gated dependency installs,
Playwright browsers, code generation, and component builds. All setup operations are opt-in. Caching is enabled by default for opted-in
operations only. For runtime-only jobs, enable just the required toolchains; no workflow calls `setup-runtime` directly.

### 3.2 Caching Strategy

`setup-runtime` delegates language package-download caches to the upstream setup actions. `setup-workspace` separately caches the installed
npm tree and Playwright's browser binaries. See the
[cache inputs and behavior](../../.github/actions/setup-workspace/readme.md#caching-model).

**Why no fallback keys?** A fallback under a different lockfile or runtime key could restore dependencies for the wrong graph or native ABI.
Exact keys trade a first-run install for correctness. An npm tree archive hit must also pass the installed-file check before it can skip
`npm ci`. Playwright still installs OS libraries when its browser archive hits. GitHub cache visibility remains branch/tag scoped.

### 3.3 Workflow Structure Pattern

Workflows share this illustrative shape. Triggers, `concurrency`, `env`, and setup inputs differ per workflow, so read the live file before
editing:

```yaml
name: Descriptive Name

on:
  push:
    branches: [main] # project trigger workflows use [main]; official-website-build.yml uses [preview]
    paths: ["relevant/paths/**"]
  workflow_dispatch: # every workflow keeps a manual trigger

# Use a concurrency group appropriate to the workflow's side effects.
concurrency:
  group: <workflow-specific-group>
  cancel-in-progress: true

defaults:
  run:
    working-directory: ./sites/<project> # most project workflows run their steps inside the project

jobs:
  job-name:
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@<approved-commit-sha> # <release>

      - name: 🔐 Azure authentication (if needed)
        uses: azure/login@<approved-commit-sha> # <release>
        with:
          # ...

      - name: 🚀 Setup workspace
        uses: ./.github/actions/setup-workspace
        with:
          node-install: "true"
          node-deps-install: "true"
          workspace-generate: "true"
          workspace-generate-args: "artifacts" # only the generators the job needs
          # ... other inputs

      - name: 🏗️ Build
        run: npm run build # the project's script, via the default working directory

      - name: 🧪 Test
        run: npm run test # the project's script, via the default working directory

      - name: 🚀 Deploy (if trigger pattern)
        run: # deployment commands
```

---

## 4. Workflow Patterns Explained

### 4.1 Build-Release Pattern (Website)

**Build Workflow** (`official-website-build.yml`):

```
Trigger: Push to preview (+ manual dispatch)
├─ Job: test (skipped when dispatched with skip_tests)
│  ├─ Setup workspace (Node.js, Playwright, generate artifacts/gql/i18n)
│  ├─ TypeScript type-check (tsgo)
│  ├─ Run unit tests (Vitest) and E2E tests (Playwright)
│  └─ Upload test reports, publish the test-results comment, upload coverage to Codecov
└─ Job: build (needs test; runs when test succeeded or was skipped)
   ├─ Azure and ACR authentication
   ├─ Setup workspace (Node.js, generate artifacts/gql/i18n)
   ├─ Build Docker image
   ├─ Smoke-test the image runtime configuration
   └─ Push to Azure Container Registry (tag `latest`; commit SHA when dispatched for production)
```

**Release Workflow** (`official-website-release.yml`):

```
Trigger: workflow_run from official-website-build on preview (+ manual dispatch)
├─ Azure authentication
└─ Deploy container to Azure App Service
```

**Why separate workflows?**

- Build can be automated on every push
- Release can carry production environment protection independently of the build; whether approval is required is a live GitHub setting
- Enables testing in preview environment before production release

### 4.2 Trigger Pattern (API)

**API Trigger** (`official-api-trigger.yml`):

```
Trigger: Push to main (+ manual dispatch)
├─ Job: test
│  ├─ Setup workspace (Node.js, .NET restore, generate artifacts)
│  ├─ Run dotnet test (Release, XPlat Code Coverage collection)
│  └─ Upload the TestResults directory as an artifact
├─ Job: build (needs test)
   ├─ Setup workspace (Node.js, generate artifacts)
   ├─ Azure and ACR authentication
   ├─ Build Docker image (sites/api.arolariu.ro/Dockerfile runs dotnet restore/build/publish)
   └─ Push to Azure Container Registry
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
Trigger: PR (+ manual dispatch with scope: affected | full)
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
- ⚠️ **Con**: An npm tree check detects missing manifests, not modified package contents
- **Decision**: Prefer exact restoration now; separately harden manifest/lock consistency in an approved workflow change

**Composite Action:**

- ✅ **Pro**: Consistency and reusability
- ⚠️ **Con**: Changes affect all workflows
- **Decision**: Well-tested changes, clear documentation

**Build-Release Separation:**

- ✅ **Pro**: A dedicated release boundary where environment protection can be configured
- ⚠️ **Con**: Requires two workflows for website
- **Decision**: Worth it for critical production deployments; verify live environment rules before claiming an approval gate

---

## 6. Implementation Details

### 6.1 Cache Key Generation

The exact key expressions live in [`setup-workspace/action.yml`](../../.github/actions/setup-workspace/action.yml). The npm tree key uses
the resolved Node and npm versions, not the requested runtime range; manifest-only changes invalidate the key and force an install.

### 6.2 Progress Indicators

The composite action groups each enabled setup phase and writes a final duration log group. Its current final logging step reports the
`node_modules` and Playwright cache states; toolchain cache outputs remain available to callers but are not duplicated there. Read the live
step names and final logging step in `.github/actions/setup-workspace/action.yml` before documenting additional output.

### 6.3 Workspace Generation

**Feature:** `workspace-generate` runs `npm run generate <workspace-generate-args>` during workspace setup. The website build selects
`artifacts gql i18n` and hygiene selects `artifacts`. With generation enabled, omitting `workspace-generate-args` also runs the `env`
generator, which outside `INFRA=azure` reads `.env` and prompts for missing required keys.

**Use Case:** Jobs that need generated workspace artifacts (taxonomy and license artifacts, synchronized locale files) before they build or
test. The `gql` generator currently writes only a placeholder (`scripts/__generated__/gql/README.placeholder.txt`).

**Example:**

```yaml
- name: 🚀 Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-install: "true"
    node-deps-install: "true"
    workspace-generate: "true"
    workspace-generate-args: "artifacts gql i18n" # only the generators the job needs

- name: 🏗️ Build website
  run: npm run build # Can now use the generated artifacts
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

- Exact lock-hash keys prevent fallback to a cache created for a different lock state.
- Shared un-prefixed keys allow workflows with the same OS/runtime/lock state to reuse an entry only when GitHub cache branch/tag scope and
  cache version make that entry accessible.
- Cache keys select artifacts; they do not authenticate cache contents or validate manifests on a cache hit.

**Limitations:**

- A contaminated entry can be reused by another workflow that resolves the same key and cache scope.
- `setup-workspace` skips `npm ci` on a `node_modules` hit, so that path does not independently validate dependencies.
- A cache hit is not a content integrity check; do not cache credentials or generated environment files.
- Treat GitHub cache permissions, workflow trust, and manifest/lock consistency as separate controls; the hash is not a poisoning boundary.

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
- ⚠️ Manifest/lock consistency is not yet validated before a cache hit is trusted; this remains an approved future workflow hardening
- ✅ Shared-cache reuse remains within the intended trust and key scope
- ✅ Clear progress indicators in logs
- ✅ Execution time within acceptable range

---

## 10. Related Documentation

### 10.1 Internal Documentation

- `.github/actions/setup-runtime/readme.md` - internal runtime responsibilities
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
- **Exact cache restoration**: No fallback across different lock hashes, with separately documented shared-cache and manifest-drift
  limitations
- **Developer experience**: Progress indicators and clear feedback
- **Flexibility**: Support for different deployment strategies

The system balances performance, correctness, and maintainability. Exact lock-hash matching prevents fallback to an older dependency graph,
but it is not an integrity boundary: shared-cache trust and manifest/lock consistency must be validated separately.
