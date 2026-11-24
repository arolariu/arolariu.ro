# Setup Workspace Action

Installs language toolchains via the internal [`setup-runtime`](../setup-runtime/readme.md) action, then bootstraps the monorepo: dependency
installs, Playwright browsers, code generation, and the shared component build.

This is the only setup action workflows call. Run checkout first, then enable only the toolchains and tasks the job needs. With no inputs,
the action provisions nothing and does not restore or save caches. Caching is enabled by default for operations you opt into.

## Usage

```yaml
# No setup work
- uses: ./.github/actions/setup-workspace

# Node.js and root npm dependencies, with caching
- uses: ./.github/actions/setup-workspace
  with:
    node-install: "true"
    node-deps-install: "true"

# Node.js only; no workspace install
- uses: ./.github/actions/setup-workspace
  with:
    node-install: "true"

# CI scripts only; no root workspace install
- uses: ./.github/actions/setup-workspace
  with:
    node-install: "true"
    node-scripts-install: "true"

# .NET tests
- uses: ./.github/actions/setup-workspace
  with:
    dotnet-install: "true"
    install-dotnet-deps: "true"

# Website test job (official-website-build): Playwright and generation without secret-dependent env
- uses: ./.github/actions/setup-workspace
  with:
    node-install: "true"
    node-deps-install: "true"
    playwright-install: "true"
    workspace-generate: "true"
    workspace-generate-args: "artifacts gql i18n"

# Python checks
- uses: ./.github/actions/setup-workspace
  with:
    python-install: "true"
    python-deps-install: "true"

# Install dependencies without any Actions cache
- uses: ./.github/actions/setup-workspace
  with:
    node-install: "true"
    node-deps-install: "true"
    cache: "false"
```

## Inputs

### Toolchain — forwarded to `setup-runtime`

| Input               | Default  |
| ------------------- | -------- |
| `node-install`      | `false`  |
| `node-version`      | `24`     |
| `node-registry-url` | `""`     |
| `dotnet-install`    | `false`  |
| `dotnet-version`    | `10.0.x` |
| `python-install`    | `false`  |
| `python-version`    | `3.12`   |

`cache` defaults to `"true"` and controls both the runtime download caches and workspace caches. Setting it to `"false"` does not disable
any requested installs.

### Dependency installation

| Input                      | Default                                      | Runs                                                                                                                                |
| -------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `node-deps-install`        | `false`                                      | `npm ci` at the repository root unless a usable `node_modules` cache is restored, then `svelte-kit sync` for CV and status (always) |
| `node-scripts-install`     | `false`                                      | `npm ci` inside `.github/scripts`                                                                                                   |
| `install-dotnet-deps`      | `false`                                      | `dotnet restore <dotnet-deps-path>`                                                                                                 |
| `dotnet-deps-path`         | `arolariu.slnx`                              | —                                                                                                                                   |
| `python-deps-install`      | `false`                                      | `pip install --upgrade pip` then `pip install -r <python-requirements-path>`                                                        |
| `python-requirements-path` | `sites/exp.arolariu.ro/requirements-dev.txt` | —                                                                                                                                   |
| `playwright-install`       | `false`                                      | Runs locked Playwright locally: installs browser binaries and OS dependencies, or only OS dependencies on a browser cache hit       |
| `playwright-browsers`      | `chromium`                                   | —                                                                                                                                   |

### Workspace tasks

| Input                     | Default                  | Runs                                         |
| ------------------------- | ------------------------ | -------------------------------------------- |
| `workspace-generate`      | `false`                  | `npm run generate <workspace-generate-args>` |
| `workspace-generate-args` | `env artifacts gql i18n` | —                                            |
| `components-build`        | `false`                  | `npm run build:components`                   |

