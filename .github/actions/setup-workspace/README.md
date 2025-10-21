# Setup Workspace Action

A composite GitHub Action that sets up the Node.js and .NET development environment with optimized caching for the arolariu.ro monorepo.

## Features

- ✅ Sets up Node.js with configurable version
- ✅ Sets up .NET with configurable version (optional)
- ✅ Intelligent caching for npm and NuGet packages
- ✅ Automatic dependency installation
- ✅ Optional Azure setup integration
- ✅ Optional Playwright browser installation
- ✅ Customizable cache keys per workflow

## Usage

### Basic Node.js Setup

```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
```

### With .NET Support

```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    dotnet-version: '10.x'
```

### With Azure and Playwright

```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    setup-azure: 'true'
    playwright: 'true'
    generate: 'true'
    cache-key-prefix: 'website-build'
```

### Custom Working Directory

```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    working-directory: './sites/arolariu.ro'
    cache-key-prefix: 'website'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `node-version` | Node.js version to use | No | `24` |
| `dotnet-version` | .NET version to use (leave empty to skip) | No | `10.x` |
| `install-node-dependencies` | Whether to install npm dependencies | No | `true` |
| `install-dotnet-dependencies` | Whether to restore .NET dependencies | No | `true` |
| `cache-key-prefix` | Prefix for cache key customization | No | `default` |
| `working-directory` | Working directory for npm commands | No | `.` |
| `setup-azure` | Whether to run `npm setup:azure` | No | `false` |
| `playwright` | Whether to install Playwright browsers | No | `false` |
| `generate` | Whether to run `npm run generate` for GraphQL schemas and artifacts | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `node-cache-hit` | Whether there was a cache hit for Node.js dependencies |
| `dotnet-cache-hit` | Whether there was a cache hit for .NET packages |

## Cache Strategy

The action uses a hierarchical cache key structure:

### Node.js Cache
```
{os}-node-{prefix}-{hash(package-lock.json)}
```

Restore keys (in order):
1. `{os}-node-{prefix}-`
2. `{os}-node-`

### .NET Cache
```
{os}-dotnet-{prefix}-{hash(*.csproj, *.slnx)}
```

Restore keys (in order):
1. `{os}-dotnet-{prefix}-`
2. `{os}-dotnet-`

## Examples from Repository Workflows

### Website Build Workflow
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    setup-azure: 'true'
    playwright: 'true'
    cache-key-prefix: 'website'
```

### API Build Workflow
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    dotnet-version: '10.x'
    install-node-dependencies: 'false'
    install-dotnet-dependencies: 'true'
    cache-key-prefix: 'api'
```

### Hygiene Check Workflow
```yaml
- name: Setup workspace
  uses: ./.github/actions/setup-workspace
  with:
    node-version: '24'
    cache-key-prefix: 'hygiene'
```

## Benefits

1. **Consistency**: All workflows use the same setup logic
2. **Performance**: Intelligent caching reduces build times
3. **Maintainability**: Single source of truth for setup steps
4. **Flexibility**: Customizable for different workflow needs
5. **DRY Principle**: Eliminates code duplication across workflows
