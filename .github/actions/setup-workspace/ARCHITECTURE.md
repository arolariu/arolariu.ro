# Setup Workspace Action - Architecture

## Overview

The `setup-workspace` action is a composite GitHub Action that consolidates common setup steps across all workflows in the arolariu.ro monorepo.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Actions Workflows                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Website    │  │     API      │  │   Hygiene    │   ...    │
│  │    Build     │  │   Trigger    │  │    Check     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                            ▼                                     │
│         ┌──────────────────────────────────────┐                │
│         │  .github/actions/setup-workspace     │                │
│         │         (Composite Action)           │                │
│         └──────────────────┬───────────────────┘                │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
            ▼                                 ▼
   ┌─────────────────┐              ┌─────────────────┐
   │   Node.js Setup │              │   .NET Setup    │
   │   + Caching     │              │   + Caching     │
   └─────────────────┘              └─────────────────┘
            │                                 │
            ▼                                 ▼
   ┌─────────────────┐              ┌─────────────────┐
   │ npm dependencies│              │  NuGet packages │
   │   Installation  │              │   Restoration   │
   └─────────────────┘              └─────────────────┘
            │
            ├─────────────────┬─────────────────┐
            ▼                 ▼                 ▼
   ┌────────────┐    ┌────────────┐   ┌────────────┐
   │   Azure    │    │ Playwright │   │   Custom   │
   │   Setup    │    │  Browsers  │   │  Commands  │
   └────────────┘    └────────────┘   └────────────┘
```

## Component Breakdown

### 1. Composite Action Core

**File:** `.github/actions/setup-workspace/action.yml`

```yaml
Inputs:
  ├─ node-version (default: '24')
  ├─ dotnet-version (optional)
  ├─ install-dependencies (default: 'true')
  ├─ cache-key-prefix (default: 'default')
  ├─ working-directory (default: '.')
  ├─ setup-azure (default: 'false')
  └─ playwright (default: 'false')

Outputs:
  ├─ node-cache-hit
  └─ dotnet-cache-hit

Steps:
  1. Setup Node.js (if requested)
  2. Cache Node.js dependencies
  3. Setup .NET (if requested)
  4. Cache .NET packages
  5. Install npm dependencies (if enabled)
  6. Setup Azure (if enabled)
  7. Install Playwright (if enabled)
```

### 2. Caching Strategy

```
Cache Hierarchy (Node.js):
┌─────────────────────────────────────────┐
│ Primary Key                             │
│ {os}-node-{prefix}-{hash(lock-files)}   │ ← Most specific
└─────────────────┬───────────────────────┘
                  │ Miss ↓
┌─────────────────────────────────────────┐
│ Restore Key 1                           │
│ {os}-node-{prefix}-                     │ ← Workflow-specific
└─────────────────┬───────────────────────┘
                  │ Miss ↓
┌─────────────────────────────────────────┐
│ Restore Key 2                           │
│ {os}-node-                              │ ← Cross-workflow fallback
└─────────────────────────────────────────┘

Cache Hierarchy (.NET):
┌─────────────────────────────────────────┐
│ Primary Key                             │
│ {os}-dotnet-{prefix}-{hash(proj-files)} │ ← Most specific
└─────────────────┬───────────────────────┘
                  │ Miss ↓
┌─────────────────────────────────────────┐
│ Restore Key 1                           │
│ {os}-dotnet-{prefix}-                   │ ← Workflow-specific
└─────────────────┬───────────────────────┘
                  │ Miss ↓
