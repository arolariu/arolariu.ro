# Migration Guide: Using setup-workspace Action

This document explains the changes made to consolidate workflow setup steps.

## What Changed?

### Before

Each workflow manually set up Node.js and/or .NET with inconsistent caching:

```yaml
- name: Installing Node.js...
  uses: actions/setup-node@v5
  with:
    node-version: 24
    cache: "npm"  # Sometimes present, sometimes not

- name: Install dependencies...
  run: npm ci

- name: Install Playwright...
  run: npx playwright install --with-deps
```

**Problems with the old approach:**
- ❌ Duplicated code across 7 workflow files
- ❌ Inconsistent caching strategies
- ❌ No standardized cache keys
- ❌ Difficult to maintain and update
- ❌ Some workflows had no caching at all

### After

All workflows now use a single, reusable composite action:

```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    setup-azure: 'true'
    playwright: 'true'
    cache-key-prefix: 'website-test'
```

**Benefits of the new approach:**
- ✅ Single source of truth for setup logic
- ✅ Intelligent hierarchical caching
- ✅ Consistent behavior across all workflows
- ✅ Easy to maintain and update
- ✅ Better performance with optimized cache keys
- ✅ Flexible and configurable per workflow

## Workflow-Specific Changes

### 1. official-website-build.yml

**Test Job (Before):**
```yaml
- name: Installing Node.js...
  uses: actions/setup-node@v5
  with:
    node-version: 24

- name: Installing dependencies...
  run: |
    npm ci
    npm setup:azure
    npm playwright install --with-deps
    npm generate
```

**Test Job (After):**
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    setup-azure: 'true'
    playwright: 'true'
    cache-key-prefix: 'website-test'
    working-directory: './sites/arolariu.ro'

- name: Generate additional files...
  run: npm generate
```

**Build Job (Before):**
```yaml
- name: Installing Node.js...
  uses: actions/setup-node@v5
  with:
    node-version: 24

- name: Installing dependencies...
  run: |
    corepack enable
    npm install --immutable
    npm run setup:azure
    npm run generate
```

**Build Job (After):**
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    setup-azure: 'true'
    cache-key-prefix: 'website-build'
    working-directory: './sites/arolariu.ro'

- name: Enable corepack and generate files...
  run: |
    corepack enable
    npm run generate
```

### 2. official-api-trigger.yml

**Before:**
```yaml
- name: Installing the .NET runtime...
  uses: actions/setup-dotnet@v5.0.0
  with:
    dotnet-version: "10.x"
```

**After:**
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    dotnet-version: '10.x'
    install-dependencies: 'false'
    cache-key-prefix: 'api-test'
```

**Benefits:**
- Added .NET package caching (previously none)
- Consistent cache key strategy
- Future-proof for adding Node.js if needed

### 3. official-hygiene-check.yml

**Before (4 separate jobs, each with):**
```yaml
- name: Setup Node.js environment
  uses: actions/setup-node@v5
  with:
    node-version: 24
    cache: "npm"

- name: Install dependencies
  run: npm ci --prefer-offline --no-audit
```

**After (4 separate jobs, each with):**
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    cache-key-prefix: 'hygiene-<job-name>'
```

**Benefits:**
- Each job has its own cache key for better isolation
- Eliminated duplicate install commands
- Consistent setup across all hygiene check jobs

### 4. official-e2e-action.yml

**Before (Setup Job):**
```yaml
- name: Installing Node.js...
  uses: actions/setup-node@v5
  with:
    node-version: 24
    cache: 'npm'

- name: Installing dependencies...
  run: npm ci

- name: Installing global dependencies...
  run: npm install -g newman

- name: Cache node_modules for reuse
  uses: actions/cache/save@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}-${{ github.run_id }}
```

**Before (Frontend/Backend Jobs):**
```yaml
- name: Installing Node.js...
  uses: actions/setup-node@v5
  with:
    node-version: 24

- name: Restore node_modules from cache
  uses: actions/cache/restore@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}-${{ github.run_id }}
```

**After (All Jobs):**
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    cache-key-prefix: 'e2e-${{ github.run_id }}'

- name: Installing global dependencies...
  run: npm install -g newman
```

**Benefits:**
- Simplified cache management (no manual save/restore)
- Consistent caching across all E2E jobs
- Still maintains per-run isolation with `github.run_id`

### 5. official-cv-trigger.yml

**Before:**
```yaml
- name: Installing Node.js...
  uses: actions/setup-node@v5
  with:
    node-version: 24

- name: Installing dependencies...
  run: |
    npm install
    npm run prepare
    npm run build
```

**After:**
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    cache-key-prefix: 'cv'
    working-directory: './sites/cv.arolariu.ro'

- name: Prepare and build...
  run: |
    npm run prepare
    npm run build
```

**Benefits:**
- Added caching (previously none)
- Scoped to cv.arolariu.ro working directory
- Consistent with other workflows

### 6. official-docs-trigger.yml

**Before:**
```yaml
- name: Installing the .NET runtime...
  uses: actions/setup-dotnet@v5
  with:
    dotnet-version: "10.x"
```

**After:**
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    dotnet-version: '10.x'
    install-dependencies: 'false'
    cache-key-prefix: 'docs'
```

**Benefits:**
- Added .NET package caching (previously none)
- Consistent with other workflows
- Prepared for future needs

## Cache Key Strategy

The new action uses a hierarchical cache key strategy:

### Node.js Cache Keys
```
Primary: {os}-node-{prefix}-{hash(package-lock.json)}
Fallback 1: {os}-node-{prefix}-
Fallback 2: {os}-node-
```

### .NET Cache Keys
```
Primary: {os}-dotnet-{prefix}-{hash(*.csproj, *.slnx)}
Fallback 1: {os}-dotnet-{prefix}-
Fallback 2: {os}-dotnet-
```

This ensures:
- ✅ Cache hits when dependencies haven't changed
- ✅ Workflow-specific caches with prefix
- ✅ Cross-workflow cache reuse as fallback
- ✅ OS-specific caches for compatibility

## Performance Impact

Expected improvements:
- **20-30% faster** workflow runs with cache hits
- **50-70% faster** for workflows that previously had no caching
- **Reduced GitHub Actions minutes** consumption
- **More consistent** build times

## Rollback Instructions

If you need to rollback to the old approach:

1. Revert the workflow changes:
   ```bash
   git revert <commit-hash>
   ```

2. Or manually restore the old setup steps from git history

## Questions?

See the main README at `.github/actions/setup-workspace/README.md` for more details.