`artifacts` prepares Website `licenses.json` from installed packages. The tracked
[category catalogs](../../../DEVELOPMENT.md#invoice-domain-category-catalogs) are checked separately in CI and are not generated by setup.

### Input validation

The action checks inputs before provisioning. Flags must be `"true"` or `"false"`; enabled tasks require their corresponding paths or
nonblank arguments. Paths are relative to the repository root unless absolute. The action also rejects these contradictory combinations:

| Requires                    | Dependent inputs                                               |
| --------------------------- | -------------------------------------------------------------- |
| `node-install: "true"`      | `node-deps-install`, `node-scripts-install`                    |
| `node-deps-install: "true"` | `playwright-install`, `workspace-generate`, `components-build` |
| `dotnet-install: "true"`    | `install-dotnet-deps`                                          |
| `python-install: "true"`    | `python-deps-install`                                          |

Two reasons this exists.

A **disabled toolchain** does not produce an obvious failure on its own. `npm`, `dotnet`, and `python` are all preinstalled on GitHub-hosted
runners, so without the guard the dependent step would quietly run against whatever version the image happens to ship instead of the version
this action pins — and you would only notice via a confusing downstream error.

**`node-deps-install` gates both the cache restore and `npm ci`,** so with it disabled the action does not populate the root `node_modules`
tree. `npm run generate`, `npm run build:components`, and the repository-local Playwright binary all require the installed tree.
`node-scripts-install` is deliberately _not_ in that group: it installs `.github/scripts` independently and does not need the root tree.

`node-deps-install` also regenerates `.svelte-kit/` for the CV and status sites, because `.svelte-kit/` is not cached and a cache hit skips
the `npm ci` that would otherwise run their `prepare` scripts. The step fails fast if either `.svelte-kit/tsconfig.json` is missing, which
would otherwise surface as an ESLint or svelte-check crash.

## Outputs

| Output                          | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `npm-download-cache-hit`        | npm download cache restored                   |
| `nuget-packages-cache-hit`      | NuGet package cache restored                  |
| `pip-download-cache-hit`        | pip download cache restored                   |
| `node-modules-cache-hit`        | `node_modules` restored from cache            |
| `playwright-browsers-cache-hit` | Playwright browser bundle restored from cache |

These outputs report cache hits, not install success. A skipped cache can leave its output empty.

## Caching model

| Cache                                                             | Owner                      | Key                                                                                                                                       |
| ----------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `~/.npm`, `~/.nuget/packages`, pip                                | `setup-runtime` (built-in) | Lock or requirements file hashes                                                                                                          |
| `node_modules`, `packages/*/node_modules`, `sites/*/node_modules` | this action                | Versioned key: runner OS/image family and architecture, resolved Node/npm versions, root lockfile, workspace manifests, and root `.npmrc` |
| `~/.cache/ms-playwright`                                          | this action                | Versioned key: runner OS/image family and architecture, requested browsers, and root lockfile                                             |

Neither key carries a workflow-name segment, but GitHub still applies branch/tag scope and cache-version accessibility. These are not one
repository-wide cache object, and the configuration does not imply a fixed storage-budget guarantee. Neither cache uses fallback restore
keys.

The Playwright key includes the requested browser list so a Chromium-only cache cannot satisfy a later Firefox request. The lockfile owns
the Playwright version. The `node_modules` key includes resolved runtime versions rather than the input range because native addons must not
be restored across incompatible runtimes.

The cached `node_modules` paths mirror the npm workspaces declared in the root `package.json` (`packages/*`, `sites/*`) — precisely what the
root lock file governs. `.github/scripts` is deliberately excluded: it has its own lock file and its own install step
(`node-scripts-install`), so folding it into a cache keyed on the root lock file would make the cache's contents depend on which job
populated it first.

An exact `node-modules-cache-hit` reports archive restoration. Setup skips `npm ci` only if the installed manifests recorded by npm's hidden
lockfile are present. An incomplete tree is reinstalled from the tracked lockfile and the summary reports `HIT (reinstalled)`. This is a
completeness check, not a content integrity verification.