┌─────────────────────────────────────────┐
│ Restore Key 2                           │
│ {os}-dotnet-                            │ ← Cross-workflow fallback
└─────────────────────────────────────────┘
```

### 3. Workflow Integration Pattern

```yaml
Before (Manual Setup):
┌────────────────────────────────────────────┐
│ Job: build                                 │
├────────────────────────────────────────────┤
│ 1. Checkout code                           │
│ 2. Setup Node.js                           │
│ 3. (Maybe) Cache dependencies              │
│ 4. Install dependencies                    │
│ 5. (Maybe) Setup Azure                     │
│ 6. (Maybe) Install Playwright              │
│ 7. Run actual job steps...                 │
└────────────────────────────────────────────┘
   ↓ Lines: ~15-20 per job
   ↓ Inconsistent caching
   ↓ Duplicated across workflows

After (Using setup-workspace):
┌────────────────────────────────────────────┐
│ Job: build                                 │
├────────────────────────────────────────────┤
│ 1. Checkout code                           │
│ 2. Setup workspace (composite action)     │
│ 3. Run actual job steps...                 │
└────────────────────────────────────────────┘
   ↓ Lines: ~5-8 per job
   ↓ Consistent caching
   ↓ Reusable across workflows
```

## Data Flow

### Node.js Workflow Example

```
┌─────────────┐
│   Trigger   │
│  (push/PR)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Step 1: Checkout                        │
│   actions/checkout@v5                   │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Step 2: Setup Workspace                 │
│   .github/actions/setup-workspace       │
│                                         │
│   Inputs:                               │
│   - node-version: '24'                  │
│   - cache-key-prefix: 'website-build'   │
│   - setup-azure: 'true'                 │
│                                         │
│   Process:                              │
│   1. Setup Node.js 24                   │
│   2. Check cache for dependencies       │
│   3. Install if cache miss              │
│   4. Run Azure setup                    │
│                                         │
│   Output:                               │
│   - node-cache-hit: true/false          │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Step 3+: Actual Job Steps               │
│   - Build                               │
│   - Test                                │
│   - Deploy                              │
└─────────────────────────────────────────┘
```

### .NET Workflow Example

```
┌─────────────┐
│   Trigger   │
│  (push/PR)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Step 1: Checkout                        │
│   actions/checkout@v5                   │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Step 2: Setup Workspace                 │
│   .github/actions/setup-workspace       │
│                                         │
│   Inputs:                               │
│   - dotnet-version: '10.x'              │
│   - cache-key-prefix: 'api-build'       │
│   - install-dependencies: 'false'       │
│                                         │
│   Process:                              │
│   1. Setup .NET 10.x                    │
│   2. Check cache for NuGet packages     │
│   3. Skip npm install                   │
│                                         │
│   Output:                               │
│   - dotnet-cache-hit: true/false        │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Step 3+: Actual Job Steps               │
│   - dotnet restore                      │
│   - dotnet build                        │
│   - dotnet test                         │
└─────────────────────────────────────────┘
```

## Cache Management

### Cache Lifecycle

```
First Run (No Cache):
┌────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│ Setup  │ -> │ Install │ -> │  Store   │ -> │  Build  │
│ Action │    │  Deps   │    │  Cache   │    │   Job   │
└────────┘    └─────────┘    └──────────┘    └─────────┘
              (2-3 min)                       (Fast)

Subsequent Runs (Cache Hit):
┌────────┐    ┌─────────┐    ┌─────────┐
│ Setup  │ -> │ Restore │ -> │  Build  │
│ Action │    │  Cache  │    │   Job   │
└────────┘    └─────────┘    └─────────┘
              (10-20 sec)     (Fast)

Dependency Change (Cache Miss):
┌────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐
│ Setup  │ -> │ Install │ -> │  Update  │ -> │  Build  │
│ Action │    │  Deps   │    │  Cache   │    │   Job   │
└────────┘    └─────────┘    └──────────┘    └─────────┘
              (2-3 min)                       (Fast)
```

### Cache Key Examples

**Website Build:**
```
linux-node-website-build-abc123def456...
└─┬──┘ └┬─┘ └──────┬──────┘ └────┬────┘
  OS  Lang  Prefix      Hash(package-lock.json)
