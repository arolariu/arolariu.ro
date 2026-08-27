# Setup Tooling Action

Installs the language toolchains used across the arolariu.ro monorepo. This action is deliberately **repo-agnostic** — it installs binaries and nothing else.

For dependency installation, code generation, Playwright browsers, or the component build, use [`setup-workspace`](../setup-workspace/readme.md), which wraps this action.

## When to use which

| Need | Action |
|------|--------|
| Just a Node/.NET/Python binary | `setup-tooling` |
| Binaries **and** `npm ci` / `dotnet restore` / `pip install` / generation | `setup-workspace` |

## Usage

```yaml
# Node.js only (the default)
- uses: ./.github/actions/setup-tooling

# .NET only
- uses: ./.github/actions/setup-tooling
  with:
    node: "false"
    dotnet: "true"

# Python only
- uses: ./.github/actions/setup-tooling
  with:
    node: "false"
    python: "true"

# Node.js configured for npm Trusted Publishing
- uses: ./.github/actions/setup-tooling
  with:
    node-registry-url: "https://registry.npmjs.org"
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `node` | `true` | Install Node.js |
| `node-version` | `24` | Matches root `.nvmrc` and `engines.node` |
| `node-registry-url` | `""` | Sets `registry-url`; required for npm Trusted Publishing |
| `dotnet` | `false` | Install the .NET SDK |
| `dotnet-version` | `10.0.x` | Matches `net10.0` in `sites/api.arolariu.ro/Directory.Build.props` |
| `python` | `false` | Install Python |
| `python-version` | `3.12` | Matches `requires-python` in `sites/exp.arolariu.ro/pyproject.toml` |
| `cache` | `true` | Enables built-in caching on every enabled toolchain |

All inputs are strings. `dotnet` and `python` default to `false` because installing an SDK a job never uses costs real minutes on every run.

## Outputs

| Output | Description |
|--------|-------------|
| `node-cache-hit` | `actions/setup-node` restored the npm cache |
| `dotnet-cache-hit` | `actions/setup-dotnet` restored the NuGet cache |
| `python-cache-hit` | `actions/setup-python` restored the pip cache |

## Caching model

Caching is delegated entirely to each `actions/setup-*` action:

| Toolchain | Cached | Keyed on |
|-----------|--------|----------|
| Node.js | `~/.npm` | `package-lock.json` + `.github/scripts/package-lock.json` |
| .NET | `~/.nuget/packages` | `**/packages.lock.json` |
| Python | pip HTTP cache | `sites/exp.arolariu.ro/requirements*.txt` |

These caches are not keyed by workflow name, but GitHub still applies cache
branch/tag scope and cache-version rules. Workflows can reuse an entry only
when that scope makes the exact key accessible; do not treat the configuration
as one repository-wide cache object or a fixed storage-budget guarantee.

The Node entry lists both lock files because both feed the same `~/.npm` store — [`setup-workspace`](../setup-workspace/readme.md) installs the root workspaces *and* `.github/scripts`, which is a separate package with its own lock file. Keying on the root file alone would let a scripts-only dependency change go unnoticed: the key would not move, the stale cache would be restored, `npm ci` would re-download the new packages, and because the restore was a hit nothing would be written back — repeating that download on every later run.

> **Do not remove the `packages.lock.json` files.** `actions/setup-dotnet` fails when caching is enabled and no lock file is found.
