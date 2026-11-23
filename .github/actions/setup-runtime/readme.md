# Setup Runtime (Internal)

Only [`setup-workspace`](../setup-workspace/readme.md) calls this composite. Workflows use `setup-workspace` even when they only need a
toolchain. This is a repository convention, not a GitHub access control setting.

The `node-install`, `dotnet-install`, and `python-install` flags all default to `"false"`. `cache` defaults to `"true"` but only applies to
selected toolchains. The action does not check out the repository, install workspace dependencies, provision browsers, generate files, or
build packages. The public input and output contract is documented by `setup-workspace`; this action owns the underlying toolchain setup and
routes each cache hit back through that contract.

## Download caches

| Toolchain | Cache          | Inputs that scope the cache                                 |
| --------- | -------------- | ----------------------------------------------------------- |
| Node.js   | npm downloads  | `package-lock.json` and `.github/scripts/package-lock.json` |
| .NET      | NuGet packages | `**/packages.lock.json`                                     |
| Python    | pip downloads  | `sites/exp.arolariu.ro/requirements*.txt`                   |

Both npm lockfiles feed the same download store. Omitting the scripts lockfile would leave that cache key unchanged on a scripts-only
dependency update, causing repeated downloads. With caching disabled, setup-node's automatic package-manager cache is also disabled. GitHub
still applies branch/tag scope and cache-version rules to enabled caches.
