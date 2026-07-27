# Setup Workspace Action

Installs language toolchains via [`setup-tooling`](../setup-tooling/readme.md), then bootstraps the arolariu.ro monorepo: dependency installs, Playwright browsers, code generation, and the shared component build.

Use [`setup-tooling`](../setup-tooling/readme.md) directly when a job needs only a binary and no repository bootstrap.

## Usage

```yaml
# Node.js + npm ci (the default)
- uses: ./.github/actions/setup-workspace

# .NET tests
- uses: ./.github/actions/setup-workspace
  with:
    node: "false"
    dotnet: "true"
    install-dotnet-deps: "true"

# Website build: generation, component library, Playwright
- uses: ./.github/actions/setup-workspace
  with:
    install-playwright: "true"
    run-generate: "true"
    run-build-components: "true"

# Python checks
- uses: ./.github/actions/setup-workspace
  with:
    node: "false"
    install-node-deps: "false"
    python: "true"
    install-python-deps: "true"
```

## Inputs

### Toolchain — forwarded to `setup-tooling`

| Input | Default |
|-------|---------|
| `node` | `true` |
| `node-version` | `24` |
| `node-registry-url` | `""` |
| `dotnet` | `false` |
| `dotnet-version` | `10.0.x` |
| `python` | `false` |
| `python-version` | `3.12` |

### Dependency installation

| Input | Default | Runs |
|-------|---------|------|
| `install-node-deps` | `true` | `npm ci` at the repository root |
| `install-scripts-deps` | `false` | `npm ci` inside `.github/scripts` |
| `install-dotnet-deps` | `false` | `dotnet restore <dotnet-deps-path>` |
| `dotnet-deps-path` | `arolariu.slnx` | — |
| `install-python-deps` | `false` | `pip install --upgrade pip` then `pip install -r <python-deps-path>` |
| `python-deps-path` | `sites/exp.arolariu.ro/requirements-dev.txt` | — |
| `install-playwright` | `false` | `npx playwright install <browsers> --with-deps` |
| `playwright-browsers` | `chromium` | — |

### Workspace tasks

| Input | Default | Runs |
|-------|---------|------|
| `run-generate` | `false` | `npm run generate <generate-args>` |
| `generate-args` | `/e /a /g /i` | — |
| `run-build-components` | `false` | `npm run build:components` |

## Outputs

| Output | Description |
|--------|-------------|
| `node-cache-hit` | npm download cache restored |
| `dotnet-cache-hit` | NuGet package cache restored |
| `python-cache-hit` | pip cache restored |
| `node-modules-cache-hit` | `node_modules` restored from cache |
| `playwright-cache-hit` | Playwright browser bundle restored from cache |

## Caching model

| Cache | Owner | Key |
|-------|-------|-----|
| `~/.npm`, `~/.nuget/packages`, pip | `setup-tooling` (built-in) | lock-file hashes |
| `node_modules` | this action | `<os>-node-modules-<hash(package-lock.json)>` |
| `~/.cache/ms-playwright` | this action | `<os>-playwright-<hash(package-lock.json)>` |

Both of this action's caches are keyed on the lock-file hash **alone** — there is no per-workflow prefix. One shared entry each, rather than every workflow writing its own multi-hundred-megabyte copy against the repository's 10 GB budget.

`npm ci` is used rather than `npm install`: it is the correct CI primitive and cannot mutate `package-lock.json`. It is skipped only when the `node_modules` cache hits on an exact lock-file match.