```

**API Build:**
```
linux-dotnet-api-build-789ghi012jkl...
└─┬──┘ └──┬──┘ └───┬───┘ └────┬────┘
  OS   Lang  Prefix    Hash(*.csproj, *.slnx)
```

**E2E Tests:**
```
linux-node-e2e-1234567890-mno456pqr...
└─┬──┘ └┬─┘ └─────┬──────┘ └────┬────┘
  OS  Lang  Run ID      Hash(package-lock.json)
```

## Error Handling

```
┌─────────────────────────────────────┐
│   Setup Workspace Action Starts     │
└───────────────┬─────────────────────┘
                │
       ┌────────┴────────┐
       │  Node.js Setup  │
       │    Required?    │
       └────────┬────────┘
                │
         ┌──────┴──────┐
         │ Yes         │ No
         ▼             ▼
   ┌──────────┐   ┌────────┐
   │  Setup   │   │  Skip  │
   │ Node.js  │   └────────┘
   └─────┬────┘
         │
    ┌────┴────┐
    │ Success?│
    └────┬────┘
         │
   ┌─────┴─────┐
   │ Yes       │ No
   ▼           ▼
┌────────┐  ┌────────┐
│Continue│  │ Fail   │
│        │  │ Action │
└───┬────┘  └────────┘
    │
    ▼
┌──────────────┐
│ Cache Check  │
└──────┬───────┘
       │
  ┌────┴────┐
  │ Hit?    │
  └────┬────┘
       │
  ┌────┴────┐
  │ Yes     │ No
  ▼         ▼
┌─────┐  ┌────────────┐
│Skip │  │  Install   │
│     │  │    Deps    │
└─────┘  └──────┬─────┘
                │
           ┌────┴────┐
           │Success? │
           └────┬────┘
                │
          ┌─────┴─────┐
          │ Yes       │ No
          ▼           ▼
       ┌──────┐    ┌──────┐
       │Output│    │ Fail │
       │Status│    │Action│
       └──────┘    └──────┘
```

## Performance Characteristics

### Time Savings

```
Job Execution Time Comparison:

Without Caching:
├─ Checkout: 5s
├─ Setup Node.js: 10s
├─ Install deps: 180s ← SLOW
├─ Build: 60s
└─ Total: 255s

With Caching (Hit):
├─ Checkout: 5s
├─ Setup workspace: 25s
│  ├─ Setup Node.js: 10s
│  └─ Restore cache: 15s ← FAST
├─ Build: 60s
└─ Total: 90s

Savings: 165s (65% faster)

With Caching (Miss):
├─ Checkout: 5s
├─ Setup workspace: 205s
│  ├─ Setup Node.js: 10s
│  ├─ Install deps: 180s
│  └─ Save cache: 15s
├─ Build: 60s
└─ Total: 270s

Overhead: 15s (6% slower, but next run will be 65% faster)
```

## Extension Points

The action is designed to be extended:

```yaml
# Current inputs
node-version: '24'
dotnet-version: '10.x'
cache-key-prefix: 'custom'
install-dependencies: 'true'
working-directory: '.'
setup-azure: 'false'
playwright: 'false'

# Future extension possibilities
# pnpm-version: '8'        # pnpm support
# python-version: '3.11'   # Python support
# rust-version: 'stable'   # Rust support
# cache-dependencies: 'true' # Toggle caching
# custom-commands: 'script' # Custom setup commands
```

## Maintenance

The action follows semantic versioning and can be updated centrally:

```
Version Updates:
┌─────────────────────────────────────┐
│ Update action.yml                   │
│ (e.g., change Node.js default)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ All workflows automatically use     │
│ the new version on next run         │
└─────────────────────────────────────┘

No changes needed in 14 workflow jobs!
```

## Related Documentation

- **Usage Guide:** `README.md`
- **Migration Guide:** `MIGRATION.md`
- **Changes Summary:** `CHANGES.md`
- **Workflows Instructions:** `../ ../instructions/workflows.instructions.md`
